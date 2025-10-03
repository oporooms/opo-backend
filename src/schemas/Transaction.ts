import mongoose, { Schema } from "mongoose";
import {
  TransactionDocument,
  TransactionMode,
  TransactionStatus,
  TransactionType,
} from "@/types/transaction";

const transactionSchema = new Schema<TransactionDocument>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    mode: {
      type: String,
      required: true,
      enum: Object.values(TransactionMode),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    payerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [...Object.values(TransactionType), null],
      default: null,
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

transactionSchema.index({ bookingId: 1, transactionDate: -1 });
transactionSchema.index({ payerId: 1, transactionDate: -1 });

export default mongoose.model<TransactionDocument>("Transaction", transactionSchema, "Transaction");