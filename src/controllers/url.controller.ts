import { Request, Response, NextFunction } from 'express';
import { UrlService } from '../services/url.service';
import { AnalyticsService } from '../services/analytics.service';

export class UrlController {
  /**
   * POST /api/v1/shorten
   * Creates a shortened URL.
   */
  static async shorten(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { long_url, custom_alias, expires_at } = req.body;

      if (!long_url) {
        res.status(400).json({ error: 'long_url is required' });
        return;
      }

      // Basic URL format validation
      try {
        new URL(long_url);
      } catch (_) {
        res.status(400).json({ error: 'Invalid long_url format. Must start with http:// or https://' });
        return;
      }

      let parsedExpiry: Date | undefined;
      if (expires_at) {
        parsedExpiry = new Date(expires_at);
        if (isNaN(parsedExpiry.getTime())) {
          res.status(400).json({ error: 'Invalid expires_at date format' });
          return;
        }
        if (parsedExpiry <= new Date()) {
          res.status(400).json({ error: 'expires_at must be in the future' });
          return;
        }
      }

      const shortened = await UrlService.shortenUrl(long_url, custom_alias, parsedExpiry);

      // Reconstruct the short URL based on the request host
      const host = req.get('host') || 'localhost:3000';
      const scheme = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const shortUrl = `${scheme}://${host}/${shortened.short_code}`;

      res.status(201).json({
        id: shortened.id,
        short_code: shortened.short_code,
        short_url: shortUrl,
        long_url: shortened.long_url,
        created_at: shortened.created_at,
        expires_at: shortened.expires_at,
        is_custom: shortened.is_custom,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /:shortCode
   * Performs the redirect, recording analytics asynchronously.
   */
  static async redirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shortCode } = req.params;
      
      // Fetch long URL (checks cache first, falls back to DB, checks expiry)
      const longUrl = await UrlService.getLongUrl(shortCode);

      // Extract client details for analytics
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const referrer = req.headers['referer'] || 'direct'; // Spelled 'referer' in HTTP headers
      const clickedAt = new Date().toISOString();

      // Trigger analytics recording asynchronously (non-blocking)
      AnalyticsService.recordClick({
        shortCode,
        ipAddress,
        userAgent,
        referrer,
        clickedAt,
      }).catch((err) => console.error('Error scheduling click analytics:', err));

      // Perform a 302 Temporary Redirect to ensure subsequent clicks hit our server for tracking
      res.redirect(302, longUrl);
    } catch (err: any) {
      if (err.status === 404 || err.status === 410) {
        res.status(err.status).send(`
          <html>
            <head><title>${err.status === 410 ? 'Link Expired' : 'Not Found'}</title></head>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
              <h1>${err.status === 410 ? 'This link has expired' : 'URL Shortener - Link Not Found'}</h1>
              <p>${err.message}</p>
              <hr/>
              <p style="color: #666; font-size: 12px;">TinyURL Demo Server</p>
            </body>
          </html>
        `);
      } else {
        next(err);
      }
    }
  }
}
