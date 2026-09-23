import { Router } from 'express';
import passport from '../config/passport.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failed' }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/app`);
  }
);

router.get('/failed', (_req, res) => {
  res.status(401).json({ success: false, message: 'Authentication failed' });
});

router.get('/me', requireAuth, (req, res) => {
  sendSuccess(res, req.user);
});

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  req.logout(() => {});
  req.session.destroy(() => {
    res.clearCookie('taskcircle.sid');
    sendSuccess(res, null, 'Logged out');
  });
}));

export default router;
