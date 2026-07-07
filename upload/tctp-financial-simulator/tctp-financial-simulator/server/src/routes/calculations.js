const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── All routes protected ─────────────────────────────────────
router.use(auth);

// ── Helper functions ─────────────────────────────────────────

function num(val) {
  return Number(val) || 0;
}

function round2(val) {
  return Math.round(val * 100) / 100;
}

/**
 * Get the monthly cost for a single cost item row.
 * hourly: rate * plannedHours
 * monthly: rate
 */
function getRowMonthlyCost(row) {
  if (row.rate_basis === 'hourly') {
    return num(row.rate) * num(row.planned_hours);
  }
  return num(row.rate);
}

/**
 * Compute the total cost for a cost item over the project duration.
 * monthly: monthlyCost * qty * duration
 * onetime: rate * qty
 * perunit: 0 (counted separately at point of sale)
 */
function computeRowTotal(row, duration) {
  if (row.cost_type === 'monthly') {
    return getRowMonthlyCost(row) * num(row.quantity) * duration;
  }
  if (row.cost_type === 'onetime') {
    return num(row.rate) * num(row.quantity);
  }
  // perunit
  return 0;
}

/**
 * Compute aggregated category totals.
 */
function computeCategoryTotals(items, duration) {
  const categories = ['labour', 'infra', 'apis', 'llm', 'overhead'];
  const totals = {};

  for (const cat of categories) {
    const rows = items.filter(i => i.category === cat);
    let monthly = 0;
    let onetime = 0;
    let perunit = 0;

    for (const row of rows) {
      const mc = getRowMonthlyCost(row);
      if (row.cost_type === 'monthly') {
        monthly += mc * num(row.quantity);
      } else if (row.cost_type === 'onetime') {
        onetime += num(row.rate) * num(row.quantity);
      } else {
        perunit += num(row.rate) * num(row.quantity);
      }
    }

    totals[cat] = {
      monthly: round2(monthly),
      onetime: round2(onetime),
      perunit: round2(perunit),
      total: round2(monthly * duration + onetime),
    };
  }

  return totals;
}

/**
 * Fetch project, cost items, and time logs for a given project.
 */
async function fetchProjectData(projectId, userId) {
  const [projects] = await db.execute(
    'SELECT * FROM projects WHERE id = ? AND user_id = ? AND is_active = 1',
    [projectId, userId]
  );
  if (projects.length === 0) return null;
  const project = projects[0];

  const [costItems] = await db.execute(
    'SELECT * FROM cost_items WHERE project_id = ? ORDER BY sort_order ASC, id ASC',
    [projectId]
  );

  const [timeLogs] = await db.execute(
    'SELECT * FROM time_logs WHERE cost_item_id IN (SELECT id FROM cost_items WHERE project_id = ?)',
    [projectId]
  );

  // Index time logs by cost_item_id + month
  const timeMap = {};
  for (const tl of timeLogs) {
    const key = `${tl.cost_item_id}_${tl.month}`;
    timeMap[key] = tl;
  }

  return { project, costItems, timeMap };
}

