const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── All routes protected ─────────────────────────────────────
router.use(auth);

// ── GET /:projectId — all time logs with cost item info ──────
router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
      [projectId, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const [rows] = await db.execute(
      `SELECT tl.*, ci.description AS cost_item_description, ci.category, ci.rate_basis,
              ci.planned_hours AS cost_item_planned_hours, ci.rate AS cost_item_rate
       FROM time_logs tl
       JOIN cost_items ci ON ci.id = tl.cost_item_id
       WHERE ci.project_id = ?
       ORDER BY ci.sort_order ASC, ci.id ASC, tl.month ASC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── PUT /:costItemId — upsert time log ───────────────────────
router.put('/:costItemId', async (req, res, next) => {
  try {
    const { costItemId } = req.params;
    const { month, actual_hours, notes } = req.body;

    if (!month || month < 1) {
      return res.status(400).json({ error: 'Valid month (>= 1) is required.' });
    }

    // Verify ownership through project
    const [items] = await db.execute(
      `SELECT ci.* FROM cost_items ci
       JOIN projects p ON p.id = ci.project_id
       WHERE ci.id = ? AND p.user_id = ? AND p.is_active = 1`,
      [costItemId, req.user.id]
    );
    if (items.length === 0) {
      return res.status(404).json({ error: 'Cost item not found.' });
    }

    await db.execute(
      `INSERT INTO time_logs (cost_item_id, month, actual_hours, notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE actual_hours = VALUES(actual_hours), notes = VALUES(notes)`,
      [costItemId, month, actual_hours ?? 0, notes || '']
    );

    const [rows] = await db.execute(
      'SELECT * FROM time_logs WHERE cost_item_id = ? AND month = ?',
      [costItemId, month]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:costItemId/:month — delete specific time log ────
router.delete('/:costItemId/:month', async (req, res, next) => {
  try {
    const { costItemId, month } = req.params;

    // Verify ownership through project
    const [items] = await db.execute(
      `SELECT ci.* FROM cost_items ci
       JOIN projects p ON p.id = ci.project_id
       WHERE ci.id = ? AND p.user_id = ? AND p.is_active = 1`,
      [costItemId, req.user.id]
    );
    if (items.length === 0) {
      return res.status(404).json({ error: 'Cost item not found.' });
    }

    const [result] = await db.execute(
      'DELETE FROM time_logs WHERE cost_item_id = ? AND month = ?',
      [costItemId, month]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Time log entry not found.' });
    }

    res.json({ success: true, message: 'Time log entry deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;