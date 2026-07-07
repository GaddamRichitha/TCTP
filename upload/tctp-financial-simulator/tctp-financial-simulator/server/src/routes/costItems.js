const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── All routes protected ─────────────────────────────────────
router.use(auth);

// ── GET /:projectId — list cost items, optional ?category=labour
router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { category } = req.query;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
      [projectId, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    let sql = 'SELECT * FROM cost_items WHERE project_id = ?';
    const params = [projectId];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /:projectId — create cost item ──────────────────────
router.post('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { category, description, cost_type, rate, quantity, rate_basis, planned_hours, sort_order } = req.body;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT id FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
      [projectId, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const validCategories = ['labour', 'infra', 'apis', 'llm', 'overhead'];
    const validCostTypes = ['monthly', 'onetime', 'perunit'];
    const validBases = ['monthly', 'hourly'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }
    if (!validCostTypes.includes(cost_type)) {
      return res.status(400).json({ error: `Invalid cost_type. Must be one of: ${validCostTypes.join(', ')}` });
    }
    if (rate_basis && !validBases.includes(rate_basis)) {
      return res.status(400).json({ error: `Invalid rate_basis. Must be one of: ${validBases.join(', ')}` });
    }

    const [result] = await db.execute(
      `INSERT INTO cost_items (project_id, category, description, cost_type, rate, quantity, rate_basis, planned_hours, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        category || 'overhead',
        description || '',
        cost_type || 'monthly',
        rate ?? 0,
        quantity ?? 1,
        rate_basis || 'monthly',
        planned_hours ?? null,
        sort_order ?? 0,
      ]
    );

    const [created] = await db.execute('SELECT * FROM cost_items WHERE id = ?', [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id — update cost item ──────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership through project
    const [items] = await db.execute(
      `SELECT ci.* FROM cost_items ci
       JOIN projects p ON p.id = ci.project_id
       WHERE ci.id = ? AND p.user_id = ? AND p.is_active = 1`,
      [id, req.user.id]
    );
    if (items.length === 0) {
      return res.status(404).json({ error: 'Cost item not found.' });
    }

    const allowed = ['category', 'description', 'cost_type', 'rate', 'quantity', 'rate_basis', 'planned_hours', 'sort_order'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    values.push(id);
    await db.execute(
      `UPDATE cost_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await db.execute('SELECT * FROM cost_items WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — delete cost item and its time logs ─────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership through project
    const [items] = await db.execute(
      `SELECT ci.* FROM cost_items ci
       JOIN projects p ON p.id = ci.project_id
       WHERE ci.id = ? AND p.user_id = ? AND p.is_active = 1`,
      [id, req.user.id]
    );
    if (items.length === 0) {
      return res.status(404).json({ error: 'Cost item not found.' });
    }

    // time_logs cascade on delete via FK, but delete explicitly for clarity
    await db.execute('DELETE FROM time_logs WHERE cost_item_id = ?', [id]);
    await db.execute('DELETE FROM cost_items WHERE id = ?', [id]);

    res.json({ success: true, message: 'Cost item and associated time logs deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;