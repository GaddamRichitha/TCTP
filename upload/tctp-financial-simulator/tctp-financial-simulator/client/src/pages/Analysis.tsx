
import { useEffect, useState } from 'react';
import type { Project, FinancialSummary, SensitivityScenario, CashflowData, WaterfallItem } from '@/types';
import { getSummary, getSensitivity, getCashflow, getWaterfall } from '@/lib/api';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Target,
  BarChart3,
  DollarSign,
  Info,
  ArrowRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
const catColors = ['#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

function fmt(n: number, currency = '$'): string {
  if (n === Infinity) return '∞';
  if (n === null) return 'N/A';
  if (Math.abs(n) >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}K`;
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDec(n: number, d = 1): string {
  if (n === Infinity || n === null) return '∞';
  return n.toFixed(d);
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// ── Verdict Box ───────────────────────────────────────────────
function VerdictBox({
  verdict,
  description,
  loading,
}: {
  verdict: 'go' | 'caution' | 'nogo';
  description: string;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-28 w-full" />;
  }

  const styles = {
    go: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      icon: <CheckCircle className="h-8 w-8 text-green-600" />,
      title: 'PROJECT IS VIABLE',
      titleColor: 'text-green-800',
      descColor: 'text-green-700',
    },
    caution: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      icon: <AlertTriangle className="h-8 w-8 text-amber-600" />,
      title: 'PROCEED WITH CAUTION',
      titleColor: 'text-amber-800',
      descColor: 'text-amber-700',
    },
    nogo: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      icon: <XCircle className="h-8 w-8 text-red-600" />,
      title: 'PROJECT NOT VIABLE',
      titleColor: 'text-red-800',
      descColor: 'text-red-700',
    },
  };

  const s = styles[verdict];

  return (
    <div className={`rounded-xl border-2 p-5 ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-3">
        {s.icon}
        <div>
          <div className={`text-xl font-extrabold tracking-wide ${s.titleColor}`}>{s.title}</div>
          <div className={`mt-1 text-sm leading-relaxed ${s.descColor}`}>{description}</div>
        </div>
      </div>
    </div>
  );
}

