import { Router } from 'express';
import { body, param } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { handleValidation } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
  sendSuccess(res, result.rows[0]);
}));

router.patch(
  '/',
  requireAuth,
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  handleValidation,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, avatar_url',
      [req.body.name, req.user.id]
    );
    sendSuccess(res, result.rows[0], 'Profile updated');
  })
);

router.get('/notification-preferences', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT due_today_enabled, due_tomorrow_enabled, overdue_enabled FROM notification_preferences WHERE user_id = $1', [req.user.id]);
  sendSuccess(res, result.rows[0]);
}));

router.patch(
  '/notification-preferences',
  requireAuth,
  body('due_today_enabled').optional().isBoolean(),
  body('due_tomorrow_enabled').optional().isBoolean(),
  body('overdue_enabled').optional().isBoolean(),
  handleValidation,
  asyncHandler(async (req, res) => {
    const updates = {
      due_today_enabled: req.body.due_today_enabled,
      due_tomorrow_enabled: req.body.due_tomorrow_enabled,
      overdue_enabled: req.body.overdue_enabled
    };

    const current = await pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.id]);
    const merged = { ...current.rows[0], ...updates };

    const result = await pool.query(
      `UPDATE notification_preferences
       SET due_today_enabled = $1,
           due_tomorrow_enabled = $2,
           overdue_enabled = $3,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING due_today_enabled, due_tomorrow_enabled, overdue_enabled`,
      [merged.due_today_enabled, merged.due_tomorrow_enabled, merged.overdue_enabled, req.user.id]
    );

    sendSuccess(res, result.rows[0], 'Preferences updated');
  })
);

export default router;
