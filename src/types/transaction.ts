import { Document, Types } from "mongoose";

export enum TransactionStatus {
	PENDING = "pending",
	PROCESSING = "processing",
	COMPLETED = "completed",
	FAILED = "failed",
	REFUNDED = "refunded",
}

export enum TransactionType {
	DEBIT = "debit",
	CREDIT = "credit",
	REFUND = "refund",
	ADJUSTMENT = "adjustment",
}

export enum TransactionMode {
	COMPANY = "Pay by company",
	WALLET = "Wallet",
	PAYMENT_GATEWAY = "Payment gateway",
	BANK_TRANSFER = "Bank transfer",
	CASH = "Cash",
}

export interface Transaction {
	_id?: Types.ObjectId;
	bookingId: Types.ObjectId;
	amount: number;
	currency: string;
	mode: TransactionMode;
	status: TransactionStatus;
	transactionDate: Date;
	payerId: Types.ObjectId;
	receiverId: Types.ObjectId;
	type?: TransactionType | null;
	reference?: string;
	description?: string;
	failureReason?: string | null;
	gatewayResponse?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	createdAt?: Date;
	updatedAt?: Date;
}

export type TransactionDocument = Transaction & Document;

export interface CreateTransactionBody {
	bookingId: string;
	amount: number;
	currency?: string;
	mode: TransactionMode;
	type?: TransactionType | null;
	status?: TransactionStatus;
	transactionDate?: string | Date;
	receiverId: string;
	description?: string;
	reference?: string;
	metadata?: Record<string, unknown>;
	gatewayResponse?: Record<string, unknown>;
	failureReason?: string | null;
}

export interface ListTransactionsQuery {
	status?: TransactionStatus;
	bookingId?: string;
	mode?: TransactionMode;
	type?: TransactionType;
	role?: "payer" | "receiver";
	from?: string;
	to?: string;
	page?: string;
	limit?: string;
}

export interface TransactionParams {
	transactionId: string;
}
