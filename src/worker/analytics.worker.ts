import { query } from '../config/database';
import { redis } from '../config/redis';
import { ClickPayload } from '../services/analytics.service';

const QUEUE_KEY = 'analytics_queue';
const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1000;
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

export class AnalyticsWorker {
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Starts the background worker processing loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Background Analytics & Cleanup Worker started');

    // Start polling Redis
    this.schedulePoll();

    // Start periodic URL expiration cleanup
    this.scheduleCleanup();
  }

  /**
   * Stops the background worker gracefully.
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    console.log('Background Analytics Worker stopped');
  }

  private schedulePoll(): void {
    if (!this.isRunning) return;
    this.pollTimer = setTimeout(async () => {
      await this.processQueueBatch();
      this.schedulePoll();
    }, POLL_INTERVAL_MS);
  }

  private scheduleCleanup(): void {
    if (!this.isRunning) return;
    this.cleanupTimer = setTimeout(async () => {
      await this.cleanupExpiredUrls();
      this.scheduleCleanup();
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Pulls up to BATCH_SIZE items from the Redis list and performs a bulk insert.
   */
  private async processQueueBatch(): Promise<void> {
    try {
      const items: ClickPayload[] = [];
      
      // Batch pop items
      for (let i = 0; i < BATCH_SIZE; i++) {
        const itemStr = await redis.lpop(QUEUE_KEY);
        if (!itemStr) break;
        try {
          items.push(JSON.parse(itemStr));
        } catch (_) {
          console.error('Invalid analytics JSON format popped from queue');
        }
      }

      if (items.length === 0) return;

      console.log(`Processing batch of ${items.length} click event(s)`);

      // Resolve URL short_codes to IDs first to populate analytics.url_id
      const uniqueCodes = Array.from(new Set(items.map((item) => item.shortCode)));
      
      // Fetch URL records
      const codesList = uniqueCodes.map((_, index) => `$${index + 1}`).join(', ');
      const urlsRes = await query(
        `SELECT id, short_code FROM urls WHERE short_code IN (${codesList})`,
        uniqueCodes
      );

      const codeToIdMap = new Map<string, number>();
      urlsRes.rows.forEach((row) => {
        codeToIdMap.set(row.short_code, parseInt(row.id, 10));
      });

      // Prepare bulk insert statements
      // We will perform a series of inserts in a single transaction or build a parameterized multi-value insert.
      // E.g., INSERT INTO analytics (url_id, clicked_at, ip_address, user_agent, referrer) VALUES ($1, $2, ...), ($6, $7, ...)
      const insertValues: any[] = [];
      const valuePlaceholders: string[] = [];
      let placeholderIndex = 1;

      items.forEach((item) => {
        const urlId = codeToIdMap.get(item.shortCode);
        if (!urlId) {
          // If the URL has been deleted, skip recording its analytics
          return;
        }

        valuePlaceholders.push(
          `($${placeholderIndex}, $${placeholderIndex + 1}, $${placeholderIndex + 2}, $${placeholderIndex + 3}, $${placeholderIndex + 4})`
        );
        insertValues.push(urlId, item.clickedAt, item.ipAddress, item.userAgent, item.referrer);
        placeholderIndex += 5;
      });

      if (insertValues.length > 0) {
        const insertQuery = `
          INSERT INTO analytics (url_id, clicked_at, ip_address, user_agent, referrer)
          VALUES ${valuePlaceholders.join(', ')}
        `;
        await query(insertQuery, insertValues);
        console.log(`Successfully recorded ${insertValues.length / 5} click events to PostgreSQL`);
      }
    } catch (err) {
      console.error('Error processing analytics batch:', err);
    }
  }

  /**
   * Deletes expired records from the database.
   */
  private async cleanupExpiredUrls(): Promise<void> {
    try {
      console.log('Running periodic database cleanup of expired URLs...');
      const res = await query(
        'DELETE FROM urls WHERE expires_at IS NOT NULL AND expires_at < NOW()'
      );
      if (res.rowCount && res.rowCount > 0) {
        console.log(`Cleaned up ${res.rowCount} expired URL(s) from database`);
      }
    } catch (err) {
      console.error('Error running expired URLs cleanup:', err);
    }
  }
}
