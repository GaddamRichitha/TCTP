import {
  LayoutDashboard,
  Calculator,
  Target,
  BarChart3,
  FileText,
} from 'lucide-react';
import type { CategoryTotals } from '@/types';
import { CATEGORIES, formatCurrency, cn } from '@/lib/utils';

type PageKey = 'dashboard' | 'costs' | 'assumptions' | 'analysis' | 'report';

interface SidebarProps {
  activePage: PageKey;
  onPageChange: (page: PageKey) => void;
  catCounts: Record<string, number>;
  totals: CategoryTotals | null;
  currency: string;
}

const NAV_ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'costs', label: 'Cost Inputs', icon: Calculator },
  { key: 'assumptions', label: 'Assumptions', icon: Target },
  { key: 'analysis', label: 'Analysis', icon: BarChart3 },
  { key: 'report', label: 'Report', icon: FileText },
];

export default function Sidebar({
  activePage,
  onPageChange,
  catCounts,
  totals,
  currency,
}: SidebarProps) {
  // Aggregate totals across all categories
  const totalMonthly = totals
    ? Object.values(totals).reduce((s, c) => s + c.monthly, 0)
    : 0;
  const totalProject = totals
    ? Object.values(totals).reduce((s, c) => s + c.total, 0)
    : 0;

  return (
    <aside className="sidebar sticky top-[52px] hidden h-[calc(100vh-52px)] w-[280px] flex-shrink-0 flex-col border-r border-border bg-surface overflow-y-auto custom-scroll lg:flex print:hidden">
      {/* Navigation */}
      <div className="px-3 pt-4 pb-2">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Navigation
        </p>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onPageChange(item.key)}
                className={cn(
                  'flex items-center gap-3 rounded-r-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'border-l-[3px] border-l-blue-500 bg-blue-50 text-blue-700'
                    : 'border-l-[3px] border-l-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Cost Categories */}
      <div className="border-t border-border px-3 pt-3 pb-2">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Cost Categories
        </p>
        <div className="flex flex-col gap-0.5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center gap-3 px-3 py-1.5 text-sm text-ink-2"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1">{cat.label}</span>
              <span className="text-xs tabular-nums text-ink-3">
                {catCounts[cat.key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals card */}
      <div className="mt-auto border-t border-border p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Totals
        </p>
        <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3">Monthly Total</span>
            <span className="text-sm font-bold tabular-nums text-ink">
              {formatCurrency(totalMonthly, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3">Project Total</span>
            <span className="text-sm font-bold tabular-nums text-ink">
              {formatCurrency(totalProject, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3">Cost / Unit</span>
            <span className="text-sm font-bold tabular-nums text-ink">
              {totalProject > 0
                ? formatCurrency(totalProject, currency)
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export type { PageKey };