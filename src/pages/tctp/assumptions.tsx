'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { KPICard } from '@/components/tctp/kpi-card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatPercent } from '@/lib/tctp-utils';

export default function AssumptionsPage() {
  const { project, setProjectField, getComputed } = useTCTPStore();
  const f = getComputed().financial;

  const s = <K extends keyof typeof project>(key: K, val: (typeof project)[K]) => setProjectField(key, val);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Assumptions</h1>
        <p className="text-sm text-muted-foreground">Configure pricing strategy and scenario variables</p>
      </div>

      {/* Pricing Strategy */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold">Pricing Strategy</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Margin</Label>
              <span className="text-sm font-bold tabular-nums">{project.targetMargin}%</span>
            </div>
            <Slider value={[project.targetMargin]} onValueChange={([v]) => s('targetMargin', v)} min={0} max={80} step={1} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Volume</Label>
              <Input type="number" value={project.targetVolume} onChange={(e) => s('targetVolume', Number(e.target.value))} className="h-9 tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
              <Input value={project.currency} onChange={(e) => s('currency', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Label</Label>
              <Input value={project.unitLabel} onChange={(e) => s('unitLabel', e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales Period (months)</Label>
            <Input type="number" value={project.salesPeriod} onChange={(e) => s('salesPeriod', Number(e.target.value))} className="h-9 w-32 tabular-nums" />
          </div>
        </div>
      </div>

      {/* Scenario Variables */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold">Scenario Variables</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            { key: 'churnRate' as const, label: 'Churn Rate (%/mo)', min: 0, max: 20, step: 0.5 },
            { key: 'growthRate' as const, label: 'Growth Rate (%/yr)', min: 0, max: 100, step: 1 },
            { key: 'costBuffer' as const, label: 'Cost Buffer (%)', min: 0, max: 50, step: 1 },
            { key: 'minROI' as const, label: 'Min ROI (%)', min: 0, max: 100, step: 1 },
            { key: 'maxPayback' as const, label: 'Max Payback (mo)', min: 1, max: 60, step: 1 },
            { key: 'minMargin' as const, label: 'Min Margin (%)', min: 0, max: 80, step: 1 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
                <span className="text-sm font-bold tabular-nums">{project[key]}{key === 'churnRate' || key === 'growthRate' || key === 'costBuffer' || key === 'minROI' || key === 'minMargin' ? '%' : ''}</span>
              </div>
              <Slider value={[project[key]]} onValueChange={([v]) => s(key, v)} min={min} max={max} step={step} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selling Price Override (0 = auto)</Label>
          <Input type="number" value={project.sellingPriceOverride || ''} onChange={(e) => s('sellingPriceOverride', Number(e.target.value))} placeholder="Auto-derived" className="h-9 w-40 tabular-nums" />
        </div>
      </div>

      {/* Derived Outputs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Derived Price" value={formatCurrency(f.derivedPrice, project.currency)} variant="teal" />
        <KPICard label="Selling Price" value={formatCurrency(f.sellingPrice, project.currency)} />
        <KPICard label="Cost/Unit" value={formatCurrency(f.costPerUnit, project.currency)} variant="amber" />
        <KPICard label="Gross Margin" value={formatPercent(f.grossMarginPct)} variant={f.grossMarginPct >= project.minMargin ? 'green' : 'red'} />
      </div>
    </div>
  );
}