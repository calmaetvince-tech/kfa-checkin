import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting for the public /m/[token] member page.
// If Upstash env vars are present, enforce 10 requests / minute / IP.
// Otherwise this is a no-op so local dev and un-provisioned deploys keep working.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let limiter: Ratelimit | null = null;

if (url && token) {
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: false,
    prefix: "kfa:m",
  });
}

export const rateLimitEnabled = limiter !== null;

export async function rateLimit(
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: 10 };
  try {
    const { success, remaining } = await limiter.limit(identifier);
    return { success, remaining };
  } catch {
    // If Redis is unreachable, fail open — never block a real member.
    return { success: true, remaining: 10 };
  }
}
