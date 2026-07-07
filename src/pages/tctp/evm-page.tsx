'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { KPICard } from '@/components/tctp/kpi-card';
import { VerdictBox } from '@/components/tctp/verdict-box';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, cn } from '@/lib/tctp-utils';

export default function EVMPage() {
  const { project, getComputed } = useTCTPStore();
  const { evm: e } = getComputed();

  if (!e) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Earned Value Management</h1>
        <div className="rounded-xl border bg-card p-12 shadow-sm text-center text-muted-foreground">
          <p className="text-lg font-medium">No EVM data available</p>
          <p className="mt-1 text-sm">Set current month &gt; 0 and add labour items to see EVM metrics.</p>
        </div>
      </div>
    );
  }

  const statusVerdict: 'go' | 'caution' | 'nogo' =
    e.CPI >= 0.95 && e.SPI >= 0.95 ? 'go' :
    e.CPI >= 0.85 && e.SPI >= 0.85 ? 'caution' : 'nogo';

  const statusDesc =
    statusVerdict === 'go' ? `CPI: ${e.CPI.toFixed(2)} and SPI: ${e.SPI.toFixed(2)} are within healthy thresholds.` :
    statusVerdict === 'caution' ? `CPI: ${e.CPI.toFixed(2)} or SPI: ${e.SPI.toFixed(2)} below target. Review resource allocation.` :
    `CPI: ${e.CPI.toFixed(2)} and SPI: ${e.SPI.toFixed(2)} indicate significant cost and schedule overruns.`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Earned Value Management</h1>
        <p className="text-sm text-muted-foreground">Month {e.currentMonth} of {e.duration}</p>
      </div>

      <VerdictBox verdict={statusVerdict} description={statusDesc} />

      {/* 8 Metric Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="PV (Planned Value)" value={formatCurrency(e.PV)} />
        <KPICard label="EV (Earned Value)" value={formatCurrency(e.EV)} />
        <KPICard label="AC (Actual Cost)" value={formatCurrency(e.AC)} />
        <KPICard label="EAC (Est. at Completion)" value={formatCurrency(e.EAC)} variant={e.EAC <= e.BAC ? 'green' : 'red'} />
        <KPICard label="CV (Cost Var.)" value={formatCurrency(e.CV)} variant={e.CV >= 0 ? 'green' : 'red'} />
        <KPICard label="SV (Schedule Var.)" value={formatCurrency(e.SV)} variant={e.SV >= 0 ? 'green' : 'red'} />
        <KPICard label="CPI" value={e.CPI.toFixed(2)} variant={e.CPI >= 0.95 ? 'green' : e.CPI >= 0.85 ? 'amber' : 'red'} />
        <KPICard label="SPI" value={e.SPI.toFixed(2)} variant={e.SPI >= 0.95 ? 'green' : e.SPI >= 0.85 ? 'amber' : 'red'} />
      </div>

      {/* EVM Quadrant SVG */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">EVM Quadrant</h2>
        <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
          {/* Quadrants */}
          <rect x="0" y="0" width="150" height="150" fill="#f0fdf4" className="dark:fill-emerald-950/30" />
          <rect x="150" y="0" width="150" height="150" fill="#fef3c7" className="dark:fill-amber-950/30" />
          <rect x="0" y="150" width="150" height="150" fill="#fef3c7" className="dark:fill-amber-950/30" />
          <rect x="150" y="150" width="150" height="150" fill="#fef2f2" className="dark:fill-red-950/30" />
          {/* Axes */}
          <line x1="150" y1="0" x2="150" y2="300" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
          <line x1="0" y1="150" x2="300" y2="150" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
          {/* Labels */}
          <text x="75" y="15" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="bold">Under Budget / Ahead</text>
          <text x="225" y="15" textAnchor="middle" fontSize="10" fill="#d97706" fontWeight="bold">Over Budget / Ahead</text>
          <text x="75" y="295" textAnchor="middle" fontSize="10" fill="#d97706" fontWeight="bold">Under Budget / Behind</text>
          <text x="225" y="295" textAnchor="middle" fontSize="10" fill="#dc2626" fontWeight="bold">Over Budget / Behind</text>
          {/* Position dot - map CPI (0.5-1.5) and SPI (0.5-1.5) to 300x300 */}
          {(() => {
            const cpiX = Math.max(0, Math.min(300, ((e.CPI - 0.5) / 1.0) * 300));
            const spiY = Math.max(0, Math.min(300, 300 - ((e.SPI - 0.5) / 1.0) * 300));
            const color = e.CPI >= 0.95 && e.SPI >= 0.95 ? '#16a34a' : e.CPI >= 0.85 && e.SPI >= 0.85 ? '#d97706' : '#dc2626';
            return (
              <>
                <circle cx={cpiX} cy={spiY} r="12" fill={color} opacity="0.2" />
                <circle cx={cpiX} cy={spiY} r="6" fill={color} />
                <text x={cpiX + 16} y={spiY - 4} fontSize="11" fontWeight="bold" fill={color}>CPI {e.CPI.toFixed(2)}</text>
                <text x={cpiX + 16} y={spiY + 10} fontSize="11" fontWeight="bold" fill={color}>SPI {e.SPI.toFixed(2)}</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* EVM Trend */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">EVM Trend</h2>
        <svg viewBox="0 0 600 200" className="w-full h-48">
          {(() => {
            const vals = e.trend.flatMap(t => [t.cumPlanned, t.cumActual ?? 0]);
            const maxVal = Math.max(...vals) * 1.1;
            const w = 560, h = 160, ox = 30, oy = 10;
            const pts = e.trend.map((t, i) => ({
              x: ox + (i / Math.max(e.trend.length - 1, 1)) * w,
              py: oy + h - (t.cumPlanned / maxVal) * h,
              ay: t.cumActual != null ? oy + h - (t.cumActual / maxVal) * h : null,
            }));
            const plannedPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.py}`).join(' ');
            const actualPts = pts.filter(p => p.ay != null);
            const actualPath = actualPts.length > 1 ? actualPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.ay}`).join(' ') : '';
            const nowX = pts[e.currentMonth - 1]?.x;

            return (
              <>
                <path d={plannedPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
                {actualPath && <path d={actualPath} fill="none" stroke="#0d9488" strokeWidth="2.5" />}
                {nowX != null && <line x1={nowX} y1={oy} x2={nowX} y2={oy + h} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />}
                {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.py} r="3" fill="#94a3b8" />)}
                {actualPts.map((p, i) => <circle key={`a${i}`} cx={p.x} cy={p.ay!} r="3" fill="#0d9488" />)}
              </>
            );
          })()}
        </svg>
      </div>

      {/* Resource Table */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Resource Detail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 text-left font-semibold">Resource</th>
                <th className="pb-2 text-right font-semibold">Plan Hrs</th>
                <th className="pb-2 text-right font-semibold">Actual Hrs</th>
                <th className="pb-2 text-right font-semibold">Planned $</th>
                <th className="pb-2 text-right font-semibold">Actual $</th>
                <th className="pb-2 text-right font-semibold">EV</th>
                <th className="pb-2 text-right font-semibold">Variance</th>
                <th className="pb-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {e.perResource.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{r.description}</td>
                  <td className="py-2 text-right tabular-nums">{formatNumber(r.planHoursToDate)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNumber(r.actualHoursToDate)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(r.plannedCost)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(r.actualCost)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(r.earnedValue)}</td>
                  <td className={cn('py-2 text-right tabular-nums font-semibold', r.variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                    {formatCurrency(r.variance)}
                  </td>
                  <td className="py-2 text-center">
                    <Badge className={cn(
                      'text-[10px]',
                      r.status === 'good' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                      r.status === 'warn' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                      r.status === 'bad' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                    )}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid gap-4 md:grid-cols-2">
        {e.CPI < 0.9 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Critical: Cost Performance</p>
            <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">CPI at {e.CPI.toFixed(2)} means you&apos;re spending ${((1 / e.CPI - 1) * 100).toFixed(0)}% more than planned. Immediate cost review required. Consider reducing scope or renegotiating rates.</p>
          </div>
        )}
        {e.SPI < 0.9 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Critical: Schedule Performance</p>
            <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">SPI at {e.SPI.toFixed(2)} indicates significant schedule delay. Consider adding resources or adjusting milestones.</p>
          </div>
        )}
        {e.VAC < 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Budget Overrun Warning</p>
            <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">VAC of {formatCurrency(e.VAC)} indicates estimated costs will exceed budget by {formatCurrency(Math.abs(e.VAC))}. Prepare a contingency request.</p>
          </div>
        )}
        {e.CPI >= 0.9 && e.SPI >= 0.9 && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">✓ Performance Acceptable</p>
            <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">CPI and SPI are within 10% of target. Continue current approach and monitor weekly.</p>
          </div>
        )}
      </div>
    </div>
  );
}