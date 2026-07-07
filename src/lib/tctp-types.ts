export type Category = 'labour' | 'infra' | 'apis' | 'llm' | 'overhead';
export type CostType = 'monthly' | 'onetime' | 'perunit';
export type RateBasis = 'monthly' | 'hourly';
export type PageKey = 'dashboard' | 'project-setup' | 'costs' | 'time-tracking' | 'assumptions' | 'analysis' | 'evm' | 'report';

export interface CostItem {
  id: string;
  description: string;
  rate: number;
  quantity: number;
  costType: CostType;
  rateBasis: RateBasis;
  plannedHours: number;
  notes: string;
}

export interface ProjectSettings {
  name: string;
  description: string;
  duration: number;
  currency: string;
  unitLabel: string;
  currentMonth: number;
  standardHours: number;
  targetMargin: number;
  targetVolume: number;
  salesPeriod: number;
  churnRate: number;
  growthRate: number;
  costBuffer: number;
  minROI: number;
  maxPayback: number;
  minMargin: number;
  sellingPriceOverride: number;
}

export interface CatTotals { monthly: number; onetime: number; perunit: number; total: number; }
export interface CategoryTotals { [key: string]: CatTotals; }

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

export interface EVMResource {
  id: string; description: string;
  planHoursToDate: number; actualHoursToDate: number;
  plannedCost: number; actualCost: number; earnedValue: number;
  variance: number; status: 'good' | 'warn' | 'bad';
}

export interface EVMMetrics {
  PV: number; EV: number; AC: number; CPI: number; SPI: number;
  CV: number; SV: number; EAC: number; VAC: number;
  BAC: number; ETC: number;
  currentMonth: number; duration: number;
  perResource: EVMResource[];
  trend: { month: number; cumPlanned: number; cumActual: number | null }[];
}

export interface SensitivityScenario {
  label: string; volumePct: number; volume: number;
  revenue: number; profit: number; roi: number;
  payback: number; marginPct: number; verdict: 'go' | 'caution' | 'nogo';
}

export interface CashflowMonth {
  month: number; inflow: number; outflow: number; net: number; cumulative: number;
}

export interface CashflowData {
  months: CashflowMonth[];
  breakEvenMonth: number | null;
}

export interface WaterfallItem { label: string; value: number; running: number; }