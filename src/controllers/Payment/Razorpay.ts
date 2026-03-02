import { Request, Response } from "express";
import ip from "ip";
import dotenv from "dotenv";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import { DefaultResponseBody } from "@/types/default";
import { Orders } from "razorpay/dist/types/orders";
import Booking from "@/schemas/Booking";
import { BookingStatus, PaymentMode, PaymentStatus } from "@/types/Bookings";
import { Types } from "mongoose";

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const createOrder = async (req: Request, res: Response<DefaultResponseBody<Orders.RazorpayOrder>>) => {
    const { amount, currency, receipt } = req.body;
    try {
        if (!amount || !currency || !receipt) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Bad Request: amount, currency, and receipt are required",
                }
            });

            return;
        }
        const options = {
            amount: Number(amount) * 100, // amount in the smallest currency unit
            currency,
            receipt: receipt || uuidv4(),
            payment_capture: 1, // auto capture
        };

        const order = await razorpayInstance.orders.create(options);
        res.status(200).json({
            data: order,
            Status: {
                Code: 200,
                Message: "Order created successfully",
            }
        });
        return;
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error",
            }
        });
        return;
    }
};

export const verifyOrder = (req: Request, res: Response<DefaultResponseBody<boolean>>) => {
    const crypto = require('crypto');

    const { orderId, paymentId, signature, bookingId } = req.body as {
        orderId: string;
        paymentId: string;
        signature: string;
        bookingId?: string;
    };

    if (!orderId || !paymentId || !signature) {
        res.status(400).json({
            data: false,
            Status: {
                Code: 400,
                Message: "Bad Request: orderId, paymentId, and signature are required",
            }
        });
        return
    }

    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(orderId + '|' + paymentId)
        .digest('hex');

    const isValid = generatedSignature === signature;

    if (!isValid) {
        res.status(400).json({
            data: false,
            Status: {
                Code: 400,
                Message: "Signature verification failed",
            }
        });
        return;
    }

    const finalizeBooking = async () => {
        const filters: Array<Record<string, unknown>> = [];

        if (bookingId && Types.ObjectId.isValid(bookingId)) {
            filters.push({ _id: new Types.ObjectId(bookingId) });
        }

        if (orderId) {
            filters.push({ 'payment.transactionDetails.orderId': orderId });
            filters.push({ 'payment.transactionDetails.id': orderId });
        }

        if (!filters.length) return;

        await Booking.findOneAndUpdate(
            {
                $or: filters,
            },
            {
                $set: {
                    status: BookingStatus.BOOKED,
                    'payment.status': PaymentStatus.success,
                    'payment.transactionDetails.id': paymentId,
                    'payment.transactionDetails.orderId': orderId,
                    'payment.transactionDetails.mode': PaymentMode.onlinePay,
                    'payment.transactionDetails.date': new Date()
                }
            }
        );
    };

    finalizeBooking().finally(() => {
        res.status(200).json({
            data: true,
            Status: {
                Code: 200,
                Message: "Signature verified successfully",
            }
        });
    });
};

export const updatePaymentDetails = async (req: Request, res: Response<DefaultResponseBody<string>>) => {
    const { orderId, paymentId, status } = req.body;

    if (!orderId || !paymentId || !status) {
        res.status(400).json({
            data: "Bad Request: orderId, paymentId, and status are required",
            Status: {
                Code: 400,
                Message: "Bad Request: orderId, paymentId, and status are required",
            }
        });
        return;
    }

    try {
        res.status(200).json({
            data: "Payment details updated successfully",
            Status: {
                Code: 200,
                Message: "Payment details updated successfully",
            }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error",
            }
        });
    }
};
