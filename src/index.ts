import 'module-alias/register';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "@/config/mongo";
import mainRoutes from "@/routes/mainRoutes";
import authRoutes from "@/routes/authRoutes";
import type { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import { globalRateLimiter } from './middleware/rateLimit';
import { authRedisRateLimiter } from './middleware/redit_ratelimit';

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
  "https://oporooms.com",
  "com.oporooms"
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

// JWT auth middleware (register before mainRoutes)
const JWT_SECRET = process.env.JWT_SECRET?.trim();
const JWT_ISSUER = process.env.JWT_ISSUER?.trim();
const JWT_AUDIENCE = process.env.JWT_AUDIENCE?.trim();

function getToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, v] = c.trim().split("=");
        return [decodeURIComponent(k), decodeURIComponent(v ?? "")];
      })
    );

    return cookies["access_token"] || cookies["token"];
  }

  return undefined;
}

const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return next();

  if (!JWT_SECRET) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  const token = getToken(req);
  if (!token) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="Missing token"');
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const decoded = jsonwebtoken.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER || undefined,
      audience: JWT_AUDIENCE || undefined,
      clockTolerance: 5,
    }) as jsonwebtoken.JwtPayload & { userId?: string; id?: string; sub?: string };

    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId || typeof userId !== "string") {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    req.user = { userId };
    next();
  } catch (err: any) {
    const name = err?.name;
    const msg =
      name === "TokenExpiredError" ? "Token expired" :
        name === "JsonWebTokenError" ? "Invalid token" :
          "Unauthorized";

    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"');
    res.status(401).json({ error: msg });
  }
};

// Prefer Redis based rate limiter if Redis configured, otherwise fallback to in-memory globalRateLimiter
const useRedisLimiter = Boolean(process.env.REDIS_URL || process.env.REDIS_URI);
app.use("/auth", useRedisLimiter ? authRedisRateLimiter : globalRateLimiter, authRoutes);
app.use(jwtAuthMiddleware);
app.use("/api/v1", mainRoutes);

let isConnected = false;

async function vercelHandler(req: Request, res: Response) {
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
