'use client';
import { useState } from 'react';
import { useTCTPStore } from '@/lib/tctp-store';
import { formatCurrency, cn, CATEGORIES } from '@/lib/tctp-utils';
import type { Category, CostType } from '@/lib/tctp-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

const typeStyles: Record<CostType, string> = {
  monthly: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  onetime: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  perunit: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

export default function CostInputsPage() {
  const { project, costItems, addCostItem, updateCostItem, deleteCostItem } = useTCTPStore();
  const [activeCat, setActiveCat] = useState<Category>('labour');

  const items = costItems[activeCat] ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Cost Inputs</h1>
        <p className="text-sm text-muted-foreground">Manage cost items by category</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCat(cat.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border cursor-pointer',
              activeCat === cat.key
                ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.label}
            <span className="ml-0.5 text-xs opacity-60">({(costItems[cat.key] ?? []).length})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Qty</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Basis</th>
                <th className="px-4 py-3 font-semibold text-right">Hrs/Mo</th>
                <th className="px-4 py-3 font-semibold text-right">Monthly</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const mc = item.rateBasis === 'hourly' ? item.rate * item.plannedHours : item.rate;
                const monthly = item.costType === 'monthly' ? mc * item.quantity : 0;
                const total = item.costType === 'monthly'
                  ? monthly * project.duration
                  : item.costType === 'onetime'
                    ? item.rate * item.quantity
                    : 0;

                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateCostItem(activeCat, item.id, { description: e.target.value })}
                        className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateCostItem(activeCat, item.id, { rate: Number(e.target.value) })}
                        className="h-8 w-24 border-0 bg-transparent p-0 text-right shadow-none tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateCostItem(activeCat, item.id, { quantity: Number(e.target.value) })}
                        className="h-8 w-16 border-0 bg-transparent p-0 text-right shadow-none tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary" className={cn('text-[10px]', typeStyles[item.costType])}>
                        {item.costType === 'monthly' ? 'Monthly' : item.costType === 'onetime' ? 'One-time' : 'Per-unit'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.rateBasis}
                        onChange={(e) => updateCostItem(activeCat, item.id, { rateBasis: e.target.value as 'monthly' | 'hourly' })}
                        className="h-8 rounded border bg-transparent px-2 text-xs cursor-pointer"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input
                        type="number"
                        value={item.plannedHours}
                        onChange={(e) => updateCostItem(activeCat, item.id, { plannedHours: Number(e.target.value) })}
                        className="h-8 w-16 border-0 bg-transparent p-0 text-right shadow-none tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{formatCurrency(monthly)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">{formatCurrency(total)}</td>
                    <td className="px-4 py-2">
                      <Input
                        value={item.notes}
                        onChange={(e) => updateCostItem(activeCat, item.id, { notes: e.target.value })}
                        className="h-8 border-0 bg-transparent p-0 shadow-none text-xs text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 cursor-pointer"
                        onClick={() => deleteCostItem(activeCat, item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3">
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => addCostItem(activeCat)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Row
          </Button>
        </div>
      </div>
    </div>
  );
}