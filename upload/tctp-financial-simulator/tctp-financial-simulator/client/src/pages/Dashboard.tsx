import type { Project, FinancialSummary, EVMMetrics, WaterfallItem, Category } from '@/types';
import { getSummary, getEVM, getWaterfall } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calculator,
  Target,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
const catColors: Record<Category, string> = {
  labour: '#3b82f6',
  infra: '#14b8a6',
  apis: '#f59e0b',
  llm: '#8b5cf6',
  overhead: '#ef4444',
};

const catLabels: Record<Category, string> = {
  labour: 'Labour',
  infra: 'Infrastructure',
  apis: 'APIs & Services',
  llm: 'LLM / AI',
  overhead: 'Overhead',
};

function fmt(n: number, currency = '$'): string {
  if (n === Infinity) return '∞';
  if (Math.abs(n) >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}K`;
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDec(n: number, d = 2): string {
  if (n === Infinity) return '∞';
  return n.toFixed(d);
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({
  label,
  value,
  sub,
  variant = 'default',
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: 'blue' | 'teal' | 'amber' | 'purple' | 'green' | 'red' | 'default';
  loading?: boolean;
}) {
  const accentMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    teal: 'bg-teal-50 border-teal-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    default: 'bg-white border-[#dde4eb]',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700',
    teal: 'text-teal-700',
    amber: 'text-amber-700',
    purple: 'text-purple-700',
    green: 'text-green-700',
    red: 'text-red-700',
    default: 'text-[#0f1923]',
  };

  return (
    <div className={`rounded-xl border p-4 ${accentMap[variant]}`}>
      <div className="mc-label uppercase text-[11px] font-semibold text-[#7a8fa0] tracking-wider">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-3/4" />
      ) : (
        <div className={`mc-value mt-1 text-2xl font-extrabold tabular-nums ${textMap[variant]}`}>
          {value}
        </div>
      )}
      {sub && !loading && <div className="mc-sub mt-1 text-xs text-[#7a8fa0]">{sub}</div>}
    </div>
  );
}

// ── Small EVM Metric Card ─────────────────────────────────────
function EVMCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#dde4eb] bg-white p-3">
      <div className="text-[10px] uppercase font-semibold text-[#7a8fa0] tracking-wider">{label}</div>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-2/3" />
      ) : (
        <div className={`mt-0.5 text-lg font-bold tabular-nums ${color}`}>{value}</div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  projectId: number;
  project: Project;
}

export default function Dashboard({ projectId, project }: Props) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [evm, setEVM] = useState<EVMMetrics | null>(null);
  const [waterfall, setWaterfall] = useState<WaterfallItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getSummary(projectId), getEVM(projectId), getWaterfall(projectId)])
      .then(([s, e, w]) => {
        if (!cancelled) {
          setSummary(s);
          setEVM(e);
          setWaterfall(w);
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

  // ── KPI calculations ───────────────────────────────────────
  const totalMonthly = summary?.totalMonthly ?? 0;
  const totalProject = summary?.totalProject ?? 0;
  const costPerUnit = summary?.costPerUnit ?? 0;
  const beUnits = summary?.beUnits ?? 0;
  const roi = summary?.roi ?? 0;
  const payback = summary?.paybackMonths ?? 0;

  // ── Category breakdown data ─────────────────────────────────
  const categories: Category[] = ['labour', 'infra', 'apis', 'llm', 'overhead'];
  const catData = categories.map((cat) => ({
    cat,
    label: catLabels[cat],
    color: catColors[cat],
    total: summary?.catTotals[cat]?.total ?? 0,
  }));
  const maxCatVal = Math.max(...catData.map((d) => d.total), 1);

  // ── EVM color helpers ───────────────────────────────────────
  function evmColor(val: number): string {
    if (val >= 1) return 'text-green-600';
    if (val >= 0.85) return 'text-amber-600';
    return 'text-red-600';
  }

  // ── EVM recommendations ─────────────────────────────────────
  function getRecommendations() {
    if (!evm) return [];
    const recs: { severity: 'good' | 'warn' | 'bad'; title: string; desc: string }[] = [];
    if (evm.CPI >= 1) recs.push({ severity: 'good', title: 'Cost performance on track', desc: `CPI is ${fmtDec(evm.CPI)}. The project is currently under or on budget.` });
    else if (evm.CPI >= 0.85) recs.push({ severity: 'warn', title: 'Slight cost overrun risk', desc: `CPI is ${fmtDec(evm.CPI)}. Monitor spending closely and look for optimisation opportunities.` });
    else recs.push({ severity: 'bad', title: 'Significant cost overrun', desc: `CPI is ${fmtDec(evm.CPI)}. Immediate corrective action required to bring costs back in line.` });

    if (evm.SPI >= 1) recs.push({ severity: 'good', title: 'Schedule performance healthy', desc: `SPI is ${fmtDec(evm.SPI)}. Work is progressing at or above the planned rate.` });
    else if (evm.SPI >= 0.85) recs.push({ severity: 'warn', title: 'Schedule slippage detected', desc: `SPI is ${fmtDec(evm.SPI)}. Consider adding resources or adjusting scope.` });
    else recs.push({ severity: 'bad', title: 'Schedule significantly behind', desc: `SPI is ${fmtDec(evm.SPI)}. Escalate immediately and reassess the project plan.` });

    if (evm.VAC < 0) recs.push({ severity: 'bad', title: 'Budget overrun projected', desc: `VAC is ${fmt(evm.VAC, c)}. The project is forecast to exceed budget.` });
    else if (evm.VAC > 0) recs.push({ severity: 'good', title: 'Budget surplus projected', desc: `VAC is ${fmt(evm.VAC, c)}. The project is forecast to finish under budget.` });

    return recs;
  }

  const recommendations = getRecommendations();

  const severityStyles = {
    good: { bg: 'bg-green-50', border: 'border-green-200', icon: <CheckCircle className="h-4 w-4 text-green-600" />, circle: 'bg-green-500' },
    warn: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, circle: 'bg-amber-500' },
    bad: { bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle className="h-4 w-4 text-red-600" />, circle: 'bg-red-500' },
  };

  // ── SVG Trend Chart ─────────────────────────────────────────
  function renderTrendChart() {
    if (!evm || evm.trend.length === 0) {
      return <div className="flex h-48 items-center justify-center text-sm text-[#7a8fa0]">No trend data available</div>;
    }

    const W = 480;
    const H = 180;
    const pad = { t: 10, r: 10, b: 28, l: 50 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const maxMonth = project.duration;
    const maxVal = Math.max(...evm.trend.map((t) => Math.max(t.cumPlanned, t.cumActual)), 1);

    // Build full planned line across all months
    const plannedPoints: { x: number; y: number }[] = [];
    const actualPoints: { x: number; y: number }[] = [];

    for (let m = 1; m <= maxMonth; m++) {
      const x = pad.l + ((m - 1) / (maxMonth - 1)) * plotW;
      const trendPt = evm.trend.find((t) => t.month === m);
      const plannedVal = trendPt?.cumPlanned ?? (evm.trend.length > 0 ? evm.trend[evm.trend.length - 1].cumPlanned * (m / maxMonth) : 0);
      plannedPoints.push({ x, y: pad.t + plotH - (plannedVal / maxVal) * plotH });
      if (trendPt) {
        actualPoints.push({ x, y: pad.t + plotH - (trendPt.cumActual / maxVal) * plotH });
      }
    }

    // "Now" line position
    const nowX = pad.l + ((project.current_month - 1) / (maxMonth - 1)) * plotW;

    function toPath(pts: { x: number; y: number }[]) {
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line key={frac} x1={pad.l} y1={pad.t + plotH * (1 - frac)} x2={W - pad.r} y2={pad.t + plotH * (1 - frac)} stroke="#e5e7eb" strokeWidth={0.5} />
        ))}

        {/* Y axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <text key={frac} x={pad.l - 4} y={pad.t + plotH * (1 - frac) + 4} textAnchor="end" className="text-[9px] fill-[#7a8fa0]">
            {Math.round(maxVal * frac)}
          </text>
        ))}

        {/* X axis labels */}
        {Array.from({ length: maxMonth }, (_, i) => i + 1)
          .filter((m) => m === 1 || m % 3 === 0 || m === maxMonth)
          .map((m) => {
            const x = pad.l + ((m - 1) / (maxMonth - 1)) * plotW;
            return (
              <text key={m} x={x} y={H - 4} textAnchor="middle" className="text-[9px] fill-[#7a8fa0]">
                M{m}
              </text>
            );
          })}

        {/* Planned line (dashed) */}
        <path d={toPath(plannedPoints)} fill="none" stroke="#9ca3af" strokeWidth={2} strokeDasharray="6 3" />

        {/* Actual line (solid) */}
        {actualPoints.length > 1 && (
          <path d={toPath(actualPoints)} fill="none" stroke="#3b82f6" strokeWidth={2} />
        )}

        {/* "Now" vertical line */}
        <line x1={nowX} y1={pad.t} x2={nowX} y2={pad.t + plotH} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={nowX} y={pad.t - 1} textAnchor="middle" className="text-[9px] fill-indigo-500 font-semibold">
          Now
        </text>

        {/* Legend */}
        <line x1={W / 2 - 80} y1={H - 2} x2={W / 2 - 60} y2={H - 2} stroke="#9ca3af" strokeWidth={2} strokeDasharray="6 3" />
        <text x={W / 2 - 56} y={H + 1} className="text-[9px] fill-[#7a8fa0]">Planned</text>
        <line x1={W / 2 + 10} y1={H - 2} x2={W / 2 + 30} y2={H - 2} stroke="#3b82f6" strokeWidth={2} />
        <text x={W / 2 + 34} y={H + 1} className="text-[9px] fill-[#7a8fa0]">Actual</text>
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Row 1: KPI Cards (3 + 3) ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          label="Total Monthly Cost"
          value={fmt(totalMonthly, c)}
          sub={`across ${project.duration}-month duration`}
          variant="blue"
          loading={loading}
        />
        <KPICard
          label="Total Project Cost"
          value={fmt(totalProject, c)}
          sub="monthly × duration + one-time"
          variant="teal"
          loading={loading}
        />
        <KPICard
          label="Cost Per Unit"
          value={fmt(costPerUnit, c)}
          sub={`at base volume of ${project.target_volume} ${project.unit_label.toLowerCase()}`}
          variant="amber"
          loading={loading}
        />
        <KPICard
          label="Break-Even Units"
          value={beUnits === Infinity ? 'N/A' : beUnits.toLocaleString()}
          sub={beUnits !== Infinity ? `to recover ${fmt(totalProject, c)}` : 'Contribution margin ≤ 0'}
          variant="purple"
          loading={loading}
        />
        <KPICard
          label="ROI"
          value={`${roi >= 0 ? '+' : ''}${fmtDec(roi)}%`}
          sub={roi >= 0 ? 'positive return' : 'negative return'}
          variant={roi >= 0 ? 'green' : 'red'}
          loading={loading}
        />
        <KPICard
          label="Payback Period"
          value={payback === Infinity ? 'N/A' : `${fmtDec(payback, 1)} mo`}
          sub={payback === Infinity ? 'No payback projected' : 'to recoup investment'}
          variant="default"
          loading={loading}
        />
      </div>

      {/* ── Row 2: Category Breakdown + EVM ────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
            <PieChart className="h-4 w-4 text-[#7a8fa0]" />
            Cost breakdown by category
          </div>
          <div className="space-y-3">
            {catData.map((d) => {
              const pct = totalProject > 0 ? (d.total / totalProject) * 100 : 0;
              return (
                <div key={d.cat}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#0f1923]">{d.label}</span>
                    <span className="tabular-nums text-[#3d4f5c]">
                      {fmt(d.total, c)}{' '}
                      <span className="text-[11px] text-[#7a8fa0]">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-5 w-full rounded bg-gray-100">
                    <div
                      className="h-5 rounded transition-all duration-400"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: d.color,
                        minWidth: pct > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EVM Section */}
        <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
            <Target className="h-4 w-4 text-[#7a8fa0]" />
            Earned Value Management
          </div>

          <div className="grid grid-cols-3 gap-2">
            <EVMCard
              label="CPI"
              value={loading ? '...' : fmtDec(evm?.CPI ?? 0)}
              color={loading ? 'text-gray-400' : evmColor(evm?.CPI ?? 0)}
              loading={loading}
            />
            <EVMCard
              label="SPI"
              value={loading ? '...' : fmtDec(evm?.SPI ?? 0)}
              color={loading ? 'text-gray-400' : evmColor(evm?.SPI ?? 0)}
              loading={loading}
            />
            <EVMCard
              label="CV ($)"
              value={loading ? '...' : fmt(evm?.CV ?? 0, c)}
              color={loading ? 'text-gray-400' : (evm?.CV ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
              loading={loading}
            />
            <EVMCard
              label="SV ($)"
              value={loading ? '...' : fmt(evm?.SV ?? 0, c)}
              color={loading ? 'text-gray-400' : (evm?.SV ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
              loading={loading}
            />
            <EVMCard
              label="EAC"
              value={loading ? '...' : (evm?.EAC ? fmt(evm.EAC, c) : 'N/A')}
              color="text-[#0f1923]"
              loading={loading}
            />
            <EVMCard
              label="VAC"
              value={loading ? '...' : fmt(evm?.VAC ?? 0, c)}
              color={loading ? 'text-gray-400' : (evm?.VAC ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
              loading={loading}
            />
          </div>

          {/* Trend Chart */}
          <div className="mt-4">{renderTrendChart()}</div>
        </div>
      </div>

      {/* ── Row 3: EVM Recommendations ─────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <Info className="h-4 w-4 text-[#7a8fa0]" />
          EVM Recommendations
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-[#7a8fa0]">No recommendations yet. Add cost items and time logs to get started.</p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, i) => {
              const style = severityStyles[rec.severity];
              return (
                <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${style.bg} ${style.border}`}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style.circle}`}>
                    {style.icon}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[#0f1923]">{rec.title}</div>
                    <div className="mt-0.5 text-xs text-[#3d4f5c]">{rec.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Row 4: Resource Variance Table ─────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <BarChart3 className="h-4 w-4 text-[#7a8fa0]" />
          Resource Variance
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !evm || evm.perResource.length === 0 ? (
          <p className="text-sm text-[#7a8fa0]">No labour resources found.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde4eb] text-left text-[11px] uppercase text-[#7a8fa0] tracking-wider">
                  <th className="pb-2 pr-4 font-semibold">Description</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Plan Hrs</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Actual Hrs</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Planned Cost</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Actual Cost</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Variance</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {evm.perResource.map((r) => (
                  <tr key={r.costItemId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-[#0f1923]">{r.description}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{r.planHoursToDate.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{r.actualHoursToDate.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{fmt(r.plannedCost, c)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{fmt(r.actualCost, c)}</td>
                    <td className={`py-2.5 pr-4 text-right tabular-nums font-semibold ${r.variance > 0 ? 'text-red-600' : r.variance < 0 ? 'text-green-600' : 'text-[#3d4f5c]'}`}>
                      {r.variance > 0 ? '+' : ''}{fmt(r.variance, c)}
                    </td>
                    <td className="py-2.5">
                      {r.status === 'good' && (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                          On/under budget
                        </span>
                      )}
                      {r.status === 'warn' && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                          Slightly over
                        </span>
                      )}
                      {r.status === 'bad' && (
                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                          Significantly over
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}