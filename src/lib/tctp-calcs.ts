import type {
  CostItem, ProjectSettings, CatTotals, CategoryTotals,
  FinancialSummary, EVMMetrics, EVMResource,
  SensitivityScenario, CashflowData, WaterfallItem,
} from './tctp-types';

export function getRowMonthlyCost(item: CostItem): number {
  if (item.rateBasis === 'hourly') {
    return item.rate * item.plannedHours;
  }
  if (item.costType === 'monthly') {
    return item.rate;
  }
  return 0;
}

export function computeRowTotal(item: CostItem, duration: number): number {
  if (item.costType === 'monthly') {
    const mc = item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate;
    return mc * item.quantity * duration;
  }
  if (item.costType === 'onetime') {
    return item.rate * item.quantity;
  }
  return 0; // perunit
}

export function computeCategoryTotals(
  items: Record<string, CostItem[]>,
  duration: number,
  costBuffer = 0
): CategoryTotals {
  const bufferMultiplier = 1 + Math.max(costBuffer, 0) / 100;
  const result: CategoryTotals = {};
  for (const [cat, catItems] of Object.entries(items)) {
    const t: CatTotals = { monthly: 0, onetime: 0, perunit: 0, total: 0 };
    for (const item of catItems) {
      if (item.costType === 'monthly') {
        const mc = item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate;
        t.monthly += mc * item.quantity;
      } else if (item.costType === 'onetime') {
        t.onetime += item.rate * item.quantity;
      } else {
        t.perunit += item.rate * item.quantity;
      }
    }
    t.monthly *= bufferMultiplier;
    t.onetime *= bufferMultiplier;
    t.total = t.monthly * duration + t.onetime;
    result[cat] = t;
  }
  return result;
}

export function computePricing(
  totals: CategoryTotals,
  project: ProjectSettings
) {
  let totalMonthly = 0;
  let totalOnetime = 0;
  let totalPerunit = 0;
  for (const cat of Object.values(totals)) {
    totalMonthly += cat.monthly;
    totalOnetime += cat.onetime;
    totalPerunit += cat.perunit;
  }
  const totalProject = totalMonthly * project.duration + totalOnetime;
  const volume = Math.max(project.targetVolume, 1);
  const cpuFixed = totalProject / volume;
  const costPerUnit = cpuFixed + totalPerunit;
  const marginFrac = project.targetMargin / 100;
  const derivedPrice = (marginFrac < 1 && costPerUnit > 0) ? costPerUnit / (1 - marginFrac) : costPerUnit * 10;
  const sellingPrice = project.sellingPriceOverride > 0 ? project.sellingPriceOverride : derivedPrice;
  const grossMarginPct = sellingPrice > 0 ? ((sellingPrice - costPerUnit) / sellingPrice) * 100 : 0;
  return { cpuFixed, costPerUnit, derivedPrice, sellingPrice, grossMarginPct };
}

export function computeBreakeven(
  totals: CategoryTotals,
  project: ProjectSettings,
  sellingPrice: number
) {
  let totalPerunit = 0;
  let totalMonthly = 0;
  let totalOnetime = 0;
  for (const cat of Object.values(totals)) {
    totalPerunit += cat.perunit;
    totalMonthly += cat.monthly;
    totalOnetime += cat.onetime;
  }
  const totalProject = totalMonthly * project.duration + totalOnetime;
  const contribPerUnit = sellingPrice - totalPerunit;
  const beUnits = (contribPerUnit > 0) ? totalProject / contribPerUnit : Infinity;
  const beRevenue = beUnits * sellingPrice;
  return { beUnits, beRevenue };
}

export function computeRevenue(
  totals: CategoryTotals,
  project: ProjectSettings,
  pricing: { sellingPrice: number; costPerUnit: number }
) {
  let totalPerunit = 0;
  let totalMonthly = 0;
  let totalOnetime = 0;
  for (const cat of Object.values(totals)) {
    totalPerunit += cat.perunit;
    totalMonthly += cat.monthly;
    totalOnetime += cat.onetime;
  }
  const totalProject = totalMonthly * project.duration + totalOnetime;
  const targetRevenue = pricing.sellingPrice * project.targetVolume;
  const totalVariableCost = totalPerunit * project.targetVolume;
  const netProfit = targetRevenue - totalProject - totalVariableCost;
  const monthlyRevenue = project.salesPeriod > 0 ? (pricing.sellingPrice * project.targetVolume) / project.salesPeriod : 0;
  const monthlyNet = monthlyRevenue - totalMonthly;
  const paybackMonths = (monthlyNet > 0 && totalOnetime > 0) ? totalOnetime / monthlyNet : 0;
  const roi = totalProject > 0 ? (netProfit / totalProject) * 100 : 0;
  const churnedUnits = project.targetVolume * (project.churnRate / 100) * 12;
  return { targetRevenue, netProfit, monthlyRevenue, monthlyNet, paybackMonths, roi, churnedUnits };
}

