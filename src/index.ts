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
      userId: string,
      otp?: string,
    };
  }
}

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env", debug: true });
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
const PORT = Number(process.env.PORT) || 3000;

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  // "http://localhost:3001",
  "https://oporooms.com",
  "https://opo-frontend-lilac.vercel.app",
  "com.oporooms",
  "https://loomstay.in",
  "https://www.loomstay.in",
];

// Keep full-origin strings for exact matches, and also derive hostnames so
// we can allow the same host over http or https when explicitly whitelisted.
const allowedOriginSet = new Set<string>([...allowedOrigins]);
const allowedHostSet = new Set<string>();
for (const o of allowedOrigins) {
  try {
    // If the allowed origin is just a hostname (no protocol), assume https during parse
    const u = new URL(o.includes('://') ? o : `https://${o}`);
    allowedHostSet.add(u.host); // includes port if present
    allowedHostSet.add(u.hostname);
  } catch {
    // If parsing fails, store raw string as a hostname fallback
    allowedHostSet.add(o);
  }
}
const isProd = process.env.NODE_ENV === "production";

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  // Exact origin match (includes protocol + host)
  if (allowedOriginSet.has(origin)) return true;

  try {
    const u = new URL(origin);

    // Allow if the host (or hostname) is explicitly whitelisted. This lets us
    // accept the same site over http OR https when it's in the allow-list.
    if (allowedHostSet.has(u.host) || allowedHostSet.has(u.hostname)) return true;

    // Also allow normalized proto+host if the allowed list contained it in a different form
    const normalized = `${u.protocol}//${u.host}`;
    if (allowedOriginSet.has(normalized)) return true;

    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]";

    // In development, allow any localhost port
    if (!isProd && isLocal) return true;

    // Special-case common domains and their subdomains (allow both http/https if explicitly desired)
    if (u.hostname === "oporooms.com" || u.hostname.endsWith(".oporooms.com")) {
      return true;
    }

    if (u.hostname === "loomstay.in" || u.hostname.endsWith(".loomstay.in")) {
      return true;
    }

    // For anything else, require HTTPS in production
    if (isProd && u.protocol !== "https:") return false;

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
