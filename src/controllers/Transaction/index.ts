import { Request, Response } from "express";
import { FilterQuery, Types } from "mongoose";
import Transaction from "@/schemas/Transaction";
import { DefaultResponseBody } from "@/types/default";
import {
    TransactionDocument,
    TransactionMode,
    TransactionStatus,
    TransactionType,
    CreateTransactionBody,
    ListTransactionsQuery,
    TransactionParams,
} from "@/types/transaction";

const respondWithError = <T>(
    res: Response<DefaultResponseBody<T>>,
    status: number,
    message: string,
) => {
    res.status(status).json({
        data: null,
        Status: { Code: status, Message: message },
    });
};

const ensureAuthenticatedUserId = <T>(
    req: Pick<Request, "user">,
    res: Response<DefaultResponseBody<T>>,
): Types.ObjectId | null => {
    const userId = req.user?.userId;

    if (!userId || !Types.ObjectId.isValid(userId)) {
        respondWithError(res, 401, "Unauthorized");
        return null;
    }

    return new Types.ObjectId(userId);
};

export const createTransaction = async (
    req: Request<{}, {}, CreateTransactionBody>,
    res: Response<DefaultResponseBody<TransactionDocument>>,
) => {
    const payerObjectId = ensureAuthenticatedUserId(req, res);
    if (!payerObjectId) return;

    const {
        bookingId,
        amount,
        currency,
        mode,
        type,
        status,
        transactionDate,
        receiverId,
        description,
        reference,
        metadata,
        gatewayResponse,
        failureReason,
    } = req.body;

    if (!bookingId || !Types.ObjectId.isValid(bookingId)) {
        respondWithError(res, 400, "A valid bookingId is required.");
        return;
    }

    if (!receiverId || !Types.ObjectId.isValid(receiverId)) {
        respondWithError(res, 400, "A valid receiverId is required.");
        return;
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        respondWithError(res, 400, "Amount must be a positive number.");
        return;
    }

    if (!mode || !Object.values(TransactionMode).includes(mode)) {
        respondWithError(res, 400, "Invalid transaction mode supplied.");
        return;
    }

    if (type && !Object.values(TransactionType).includes(type)) {
        respondWithError(res, 400, "Invalid transaction type supplied.");
        return;
    }

    if (status && !Object.values(TransactionStatus).includes(status)) {
        respondWithError(res, 400, "Invalid transaction status supplied.");
        return;
    }

    const normalizedCurrency = (currency || "INR").trim().toUpperCase();
    if (normalizedCurrency.length < 3 || normalizedCurrency.length > 4) {
        respondWithError(res, 400, "Currency must be a 3-4 letter ISO code.");
        return;
    }

    try {
        const transaction = await Transaction.create({
            bookingId: new Types.ObjectId(bookingId),
            amount,
            currency: normalizedCurrency,
            mode,
            status: status ?? TransactionStatus.PENDING,
            payerId: payerObjectId,
            receiverId: new Types.ObjectId(receiverId),
            type: type ?? null,
            transactionDate: transactionDate ? new Date(transactionDate) : undefined,
            description,
            reference,
            metadata,
            gatewayResponse,
            failureReason: failureReason ?? null,
        });

        res.status(201).json({
            data: transaction,
            Status: { Code: 201, Message: "Transaction recorded successfully." },
        });
    } catch (error: any) {
        const message = error?.message || "Unable to record transaction.";
        respondWithError(res, 500, message);
    }
};

export const listTransactions = async (
    req: Request<{}, {}, {}, ListTransactionsQuery>,
    res: Response<DefaultResponseBody<TransactionDocument[]>>,
) => {
    const participantObjectId = ensureAuthenticatedUserId(req, res);
    if (!participantObjectId) return;

    const {
        status,
        bookingId,
        mode,
        type,
        role,
        from,
        to,
        page = "1",
        limit = "20",
    } = req.query;

    const filter: FilterQuery<TransactionDocument> = {};

    if (status) filter.status = status;
    if (mode) filter.mode = mode;
    if (type) filter.type = type;
    if (bookingId) {
        if (!Types.ObjectId.isValid(bookingId)) {
            respondWithError(res, 400, "Invalid bookingId supplied.");
            return;
        }
        filter.bookingId = new Types.ObjectId(bookingId);
    }

    if (from || to) {
        filter.transactionDate = {};
        if (from) {
            const fromDate = new Date(from);
            if (Number.isNaN(fromDate.valueOf())) {
                respondWithError(res, 400, "Invalid 'from' date supplied.");
                return;
            }
            filter.transactionDate.$gte = fromDate;
        }
        if (to) {
            const toDate = new Date(to);
            if (Number.isNaN(toDate.valueOf())) {
                respondWithError(res, 400, "Invalid 'to' date supplied.");
                return;
            }
            filter.transactionDate.$lte = toDate;
        }
    }

    if (role === "payer") {
        filter.payerId = participantObjectId;
    } else if (role === "receiver") {
        filter.receiverId = participantObjectId;
    } else {
        filter.$or = [
            { payerId: participantObjectId },
            { receiverId: participantObjectId },
        ];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    try {
        const transactions = await Transaction.find(filter)
            .sort({ transactionDate: -1 })
            .skip(skip)
            .limit(limitNumber)
        const total = await Transaction.countDocuments(filter);

        if (!transactions.length || !transactions) {
            res.status(200).json({
                data: [],
                Status: { Code: 200, Message: "No transactions found on this page." },
            });
            return;
        }

        res.setHeader("X-Total-Count", total.toString());
        res.status(200).json({
            data: transactions,
            Status: { Code: 200, Message: "Transactions fetched successfully." },
        });
    } catch (error: any) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: error?.message || "Unable to fetch transactions.",
            },
        });
    }
};

export const getTransactionById = async (
    req: Request<TransactionParams>,
    res: Response<DefaultResponseBody<TransactionDocument>>,
) => {
    const participantObjectId = ensureAuthenticatedUserId(req, res);
    if (!participantObjectId) return;

    const { transactionId } = req.params;
    if (!transactionId || !Types.ObjectId.isValid(transactionId)) {
        respondWithError(res, 400, "A valid transactionId is required.");
        return;
    }

    try {
        const transaction = await Transaction.findOne({
            _id: new Types.ObjectId(transactionId),
            $or: [
                { payerId: participantObjectId },
                { receiverId: participantObjectId },
            ],
        })

        if (!transaction) {
            respondWithError(res, 404, "Transaction not found.");
            return;
        }

        res.status(200).json({
            data: transaction,
            Status: { Code: 200, Message: "Transaction fetched successfully." },
        });
    } catch (error: any) {
        const message = error?.message || "Unable to fetch transaction.";
        respondWithError(res, 500, message);
    }
};
