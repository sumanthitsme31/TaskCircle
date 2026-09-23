import { Router } from 'express';
import { body, param } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { handleValidation } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler, AppError } from '../utils/errors.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const circleId = Number(req.query.circleId);
  if (Number.isNaN(circleId)) {
    throw new AppError('circleId query param is required', 400);
  }

  const membership = await pool.query(
    `SELECT 1 FROM memberships WHERE user_id = $1 AND circle_id = $2 AND status = 'ACTIVE'`,
    [req.user.id, circleId]
  );
  if (!membership.rowCount) {
    throw new AppError('Circle access denied', 403);
  }

  const tasks = await pool.query(
    `SELECT t.*, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.circle_id = $1
     ORDER BY t.created_at DESC`,
    [circleId]
  );

  sendSuccess(res, tasks.rows);
}));

router.patch(
  '/:taskId',
  requireAuth,
  param('taskId').isInt(),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'COMPLETED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('assigned_to').optional().isInt(),
  handleValidation,
  asyncHandler(async (req, res) => {
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.taskId]);
    if (!task.rowCount) {
      throw new AppError('Task not found', 404);
    }

    const membership = await pool.query(
      `SELECT role FROM memberships WHERE user_id = $1 AND circle_id = $2 AND status = 'ACTIVE'`,
      [req.user.id, task.rows[0].circle_id]
    );
    if (!membership.rowCount) {
      throw new AppError('Circle access denied', 403);
    }

    const editable = membership.rows[0].role === 'ADMIN'
      || membership.rows[0].role === 'MODERATOR'
      || task.rows[0].assigned_to === req.user.id;

    if (!editable) {
      throw new AppError('Insufficient permissions', 403);
    }

    const status = req.body.status || task.rows[0].status;
    const priority = req.body.priority || task.rows[0].priority;
    const assignedTo = req.body.assigned_to ?? task.rows[0].assigned_to;

    if (req.body.assigned_to !== undefined && assignedTo !== null) {
      const assigneeMembership = await pool.query(
        `SELECT 1
         FROM memberships
         WHERE circle_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
        [task.rows[0].circle_id, assignedTo]
      );

      if (!assigneeMembership.rowCount) {
        throw new AppError('Assigned user must be an active circle member', 422);
      }
    }

    const updated = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           status = $3,
           priority = $4,
           assigned_to = $5,
           due_date = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        req.body.title || task.rows[0].title,
        req.body.description ?? task.rows[0].description,
        status,
        priority,
        assignedTo,
        req.body.due_date ?? task.rows[0].due_date,
        req.params.taskId
      ]
    );

    sendSuccess(res, updated.rows[0], 'Task updated');
  })
);

router.delete('/:taskId', requireAuth, param('taskId').isInt(), handleValidation, asyncHandler(async (req, res) => {
  const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.taskId]);
  if (!task.rowCount) {
    throw new AppError('Task not found', 404);
  }

  const membership = await pool.query(
    `SELECT role FROM memberships WHERE user_id = $1 AND circle_id = $2 AND status = 'ACTIVE'`,
    [req.user.id, task.rows[0].circle_id]
  );
  if (!membership.rowCount || !['ADMIN', 'MODERATOR'].includes(membership.rows[0].role)) {
    throw new AppError('Insufficient permissions', 403);
  }

  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.taskId]);
  sendSuccess(res, null, 'Task deleted');
}));

export default router;
