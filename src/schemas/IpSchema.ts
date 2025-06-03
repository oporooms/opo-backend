import mongoose, { Document, Schema } from "mongoose";

export interface IIp extends Document {
  userIp: string;
  phone: string;
  date: Date;
  otpCount: number;
}

const IpSchema: Schema = new Schema<IIp>({
  userIp: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: Date, default: Date.now, expires: 3600 }, // TTL index: expires after 1 hour
  otpCount: { type: Number, default: 0 },
});

export default mongoose.model<IIp>("Ip", IpSchema, "Ip");
