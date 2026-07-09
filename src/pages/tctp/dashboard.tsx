'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { KPICard } from '@/components/tctp/kpi-card';
import { VerdictBox } from '@/components/tctp/verdict-box';
import { formatCurrency, formatPercent, formatNumber, formatMonths, cn, CATEGORIES } from '@/lib/tctp-utils';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { getComputed, project } = useTCTPStore();
  const { financial: f, evm: e } = getComputed();

  const verdict: 'go' | 'caution' | 'nogo' =
    f.roi >= project.minROI && f.paybackMonths <= project.maxPayback && f.grossMarginPct >= project.minMargin
      ? 'go'
      : f.roi >= project.minROI * 0.7 || f.paybackMonths <= project.maxPayback * 1.3
        ? 'caution'
        : 'nogo';

  const totalCat = Object.values(f.catTotals).reduce((s, c) => s + c.total, 0);
  const unitName = project.unitLabel.trim() || 'unit';
  const unitSingular = unitName.toLowerCase().endsWith('s') ? unitName.slice(0, -1) : unitName;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{project.name} — {project.description}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Project Cost" value={formatCurrency(f.totalProject, project.currency)} variant="teal" />
        <KPICard label="Selling Price" value={formatCurrency(f.sellingPrice, project.currency)} sub={`per ${unitSingular.toLowerCase()}`} />
        <KPICard label="Net Profit" value={formatCurrency(f.netProfit, project.currency)} variant={f.netProfit >= 0 ? 'green' : 'red'} />
        <KPICard label="ROI" value={formatPercent(f.roi)} variant={f.roi >= project.minROI ? 'green' : 'amber'} />
        <KPICard label="Margin" value={formatPercent(f.grossMarginPct)} />
        <KPICard label="Payback" value={formatMonths(f.paybackMonths)} variant={f.paybackMonths <= project.maxPayback ? 'default' : 'red'} />
      </div>

      {/* Verdict */}
      <VerdictBox
        verdict={verdict}
        description={`ROI: ${formatPercent(f.roi)} (target ≥${formatPercent(project.minROI)}) · Margin: ${formatPercent(f.grossMarginPct)} (target ≥${formatPercent(project.minMargin)}) · Payback: ${formatMonths(f.paybackMonths)} (max ${formatMonths(project.maxPayback)})`}
      />

      {/* Category Breakdown */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Category Breakdown</h2>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const ct = f.catTotals[cat.key];
            if (!ct) return null;
            const pct = totalCat > 0 ? (ct.total / totalCat) * 100 : 0;
            return (
              <div key={cat.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.label}</span>
                  <span className="tabular-nums text-muted-foreground">{formatCurrency(ct.total, project.currency)} · {pct.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EVM Summary */}
      {e && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KPICard label="PV (Planned)" value={formatCurrency(e.PV, project.currency)} />
            <KPICard label="EV (Earned)" value={formatCurrency(e.EV, project.currency)} />
            <KPICard label="AC (Actual)" value={formatCurrency(e.AC, project.currency)} />
            <KPICard label="CPI" value={e.CPI.toFixed(2)} variant={e.CPI >= 0.95 ? 'green' : e.CPI >= 0.85 ? 'amber' : 'red'} />
            <KPICard label="SPI" value={e.SPI.toFixed(2)} variant={e.SPI >= 0.95 ? 'green' : e.SPI >= 0.85 ? 'amber' : 'red'} />
            <KPICard label="EAC" value={formatCurrency(e.EAC, project.currency)} />
          </div>

          {/* EVM Trend SVG */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">EVM Trend</h2>
            <svg viewBox="0 0 600 200" className="w-full h-48">
              {(() => {
                const maxVal = Math.max(...e.trend.map(t => t.cumPlanned), ...e.trend.map(t => t.cumActual ?? 0)) * 1.1;
                const w = 560, h = 160, ox = 30, oy = 10;
                const pts = e.trend.map((t, i) => ({
                  x: ox + (i / Math.max(e.trend.length - 1, 1)) * w,
                  py: oy + h - (t.cumPlanned / maxVal) * h,
                  ay: t.cumActual != null ? oy + h - (t.cumActual / maxVal) * h : null,
                }));
                const plannedPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.py}`).join(' ');
                const actualPts = pts.filter(p => p.ay != null);
                const actualPath = actualPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.ay}`).join(' ');
                const nowX = pts[e.currentMonth - 1]?.x;

                return (
                  <>
                    <line x1={ox} y1={oy + h / 2} x2={ox + w} y2={oy + h / 2} stroke="currentColor" strokeOpacity="0.05" />
                    <path d={plannedPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
                    {actualPts.length > 1 && <path d={actualPath} fill="none" stroke="#0d9488" strokeWidth="2.5" />}
                    {nowX != null && <line x1={nowX} y1={oy} x2={nowX} y2={oy + h} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />}
                    {nowX != null && <text x={nowX + 4} y={oy + 12} fill="#f59e0b" fontSize="10" fontWeight="bold">Now</text>}
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.py} r="3" fill="#94a3b8" />
                    ))}
                    {actualPts.map((p, i) => (
                      <circle key={`a${i}`} cx={p.x} cy={p.ay!} r="3" fill="#0d9488" />
                    ))}
                    <text x={ox + w + 4} y={oy + 12} fill="#94a3b8" fontSize="9">Planned</text>
                    <text x={ox + w + 4} y={oy + 24} fill="#0d9488" fontSize="9">Actual</text>
                  </>
                );
              })()}
            </svg>
          </div>

          {/* EVM Recommendations */}
          <div className="grid gap-4 md:grid-cols-3">
            {e.CPI < 0.95 && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">⚠ Cost Overrun Risk</p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">CPI of {e.CPI.toFixed(2)} indicates spending exceeds earned value. Review resource allocation.</p>
              </div>
            )}
            {e.SPI < 0.95 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">⚠ Schedule Risk</p>
                <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">SPI of {e.SPI.toFixed(2)} indicates progress is behind schedule.</p>
              </div>
            )}
            {e.CPI >= 0.95 && e.SPI >= 0.95 && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">✓ On Track</p>
                <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">CPI and SPI are within acceptable thresholds. Continue monitoring.</p>
              </div>
            )}
          </div>

          {/* Resource Variance Table */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Resource Variance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Resource</th>
                    <th className="pb-2 pr-4 text-right">Plan Hrs</th>
                    <th className="pb-2 pr-4 text-right">Actual Hrs</th>
                    <th className="pb-2 pr-4 text-right">Variance</th>
                    <th className="pb-2 pr-4 text-right">EV</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {e.perResource.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.description}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.planHoursToDate}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.actualHoursToDate}</td>
                      <td className={cn('py-2 pr-4 text-right tabular-nums', r.variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                        {r.variance >= 0 ? '+' : ''}{formatCurrency(r.variance, project.currency)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(r.earnedValue, project.currency)}</td>
                      <td className="py-2 text-right">
                        <Badge variant={r.status === 'good' ? 'default' : r.status === 'warn' ? 'secondary' : 'destructive'}
                          className={cn(
                            r.status === 'good' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                            r.status === 'warn' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                            r.status === 'bad' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                          )}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
