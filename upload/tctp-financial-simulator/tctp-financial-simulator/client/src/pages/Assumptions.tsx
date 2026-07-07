
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Project } from '@/types';
import { updateProject, getSummary } from '@/lib/api';
import {
  Target,
  TrendingUp,
  DollarSign,
  Percent,
  Save,
  Info,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
function fmt(n: number, currency = '$'): string {
  if (n === Infinity) return '∞';
  if (Math.abs(n) >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}K`;
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Range Slider Component ────────────────────────────────────
function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#0f1923]">{label}</label>
        <span className="tabular-nums text-sm font-bold text-[#0f1923]">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 accent-[#0f1923]"
          style={{
            background: `linear-gradient(to right, #0f1923 0%, #0f1923 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
          }}
        />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  projectId: number;
  project: Project;
  onProjectUpdate: (p: Project) => void;
}

export default function Assumptions({ projectId, project, onProjectUpdate }: Props) {
  // Local state mirrors project fields
  const [margin, setMargin] = useState(project.target_margin);
  const [volume, setVolume] = useState(project.target_volume);
  const [currency, setCurrency] = useState(project.currency);
  const [unitLabel, setUnitLabel] = useState(project.unit_label);
  const [salesPeriod, setSalesPeriod] = useState(project.sales_period);
  const [churnRate, setChurnRate] = useState(project.churn_rate);
  const [growthRate, setGrowthRate] = useState(project.growth_rate);
  const [costBuffer, setCostBuffer] = useState(project.cost_buffer);
  const [minROI, setMinROI] = useState(project.min_roi);
  const [maxPayback, setMaxPayback] = useState(project.max_payback);
  const [minMargin, setMinMargin] = useState(project.min_margin);
  const [sellingPriceOverride, setSellingPriceOverride] = useState(project.selling_price ?? 0);

  // Derived values
  const [derivedPrice, setDerivedPrice] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [targetRevenue, setTargetRevenue] = useState(0);
  const [churnImpact, setChurnImpact] = useState(0);
  const [computed, setComputed] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounce = useCallback((fn: () => void, ms = 500) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, ms);
  }, []);

  // Re-derive when inputs change
  useEffect(() => {
    // We need the summary data to compute derived values
    // For live derivation, compute locally from available data
    // We'll fetch summary for accurate values
    let cancelled = false;

    const computeDerived = async () => {
      try {
        const summary = await getSummary(projectId);
        if (cancelled) return;

        const cpu = summary.pricing.costPerUnit;
        const dp = summary.pricing.derivedPrice;
        const tr = summary.revenue.targetRevenue;
        const churned = summary.churnedUnits;

        setCostPerUnit(cpu);
        setDerivedPrice(sellingPriceOverride > 0 ? sellingPriceOverride : dp);
        setTargetRevenue(tr);
        setChurnImpact(churned);
        setComputed(true);
      } catch {
        // fallback: local calculation
        setComputed(false);
      }
    };

    computeDerived();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, margin, volume, salesPeriod, sellingPriceOverride]);

  // Auto-save on any change
  const saveProject = useCallback(
    (updates: Partial<Project>) => {
      debounce(async () => {
        try {
          const updated = await updateProject(projectId, updates);
          onProjectUpdate(updated);
        } catch {
          // silent fail for auto-save
        }
      }, 600);
    },
    [projectId, onProjectUpdate, debounce]
  );

  const handleMarginChange = (v: number) => {
    setMargin(v);
    saveProject({ target_margin: v });
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    saveProject({ target_volume: v });
  };

  const handleCurrencyChange = (v: string) => {
    setCurrency(v);
    saveProject({ currency: v });
  };

  const handleUnitLabelChange = (v: string) => {
    setUnitLabel(v);
    saveProject({ unit_label: v });
  };

  const handleSalesPeriodChange = (v: number) => {
    setSalesPeriod(v);
    saveProject({ sales_period: v });
  };

  const handleChurnChange = (v: number) => {
    setChurnRate(v);
    saveProject({ churn_rate: v });
  };

  const handleGrowthChange = (v: number) => {
    setGrowthRate(v);
    saveProject({ growth_rate: v });
  };

  const handleBufferChange = (v: number) => {
    setCostBuffer(v);
    saveProject({ cost_buffer: v });
  };

  const handleMinROIChange = (v: number) => {
    setMinROI(v);
    saveProject({ min_roi: v });
  };

  const handleMaxPaybackChange = (v: number) => {
    setMaxPayback(v);
    saveProject({ max_payback: v });
  };

  const handleMinMarginChange = (v: number) => {
    setMinMargin(v);
    saveProject({ min_margin: v });
  };

  const handleSellingPriceChange = (v: number) => {
    setSellingPriceOverride(v);
    saveProject({ selling_price: v > 0 ? v : null });
  };

  // ── Save button (explicit) ───────────────────────────────────
  const handleSave = async () => {
    try {
      const updated = await updateProject(projectId, {
        target_margin: margin,
        target_volume: volume,
        currency,
        unit_label: unitLabel,
        sales_period: salesPeriod,
        churn_rate: churnRate,
        growth_rate: growthRate,
        cost_buffer: costBuffer,
        min_roi: minROI,
        max_payback: maxPayback,
        min_margin: minMargin,
        selling_price: sellingPriceOverride > 0 ? sellingPriceOverride : null,
      });
      onProjectUpdate(updated);
    } catch {
      // handled silently
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Pricing Strategy Card ──────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <Target className="h-4 w-4 text-[#7a8fa0]" />
          Pricing Strategy
        </div>

        {/* Target profit margin slider */}
        <div className="mb-4">
          <RangeSlider
            label="Target profit margin"
            value={margin}
            min={1}
            max={90}
            onChange={handleMarginChange}
          />
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#7a8fa0]">
            <Info className="h-3 w-3" />
            Derived selling price = Cost per unit ÷ (1 – margin%)
          </div>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1923]">Target volume</label>
            <input
              type="number"
              min={1}
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg border border-[#dde4eb] bg-white px-3 py-2 text-sm tabular-nums text-[#0f1923] focus:border-[#0f1923] focus:outline-none focus:ring-1 focus:ring-[#0f1923]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1923]">Currency</label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full rounded-lg border border-[#dde4eb] bg-white px-3 py-2 text-sm text-[#0f1923] focus:border-[#0f1923] focus:outline-none focus:ring-1 focus:ring-[#0f1923]/20"
            >
              <option value="$">$</option>
              <option value="€">€</option>
              <option value="£">£</option>
              <option value="₹">₹</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1923]">Unit label</label>
            <input
              type="text"
              value={unitLabel}
              onChange={(e) => handleUnitLabelChange(e.target.value)}
              className="w-full rounded-lg border border-[#dde4eb] bg-white px-3 py-2 text-sm text-[#0f1923] focus:border-[#0f1923] focus:outline-none focus:ring-1 focus:ring-[#0f1923]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1923]">Sales period (months)</label>
            <input
              type="number"
              min={1}
              value={salesPeriod}
              onChange={(e) => handleSalesPeriodChange(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg border border-[#dde4eb] bg-white px-3 py-2 text-sm tabular-nums text-[#0f1923] focus:border-[#0f1923] focus:outline-none focus:ring-1 focus:ring-[#0f1923]/20"
            />
          </div>
        </div>
      </div>

      {/* ── Scenario Variables Card ────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <TrendingUp className="h-4 w-4 text-[#7a8fa0]" />
          Scenario Variables
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <RangeSlider label="Monthly churn rate" value={churnRate} min={0} max={30} onChange={handleChurnChange} />
          <RangeSlider label="Monthly growth rate" value={growthRate} min={0} max={50} onChange={handleGrowthChange} />
          <RangeSlider label="Cost buffer" value={costBuffer} min={0} max={50} onChange={handleBufferChange} />
          <RangeSlider label="Min ROI threshold" value={minROI} min={0} max={100} onChange={handleMinROIChange} />
          <RangeSlider label="Max payback period" value={maxPayback} min={6} max={60} onChange={handleMaxPaybackChange} unit="mo" />
          <RangeSlider label="Min margin threshold" value={minMargin} min={0} max={100} onChange={handleMinMarginChange} />
        </div>

        {/* Manual selling price override */}
        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-[#0f1923]">
            Manual selling price override
            <span className="ml-2 text-xs font-normal text-[#7a8fa0]">(0 = auto-derive)</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={sellingPriceOverride || ''}
            placeholder="0 = auto-derive"
            onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-[#dde4eb] bg-white px-3 py-2 text-sm tabular-nums text-[#0f1923] focus:border-[#0f1923] focus:outline-none focus:ring-1 focus:ring-[#0f1923]/20"
          />
        </div>
      </div>

      {/* ── Live Derived Outputs Card ──────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <DollarSign className="h-4 w-4 text-[#7a8fa0]" />
          Live Derived Outputs
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Derived price */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="text-[11px] uppercase font-semibold text-blue-600/70 tracking-wider">
              Derived Price
            </div>
            {!computed ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-blue-700">
                {fmt(derivedPrice, currency)}
              </div>
            )}
            <div className="mt-1 text-xs text-blue-600/70">per {unitLabel.toLowerCase().slice(0, -1) || 'unit'}</div>
          </div>

          {/* Cost per unit */}
          <div className="rounded-lg border border-[#dde4eb] bg-white p-4">
            <div className="mc-label text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
              Cost Per Unit
            </div>
            {!computed ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mc-value mt-1 text-2xl font-extrabold tabular-nums text-[#0f1923]">
                {fmt(costPerUnit, currency)}
              </div>
            )}
            <div className="mc-sub mt-1 text-xs text-[#7a8fa0]">at base volume</div>
          </div>

          {/* Target revenue */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="text-[11px] uppercase font-semibold text-green-600/70 tracking-wider">
              Target Revenue
            </div>
            {!computed ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-green-700">
                {fmt(targetRevenue, currency)}
              </div>
            )}
            <div className="mt-1 text-xs text-green-600/70">base case</div>
          </div>

          {/* Churn impact */}
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <div className="text-[11px] uppercase font-semibold text-purple-600/70 tracking-wider">
              Effective Churn Impact
            </div>
            {!computed ? (
              <Skeleton className="mt-1 h-8 w-3/4" />
            ) : (
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-purple-700">
                {churnImpact.toLocaleString()}
              </div>
            )}
            <div className="mt-1 text-xs text-purple-600/70">{unitLabel.toLowerCase()} lost/yr</div>
          </div>
        </div>
      </div>

      {/* ── Save Button ────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f1923] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0f1923]/90 transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Assumptions
        </button>
      </div>
    </div>
  );
}