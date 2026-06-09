import { query } from '../config/database';
import { redis } from '../config/redis';

export interface ClickPayload {
  shortCode: string;
  ipAddress: string;
  userAgent: string;
  referrer: string;
  clickedAt: string;
}

export class AnalyticsService {
  private static QUEUE_KEY = 'analytics_queue';

  /**
   * Pushes a click event to a Redis queue for asynchronous background processing.
   */
  static async recordClick(payload: ClickPayload): Promise<void> {
    try {
      await redis.rpush(this.QUEUE_KEY, JSON.stringify(payload));
    } catch (err) {
      // Log error but do not fail the redirect flow (resiliency first)
      console.error('Failed to push click event to Redis queue:', err);
    }
  }

  /**
   * Retrieves summary analytics for a given short code.
   */
  static async getAnalytics(shortCode: string) {
    // Check if the URL exists first
    const urlRes = await query('SELECT id, long_url, created_at, expires_at FROM urls WHERE short_code = $1', [shortCode]);
    if (urlRes.rows.length === 0) {
      throw { status: 404, message: 'URL not found' };
    }

    const url = urlRes.rows[0];

    // Get click statistics
    const statsRes = await query(
      `SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip_address) as unique_visitors
       FROM analytics 
       WHERE url_id = $1`,
      [url.id]
    );

    // Get breakdown by referrers
    const referrersRes = await query(
      `SELECT referrer, COUNT(*) as count 
       FROM analytics 
       WHERE url_id = $1 
       GROUP BY referrer 
       ORDER BY count DESC 
       LIMIT 10`,
      [url.id]
    );

    // Get click distribution over past 7 days
    const timelineRes = await query(
      `SELECT 
        DATE(clicked_at) as click_date, 
        COUNT(*) as count 
       FROM analytics 
       WHERE url_id = $1 AND clicked_at >= NOW() - INTERVAL '7 days'
       GROUP BY click_date 
       ORDER BY click_date ASC`,
      [url.id]
    );

    return {
      shortCode,
      longUrl: url.long_url,
      createdAt: url.created_at,
      expiresAt: url.expires_at,
      totalClicks: parseInt(statsRes.rows[0].total_clicks, 10),
      uniqueVisitors: parseInt(statsRes.rows[0].unique_visitors, 10),
      topReferrers: referrersRes.rows.map((row) => ({
        referrer: row.referrer || 'Direct/Unknown',
        count: parseInt(row.count, 10),
      })),
      clicksTimeline7Days: timelineRes.rows.map((row) => ({
        date: row.click_date,
        count: parseInt(row.count, 10),
      })),
    };
  }
}
