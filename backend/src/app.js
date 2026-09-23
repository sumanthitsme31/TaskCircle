import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport from './config/passport.js';
import { env } from './config/env.js';
import { redisClient } from './db/redis.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import circleRoutes from './routes/circleRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import myTaskRoutes from './routes/myTaskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = env.frontendUrl.split(',').map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin denied'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 250,
  standardHeaders: 'draft-8'
}));

const sessionStore = new RedisStore({
  client: redisClient,
  prefix: 'taskcircle:'
});

app.use(session({
  store: sessionStore,
  name: 'taskcircle.sid',
  secret: env.sessionSecret,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/my-tasks', myTaskRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;
