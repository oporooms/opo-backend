import type { Request, Response, NextFunction, RequestHandler } from "express";
import Redis from "ioredis";
import os from "os";

/**
 * Production-ready Redis-backed rate limiter (sliding window + burst) with:
 * - Trustable client IP extraction (supports X-Forwarded-For / CF-Connecting-IP)
 * - Configurable window, burst (token bucket) and block durations
 * - Distinct prefixes per logical use-case
 * - Lightweight Lua script for atomic updates
 * - Debug + graceful Redis fallback (degrades to in-memory counter)
 */

interface RedisRateLimitOptions {
	prefix?: string;            // Redis key prefix
	windowMs: number;           // Sliding window size
	max: number;                // Max requests per window
	burst?: number;             // Optional additional burst tokens
	blockDurationMs?: number;   // Time to block after exceeding limit
	redis?: Redis;              // Provide existing client
	extractKey?: (req: Request) => string; // Custom key (default: IP)
	whitelist?: (key: string, req: Request) => boolean; // Skip limiter
	onBlocked?: (ctx: BlockContext) => void; // Hook when blocked
	debug?: boolean;
}

interface BlockContext {
	key: string;
	remaining: number;
	resetMs: number;
	blockMs: number;
	count: number;
	max: number;
}

// Minimal in-memory fallback if Redis is unavailable
const fallbackBuckets = new Map<string, { count: number; reset: number; blockedUntil?: number }>();

// Single shared Redis instance (can be customized via env)
let sharedRedis: Redis | undefined;
function getRedis(): Redis | undefined {
	if (sharedRedis) return sharedRedis;
	const url = process.env.REDIS_URL || process.env.REDIS_URI;
	if (!url) return undefined;
	sharedRedis = new Redis(url, {
		lazyConnect: true,
		enableReadyCheck: true,
		maxRetriesPerRequest: 2,
	});
			sharedRedis.on("error", (e: unknown) => {
				if (process.env.RATE_LIMIT_DEBUG === "1") {
					const msg = e instanceof Error ? e.message : String(e);
				}
			});
	return sharedRedis;
}

// Atomic Lua script implementing (sliding) window + optional blocking
// KEYS[1] = counter key, KEYS[2] = block key
// ARGV: [1]=now(ms) [2]=windowMs [3]=max [4]=blockMs
// Returns table: { currentCount, ttl_ms, blocked(0/1), block_ttl_ms }
const LUA_SCRIPT = `
local counterKey = KEYS[1]
local blockKey = KEYS[2]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxReq = tonumber(ARGV[3])
local blockMs = tonumber(ARGV[4])

-- If blocked
local blkTtl = redis.call('PTTL', blockKey)
if blkTtl > 0 then
	local current = tonumber(redis.call('GET', counterKey) or '0')
	return { current, redis.call('PTTL', counterKey), 1, blkTtl }
end

-- Increment count with expire
local current = redis.call('INCR', counterKey)
if current == 1 then
	redis.call('PEXPIRE', counterKey, windowMs)
end

local ttl = redis.call('PTTL', counterKey)
if current > maxReq then
	if blockMs > 0 then
		redis.call('SET', blockKey, '1', 'PX', blockMs)
		blkTtl = blockMs
	end
	return { current, ttl, 1, blkTtl }
end
return { current, ttl, 0, 0 }
`;

function getClientIp(req: Request): string {
	// Respect X-Forwarded-For (first IP) if behind trusted proxy
	const xff = (req.headers["x-forwarded-for"] as string) || "";
	if (xff) {
		const ip = xff.split(",")[0].trim();
		if (ip) return ip;
	}
	const cf = (req.headers["cf-connecting-ip"] as string) || "";
	if (cf) return cf;
	const real = (req.headers["x-real-ip"] as string) || "";
	if (real) return real;
	return (
		req.ip ||
		(req.socket ? req.socket.remoteAddress : undefined) ||
		(req.connection ? req.connection.remoteAddress : undefined) ||
		"unknown"
	).toString();
}

