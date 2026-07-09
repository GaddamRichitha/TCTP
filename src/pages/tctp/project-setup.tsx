'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';

export default function ProjectSetupPage() {
  const { project, setProjectField } = useTCTPStore();
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof typeof project>(key: K, val: (typeof project)[K]) => {
    setProjectField(key, val);
    setSaved(true);
  };

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [saved, project]);

  const field = (label: string, key: keyof typeof project, type: 'text' | 'number' = 'text') => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={project[key]}
        onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="h-9"
      />
    </div>
  );

  const slider = (label: string, key: keyof typeof project, min: number, max: number, step = 1) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
        <span className="text-sm font-bold tabular-nums">{project[key]}</span>
      </div>
      <Slider
        value={[project[key] as number]}
        onValueChange={([v]) => update(key, v)}
        min={min} max={max} step={step}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Setup</h1>
          <p className="text-sm text-muted-foreground">Configure project parameters and financial assumptions</p>
        </div>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Auto-saved</span>}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-semibold">General Settings</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {field('Project Name', 'name')}
          {field('Description', 'description')}
          {slider('Duration (months)', 'duration', 1, 36)}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
            <Select value={project.currency} onValueChange={(v) => update('currency', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="$">$ USD</SelectItem>
                <SelectItem value="€">€ EUR</SelectItem>
                <SelectItem value="£">£ GBP</SelectItem>
                <SelectItem value="¥">¥ JPY</SelectItem>
                <SelectItem value="₹">₹ INR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field('Unit Label', 'unitLabel')}
          {slider('Current Month', 'currentMonth', 0, project.duration)}
          {slider('Standard Hours/Month', 'standardHours', 80, 240, 8)}
        </div>

        <h2 className="text-sm font-semibold pt-2">Financial Targets</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {slider('Target Margin (%)', 'targetMargin', 0, 80)}
          {slider('Target Volume', 'targetVolume', 10, 10000, 10)}
          {slider('Sales Period (months)', 'salesPeriod', 1, 36)}
          {slider('Churn Rate (%/mo)', 'churnRate', 0, 20, 0.5)}
          {slider('Growth Rate (%/yr)', 'growthRate', 0, 100)}
          {slider('Cost Buffer (%)', 'costBuffer', 0, 50)}
        </div>

        <h2 className="text-sm font-semibold pt-2">Decision Thresholds</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {slider('Min ROI (%)', 'minROI', 0, 100)}
          {slider('Max Payback (months)', 'maxPayback', 1, 60)}
          {slider('Min Margin (%)', 'minMargin', 0, 80)}
          {field('Selling Price Override', 'sellingPriceOverride', 'number')}
        </div>
      </div>
    </div>
  );
}