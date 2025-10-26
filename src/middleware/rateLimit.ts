import type { Request, Response, NextFunction, RequestHandler } from "express";

type Bucket = {
  count: number;
  first: number; // first attempt timestamp in the window
  last: number; // last attempt timestamp
};

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

const RT_DEBUG = process.env.RATE_LIMIT_DEBUG === "1";

function dbg(...args: unknown[]) {
  if (RT_DEBUG) {
    // Prefix to make grepping easier
  }
}

function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, keyGenerator } = options;
  const genKey =
    keyGenerator ||
    ((req: Request) => {
      const ip =
        (req.ip ||
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "unknown").toString();
      const subject = (
        req.body?.phone ||
        req.body?.email ||
        req.body?.username ||
        ""
      )
        .toString()
        .trim()
        .toLowerCase();
      return subject ? `${ip}|${subject}` : ip;
    });

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = genKey(req);
    const bucket = buckets.get(key);

    if (!bucket) {
      buckets.set(key, { count: 1, first: now, last: now });
      dbg("NEW bucket", { key, count: 1, windowMs });
      return next();
    }

    // Reset window if expired
    if (now - bucket.first >= windowMs) {
      dbg("RESET window", {
        key,
        previousCount: bucket.count,
        elapsedMs: now - bucket.first,
      });
      bucket.count = 1;
      bucket.first = now;
      bucket.last = now;
      return next();
    }

    bucket.count += 1;
    bucket.last = now;
    dbg("ATTEMPT", {
      key,
      count: bucket.count,
      remaining: Math.max(max - bucket.count, 0),
    });

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.first + windowMs - now) / 1000);
      dbg("BLOCKED", {
        key,
        count: bucket.count,
        retryAfterSec,
      });
      res.setHeader("Retry-After", String(Math.max(retryAfterSec, 1)));
      res.setHeader("Cache-Control", "no-store");
      res.status(429).json({
        error: "Too many login attempts. Please try again later.",
      });
      return;
    }

    next();
  };
}

// Default limiter for login: 10 attempts per 15 minutes per IP+subject
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

export { createRateLimiter };
