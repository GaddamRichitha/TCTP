import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

type MetricVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'teal';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: MetricVariant;
  trend?: 'up' | 'down';
}

const VARIANT_STYLES: Record<MetricVariant, string> = {
  default: 'border-border bg-surface',
  blue: 'border-blue-200 bg-blue-50',
  green: 'border-green-200 bg-green-50',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
  purple: 'border-purple-200 bg-purple-50',
  teal: 'border-teal-200 bg-teal-50',
};

export default function MetricCard({
  label,
  value,
  sub,
  variant = 'default',
  trend,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition',
        VARIANT_STYLES[variant],
      )}
    >
      <p className="text-xs font-medium text-ink-3">{label}</p>

      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-2xl font-extrabold tracking-tight text-ink"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>

        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold',
              trend === 'up' ? 'text-green-600' : 'text-red-600',
            )}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
          </span>
        )}
      </div>

      {sub && <p className="mt-1 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}