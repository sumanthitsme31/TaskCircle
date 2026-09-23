import { Router } from 'express';
import { body, param } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireAuth, requireCircleRole } from '../middleware/auth.js';
import { handleValidation } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { generateUniqueCircleCode } from '../services/groupCode.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const circles = await pool.query(
    `SELECT c.*, m.role
     FROM circles c
     JOIN memberships m ON m.circle_id = c.id
     WHERE m.user_id = $1 AND m.status = 'ACTIVE'
     ORDER BY c.created_at DESC`,
    [req.user.id]
  );
  sendSuccess(res, circles.rows);
}));

router.post(
  '/',
  requireAuth,
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('privacy').isIn(['PUBLIC', 'PRIVATE']),
  handleValidation,
  asyncHandler(async (req, res) => {
    const code = await generateUniqueCircleCode();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query(
        `INSERT INTO circles (name, description, code, privacy, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.body.name, req.body.description || null, code, req.body.privacy, req.user.id]
      );
      await client.query(
        `INSERT INTO memberships (circle_id, user_id, role, status)
         VALUES ($1, $2, 'ADMIN', 'ACTIVE')`,
        [created.rows[0].id, req.user.id]
      );
      await client.query('COMMIT');
      sendSuccess(res, created.rows[0], 'Circle created', 201);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get('/:circleId', requireAuth, param('circleId').isInt(), handleValidation, asyncHandler(async (req, res) => {
  const circle = await pool.query('SELECT * FROM circles WHERE id = $1', [req.params.circleId]);
  if (!circle.rowCount) {
    throw new AppError('Circle not found', 404);
  }

  const membership = await pool.query(
    'SELECT role FROM memberships WHERE circle_id = $1 AND user_id = $2 AND status = $3',
    [req.params.circleId, req.user.id, 'ACTIVE']
  );

  if (!membership.rowCount) {
    throw new AppError('Access denied', 403);
  }

  sendSuccess(res, { ...circle.rows[0], role: membership.rows[0].role });
}));

router.post(
  '/join',
  requireAuth,
  body('code').isString().trim().isLength({ min: 8, max: 8 }),
  handleValidation,
  asyncHandler(async (req, res) => {
    const circleResult = await pool.query('SELECT * FROM circles WHERE code = UPPER($1)', [req.body.code]);
    if (!circleResult.rowCount) {
      throw new AppError('Invalid circle code', 404);
    }

    const circle = circleResult.rows[0];
    const existingMembership = await pool.query(
      'SELECT * FROM memberships WHERE circle_id = $1 AND user_id = $2',
      [circle.id, req.user.id]
    );

    if (existingMembership.rowCount) {
      throw new AppError('Already part of this circle', 409);
    }

    if (circle.privacy === 'PUBLIC') {
      await pool.query(
        "INSERT INTO memberships (circle_id, user_id, role, status) VALUES ($1, $2, 'MEMBER', 'ACTIVE')",
        [circle.id, req.user.id]
      );
      return sendSuccess(res, { circleId: circle.id, status: 'ACTIVE' }, 'Joined circle');
    }

    await pool.query(
      `INSERT INTO join_requests (circle_id, user_id, status)
       VALUES ($1, $2, 'PENDING')
       ON CONFLICT (circle_id, user_id) DO UPDATE SET status = 'PENDING', updated_at = NOW()`,
      [circle.id, req.user.id]
    );
    return sendSuccess(res, { circleId: circle.id, status: 'PENDING' }, 'Join request submitted');
  })
);

router.get('/:circleId/members', requireAuth, param('circleId').isInt(), handleValidation, requireCircleRole(), asyncHandler(async (req, res) => {
  const members = await pool.query(
    `SELECT m.id, m.role, m.status, u.id AS user_id, u.name, u.email, u.avatar_url
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.circle_id = $1
     ORDER BY m.created_at`,
    [req.params.circleId]
  );
  sendSuccess(res, members.rows);
}));

router.patch(
  '/:circleId/members/:membershipId',
  requireAuth,
  requireCircleRole(['ADMIN', 'MODERATOR']),
  body('role').isIn(['ADMIN', 'MODERATOR', 'MEMBER']),
  handleValidation,
  asyncHandler(async (req, res) => {
    const updated = await pool.query(
      `UPDATE memberships
       SET role = $1, updated_at = NOW()
       WHERE id = $2 AND circle_id = $3
       RETURNING id, role, user_id`,
      [req.body.role, req.params.membershipId, req.params.circleId]
    );
    if (!updated.rowCount) {
      throw new AppError('Membership not found', 404);
    }
    sendSuccess(res, updated.rows[0], 'Member role updated');
  })
);

router.delete('/:circleId/members/:membershipId', requireAuth, requireCircleRole(['ADMIN', 'MODERATOR']), asyncHandler(async (req, res) => {
  const removed = await pool.query(
    `UPDATE memberships
     SET status = 'REMOVED', updated_at = NOW()
     WHERE id = $1 AND circle_id = $2
     RETURNING id`,
    [req.params.membershipId, req.params.circleId]
  );

  if (!removed.rowCount) {
    throw new AppError('Membership not found', 404);
  }
  sendSuccess(res, null, 'Member removed');
}));

router.get('/:circleId/join-requests', requireAuth, requireCircleRole(['ADMIN', 'MODERATOR']), asyncHandler(async (req, res) => {
  const requests = await pool.query(
    `SELECT jr.id, jr.status, jr.created_at, u.id AS user_id, u.name, u.email
     FROM join_requests jr
     JOIN users u ON u.id = jr.user_id
     WHERE jr.circle_id = $1 AND jr.status = 'PENDING'
     ORDER BY jr.created_at`,
    [req.params.circleId]
  );
  sendSuccess(res, requests.rows);
}));

router.patch(
  '/:circleId/join-requests/:requestId',
  requireAuth,
  requireCircleRole(['ADMIN', 'MODERATOR']),
  body('status').isIn(['APPROVED', 'REJECTED']),
  handleValidation,
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const request = await client.query(
        `UPDATE join_requests
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND circle_id = $3
         RETURNING *`,
        [req.body.status, req.params.requestId, req.params.circleId]
      );

      if (!request.rowCount) {
        throw new AppError('Join request not found', 404);
      }

      if (req.body.status === 'APPROVED') {
        await client.query(
          `INSERT INTO memberships (circle_id, user_id, role, status)
           VALUES ($1, $2, 'MEMBER', 'ACTIVE')
           ON CONFLICT (circle_id, user_id)
           DO UPDATE SET status = 'ACTIVE', role = 'MEMBER', updated_at = NOW()`,
          [req.params.circleId, request.rows[0].user_id]
        );
      }

      await client.query('COMMIT');
      sendSuccess(res, request.rows[0], 'Join request updated');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get('/:circleId/tasks', requireAuth, requireCircleRole(), asyncHandler(async (req, res) => {
  const tasks = await pool.query(
    `SELECT t.*, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.circle_id = $1
     ORDER BY t.created_at DESC`,
    [req.params.circleId]
  );
  sendSuccess(res, tasks.rows);
}));

router.post(
  '/:circleId/tasks',
  requireAuth,
  requireCircleRole(['ADMIN', 'MODERATOR']),
  body('title').isString().trim().isLength({ min: 2, max: 200 }),
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'COMPLETED']),
  body('assigned_to').optional().isInt(),
  handleValidation,
  asyncHandler(async (req, res) => {
    const created = await pool.query(
      `INSERT INTO tasks (circle_id, title, description, priority, status, assigned_to, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.params.circleId,
        req.body.title,
        req.body.description || null,
        req.body.priority,
        req.body.status || 'TODO',
        req.body.assigned_to || null,
        req.body.due_date || null,
        req.user.id
      ]
    );

    if (req.body.assigned_to) {
      await pool.query(
        `INSERT INTO notifications (user_id, task_id, circle_id, type, message)
         VALUES ($1, $2, $3, 'NEW_TASK', $4)`,
        [req.body.assigned_to, created.rows[0].id, req.params.circleId, `New task assigned: ${req.body.title}`]
      );
    }

    sendSuccess(res, created.rows[0], 'Task created', 201);
  })
);

