export interface RateLimitConfig {
    interval: number; // in milliseconds
    limit: number; // max requests per interval
}

// Simple in-memory store for Edge Middleware
// Note: This state is process-local and may reset on serverless function restarts.
// For production scale, use Redis (Upstash).
const ipMap = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(ip: string, config: RateLimitConfig) {
    const now = Date.now();
    const windowStart = now - config.interval;

    const record = ipMap.get(ip);

    if (!record) {
        ipMap.set(ip, { count: 1, lastReset: now });
        return { success: true, remaining: config.limit - 1 };
    }

    if (record.lastReset < windowStart) {
        // Window expired, reset
        record.count = 1;
        record.lastReset = now;
        return { success: true, remaining: config.limit - 1 };
    }

    if (record.count >= config.limit) {
        return { success: false, remaining: 0 };
    }

    record.count++;
    return { success: true, remaining: config.limit - record.count };
}

// Clean up old entries periodically to prevent memory leaks
// (Edge runtime might kill timers, but we try)
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipMap.entries()) {
        if (record.lastReset < now - 60000) { // 1 minute cleanup
            ipMap.delete(ip);
        }
    }
}, 60000);
