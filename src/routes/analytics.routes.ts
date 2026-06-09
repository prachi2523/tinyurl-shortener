import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

// Route for getting URL analytics
router.get('/api/v1/analytics/:shortCode', AnalyticsController.getStats);

export default router;