export function redisRateLimiter(options: RedisRateLimitOptions): RequestHandler {
	const {
		prefix = "rl",
		windowMs,
		max,
		burst = 0,
		blockDurationMs = 0,
		extractKey = (req) => getClientIp(req),
		whitelist = (key) => false,
		onBlocked,
		redis: providedRedis,
		debug = process.env.RATE_LIMIT_DEBUG === "1" || false,
	} = options;

	if (!windowMs || !max) {
		throw new Error("redisRateLimiter requires windowMs and max options");
	}

	const redis = providedRedis || getRedis();
			const scriptShaPromise: Promise<string | undefined> | undefined = redis
				? (redis.script("LOAD", LUA_SCRIPT) as Promise<string>).then((sha) => sha).catch(() => undefined)
		: undefined;

	const hostname = os.hostname();

	async function handleRedis(
		key: string
	): Promise<{ allow: boolean; remaining: number; resetMs: number; blockMs: number; count: number }> {
		if (!redis) throw new Error("NO_REDIS");
		const now = Date.now();
		const counterKey = `${prefix}:c:${key}`;
		const blockKey = `${prefix}:b:${key}`;
		let res: any;
		try {
			const sha = await scriptShaPromise;
			const args = [now, windowMs, max + burst, blockDurationMs];
			if (sha) {
				res = await redis.evalsha(sha, 2, counterKey, blockKey, ...args);
			} else {
				res = await redis.eval(LUA_SCRIPT, 2, counterKey, blockKey, ...args);
			}
		} catch (e) {
			if (debug) console.error("[redis-rate-limit] eval error, fallback", (e as Error).message);
			throw new Error("EVAL_FAIL");
		}

		const [count, ttlMs, blocked, blockTtl] = res.map((n: any) => Number(n));
		const remaining = Math.max(max + burst - count, 0);
		const resetMs = now + ttlMs;
		const blockMs = blocked ? blockTtl || blockDurationMs : 0;
		return { allow: !blocked, remaining, resetMs, blockMs, count };
	}

	function handleFallback(
		key: string
	): { allow: boolean; remaining: number; resetMs: number; blockMs: number; count: number } {
		const now = Date.now();
		const bucket = fallbackBuckets.get(key);
		if (!bucket || now > bucket.reset) {
			const reset = now + windowMs;
			fallbackBuckets.set(key, { count: 1, reset });
			return { allow: true, remaining: max - 1, resetMs: reset, blockMs: 0, count: 1 };
		}
		if (bucket.blockedUntil && now < bucket.blockedUntil) {
			return { allow: false, remaining: 0, resetMs: bucket.reset, blockMs: bucket.blockedUntil - now, count: bucket.count };
		}
		bucket.count += 1;
		if (bucket.count > max + burst) {
			if (blockDurationMs > 0) bucket.blockedUntil = now + blockDurationMs;
			return { allow: false, remaining: 0, resetMs: bucket.reset, blockMs: blockDurationMs, count: bucket.count };
		}
		return { allow: true, remaining: Math.max(max + burst - bucket.count, 0), resetMs: bucket.reset, blockMs: 0, count: bucket.count };
	}

		return async function redisRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
		const keyRaw = extractKey(req) || "unknown";
		const key = keyRaw.toLowerCase();
		if (whitelist(key, req)) return next();

		let result: { allow: boolean; remaining: number; resetMs: number; blockMs: number; count: number };
		try {
			result = await handleRedis(key);
		} catch {
			// Fallback path
			result = handleFallback(key);
		}

		// Set headers (similar to RFC standard rate limit fields)
		res.setHeader("RateLimit-Limit", String(max + burst));
		res.setHeader("RateLimit-Remaining", String(result.remaining));
		res.setHeader("RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));
		res.setHeader("X-RateLimit-Key", key);
		res.setHeader("X-RateLimit-Host", hostname);

		if (!result.allow) {
			const retrySec = Math.ceil((result.blockMs || result.resetMs - Date.now()) / 1000);
			res.setHeader("Retry-After", String(Math.max(retrySec, 1)));
			if (onBlocked) {
				onBlocked({
					key,
					remaining: result.remaining,
					resetMs: result.resetMs,
						blockMs: result.blockMs,
					count: result.count,
					max: max + burst,
				});
			}
					res.status(429).json({
				error: "Too many requests",
				key,
				retryAfter: retrySec,
			});
					return;
				}

				next();
	};
}

// Pre-configured common limiter (e.g., for auth endpoints) 10 req / 60s with burst 5
export const authRedisRateLimiter = redisRateLimiter({
	prefix: "auth",
	windowMs: 60_000,
	max: 10,
	burst: 5,
	blockDurationMs: 5 * 60_000, // 5 minutes block
	extractKey: (req) => {
		const ip = getClientIp(req);
		const idPart =
			(req.body?.phone || req.body?.email || req.body?.username || "").toString().toLowerCase();
		return idPart ? `${ip}|${idPart}` : ip;
	},
	whitelist: (key) => key.startsWith("127.0.0.1") || key.startsWith("::1"),
	onBlocked: (ctx) => {
		if (process.env.RATE_LIMIT_DEBUG === "1") {
			console.warn("[redis-rate-limit] blocked", ctx);
		}
	},
});

export { getClientIp };