export function computeEVM(
  items: Record<string, CostItem[]>,
  actualHours: Record<string, Record<number, number>>,
  project: ProjectSettings
): EVMMetrics | null {
  const labourItems = items['labour'] ?? [];
  if (labourItems.length === 0 || project.currentMonth <= 0) return null;

  let totalPV = 0;
  let totalEV = 0;
  let totalAC = 0;
  let BAC = 0;

  const perResource: EVMResource[] = [];

  for (const item of labourItems) {
    const monthlyCost = item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate;
    const rowPV = monthlyCost * item.quantity * project.currentMonth;
    const rowBAC = monthlyCost * item.quantity * project.duration;

    let totalActualHrs = 0;
    for (let m = 1; m <= project.currentMonth && m <= project.duration; m++) {
      totalActualHrs += actualHours[item.id]?.[m] ?? 0;
    }

    const plannedHrsToDate = item.plannedHours * project.currentMonth;
    const ratio = plannedHrsToDate > 0 ? Math.min(totalActualHrs / plannedHrsToDate, 1.0) : 0;
    const rowEV = ratio * rowBAC;

    const impliedRate = item.rateBasis === 'hourly' ? item.rate : item.rate / project.standardHours;
    const rowAC = impliedRate * totalActualHrs * item.quantity;

    totalPV += rowPV;
    totalEV += rowEV;
    totalAC += rowAC;
    BAC += rowBAC;

    const variance = rowEV - rowAC;
    let status: 'good' | 'warn' | 'bad' = 'good';
    if (variance < 0) {
      const pct = rowAC > 0 ? Math.abs(variance) / rowAC : 0;
      status = pct > 0.1 ? 'bad' : 'warn';
    }

    perResource.push({
      id: item.id,
      description: item.description,
      planHoursToDate: plannedHrsToDate,
      actualHoursToDate: totalActualHrs,
      plannedCost: rowPV,
      actualCost: rowAC,
      earnedValue: rowEV,
      variance,
      status,
    });
  }

  const CPI = totalAC > 0 ? totalEV / totalAC : 1;
  const SPI = totalPV > 0 ? totalEV / totalPV : 1;
  const CV = totalEV - totalAC;
  const SV = totalEV - totalPV;
  const EAC = CPI > 0 ? totalAC + (BAC - totalEV) / CPI : BAC;
  const VAC = BAC - EAC;
  const ETC = EAC - totalAC;

  const trend: { month: number; cumPlanned: number; cumActual: number | null }[] = [];
  let cumP = 0;
  let cumA = 0;
  for (let m = 1; m <= project.duration; m++) {
    let monthPlanned = 0;
    for (const item of labourItems) {
      const mc = item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate;
      monthPlanned += mc * item.quantity;
    }
    cumP += monthPlanned;

    if (m <= project.currentMonth) {
      let monthActual = 0;
      for (const item of labourItems) {
        const hrs = actualHours[item.id]?.[m] ?? 0;
        const rate = item.rateBasis === 'hourly' ? item.rate : item.rate / project.standardHours;
        monthActual += hrs * rate * item.quantity;
      }
      cumA += monthActual;
      trend.push({ month: m, cumPlanned: cumP, cumActual: cumA });
    } else {
      trend.push({ month: m, cumPlanned: cumP, cumActual: null });
    }
  }

  return { PV: totalPV, EV: totalEV, AC: totalAC, CPI, SPI, CV, SV, EAC, VAC, BAC, ETC, currentMonth: project.currentMonth, duration: project.duration, perResource, trend };
}

export function computeSensitivity(
  project: ProjectSettings,
  pricing: { sellingPrice: number; costPerUnit: number },
  totals: CategoryTotals
): SensitivityScenario[] {
  let totalMonthly = 0;
  let totalOnetime = 0;
  let totalPerunit = 0;
  for (const cat of Object.values(totals)) {
    totalMonthly += cat.monthly;
    totalOnetime += cat.onetime;
    totalPerunit += cat.perunit;
  }
  const totalProject = totalMonthly * project.duration + totalOnetime;

  const pcts = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const labels = ['-40%', '-30%', '-20%', '-10%', 'Base', '+10%', '+20%', '+30%', '+40%'];

  return pcts.map((pct, i) => {
    const volume = Math.max(1, Math.round(project.targetVolume * (1 + pct / 100)));
    const revenue = volume * pricing.sellingPrice;
    const totalCost = totalProject + totalPerunit * volume;
    const profit = revenue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const monthlyNet = (project.salesPeriod > 0) ? (profit / project.salesPeriod) : profit;
    const payback = (monthlyNet > 0 && totalOnetime > 0) ? totalOnetime / monthlyNet : 999;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    const passROI = roi >= project.minROI;
    const passPayback = payback <= project.maxPayback;
    const passMargin = marginPct >= project.minMargin;
    const failCount = [passROI, passPayback, passMargin].filter(Boolean).length;

    let verdict: 'go' | 'caution' | 'nogo' = 'nogo';
    if (failCount === 3) verdict = 'go';
    else if (failCount >= 2) verdict = 'caution';

    return { label: labels[i], volumePct: pct, volume, revenue, profit, roi, payback, marginPct, verdict };
  });
}

