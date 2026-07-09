'use client';
import { useTCTPStore } from '@/lib/tctp-store';
import { formatCurrency, cn, CATEGORIES } from '@/lib/tctp-utils';
import type { PageKey, Category } from '@/lib/tctp-types';
import {
  LayoutDashboard, Settings, DollarSign, Clock, Sliders, BarChart3, Target, FileText,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'project-setup', label: 'Project Setup', icon: Settings },
  { key: 'costs', label: 'Cost Inputs', icon: DollarSign },
  { key: 'time-tracking', label: 'Time Tracking', icon: Clock },
  { key: 'assumptions', label: 'Assumptions', icon: Sliders },
  { key: 'analysis', label: 'Analysis', icon: BarChart3 },
  { key: 'evm', label: 'EVM', icon: Target },
  { key: 'report', label: 'Report', icon: FileText },
];

export function Sidebar() {
  const { activePage, setActivePage, costItems, project, getComputed } = useTCTPStore();
  const computed = getComputed();
  const f = computed.financial;

  return (
    <aside className="hidden w-[280px] shrink-0 border-r bg-white dark:bg-zinc-900 dark:border-zinc-800 lg:block">
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="p-4 space-y-6">
          {/* Navigation */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation</p>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const active = activePage === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActivePage(item.key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-teal-600 text-white dark:bg-teal-700'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <Separator />

          {/* Cost Categories */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cost Categories</p>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const count = (costItems[cat.key] ?? []).length;
                return (
                  <div key={cat.key} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm">{cat.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Totals</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly</span>
                <span className="font-semibold tabular-nums">{formatCurrency(f.totalMonthly, project.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Project</span>
                <span className="font-bold tabular-nums">{formatCurrency(f.totalProject, project.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost/Unit</span>
                <span className="font-semibold tabular-nums">{formatCurrency(f.costPerUnit, project.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