// ── Verdict Pill ──────────────────────────────────────────────
function VerdictPill({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    go: 'bg-green-100 text-green-700',
    caution: 'bg-amber-100 text-amber-700',
    nogo: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    go: 'Go',
    caution: 'Caution',
    nogo: 'No-Go',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[verdict] || 'bg-gray-100 text-gray-700'}`}>
      {labels[verdict] || verdict}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  projectId: number;
  project: Project;
}

export default function Analysis({ projectId, project }: Props) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityScenario[] | null>(null);
  const [cashflow, setCashflow] = useState<CashflowData | null>(null);
  const [waterfall, setWaterfall] = useState<WaterfallItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getSummary(projectId), getSensitivity(projectId), getCashflow(projectId), getWaterfall(projectId)])
      .then(([s, sen, cf, wf]) => {
        if (!cancelled) {
          setSummary(s);
          setSensitivity(sen);
          setCashflow(cf);
          setWaterfall(wf);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const c = project.currency;

  // ── Verdict computation ──────────────────────────────────────
  const baseScenario = sensitivity?.find((s) => s.volumePct === 0);
  const verdict: 'go' | 'caution' | 'nogo' = baseScenario?.verdict ?? 'caution';
  const roi = summary?.roi ?? 0;
  const payback = summary?.paybackMonths ?? 0;
  const marginPct = summary?.grossMarginPct ?? 0;

  const verdictDesc = {
    go: `With an ROI of ${fmtDec(roi)}% and a payback period of ${fmtDec(payback, 1)} months, the project meets all viability thresholds (ROI ≥ ${project.min_roi}%, payback ≤ ${project.max_payback}mo, margin ≥ ${project.min_margin}%).`,
    caution: `The project shows moderate viability with ROI of ${fmtDec(roi)}% and payback of ${fmtDec(payback, 1)} months. Some thresholds may not be fully met — review sensitivity scenarios for risk assessment.`,
    nogo: `The project does not meet viability criteria. With ROI of ${fmtDec(roi)}% and payback of ${payback === Infinity ? '∞' : `${fmtDec(payback, 1)}mo`}, it fails key thresholds (ROI ≥ ${project.min_roi}%, payback ≤ ${project.max_payback}mo, margin ≥ ${project.min_margin}%).`,
  };

  // ── Progress to break-even ───────────────────────────────────
  const beMonth = cashflow?.breakEvenMonth ?? null;
  const progressPct = beMonth !== null ? Math.min(100, (project.current_month / beMonth) * 100) : 0;

  // ── Waterfall chart data ─────────────────────────────────────
  const waterfallItems = waterfall ?? [];
  const waterfallTotal = waterfallItems.reduce((sum, w) => sum + w.running, 0);
  const maxWaterfallVal = waterfallTotal > 0 ? waterfallTotal : 1;

  // ── Cashflow chart data ──────────────────────────────────────
  const cashflowMonths = cashflow?.months ?? [];
  const maxCashflowAbs = Math.max(
    ...cashflowMonths.map((m) => Math.max(Math.abs(m.inflow), Math.abs(m.outflow))),
    1
  );

  // ── Sensitivity table: find base ROI for comparison ─────────
  const baseROI = baseScenario?.roi ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Go/No-Go Verdict ───────────────────────────────────── */}
      <VerdictBox verdict={verdict} description={verdictDesc[verdict]} loading={loading} />

      {/* ── Break-Even Analysis ────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <Target className="h-4 w-4 text-[#7a8fa0]" />
          Break-Even Analysis
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#dde4eb] bg-white p-4">
            <div className="text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
              Break-Even Units
            </div>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mc-value mt-1 text-2xl font-extrabold tabular-nums text-[#0f1923]">
                {summary?.beUnits === Infinity
                  ? 'N/A'
                  : summary?.beUnits.toLocaleString()}
              </div>
            )}
            <div className="mc-sub mt-1 text-xs text-[#7a8fa0]">
              of {project.target_volume} target {project.unit_label.toLowerCase()}
            </div>
          </div>

          <div className="rounded-lg border border-[#dde4eb] bg-white p-4">
            <div className="text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
              Break-Even Revenue
            </div>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mc-value mt-1 text-2xl font-extrabold tabular-nums text-[#0f1923]">
                {fmt(summary?.beRevenue ?? 0, c)}
              </div>
            )}
            <div className="mc-sub mt-1 text-xs text-[#7a8fa0]">total revenue needed</div>
          </div>

          <div className="rounded-lg border border-[#dde4eb] bg-white p-4">
            <div className="text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
              Contribution Margin
            </div>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mc-value mt-1 text-2xl font-extrabold tabular-nums text-[#0f1923]">
                {fmt(summary?.costPerUnit ?? 0, c)}
              </div>
            )}
            <div className="mc-sub mt-1 text-xs text-[#7a8fa0]">per {project.unit_label.toLowerCase().slice(0, -1) || 'unit'} sold</div>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Break-even is calculated as <strong>Total Fixed Costs ÷ (Selling Price – Cost Per Unit)</strong>.
            This represents the minimum number of units that must be sold to cover all project costs.
          </p>
        </div>
      </div>

      {/* ── Sensitivity Analysis ───────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <TrendingUp className="h-4 w-4 text-[#7a8fa0]" />
          Sensitivity Analysis
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !sensitivity ? null : (
          <div className="max-h-96 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde4eb] text-left text-[11px] uppercase text-[#7a8fa0] tracking-wider">
                  <th className="pb-2 pr-3 font-semibold">Scenario</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Volume</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Revenue</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Net Profit</th>
                  <th className="pb-2 pr-3 text-right font-semibold">ROI</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Payback</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Margin</th>
                  <th className="pb-2 font-semibold">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((s: SensitivityScenario) => {
                  const isBase = s.volumePct === 0;
                  const roiDiff = s.roi - baseROI;
                  return (
                    <tr
                      key={s.label}
                      className={`border-b border-gray-100 transition-colors ${isBase ? 'bg-blue-50/60 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-2.5 pr-3 text-[#0f1923]">
                        <div className="flex items-center gap-2">
                          <ArrowRight className={`h-3 w-3 ${isBase ? 'text-blue-600' : 'text-[#7a8fa0]'}`} />
                          {s.label}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-[#3d4f5c]">{s.volume.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-[#3d4f5c]">{fmt(s.revenue, c)}</td>
                      <td className={`py-2.5 pr-3 text-right tabular-nums font-semibold ${s.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(s.profit, c)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        <span className={roiDiff > 0 ? 'text-green-600' : roiDiff < 0 ? 'text-red-600' : ''}>
                          {fmtDec(s.roi)}%
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-[#3d4f5c]">
                        {s.payback !== null ? `${fmtDec(s.payback, 1)}mo` : '∞'}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-[#3d4f5c]">{fmtDec(s.marginPct)}%</td>
                      <td className="py-2.5">
                        <VerdictPill verdict={s.verdict} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cash Flow Waterfall ────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <BarChart3 className="h-4 w-4 text-[#7a8fa0]" />
          Cash Flow Waterfall
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : waterfallItems.length === 0 ? (
          <p className="text-sm text-[#7a8fa0]">No cost data available.</p>
        ) : (
          <div className="space-y-2.5">
            {waterfallItems.map((item, i) => {
              const pct = (item.value / maxWaterfallVal) * 100;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#0f1923]">{item.label}</span>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-[#3d4f5c]">{fmt(item.value, c)}</span>
                      <span className="text-[11px] text-[#7a8fa0]">Running: {fmt(item.running, c)}</span>
                    </div>
                  </div>
                  <div className="h-5 w-full rounded bg-gray-100">
                    <div
                      className="h-5 rounded transition-all duration-400"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: catColors[i] || '#6b7280',
                        minWidth: pct > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {/* Total bar */}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-[#0f1923] px-3 py-2 text-sm">
              <span className="font-bold text-white">Total Project Cost</span>
              <span className="tabular-nums font-bold text-white">{fmt(waterfallTotal, c)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Cash Flow Projection ───────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <DollarSign className="h-4 w-4 text-[#7a8fa0]" />
          Cash Flow Projection (24 Months)
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : cashflowMonths.length === 0 ? (
          <p className="text-sm text-[#7a8fa0]">No cashflow data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-[3px]" style={{ height: '260px' }}>
              {cashflowMonths.map((m) => {
                const isDev = m.phase === 'development';
                const outH = (Math.abs(m.outflow) / maxCashflowAbs) * 220;
                const inH = (Math.abs(m.inflow) / maxCashflowAbs) * 220;
                const isBE = beMonth !== null && m.month === beMonth;

                return (
                  <div
                    key={m.month}
                    className="relative flex flex-1 flex-col items-center"
                    style={{ minWidth: '20px' }}
                  >
                    {/* Value label */}
                    <div className="absolute -top-5 text-[9px] tabular-nums text-[#7a8fa0]">
                      {m.month % 3 === 1 || m.month === 1 ? `M${m.month}` : ''}
                    </div>

                    <div className="flex w-full flex-1 items-end gap-[1px]">
                      {/* Outflow bar (red) */}
                      {m.outflow > 0 && (
                        <div
                          className="flex-1 rounded-t bg-red-400 transition-all duration-300 min-w-[6px]"
                          style={{ height: `${Math.max(outH, 2)}px` }}
                          title={`Outflow: ${fmt(m.outflow, c)}`}
                        />
                      )}
                      {/* Inflow bar (green) */}
                      {m.inflow > 0 && (
                        <div
                          className="flex-1 rounded-t bg-green-400 transition-all duration-300 min-w-[6px]"
                          style={{ height: `${Math.max(inH, 2)}px` }}
                          title={`Inflow: ${fmt(m.inflow, c)}`}
                        />
                      )}
                      {/* Net bar if both exist */}
                      {!isDev && m.net !== 0 && (
                        <div
                          className={`flex-1 rounded-t min-w-[6px] transition-all duration-300 ${
                            m.net >= 0 ? 'bg-blue-400' : 'bg-red-400'
                          }`}
                          style={{ height: `${Math.max((Math.abs(m.net) / maxCashflowAbs) * 220, 2)}px` }}
                          title={`Net: ${fmt(m.net, c)}`}
                        />
                      )}
                    </div>

                    {/* Break-even marker */}
                    {isBE && (
                      <div className="absolute -left-1 -right-1 top-0 border-t-2 border-dashed border-blue-600">
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-600 whitespace-nowrap">
                          Break-even
                        </span>
                      </div>
                    )}

                    {/* Cumulative value */}
                    <div
                      className={`mt-1 text-[9px] tabular-nums ${
                        m.cumulative >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {m.month % 3 === 0 || m.month === 1
                        ? (m.cumulative >= 0 ? '+' : '') + (m.cumulative / 1000).toFixed(0) + 'K'
                        : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs text-[#7a8fa0]">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-red-400" />
                Outflow
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-green-400" />
                Inflow
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-blue-400" />
                Net
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border-t-2 border-dashed border-blue-600" />
                Break-even
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Progress Meter ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-[#0f1923]">Progress to Break-Even</span>
          <span className="tabular-nums font-bold text-[#0f1923]">
            {loading ? '...' : `${Math.min(progressPct, 100).toFixed(0)}%`}
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-gray-100">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[#7a8fa0]">
          <span>Month {project.current_month} of {project.duration}</span>
          <span>
            {beMonth !== null ? `Break-even at Month ${beMonth}` : 'Break-even not projected'}
          </span>
        </div>
      </div>
    </div>
  );
}