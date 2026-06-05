import "module-alias/register";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mainRoutes from "@/routes/mainRoutes";
import authRoutes from "@/routes/authRoutes";
import { slowDown } from "express-slow-down";
import adminRouter from "./routes/Admin";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      otp?: string;
    };
  }
}

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env", debug: true });
} else {
  void (async () => {
    const chalkMod = await import("chalk");
    const chalk = (chalkMod as any).default || chalkMod;

    const result = dotenv.config({ path: ".env.local" });
    const tag = chalk.bold.cyan("[dotenv]");

    if (result.error) {
      console.error(
        tag,
        chalk.bgRed.white(" ERROR "),
        chalk.red(`Failed to load .env.local: ${result.error.message}`)
      );
      return;
    }

    const keys = Object.keys(result.parsed ?? {});
    console.log(
      tag,
      chalk.bgGreen.black(" OK "),
      chalk.green(`Loaded .env.local (${keys.length} vars)`)
    );

    const dbg = String(
      process.env.DOTENV_DEBUG || process.env.DEBUG || ""
    ).toLowerCase();
    if (dbg === "1" || dbg === "true" || dbg.includes("dotenv")) {
      console.log(
        tag,
        chalk.white("Variables:"),
        keys.sort().map((k) => chalk.yellow(k)).join(chalk.gray(", "))
      );
    }
  })();
}

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://oporooms.com",
  "https://opo-frontend-lilac.vercel.app",
  "com.oporooms",
  "https://loomstay.in",
  "https://www.loomstay.in",
  "https://opotravel.in",
  "https://www.opotravel.in",
  "https://o9-frontend.vercel.app",
  "https://o9-admin.vercel.app",
];

const allowedOriginSet = new Set<string>([...allowedOrigins]);
const allowedHostSet = new Set<string>();
for (const o of allowedOrigins) {
  try {
    const u = new URL(o.includes("://") ? o : `https://${o}`);
    allowedHostSet.add(u.host);
    allowedHostSet.add(u.hostname);
  } catch {
    allowedHostSet.add(o);
  }
}
const isProd = process.env.NODE_ENV === "production";

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (allowedOriginSet.has(origin)) return true;

  try {
    const u = new URL(origin);

    if (allowedHostSet.has(u.host) || allowedHostSet.has(u.hostname)) return true;

    const normalized = `${u.protocol}//${u.host}`;
    if (allowedOriginSet.has(normalized)) return true;

    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]";

    if (!isProd && isLocal) return true;

    if (u.hostname === "oporooms.com" || u.hostname.endsWith(".oporooms.com")) {
      return true;
    }

    if (
      u.hostname === "loomstay.in" ||
      u.hostname.endsWith(".loomstay.in") ||
      u.hostname.endsWith(".opotravel.in")
    ) {
      return true;
    }

    if (
      u.hostname === "o9-frontend.vercel.app" ||
      u.hostname.endsWith(".o9-frontend.vercel.app")
    ) {
      return true;
    }
    if (
      u.hostname === "o9-admin.vercel.app" ||
      u.hostname.endsWith(".o9-admin.vercel.app")
    ) {
      return true;
    }

    if (u.hostname.endsWith(".vercel.app")) {
      return true;
    }

    if (isProd && u.protocol !== "https:") return false;

    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
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
    maxAge: 86400,
    optionsSuccessStatus: 204,
    preflightContinue: false,
  })
);

app.use(express.json());

const limiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => hits * 100,
  message: "Too many requests, please try again later.",
});

app.use("/auth", limiter, authRoutes);
app.use("/api/v1", limiter, mainRoutes);
app.use("/api/v1/admin", limiter, adminRouter);

export default app;
