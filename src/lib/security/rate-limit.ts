type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const hitsByKey = new Map<string, number[]>();

export function consumeRateLimit(
  key: string,
  { windowMs, max }: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  const recentHits = (hitsByKey.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recentHits.length >= max) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recentHits[0] + windowMs - now) / 1000),
    );

    hitsByKey.set(key, recentHits);

    return { ok: false, retryAfterSeconds };
  }

  recentHits.push(now);
  hitsByKey.set(key, recentHits);

  return { ok: true };
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export const publicRateLimits = {
  appointments: { windowMs: 15 * 60 * 1000, max: 8 },
  availability: { windowMs: 60 * 1000, max: 40 },
  login: { windowMs: 15 * 60 * 1000, max: 8 },
  manage: { windowMs: 15 * 60 * 1000, max: 20 },
} as const;
