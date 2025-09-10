import { ObjectId } from "mongodb"
import { Bookings } from "./Booking"
import { IUser } from "../user"

export enum TransactionStatus {
    pending = "pending",
    completed = "completed",
    cancelled = "cancelled",
    refunded = "refunded",
}

export interface TransactionType {
    _id?: string | ObjectId,
    bookingId?: string | ObjectId,
    photo?: string | File,
    payer_id?: string | ObjectId,
    receiver_id?: string | ObjectId,
    amount: number,
    mode?: Bookings['payment']['mode'],
    type?: "upi" | "cash" | "debit_card" | "credit_card" | string | null,
    status?: TransactionStatus,
    transactionDate?: Date,
    bookings?: Bookings,
    utr?: string,
    payer?: IUser,
    receiver?: IUser,
    createdAt?: Date,
    transactionId?: string,
}

export interface TransactionAction extends TransactionType {
    action: string,
    name1: string,
    name2: string,
}