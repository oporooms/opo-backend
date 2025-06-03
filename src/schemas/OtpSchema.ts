import mongoose, { Document, Schema } from "mongoose";

export interface IOtp extends Document {
  phone: string;
  randomCode: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  phone: { type: String, required: true },
  randomCode: { type: String, required: true },
  expiresAt: { type: Date, default: Date.now, expires: 3600 }, // TTL index: expires after 5 minutes
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOtp>("Otp", OtpSchema, "Otp");
