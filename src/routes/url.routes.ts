import { Router } from 'express';
import { UrlController } from '../controllers/url.controller';
import { rateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Route for shortening URLs (applies rate limiting)
router.post('/api/v1/shorten', rateLimiter, UrlController.shorten);

// Direct route for redirecting short URLs (no rate limit, hot path)
router.get('/:shortCode', UrlController.redirect);

export default router;
