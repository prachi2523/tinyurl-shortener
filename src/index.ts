import express from 'express';
import dotenv from 'dotenv';
import urlRoutes from './routes/url.routes';
import analyticsRoutes from './routes/analytics.routes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());

// Register API & Redirection routes
app.use(urlRoutes);
app.use(analyticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`URL Shortener API running on port ${PORT}`);
});
