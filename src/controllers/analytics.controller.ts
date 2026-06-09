import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/:shortCode
   * Returns analytics summary for a shortened URL.
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shortCode } = req.params;
      
      const stats = await AnalyticsService.getAnalytics(shortCode);
      
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  }
}
