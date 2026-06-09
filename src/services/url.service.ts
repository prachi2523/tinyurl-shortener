import { query } from '../config/database';
import { redis } from '../config/redis';
import { encodeToBase62 } from '../utils/base62';
import { Url } from '../models/url.model';

const CACHE_TTL_SECONDS = 86400; // 24 hours
const NEGATIVE_CACHE_TTL_SECONDS = 300; // 5 minutes

export class UrlService {
  /**
   * Shortens a long URL by generating a short code or using a custom alias.
   */
  static async shortenUrl(
    longUrl: string,
    customAlias?: string,
    expiresAt?: Date
  ): Promise<Url> {
    // 1. If custom alias is provided, validate and check availability
    if (customAlias) {
      // Validate alphanumeric custom alias (1 to 15 chars)
      const aliasRegex = /^[a-zA-Z0-9_-]{1,15}$/;
      if (!aliasRegex.test(customAlias)) {
        throw { status: 400, message: 'Invalid custom alias format. Use 1-15 alphanumeric characters, hyphens, or underscores.' };
      }

      // Check DB for existing custom alias
      const checkRes = await query('SELECT id FROM urls WHERE short_code = $1', [customAlias]);
      if (checkRes.rows.length > 0) {
        throw { status: 409, message: 'Custom alias is already in use.' };
      }

      // Insert custom alias
      const insertRes = await query(
        `INSERT INTO urls (short_code, long_url, expires_at, is_custom) 
         VALUES ($1, $2, $3, true) 
         RETURNING id, short_code, long_url, created_at, expires_at, is_custom`,
        [customAlias, longUrl, expiresAt || null]
      );

      const newUrl: Url = insertRes.rows[0];
      // Pre-cache custom alias
      await this.cacheUrl(newUrl.short_code, newUrl.long_url, newUrl.expires_at || undefined);
      return newUrl;
    }

    // 2. No custom alias: Fetch next ID from sequence to guarantee no collisions
    const seqRes = await query("SELECT nextval('urls_id_seq') as next_id");
    const nextId = parseInt(seqRes.rows[0].next_id, 10);
    
    // Convert numerical sequence ID to Base62 string
    const shortCode = encodeToBase62(nextId);

    // Save to PostgreSQL
    const insertRes = await query(
      `INSERT INTO urls (id, short_code, long_url, expires_at, is_custom) 
       VALUES ($1, $2, $3, $4, false) 
       RETURNING id, short_code, long_url, created_at, expires_at, is_custom`,
      [nextId, shortCode, longUrl, expiresAt || null]
    );

    const newUrl: Url = insertRes.rows[0];
    
    // Pre-cache newly created short code
    await this.cacheUrl(newUrl.short_code, newUrl.long_url, newUrl.expires_at || undefined);
    
    return newUrl;
  }

  /**
   * Retrieves the long URL from cache or database, validating expiration.
   */
  static async getLongUrl(shortCode: string): Promise<string> {
    const redisKey = `url:${shortCode}`;

    // 1. Check Redis cache
    const cachedUrl = await redis.get(redisKey);
    if (cachedUrl) {
      if (cachedUrl === '__NULL__') {
        throw { status: 404, message: 'URL not found' };
      }
      return cachedUrl;
    }

    // 2. Cache miss: Query Postgres
    const dbRes = await query(
      'SELECT id, long_url, expires_at FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (dbRes.rows.length === 0) {
      // Prevent cache penetration: negative caching
      await redis.setex(redisKey, NEGATIVE_CACHE_TTL_SECONDS, '__NULL__');
      throw { status: 404, message: 'URL not found' };
    }

    const { long_url, expires_at } = dbRes.rows[0];

    // 3. Check expiration
    if (expires_at && new Date(expires_at) < new Date()) {
      // Lazy delete/invalidate from DB or keep for history, but mark as expired.
      // Here we cache as negative to prevent DB queries and throw 404.
      await redis.setex(redisKey, NEGATIVE_CACHE_TTL_SECONDS, '__NULL__');
      throw { status: 410, message: 'URL has expired' };
    }

    // 4. Populate cache
    await this.cacheUrl(shortCode, long_url, expires_at);

    return long_url;
  }

  /**
   * Cache helper with calculated TTL
   */
  private static async cacheUrl(shortCode: string, longUrl: string, expiresAt?: Date | null) {
    const redisKey = `url:${shortCode}`;
    
    if (expiresAt) {
      const msLeft = new Date(expiresAt).getTime() - Date.now();
      const secondsLeft = Math.floor(msLeft / 1000);
      
      if (secondsLeft > 0) {
        // Cache for remaining life of URL, capped at standard TTL if it's very long
        const ttl = Math.min(secondsLeft, CACHE_TTL_SECONDS);
        await redis.setex(redisKey, ttl, longUrl);
      }
    } else {
      // No expiration: Cache with default TTL
      await redis.setex(redisKey, CACHE_TTL_SECONDS, longUrl);
    }
  }
}