router.post(
  '/:circleId/tasks/assign-all',
  requireAuth,
  requireCircleRole(['ADMIN', 'MODERATOR']),
  body('title').isString().trim().isLength({ min: 2, max: 200 }),
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH']),
  handleValidation,
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const members = await client.query(
        `SELECT user_id
         FROM memberships
         WHERE circle_id = $1 AND status = 'ACTIVE'`,
        [req.params.circleId]
      );

      const createdTasks = [];
      for (const member of members.rows) {
        const task = await client.query(
          `INSERT INTO tasks (circle_id, title, description, priority, status, assigned_to, due_date, created_by)
           VALUES ($1, $2, $3, $4, 'TODO', $5, $6, $7)
           RETURNING id, assigned_to`,
          [req.params.circleId, req.body.title, req.body.description || null, req.body.priority, member.user_id, req.body.due_date || null, req.user.id]
        );

        createdTasks.push(task.rows[0]);

        await client.query(
          `INSERT INTO notifications (user_id, task_id, circle_id, type, message)
           VALUES ($1, $2, $3, 'NEW_TASK', $4)`,
          [member.user_id, task.rows[0].id, req.params.circleId, `New task assigned: ${req.body.title}`]
        );
      }

      await client.query('COMMIT');
      sendSuccess(res, { count: createdTasks.length }, 'Tasks assigned to all members', 201);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

export default router;
