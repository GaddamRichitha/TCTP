const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── All routes protected ─────────────────────────────────────
router.use(auth);

// ── GET / — list all projects for user with cost summary ─────
router.get('/', async (req, res, next) => {
  try {
    const [projects] = await db.execute(
      `SELECT p.*,
              COALESCE(SUM(
                CASE
                  WHEN ci.cost_type = 'monthly' THEN
                    (CASE WHEN ci.rate_basis = 'hourly' THEN ci.rate * ci.planned_hours ELSE ci.rate END) * ci.quantity * p.duration
                  WHEN ci.cost_type = 'onetime' THEN ci.rate * ci.quantity
                  ELSE 0
                END
              ), 0) AS total_estimated_cost,
              COUNT(ci.id) AS cost_item_count
       FROM projects p
       LEFT JOIN cost_items ci ON ci.project_id = p.id
       WHERE p.user_id = ? AND p.is_active = 1
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single project with cost items & time logs ────
router.get('/:id', async (req, res, next) => {
  try {
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
      [req.params.id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    const project = projects[0];

    const [costItems] = await db.execute(
      'SELECT * FROM cost_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC',
      [project.id]
    );

    // Group cost items by category
    const grouped = {};
    const categories = ['labour', 'infra', 'apis', 'llm', 'overhead'];
    categories.forEach(c => { grouped[c] = []; });
    costItems.forEach(ci => {
      if (!grouped[ci.category]) grouped[ci.category] = [];
      grouped[ci.category].push(ci);
    });

    const [timeLogs] = await db.execute(
      'SELECT tl.*, ci.description AS cost_item_description, ci.category FROM time_logs tl JOIN cost_items ci ON ci.id = tl.cost_item_id WHERE tl.cost_item_id IN (SELECT id FROM cost_items WHERE project_id = ?)',
      [project.id]
    );

    res.json({ ...project, costItems: grouped, costItemsFlat: costItems, timeLogs });
  } catch (err) {
    next(err);
  }
});

// ── POST / — create project ──────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const [result] = await db.execute(
      `INSERT INTO projects (user_id, name, description, currency, unit_label, duration,
         target_volume, sales_period, target_margin, churn_rate, growth_rate, cost_buffer,
         min_roi, max_payback, min_margin, selling_price, current_month)
       VALUES (?, 'Untitled Project', '', '$', 'Units', 12, 500, 12, 35.00, 3.00, 10.00, 15.00, 15.00, 36, 20.00, NULL, 3)`,
      [req.user.id]
    );

    const [created] = await db.execute('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id — update project ────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
      [id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const allowed = [
      'name', 'description', 'currency', 'unit_label', 'duration', 'target_volume',
      'sales_period', 'target_margin', 'churn_rate', 'growth_rate', 'cost_buffer',
      'min_roi', 'max_payback', 'min_margin', 'selling_price', 'current_month'
    ];
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
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await db.execute('SELECT * FROM projects WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — soft delete ────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
      [req.params.id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await db.execute('UPDATE projects SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Project deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;