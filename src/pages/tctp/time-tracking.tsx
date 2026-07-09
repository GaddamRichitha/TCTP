'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { cn, formatNumber } from '@/lib/tctp-utils';
import { Input } from '@/components/ui/input';

export default function TimeTrackingPage() {
  const { project, costItems, actualHours, setActualHours } = useTCTPStore();
  const labour = costItems['labour'] ?? [];
  const cur = project.currentMonth;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <p className="text-sm text-muted-foreground">Track actual hours for labour resources (Month {cur} highlighted)</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/80">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-semibold sticky left-0 bg-muted/80 min-w-[160px]">Resource</th>
                <th className="px-3 py-3 font-semibold text-right">Plan/Mo</th>
                {Array.from({ length: project.duration }, (_, i) => (
                  <th
                    key={i + 1}
                    className={cn(
                      'px-3 py-3 font-semibold text-right min-w-[56px]',
                      i + 1 === cur && 'bg-teal-100 dark:bg-teal-900/50'
                    )}
                  >
                    M{i + 1}
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-right">Total Actual</th>
                <th className="px-3 py-3 font-semibold text-right">Plan to Date</th>
                <th className="px-3 py-3 font-semibold text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {labour.map((item) => {
                let totalActual = 0;
                for (let m = 1; m <= project.duration; m++) {
                  totalActual += actualHours[item.id]?.[m] ?? 0;
                }
                const planToDate = item.plannedHours * cur;
                const variance = totalActual - planToDate;

                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium sticky left-0 bg-card">{item.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.plannedHours}</td>
                    {Array.from({ length: project.duration }, (_, i) => {
                      const m = i + 1;
                      const val = actualHours[item.id]?.[m] ?? 0;
                      return (
                        <td key={m} className={cn('px-3 py-1 text-right', m === cur && 'bg-teal-50/50 dark:bg-teal-950/30')}>
                          <Input
                            type="number"
                            value={val || ''}
                            onChange={(e) => setActualHours(item.id, m, Number(e.target.value))}
                            placeholder="—"
                            className={cn(
                              'h-7 w-14 border-0 bg-transparent p-0 text-right shadow-none tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0',
                              m === cur && 'font-bold'
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(totalActual)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(planToDate)}</td>
                    <td className={cn('px-3 py-2 text-right tabular-nums font-semibold', variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                      {variance >= 0 ? '+' : ''}{formatNumber(variance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}