export function computeCashflow(
  project: ProjectSettings,
  pricing: { sellingPrice: number; costPerUnit: number },
  totals: CategoryTotals
): CashflowData {
  let totalMonthly = 0;
  let totalOnetime = 0;
  let totalPerunit = 0;
  for (const cat of Object.values(totals)) {
    totalMonthly += cat.monthly;
    totalOnetime += cat.onetime;
    totalPerunit += cat.perunit;
  }

  const monthlyRevenue = project.salesPeriod > 0 ? (pricing.sellingPrice * project.targetVolume) / project.salesPeriod : 0;
  const months: CashflowData['months'] = [];
  let cumulative = 0;
  let breakEvenMonth: number | null = null;

  for (let m = 1; m <= 24; m++) {
    let inflow = 0;
    let outflow = 0;

    if (m <= project.duration) {
      outflow = totalMonthly + (totalOnetime / project.duration);
      // Partial revenue during development if past halfway
      if (m > project.duration * 0.7) {
        inflow = monthlyRevenue * 0.3;
      }
    } else {
      outflow = totalMonthly;
      inflow = monthlyRevenue;
    }

    const net = inflow - outflow;
    cumulative += net;

    if (breakEvenMonth === null && cumulative >= 0) {
      breakEvenMonth = m;
    }

    months.push({ month: m, inflow, outflow, net, cumulative });
  }

  return { months, breakEvenMonth };
}

export function computeWaterfall(
  pricing: { sellingPrice: number },
  totals: CategoryTotals,
  project: ProjectSettings
): WaterfallItem[] {
  const revenue = project.targetVolume * pricing.sellingPrice;
  const items: WaterfallItem[] = [];
  let running = revenue;
  items.push({ label: 'Revenue', value: revenue, running });

  const catLabels: Record<string, string> = {
    labour: 'Labour',
    infra: 'Infrastructure',
    apis: 'APIs & Services',
    llm: 'LLM / AI',
    overhead: 'Overhead',
  };

  for (const [key, label] of Object.entries(catLabels)) {
    const cat = totals[key];
    if (!cat) continue;
    const total = cat.monthly * project.duration + cat.onetime + cat.perunit * project.targetVolume;
    running -= total;
    items.push({ label, value: -total, running });
  }

  items.push({ label: 'Net Profit', value: running, running });
  return items;
}

export interface AllComputed {
  financial: FinancialSummary;
  evm: EVMMetrics | null;
  sensitivity: SensitivityScenario[];
  cashflow: CashflowData;
  waterfall: WaterfallItem[];
}

export function computeAll(
  items: Record<string, CostItem[]>,
  actualHours: Record<string, Record<number, number>>,
  project: ProjectSettings
): AllComputed {
  const totals = computeCategoryTotals(items, project.duration, project.costBuffer);
  const pricingResult = computePricing(totals, project);
  const beResult = computeBreakeven(totals, project, pricingResult.sellingPrice);
  const revResult = computeRevenue(totals, project, pricingResult);

  let totalMonthly = 0;
  let totalOnetime = 0;
  let totalPerunit = 0;
  for (const cat of Object.values(totals)) {
    totalMonthly += cat.monthly;
    totalOnetime += cat.onetime;
    totalPerunit += cat.perunit;
  }
  const totalProject = totalMonthly * project.duration + totalOnetime;

  const financial: FinancialSummary = {
    catTotals: totals,
    totalMonthly,
    totalOnetime,
    totalPerunit,
    totalProject,
    cpuFixed: pricingResult.cpuFixed,
    costPerUnit: pricingResult.costPerUnit,
    derivedPrice: pricingResult.derivedPrice,
    sellingPrice: pricingResult.sellingPrice,
    grossMarginPct: pricingResult.grossMarginPct,
    beUnits: beResult.beUnits,
    beRevenue: beResult.beRevenue,
    targetRevenue: revResult.targetRevenue,
    netProfit: revResult.netProfit,
    monthlyRevenue: revResult.monthlyRevenue,
    monthlyNet: revResult.monthlyNet,
    paybackMonths: revResult.paybackMonths,
    roi: revResult.roi,
    churnedUnits: revResult.churnedUnits,
  };

  const evm = computeEVM(items, actualHours, project);
  const sensitivity = computeSensitivity(project, pricingResult, totals);
  const cashflow = computeCashflow(project, pricingResult, totals);
  const waterfall = computeWaterfall(pricingResult, totals, project);

  return { financial, evm, sensitivity, cashflow, waterfall };
}
