'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { KPICard } from '@/components/tctp/kpi-card';
import { VerdictBox } from '@/components/tctp/verdict-box';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, formatMonths, formatNumber, cn, CATEGORIES } from '@/lib/tctp-utils';

export default function AnalysisPage() {
  const { project, getComputed } = useTCTPStore();
  const { financial: f, sensitivity, cashflow, waterfall } = getComputed();

  const verdict: 'go' | 'caution' | 'nogo' =
    f.roi >= project.minROI && f.paybackMonths <= project.maxPayback && f.grossMarginPct >= project.minMargin
      ? 'go'
      : f.roi >= project.minROI * 0.7 || f.paybackMonths <= project.maxPayback * 1.3
        ? 'caution'
        : 'nogo';

  const verdictStyles: Record<string, string> = {
    go: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    caution: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    nogo: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Analysis</h1>
        <p className="text-sm text-muted-foreground">Financial analysis, sensitivity, and cash flow projections</p>
      </div>

      <VerdictBox
        verdict={verdict}
        description={`ROI ${formatPercent(f.roi)} · Margin ${formatPercent(f.grossMarginPct)} · Payback ${formatMonths(f.paybackMonths)}`}
      />

      {/* Break-even */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard label="Break-even Units" value={isFinite(f.beUnits) ? formatNumber(f.beUnits) : '∞'} />
        <KPICard label="Break-even Revenue" value={formatCurrency(f.beRevenue)} />
        <KPICard label="Target Revenue" value={formatCurrency(f.targetRevenue)} variant="teal" />
        <KPICard label="Net Profit" value={formatCurrency(f.netProfit)} variant={f.netProfit >= 0 ? 'green' : 'red'} />
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
          ℹ Break-even assumes {formatCurrency(f.sellingPrice)} selling price with {formatNumber(project.targetVolume)} target units over {project.duration} months. Per-unit variable costs: {formatCurrency(f.totalPerunit)}.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="breakdown">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="waterfall">Margin Waterfall</TabsTrigger>
        </TabsList>

        {/* Cost Breakdown */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Category Cost Distribution</h3>
            {/* Bar chart */}
            <div className="space-y-3 mb-6">
              {CATEGORIES.map((cat) => {
                const ct = f.catTotals[cat.key];
                if (!ct) return null;
                const total = f.totalProject;
                const pct = total > 0 ? (ct.total / total) * 100 : 0;
                return (
                  <div key={cat.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{cat.label}</span>
                      <span className="tabular-nums text-muted-foreground">{formatCurrency(ct.total)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-6 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color, minWidth: pct > 0 ? '4px' : '0' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-semibold">Category</th>
                  <th className="pb-2 text-right font-semibold">Monthly</th>
                  <th className="pb-2 text-right font-semibold">One-time</th>
                  <th className="pb-2 text-right font-semibold">Per-unit</th>
                  <th className="pb-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => {
                  const ct = f.catTotals[cat.key];
                  if (!ct) return null;
                  return (
                    <tr key={cat.key} className="border-b last:border-0">
                      <td className="py-2 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.label}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(ct.monthly)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(ct.onetime)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(ct.perunit)}</td>
                      <td className="py-2 text-right tabular-nums font-bold">{formatCurrency(ct.total)}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right tabular-nums">{formatCurrency(f.totalMonthly)}</td>
                  <td className="pt-2 text-right tabular-nums">{formatCurrency(f.totalOnetime)}</td>
                  <td className="pt-2 text-right tabular-nums">{formatCurrency(f.totalPerunit)}</td>
                  <td className="pt-2 text-right tabular-nums">{formatCurrency(f.totalProject)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Sensitivity */}
        <TabsContent value="sensitivity">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-semibold">Scenario</th>
                    <th className="px-4 py-3 text-right font-semibold">Volume %</th>
                    <th className="px-4 py-3 text-right font-semibold">Units</th>
                    <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th className="px-4 py-3 text-right font-semibold">Profit</th>
                    <th className="px-4 py-3 text-right font-semibold">ROI</th>
                    <th className="px-4 py-3 text-right font-semibold">Payback</th>
                    <th className="px-4 py-3 text-right font-semibold">Margin</th>
                    <th className="px-4 py-3 text-center font-semibold">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.map((sc, i) => (
                    <tr key={i} className={cn('border-b last:border-0', sc.label === 'Base' && 'bg-muted/30 font-semibold')}>
                      <td className="px-4 py-2">{sc.label}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{sc.volumePct > 0 ? '+' : ''}{sc.volumePct}%</td>
                      <td className="px-4 py-2 text-right tabular-nums">{sc.volume}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(sc.revenue)}</td>
                      <td className={cn('px-4 py-2 text-right tabular-nums', sc.profit < 0 ? 'text-red-600 dark:text-red-400' : '')}>{formatCurrency(sc.profit)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatPercent(sc.roi)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMonths(sc.payback)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatPercent(sc.marginPct)}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge className={cn('text-[10px]', verdictStyles[sc.verdict])}>{sc.verdict.toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">24-Month Cash Flow Projection</h3>
            <div className="space-y-2">
              {cashflow.months.map((m) => (
                <div key={m.month} className="flex items-center gap-3 text-sm">
                  <span className="w-8 text-xs text-muted-foreground tabular-nums">M{m.month}</span>
                  <div className="flex-1 flex h-5 rounded overflow-hidden bg-muted">
                    {m.inflow > 0 && (
                      <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(Math.abs(m.inflow) / (cashflow.months.reduce((mx, c) => Math.max(mx, Math.abs(c.inflow), Math.abs(c.outflow)), 1)) * 100, 100)}%` }} />
                    )}
                    {m.outflow > 0 && (
                      <div className="bg-red-400 h-full ml-auto" style={{ width: `${Math.min(Math.abs(m.outflow) / (cashflow.months.reduce((mx, c) => Math.max(mx, Math.abs(c.inflow), Math.abs(c.outflow)), 1)) * 100, 100)}%` }} />
                    )}
                  </div>
                  <span className={cn('w-20 text-right tabular-nums text-xs font-medium', m.cumulative >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {m.cumulative >= 0 ? '+' : ''}{formatCurrency(m.cumulative)}
                  </span>
                </div>
              ))}
            </div>
            {cashflow.breakEvenMonth && (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Break-even at month {cashflow.breakEvenMonth}
              </p>
            )}
          </div>
        </TabsContent>

        {/* Waterfall */}
        <TabsContent value="waterfall">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Margin Waterfall</h3>
            <div className="space-y-3">
              {waterfall.map((item, i) => {
                const maxAbs = Math.max(...waterfall.map(w => Math.abs(w.value)), 1);
                const isPositive = item.value >= 0;
                const barWidth = (Math.abs(item.value) / maxAbs) * 100;
                const isLast = i === waterfall.length - 1;

                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={cn('font-medium', isLast && (item.running >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'))}>
                        {isLast ? '≠ ' : i === 0 ? '' : '− '}{item.label}
                      </span>
                      <span className={cn('tabular-nums font-bold', isLast && (item.running >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'))}>
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                    <div className="h-7 rounded bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded transition-all', isPositive ? 'bg-emerald-500' : 'bg-red-400', isLast && (item.running >= 0 ? 'bg-emerald-500' : 'bg-red-400'))}
                        style={{ width: `${barWidth}%`, minWidth: item.value !== 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}