// ── GET /:projectId/summary ──────────────────────────────────
router.get('/:projectId/summary', async (req, res, next) => {
  try {
    const data = await fetchProjectData(req.params.projectId, req.user.id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    const { project, costItems } = data;
    const duration = num(project.duration);
    const volume = num(project.target_volume);
    const margin = num(project.target_margin);
    const buffer = num(project.cost_buffer);

    // 1. Category totals
    const catTotals = computeCategoryTotals(costItems, duration);

    // 2. Grand totals
    let totalMonthly = 0;
    let totalOnetime = 0;
    let totalPerunit = 0;
    for (const cat of Object.values(catTotals)) {
      totalMonthly += cat.monthly;
      totalOnetime += cat.onetime;
      totalPerunit += cat.perunit;
    }
    const totalProject = round2(totalMonthly * duration + totalOnetime);

    // 3. Pricing
    // cpuFixed = total project fixed cost spread across target volume
    const cpuFixed = round2(totalProject / Math.max(volume, 1));
    const costPerUnit = round2(totalPerunit + cpuFixed);
    const derivedPrice = costPerUnit > 0 ? round2(costPerUnit / (1 - margin / 100)) : 0;
    const sellingPrice = project.selling_price != null ? num(project.selling_price) : derivedPrice;
    const grossMarginPct = round2((sellingPrice - costPerUnit) / Math.max(sellingPrice, 0.01) * 100);

    // 4. Break-even
    const contribPerUnit = round2(sellingPrice - costPerUnit);
    const beUnits = contribPerUnit > 0 ? round2(totalProject / contribPerUnit) : Infinity;
    const beRevenue = round2(beUnits * sellingPrice);

    // 5. Revenue & Profit
    const targetRevenue = round2(volume * sellingPrice);
    const netProfit = round2(targetRevenue - totalProject - totalPerunit * volume);
    const monthlyRevenue = round2(targetRevenue / Math.max(num(project.sales_period), 1));
    const monthlyNet = round2(netProfit / Math.max(num(project.sales_period), 1));
    const paybackMonths = monthlyRevenue > 0 ? round2(totalProject / monthlyRevenue) : Infinity;
    const roi = totalProject > 0 ? round2((netProfit / totalProject) * 100) : 0;

    // 6. Churned units
    const churnedUnits = round2(volume * (num(project.churn_rate) / 100));

    res.json({
      categoryTotals: catTotals,
      totalMonthly: round2(totalMonthly),
      totalOnetime: round2(totalOnetime),
      totalPerunit: round2(totalPerunit),
      totalProject,
      pricing: {
        cpuFixed,
        costPerUnit,
        derivedPrice,
        sellingPrice,
        grossMarginPct,
      },
      breakeven: {
        contribPerUnit,
        beUnits,
        beRevenue,
      },
      revenue: {
        targetRevenue,
        netProfit,
        monthlyRevenue,
        monthlyNet,
        paybackMonths,
        roi,
      },
      churnedUnits,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:projectId/evm ──────────────────────────────────────
router.get('/:projectId/evm', async (req, res, next) => {
  try {
    const data = await fetchProjectData(req.params.projectId, req.user.id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    const { project, costItems, timeMap } = data;
    const currentMonth = num(project.current_month);
    const duration = num(project.duration);
    const stdHours = 160; // standard hours per month if not specified

    // Only labour items for EVM
    const labourItems = costItems.filter(i => i.category === 'labour');

    // Accumulators
    let totalPV = 0;
    let totalEV = 0;
    let totalAC = 0;

    const resourceBreakdown = [];
    const trendData = [];

    // Cumulative arrays for trend
    const cumPlannedByMonth = new Array(duration + 1).fill(0);
    const cumActualByMonth = new Array(duration + 1).fill(0);

    for (const row of labourItems) {
      const monthlyCost = getRowMonthlyCost(row);
      const qty = num(row.quantity);
      const plannedHoursThisMonth = row.rate_basis === 'hourly' ? num(row.planned_hours) : stdHours;
      const impliedRate = plannedHoursThisMonth > 0 ? monthlyCost / plannedHoursThisMonth : 0;

      let resourcePV = 0;
      let resourceEV = 0;
      let resourceAC = 0;
      let planHoursToDate = 0;
      let actualHoursToDate = 0;

      for (let m = 1; m <= duration; m++) {
        // PV is the planned cost for ALL months up to duration (budgeted cost of work scheduled)
        if (m <= currentMonth) {
          resourcePV += monthlyCost * qty;
        }

        const isPast = m <= currentMonth;
        let actualHrs = 0;

        if (isPast) {
          planHoursToDate += plannedHoursThisMonth * qty;

          const tlKey = `${row.id}_${m}`;
          const tl = timeMap[tlKey];
          actualHrs = tl ? num(tl.actual_hours) : 0;
          actualHoursToDate += actualHrs;

          const pctComplete = plannedHoursThisMonth > 0 ? Math.min(actualHrs / (plannedHoursThisMonth * qty), 1.0) : 1.0;
          resourceEV += monthlyCost * qty * pctComplete;
          resourceAC += impliedRate * actualHrs * qty;
        }

        // Trend tracking
        if (m <= currentMonth) {
          cumPlannedByMonth[m] += plannedHoursThisMonth * qty;
          cumActualByMonth[m] += (isPast ? actualHrs : 0) + (m > 1 ? cumActualByMonth[m - 1] : 0);
        }
      }

      totalPV += resourcePV;
      totalEV += resourceEV;
      totalAC += resourceAC;

      const variance = round2(resourceAC - resourceEV);
      let status = 'good';
      if (variance > resourceEV * 0.15) status = 'bad';
      else if (variance > resourceEV * 0.05) status = 'warn';

      resourceBreakdown.push({
        costItemId: row.id,
        description: row.description,
        planHoursToDate: round2(planHoursToDate),
        actualHoursToDate: round2(actualHoursToDate),
        plannedCost: round2(resourcePV),
        actualCost: round2(resourceAC),
        variance,
        status,
      });
    }

    // Build trend data
    for (let m = 1; m <= currentMonth && m <= duration; m++) {
      trendData.push({
        month: m,
        cumPlanned: round2(cumPlannedByMonth[m]),
        cumActual: round2(cumActualByMonth[m]),
      });
    }

    // EVM metrics
    const cpi = totalAC > 0 ? round2(totalEV / totalAC) : 0;
    const spi = totalPV > 0 ? round2(totalEV / totalPV) : 0;
    const cv = round2(totalEV - totalAC);
    const sv = round2(totalEV - totalPV);
    const eac = cpi > 0 ? round2(totalPV / cpi) : Infinity;
    const vac = round2(totalPV - eac);
    const remainingBudget = Math.max(totalPV - totalEV, 0);
    const tcpi = totalAC < totalPV ? round2(remainingBudget / (totalPV - totalAC)) : 0;

    res.json({
      pv: round2(totalPV),
      ev: round2(totalEV),
      ac: round2(totalAC),
      cpi,
      spi,
      cv,
      sv,
      eac: eac === Infinity ? null : eac,
      vac,
      tcpi,
      resources: resourceBreakdown,
      trend: trendData,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:projectId/sensitivity ──────────────────────────────
router.get('/:projectId/sensitivity', async (req, res, next) => {
  try {
    const data = await fetchProjectData(req.params.projectId, req.user.id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    const { project, costItems } = data;
    const duration = num(project.duration);
    const baseVolume = num(project.target_volume);
    const margin = num(project.target_margin);
    const minROI = num(project.min_roi);
    const maxPayback = num(project.max_payback);
    const minMargin = num(project.min_margin);
    const salesPeriod = num(project.sales_period);

    // Base cost totals
    const catTotals = computeCategoryTotals(costItems, duration);
    let totalMonthlyCost = 0;
    let totalOnetimeCost = 0;
    let totalPerunitCost = 0;
    for (const cat of Object.values(catTotals)) {
      totalMonthlyCost += cat.monthly;
      totalOnetimeCost += cat.onetime;
      totalPerunitCost += cat.perunit;
    }
    const totalFixedCost = totalMonthlyCost * duration + totalOnetimeCost;

    function computeScenario(volumeMultiplier) {
      const vol = round2(baseVolume * (1 + volumeMultiplier));
      const cpuFixed = round2(totalFixedCost / Math.max(vol, 1));
      const costPU = round2(totalPerunitCost + cpuFixed);
      const derivedP = costPU > 0 ? round2(costPU / (1 - margin / 100)) : 0;
      const sellP = project.selling_price != null ? num(project.selling_price) : derivedP;
      const marginPct = round2((sellP - costPU) / Math.max(sellP, 0.01) * 100);
      const contrib = round2(sellP - costPU);

      const revenue = round2(vol * sellP);
      const profit = round2(revenue - totalFixedCost - totalPerunitCost * vol);
      const roiVal = totalFixedCost > 0 ? round2((profit / totalFixedCost) * 100) : 0;
      const mRev = round2(revenue / Math.max(salesPeriod, 1));
      const payback = mRev > 0 ? round2(totalFixedCost / mRev) : Infinity;

      let verdict = 'caution';
      if (roiVal >= minROI && payback <= maxPayback && marginPct >= minMargin) {
        verdict = 'go';
      } else if (roiVal < 0 || payback > maxPayback * 1.5 || marginPct < 0) {
        verdict = 'nogo';
      }

      return {
        label: volumeMultiplier === 0 ? 'Base' : `${volumeMultiplier > 0 ? '+' : ''}${Math.round(volumeMultiplier * 100)}%`,
        volume: vol,
        volumeMultiplier: round2(volumeMultiplier * 100),
        revenue,
        profit,
        roi: roiVal,
        payback: payback === Infinity ? null : payback,
        marginPct,
        costPerUnit: costPU,
        sellingPrice: sellP,
        verdict,
      };
    }

    const multipliers = [-0.4, -0.2, 0, 0.2, 0.4];
    const scenarios = multipliers.map(computeScenario);

    res.json({ scenarios });
  } catch (err) {
    next(err);
  }
});

// ── GET /:projectId/cashflow ─────────────────────────────────
router.get('/:projectId/cashflow', async (req, res, next) => {
  try {
    const data = await fetchProjectData(req.params.projectId, req.user.id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    const { project, costItems } = data;
    const duration = num(project.duration);
    const volume = num(project.target_volume);
    const salesPeriod = num(project.sales_period);
    const growthRate = num(project.growth_rate) / 100;
    const margin = num(project.target_margin);

    // Compute cost totals
    const catTotals = computeCategoryTotals(costItems, duration);
    let totalMonthlyCost = 0;
    let totalOnetimeCost = 0;
    let totalPerunitCost = 0;
    for (const cat of Object.values(catTotals)) {
      totalMonthlyCost += cat.monthly;
      totalOnetimeCost += cat.onetime;
      totalPerunitCost += cat.perunit;
    }

    // Per-unit pricing
    const totalFixedCost = round2(totalMonthlyCost * duration + totalOnetimeCost);
    const cpuFixed = round2(totalFixedCost / Math.max(volume, 1));
    const costPerUnit = round2(totalPerunitCost + cpuFixed);
    const derivedPrice = costPerUnit > 0 ? round2(costPerUnit / (1 - margin / 100)) : 0;
    const sellingPrice = project.selling_price != null ? num(project.selling_price) : derivedPrice;

    // Monthly unit sales after launch (linearly over sales_period, then 0)
    const monthlyBaseUnits = volume / Math.max(salesPeriod, 1);

    const cashflow = [];
    let cumulative = 0;
    let beMonth = null;

    for (let m = 1; m <= 24; m++) {
      let inflow = 0;
      let outflow = 0;

      if (m <= duration) {
        // Development phase: costs only
        outflow = totalMonthlyCost;
        // Spread onetime costs evenly over duration
        if (m === 1) outflow += totalOnetimeCost;
      } else {
        // Revenue phase
        const revMonth = m - duration; // months into revenue phase
        const growthFactor = Math.pow(1 + growthRate, revMonth - 1);
        const unitsThisMonth = round2(monthlyBaseUnits * Math.min(growthFactor, 5)); // cap growth at 5x
        inflow = round2(unitsThisMonth * sellingPrice);
        outflow = round2(unitsThisMonth * totalPerunitCost);
      }

      const net = round2(inflow - outflow);
      cumulative = round2(cumulative + net);

      if (beMonth === null && cumulative >= 0 && m > 1) {
        beMonth = m;
      }

      cashflow.push({
        month: m,
        phase: m <= duration ? 'development' : 'revenue',
        inflow,
        outflow,
        net,
        cumulative,
      });
    }

    res.json({
      cashflow,
      breakEvenMonth: beMonth,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:projectId/waterfall ────────────────────────────────
router.get('/:projectId/waterfall', async (req, res, next) => {
  try {
    const data = await fetchProjectData(req.params.projectId, req.user.id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    const { project, costItems } = data;
    const duration = num(project.duration);

    const catTotals = computeCategoryTotals(costItems, duration);

    const labels = ['Labour', 'Infrastructure', 'APIs & Services', 'LLM Costs', 'Overhead'];
    const keys = ['labour', 'infra', 'apis', 'llm', 'overhead'];

    const waterfall = [];
    let running = 0;

    for (let i = 0; i < keys.length; i++) {
      const value = catTotals[keys[i]].total;
      running += value;
      waterfall.push({
        label: labels[i],
        value,
        running: round2(running),
      });
    }

    res.json({
      waterfall,
      totalCost: round2(running),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;