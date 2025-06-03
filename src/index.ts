import 'module-alias/register';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/mongo";
import mainRoutes from "./routes/mainRoutes";
import authRoutes from "./routes/authRoutes";
import type { Request, Response, NextFunction } from "express";

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env" });
} else {
  dotenv.config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://oporooms.com",
  "com.oporooms"
];
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

app.use(express.json());

// JWT auth middleware (register before mainRoutes)
const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/auth")) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
    (req as any).user = require("jsonwebtoken").verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

app.use("/auth", authRoutes);
app.use(jwtAuthMiddleware);
app.use("/", mainRoutes);

let isConnected = false;

async function vercelHandler(req: any, res: any) {
  if (!isConnected) {
    const MONGO_URI = process.env.MONGO_URI || "";
    await connectDB(MONGO_URI);
    isConnected = true;
  }
  app(req, res);
}

if (process.env.VERCEL) {
  module.exports = vercelHandler;
} else {
  const MONGO_URI = process.env.MONGO_URI || "";
  connectDB(MONGO_URI);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
