'use client';
import { useRef } from 'react';
import { useTCTPStore } from '@/lib/tctp-store';
import { KPICard } from '@/components/tctp/kpi-card';
import { VerdictBox } from '@/components/tctp/verdict-box';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, Printer, FileJson } from 'lucide-react';
import { formatCurrency, formatPercent, formatMonths, formatNumber, cn, CATEGORIES } from '@/lib/tctp-utils';
import type { Category } from '@/lib/tctp-types';

export default function ReportPage() {
  const { project, costItems, getComputed } = useTCTPStore();
  const { financial: f, evm: e } = getComputed();
  const ref = useRef<HTMLDivElement>(null);

  const verdict: 'go' | 'caution' | 'nogo' =
    f.roi >= project.minROI && f.paybackMonths <= project.maxPayback && f.grossMarginPct >= project.minMargin
      ? 'go'
      : f.roi >= project.minROI * 0.7 || f.paybackMonths <= project.maxPayback * 1.3
        ? 'caution'
        : 'nogo';

  const exportCSV = () => {
    const rows: string[] = [['Category', 'Description', 'Rate', 'Qty', 'Type', 'Monthly Cost', 'Total']];
    for (const [cat, items] of Object.entries(costItems)) {
      for (const item of items) {
        const mc = item.costType === 'monthly' ? (item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate) * item.quantity : 0;
        const total = item.costType === 'monthly' ? mc * project.duration : item.costType === 'onetime' ? item.rate * item.quantity : 0;
        rows.push([cat, item.description, String(item.rate), String(item.quantity), item.costType, mc.toFixed(2), total.toFixed(2)]);
      }
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_costs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = { project, costItems, summary: f };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 max-w-5xl mx-auto" ref={ref}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Report</h1>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportCSV}><Table className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportJSON}><FileJson className="mr-2 h-4 w-4" />JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Project Overview */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Project Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium ml-1">{project.name}</span></div>
          <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium ml-1">{project.duration} months</span></div>
          <div><span className="text-muted-foreground">Target Volume:</span> <span className="font-medium ml-1">{project.targetVolume} {project.unitLabel.toLowerCase()}</span></div>
          <div><span className="text-muted-foreground">Current Month:</span> <span className="font-medium ml-1">{project.currentMonth} of {project.duration}</span></div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Cost Summary</h2>
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
                  <td className="py-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />{cat.label}</td>
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

      {/* Pricing & Profitability */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Selling Price" value={formatCurrency(f.sellingPrice)} variant="teal" />
        <KPICard label="Gross Margin" value={formatPercent(f.grossMarginPct)} variant={f.grossMarginPct >= project.minMargin ? 'green' : 'red'} />
        <KPICard label="Net Profit" value={formatCurrency(f.netProfit)} variant={f.netProfit >= 0 ? 'green' : 'red'} />
        <KPICard label="ROI" value={formatPercent(f.roi)} variant={f.roi >= project.minROI ? 'green' : 'amber'} />
      </div>

      {/* EVM Summary */}
      {e && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">EVM Summary (Month {e.currentMonth})</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">CPI:</span> <span className="font-bold ml-1">{e.CPI.toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">SPI:</span> <span className="font-bold ml-1">{e.SPI.toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">EAC:</span> <span className="font-bold ml-1">{formatCurrency(e.EAC)}</span></div>
            <div><span className="text-muted-foreground">CV:</span> <span className={cn('font-bold ml-1', e.CV < 0 ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(e.CV)}</span></div>
            <div><span className="text-muted-foreground">SV:</span> <span className={cn('font-bold ml-1', e.SV < 0 ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(e.SV)}</span></div>
            <div><span className="text-muted-foreground">VAC:</span> <span className={cn('font-bold ml-1', e.VAC < 0 ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(e.VAC)}</span></div>
          </div>
        </div>
      )}

      <VerdictBox
        verdict={verdict}
        description={`Overall financial viability: ROI ${formatPercent(f.roi)}, Margin ${formatPercent(f.grossMarginPct)}, Payback ${formatMonths(f.paybackMonths)}`}
      />

      {/* Decision Checklist */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Decision Checklist</h2>
        <div className="space-y-2">
          {[
            { label: `ROI ≥ ${project.minROI}%`, pass: f.roi >= project.minROI, detail: `Actual: ${formatPercent(f.roi)}` },
            { label: `Margin ≥ ${project.minMargin}%`, pass: f.grossMarginPct >= project.minMargin, detail: `Actual: ${formatPercent(f.grossMarginPct)}` },
            { label: `Payback ≤ ${project.maxPayback} months`, pass: f.paybackMonths <= project.maxPayback, detail: `Actual: ${formatMonths(f.paybackMonths)}` },
            { label: 'Net Profit positive', pass: f.netProfit >= 0, detail: `Actual: ${formatCurrency(f.netProfit)}` },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.pass ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs">✗</span>
              )}
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">— {item.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Formulas */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Key Formulas</h2>
        <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
          <p>Cost/Unit = Total Project Cost / Target Volume</p>
          <p>Derived Price = Cost/Unit / (1 - Target Margin%)</p>
          <p>Gross Margin = (Selling Price - Cost/Unit) / Selling Price × 100</p>
          <p>Break-even Units = Total Fixed Cost / (Selling Price - Per-unit Cost)</p>
          <p>ROI = Net Profit / Total Project Cost × 100</p>
          <p>CPI = Earned Value / Actual Cost</p>
          <p>SPI = Earned Value / Planned Value</p>
        </div>
      </div>

      {/* Assumptions Log */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Assumptions Log</h2>
        <div className="flex flex-wrap gap-2">
          {[
            `Duration: ${project.duration}mo`,
            `Volume: ${project.targetVolume}`,
            `Margin: ${project.targetMargin}%`,
            `Churn: ${project.churnRate}%/mo`,
            `Growth: ${project.growthRate}%/yr`,
            `Sales Period: ${project.salesPeriod}mo`,
            `Standard Hours: ${project.standardHours}/mo`,
            `Buffer: ${project.costBuffer}%`,
          ].map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Full Line Items */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-semibold">Full Line Items</h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80">
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
                <th className="px-4 py-2 text-right font-semibold">Rate</th>
                <th className="px-4 py-2 text-right font-semibold">Qty</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 text-right font-semibold">Monthly</th>
                <th className="px-4 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => {
                const items = costItems[cat.key] ?? [];
                return items.map((item) => {
                  const mc = item.costType === 'monthly' ? (item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate) * item.quantity : 0;
                  const total = item.costType === 'monthly' ? mc * project.duration : item.costType === 'onetime' ? item.rate * item.quantity : 0;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-1.5 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-muted-foreground">{cat.label}</span>
                      </td>
                      <td className="px-4 py-1.5">{item.description}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{formatCurrency(item.rate)}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.costType === 'monthly' ? 'Monthly' : item.costType === 'onetime' ? 'One-time' : 'Per-unit'}
                        </Badge>
                      </td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{formatCurrency(mc)}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums font-bold">{formatCurrency(total)}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}