import 'module-alias/register';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "@/config/mongo";
import mainRoutes from "@/routes/mainRoutes";
import authRoutes from "@/routes/authRoutes";
import { slowDown } from 'express-slow-down'
import adminRouter from './routes/Admin';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string
    };
  }
}

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env" });
} else {
  // Load dotenv in development with colored debug output using chalk
  void (async () => {
    const chalkMod = await import('chalk');
    const chalk = (chalkMod as any).default || chalkMod;

    const result = dotenv.config({ path: ".env.local" });
    const tag = chalk.bold.cyan("[dotenv]");

    if (result.error) {
      console.error(tag, chalk.bgRed.white(" ERROR "), chalk.red(`Failed to load .env.local: ${result.error.message}`));
      return;
    }

    const keys = Object.keys(result.parsed ?? {});
    console.log(tag, chalk.bgGreen.black(" OK "), chalk.green(`Loaded .env.local (${keys.length} vars)`));

    const dbg = String(process.env.DOTENV_DEBUG || process.env.DEBUG || "").toLowerCase();
    if (dbg === "1" || dbg === "true" || dbg.includes("dotenv")) {
      // List variable names only (avoid printing sensitive values)
      console.log(tag, chalk.white("Variables:"), keys.sort().map(k => chalk.yellow(k)).join(chalk.gray(", ")));
    }
  })();
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  // "http://localhost:3001",
  "https://oporooms.com",
  "https://opo-frontend-lilac.vercel.app",
  "com.oporooms",
  "https://loomstay.in"
];

const allowedOriginSet = new Set<string>([...allowedOrigins]);
const isProd = process.env.NODE_ENV === "production";

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (allowedOriginSet.has(origin)) return true;

  try {
    const u = new URL(origin);
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]";

    // In production, require HTTPS for non-local origins
    if (isProd && !isLocal && u.protocol !== "https:") return false;

    const normalized = `${u.protocol}//${u.host}`;
    if (allowedOriginSet.has(normalized)) return true;

    // Optionally allow oporooms.com and its subdomains
    if (u.hostname === "oporooms.com" || u.hostname.endsWith(".oporooms.com")) {
      return isProd ? u.protocol === "https:" : true;
    }

    // In development, allow any localhost port
    if (!isProd && isLocal) return true;

    return false;
  } catch {
    // Non-URL origins must be explicitly whitelisted
    return false;
  }
};

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isOriginAllowed(origin)) {
        console.log("CORS allowed:", origin);
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "ETag"],
    maxAge: 86400, // cache preflight 24h
    optionsSuccessStatus: 204,
    preflightContinue: false,
  })
);

app.use(express.json());

const limiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per 15 minutes.
  delayMs: (hits) => hits * 100, // Add 100 ms of delay to every request after the 5th one.
  message: 'Too many requests, please try again later.',
  // store: ... , // Use an external store for more precise rate limiting
})


app.use("/auth", limiter, authRoutes);
app.use("/api/v1", limiter, mainRoutes);
app.use("/api/v1/admin", limiter, adminRouter);


const MONGO_URI = process.env.MONGO_URI || "";
connectDB(MONGO_URI);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
