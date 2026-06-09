import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_REQUESTS = 60; // 60 requests per minute per IP

/**
 * Sliding Window rate limiter middleware using Redis sorted sets (ZSET).
 */
export async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'anonymous';
  const redisKey = `rate_limit:${ip}`;
  
  const now = Date.now();
  const clearBefore = now - WINDOW_SIZE_IN_SECONDS * 1000;

  try {
    const pipeline = redis.pipeline();
    // Remove timestamps older than the current window size
    pipeline.zremrangebyscore(redisKey, 0, clearBefore);
    // Add current request timestamp
    pipeline.zadd(redisKey, now, now.toString());
    // Get count of requests in the current window
    pipeline.zcard(redisKey);
    // Set TTL on the set key so it expires if inactive
    pipeline.expire(redisKey, WINDOW_SIZE_IN_SECONDS);

    const results = await pipeline.exec();
    
    if (!results) {
      res.status(500).json({ error: 'Rate limiter failure' });
      return;
    }

    // Results is an array of [err, result]. zcard is index 2.
    const zcardResult = results[2];
    const requestCount = zcardResult[1] as number;

    if (requestCount > MAX_REQUESTS) {
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfterSeconds: WINDOW_SIZE_IN_SECONDS,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail-open or fail-closed based on production requirements. Here we fail-open.
    next();
  }
}
