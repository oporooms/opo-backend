import mongoose from "mongoose";

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cache =
  global.mongooseCache ??
  (global.mongooseCache = { conn: null, promise: null });

export const connectDB = async (MONGO_URI: string) => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI not set in environment variables");
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGO_URI, {
        dbName: "O9Stay",
        directConnection: false,
      })
      .then((mongooseInstance) => {
        console.log("MongoDB connected");
        return mongooseInstance;
      });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (err) {
    cache.promise = null;
    console.error("MongoDB connection error:", err);
    throw err;
  }
};
