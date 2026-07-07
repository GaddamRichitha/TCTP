/* ───────────────────────────── Core Entities ───────────────────────────── */

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'viewer';
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string;
  currency: string;
  unit_label: string;
  duration: number;
  target_volume: number;
  sales_period: number;
  target_margin: number;
  churn_rate: number;
  growth_rate: number;
  cost_buffer: number;
  min_roi: number;
  max_payback: number;
  min_margin: number;
  selling_price: number | null;
  current_month: number;
  is_active: number;
  cost_summary?: CostSummary;
}

/* ───────────────────────────── Cost Model ─────────────────────────────── */

export type Category = 'labour' | 'infra' | 'apis' | 'llm' | 'overhead';
export type CostType = 'monthly' | 'onetime' | 'perunit';
export type RateBasis = 'monthly' | 'hourly';

export interface CostItem {
  id: number;
  project_id: number;
  category: Category;
  description: string;
  cost_type: CostType;
  rate: number;
  quantity: number;
  rate_basis: RateBasis;
  planned_hours: number | null;
  sort_order: number;
}

export interface TimeLog {
  id: number;
  cost_item_id: number;
  month: number;
  actual_hours: number;
  notes: string;
}

export interface CostSummary {
  total_monthly: number;
  total_onetime: number;
  total_perunit: number;
  total_project: number;
}

export interface CatTotals {
  monthly: number;
  onetime: number;
  perunit: number;
  total: number;
}

export interface CategoryTotals {
  [key: string]: CatTotals;
}

/* ───────────────────────────── EVM (Earned Value) ─────────────────────── */

export interface EVMMetrics {
  PV: number;
  EV: number;
  AC: number;
  CPI: number;
  SPI: number;
  CV: number;
  SV: number;
  EAC: number;
  VAC: number;
  TCPI: number;
  currentMonth: number;
  duration: number;
  originalTotalCost: number;
  projectedTotalCost: number;
  perResource: EVMResource[];
  trend: EVMTrendPoint[];
}

export interface EVMResource {
  description: string;
  planHoursToDate: number;
  actualHoursToDate: number;
  plannedCost: number;
  actualCost: number;
  variance: number;
  status: 'good' | 'warn' | 'bad';
}

export interface EVMTrendPoint {
  month: number;
  cumPlanned: number;
  cumActual: number | null;
}

/* ───────────────────────────── Sensitivity Analysis ───────────────────── */

export interface SensitivityScenario {
  label: string;
  volumePct: number;
  volume: number;
  revenue: number;
  profit: number;
  roi: number;
  payback: number;
  marginPct: number;
  verdict: 'go' | 'caution' | 'nogo';
}

/* ───────────────────────────── Cashflow ───────────────────────────────── */

export interface CashflowMonth {
  month: number;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}

export interface CashflowData {
  months: CashflowMonth[];
  breakEvenMonth: number | null;
}

/* ───────────────────────────── Waterfall ──────────────────────────────── */

export interface WaterfallItem {
  label: string;
  value: number;
  running: number;
}

/* ───────────────────────────── Financial Summary ──────────────────────── */

export interface FinancialSummary {
  catTotals: CategoryTotals;
  totalMonthly: number;
  totalOnetime: number;
  totalPerunit: number;
  totalProject: number;
  cpuFixed: number;
  costPerUnit: number;
  derivedPrice: number;
  sellingPrice: number;
  grossMarginPct: number;
  beUnits: number;
  beRevenue: number;
  targetRevenue: number;
  netProfit: number;
  monthlyRevenue: number;
  monthlyNet: number;
  paybackMonths: number;
  roi: number;
  churnedUnits: number;
}