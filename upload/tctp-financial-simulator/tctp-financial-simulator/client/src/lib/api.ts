import type {
  User,
  Project,
  CostItem,
  TimeLog,
  FinancialSummary,
  EVMMetrics,
  SensitivityScenario,
  CashflowData,
  WaterfallItem,
  Category,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/* ------------------------------------------------------------------ */
/*  Auth                                                              */
/* ------------------------------------------------------------------ */

export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: User }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(
  username: string,
  email: string,
  password: string,
  fullName?: string,
): Promise<{ token: string; user: User }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, fullName }),
  });
}

export async function getProfile(): Promise<User> {
  return request<User>('/auth/me');
}

/* ------------------------------------------------------------------ */
/*  Projects                                                          */
/* ------------------------------------------------------------------ */

export async function createProject(
  data: Partial<Project>,
): Promise<Project> {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProjects(): Promise<Project[]> {
  return request<Project[]>('/projects');
}

export async function getProject(id: number): Promise<Project> {
  return request<Project>(`/projects/${id}`);
}

export async function updateProject(
  id: number,
  data: Partial<Project>,
): Promise<Project> {
  return request<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: number): Promise<void> {
  return request<void>(`/projects/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/*  Cost Items  (server mounted at /api/cost-items)                   */
/* ------------------------------------------------------------------ */

export async function getCostItems(
  projectId: number,
  category?: Category,
): Promise<CostItem[]> {
  const q = category ? `?category=${category}` : '';
  return request<CostItem[]>(`/cost-items/${projectId}${q}`);
}

export async function createCostItem(
  projectId: number,
  data: Partial<CostItem>,
): Promise<CostItem> {
  return request(`/cost-items/${projectId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCostItem(
  id: number,
  data: Partial<CostItem>,
): Promise<CostItem> {
  return request(`/cost-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCostItem(id: number): Promise<void> {
  return request<void>(`/cost-items/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/*  Time Logs  (server mounted at /api/time-logs)                     */
/* ------------------------------------------------------------------ */

export async function getTimeLogs(
  projectId: number,
): Promise<TimeLog[]> {
  return request<TimeLog[]>(`/time-logs/${projectId}`);
}

export async function upsertTimeLog(
  costItemId: number,
  data: { month: number; actual_hours: number; notes: string },
): Promise<TimeLog> {
  return request(`/time-logs/${costItemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTimeLog(
  costItemId: number,
  month: number,
): Promise<void> {
  return request<void>(
    `/time-logs/${costItemId}/${month}`,
    { method: 'DELETE' },
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics / Calculations  (server mounted at /api/calculations)    */
/* ------------------------------------------------------------------ */

/** Raw summary response from the server (nested shape) */
interface SummaryResponse {
  categoryTotals: Record<string, { monthly: number; onetime: number; perunit: number; total: number }>;
  totalMonthly: number;
  totalOnetime: number;
  totalPerunit: number;
  totalProject: number;
  pricing: { cpuFixed: number; costPerUnit: number; derivedPrice: number; sellingPrice: number; grossMarginPct: number };
  breakeven: { contribPerUnit: number; beUnits: number; beRevenue: number };
  revenue: { targetRevenue: number; netProfit: number; monthlyRevenue: number; monthlyNet: number; paybackMonths: number; roi: number };
  churnedUnits: number;
}

/** Transform the nested server response into a flat FinancialSummary */
function flattenSummary(r: SummaryResponse): FinancialSummary {
  const catTotals: FinancialSummary['catTotals'] = {};
  for (const [k, v] of Object.entries(r.categoryTotals)) {
    catTotals[k] = v;
  }
  return {
    catTotals,
    totalMonthly: r.totalMonthly,
    totalOnetime: r.totalOnetime,
    totalPerunit: r.totalPerunit,
    totalProject: r.totalProject,
    cpuFixed: r.pricing.cpuFixed,
    costPerUnit: r.pricing.costPerUnit,
    derivedPrice: r.pricing.derivedPrice,
    sellingPrice: r.pricing.sellingPrice,
    grossMarginPct: r.pricing.grossMarginPct,
    beUnits: r.breakeven.beUnits,
    beRevenue: r.breakeven.beRevenue,
    targetRevenue: r.revenue.targetRevenue,
    netProfit: r.revenue.netProfit,
    monthlyRevenue: r.revenue.monthlyRevenue,
    monthlyNet: r.revenue.monthlyNet,
    paybackMonths: r.revenue.paybackMonths,
    roi: r.revenue.roi,
    churnedUnits: r.churnedUnits,
  };
}

export async function getSummary(
  projectId: number,
): Promise<FinancialSummary> {
  const raw = await request<SummaryResponse>(`/calculations/${projectId}/summary`);
  return flattenSummary(raw);
}

/** Raw EVM response from the server */
interface EVMResponse {
  pv: number; ev: number; ac: number;
  cpi: number; spi: number; cv: number; sv: number;
  eac: number | null; vac: number; tcpi: number;
  resources: Array<{
    description: string;
    planHoursToDate: number;
    actualHoursToDate: number;
    plannedCost: number;
    actualCost: number;
    variance: number;
    status: string;
  }>;
  trend: Array<{ month: number; cumPlanned: number; cumActual: number }>;
}

function flattenEVM(r: EVMResponse): EVMMetrics {
  return {
    PV: r.pv, EV: r.ev, AC: r.ac,
    CPI: r.cpi, SPI: r.spi, CV: r.cv, SV: r.sv,
    EAC: r.eac ?? Infinity, VAC: r.vac, TCPI: r.tcpi,
    currentMonth: 0, // filled from project context
    duration: 0,    // filled from project context
    originalTotalCost: r.pv,
    projectedTotalCost: r.eac ?? r.pv,
    perResource: r.resources.map(res => ({
      ...res,
      status: res.status as 'good' | 'warn' | 'bad',
    })),
    trend: r.trend.map(t => ({
      ...t,
      cumActual: t.cumActual ?? null,
    })),
  };
}

export async function getEVM(projectId: number): Promise<EVMMetrics> {
  const raw = await request<EVMResponse>(`/calculations/${projectId}/evm`);
  return flattenEVM(raw);
}

/** Raw sensitivity response */
interface SensitivityResponse {
  scenarios: Array<{
    label: string; volume: number; volumeMultiplier: number;
    revenue: number; profit: number; roi: number;
    payback: number | null; marginPct: number; costPerUnit: number;
    sellingPrice: number; verdict: string;
  }>;
}

export async function getSensitivity(
  projectId: number,
): Promise<SensitivityScenario[]> {
  const raw = await request<SensitivityResponse>(`/calculations/${projectId}/sensitivity`);
  return raw.scenarios.map(s => ({
    label: s.label,
    volumePct: s.volumeMultiplier,
    volume: s.volume,
    revenue: s.revenue,
    profit: s.profit,
    roi: s.roi,
    payback: s.payback ?? Infinity,
    marginPct: s.marginPct,
    verdict: s.verdict as 'go' | 'caution' | 'nogo',
  }));
}

/** Raw cashflow response */
interface CashflowResponse {
  cashflow: Array<{
    month: number; phase: string;
    inflow: number; outflow: number; net: number; cumulative: number;
  }>;
  breakEvenMonth: number | null;
}

export async function getCashflow(
  projectId: number,
): Promise<CashflowData> {
  const raw = await request<CashflowResponse>(`/calculations/${projectId}/cashflow`);
  return {
    months: raw.cashflow.map(m => ({
      month: m.month,
      inflow: m.inflow,
      outflow: m.outflow,
      net: m.net,
      cumulative: m.cumulative,
    })),
    breakEvenMonth: raw.breakEvenMonth,
  };
}

/** Raw waterfall response */
interface WaterfallResponse {
  waterfall: Array<{ label: string; value: number; running: number }>;
  totalCost: number;
}

export async function getWaterfall(
  projectId: number,
): Promise<WaterfallItem[]> {
  const raw = await request<WaterfallResponse>(`/calculations/${projectId}/waterfall`);
  return raw.waterfall;
}