import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  mode: {
    type: String,
    required: true,
  },
  payer_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  receiver_id: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
  },
  status: {
    type: String,
    required: true,
  },
  transactionDate: {
    type: Date,
    required: true,
  },
  type: {
    type: mongoose.Schema.Types.Mixed, // Null type
  },
});

export default mongoose.model("Transaction", transactionSchema);