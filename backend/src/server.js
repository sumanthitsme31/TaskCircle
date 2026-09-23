import app from './app.js';
import { env } from './config/env.js';
import { redisClient } from './db/redis.js';
import { pool } from './db/pool.js';
import { startNotificationScheduler } from './services/notificationsScheduler.js';

const start = async () => {
  await redisClient.connect();
  await pool.query('SELECT 1');
  startNotificationScheduler();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`TaskCircle backend running on port ${env.port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
