import { AnalyticsWorker } from './analytics.worker';

const worker = new AnalyticsWorker();

// Start worker
worker.start();

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down worker gracefully...');
  worker.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
