import type {
  NextFunction,
  Request,
  Response,
} from "express";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const CLEANUP_EVERY_REQUESTS = 100;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
let requestsSinceCleanup = 0;

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded;

  const firstForwardedIp = forwardedValue
    ?.split(",")[0]
    ?.trim();

  return (
    firstForwardedIp ||
    req.socket.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

function cleanupExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function emailAvailabilityRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const now = Date.now();

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= CLEANUP_EVERY_REQUESTS) {
    cleanupExpiredBuckets(now);
    requestsSinceCleanup = 0;
  }

  const key = getClientKey(req);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    next();
    return;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000)
    );

    res.setHeader(
      "Retry-After",
      retryAfterSeconds.toString()
    );
    res.status(429).json({
      error:
        "Demasiadas comprobaciones de email. Esperá un minuto.",
    });
    return;
  }

  current.count += 1;
  next();
}
