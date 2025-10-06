import { removeNoSqlInjection } from "@/functions";
import mongoose, { Document, Schema } from "mongoose";

export interface IOtp extends Document {
  phone: string;
  email?: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
  userIp: string;
  otpCount: number;
}

const OtpSchema = new Schema<IOtp>({
  phone: { type: String, required: true },
  email: { type: String, required: false },
  otp: { type: String, required: true },
  expiresAt: { type: Date, default: Date.now, expires: 3600 }, // TTL index: expires after 1 hour
  createdAt: { type: Date, default: Date.now },
  userIp: { type: String, required: true },
  otpCount: { type: Number, default: 0 },
});

// Sanitize documents and queries against NoSQL injection
function sanitizeObject<T = any>(obj: T): T {
  try {
    // removeNoSqlInjection may return a different runtime type (e.g. string for strings),
    // so cast through any to satisfy the generic return type.
    const sanitized = removeNoSqlInjection(obj as any);
    return sanitized as T;
  } catch {
    return obj;
  }
}

// // Sanitize before saving a document
// OtpSchema.pre("save", function (next) {
//   const doc: any = this;
//   Object.keys(doc.toObject ? doc.toObject() : doc).forEach((k) => {
//     if (doc[k] && typeof doc[k] === "string") {
//       doc[k] = sanitizeObject(doc[k]);
//     }
//   });
//   next();
// });

// // Common query / update middleware
// const queryMiddlewares: Array<
//   "find" | "findOne" | "findOneAndUpdate" | "updateOne" | "updateMany"
// > = ["find", "findOne", "findOneAndUpdate", "updateOne", "updateMany"];

// queryMiddlewares.forEach((op) => {
//   OtpSchema.pre(op, function (next) {
//     const q: any = this;
//     const query = q.getQuery?.();
//     if (query) q.setQuery(sanitizeObject(query));

//     const update = q.getUpdate?.();
//     if (update) q.setUpdate(sanitizeObject(update));

//     // Mongoose stores some update ops inside $set
//     if (update && update.$set) {
//       update.$set = sanitizeObject(update.$set);
//     }
//     next();
//   });
// });

// // Aggregate pipeline sanitization
// OtpSchema.pre("aggregate", function (next) {
//   const pipeline = this.pipeline();
//   for (let i = 0; i < pipeline.length; i++) {
//     pipeline[i] = sanitizeObject(pipeline[i]);
//   }
//   next();
// });

export default mongoose.model<IOtp>("Otp", OtpSchema, "Otp");
