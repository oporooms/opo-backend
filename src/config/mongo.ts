import mongoose from "mongoose";

export const connectDB = async (MONGO_URI: string) => {
  if (!MONGO_URI) {
    console.error("MONGO_URI not set in environment variables");
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};
