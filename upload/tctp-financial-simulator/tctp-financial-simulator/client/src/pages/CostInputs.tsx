
import { useEffect, useState, useCallback, useRef } from 'react';
import type { Project, CostItem, TimeLog, Category, CostType, RateBasis } from '@/types';
import {
  getCostItems,
  createCostItem,
  updateCostItem,
  deleteCostItem,
  getTimeLogs,
  upsertTimeLog,
} from '@/lib/api';
import {
  Users,
  Server,
  Plug,
  Brain,
  Building,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';

// ── Category meta ─────────────────────────────────────────────
const categoryMeta: { key: Category; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'labour', label: 'Labour', icon: <Users className="h-4 w-4" />, color: 'text-blue-600' },
  { key: 'infra', label: 'Infrastructure', icon: <Server className="h-4 w-4" />, color: 'text-teal-600' },
  { key: 'apis', label: 'APIs & Services', icon: <Plug className="h-4 w-4" />, color: 'text-amber-600' },
  { key: 'llm', label: 'LLM / AI', icon: <Brain className="h-4 w-4" />, color: 'text-purple-600' },
  { key: 'overhead', label: 'Overhead', icon: <Building className="h-4 w-4" />, color: 'text-red-600' },
];

// ── Helpers ───────────────────────────────────────────────────
function getRowMonthlyCost(row: CostItem): number {
  if (row.rate_basis === 'hourly') {
    return (Number(row.rate) || 0) * (Number(row.planned_hours) || 0);
  }
  return Number(row.rate) || 0;
}

function computeRowTotal(row: CostItem, duration: number): string {
  const qty = Number(row.quantity) || 0;
  if (row.cost_type === 'monthly') {
    return (getRowMonthlyCost(row) * qty).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (row.cost_type === 'onetime') {
    return ((Number(row.rate) || 0) * qty).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  // perunit
  return ((Number(row.rate) || 0) * qty).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '/unit';
}

function useDebounce() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounce = useCallback((fn: () => void, ms = 500) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);
  return debounce;
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  projectId: number;
  project: Project;
  onCostChange: () => void;
}

export default function CostInputs({ projectId, project, onCostChange }: Props) {
  const [activeTab, setActiveTab] = useState<Category>('labour');
  const [items, setItems] = useState<CostItem[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const debounce = useDebounce();

  // Fetch cost items and time logs when tab changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getCostItems(projectId, activeTab), getTimeLogs(projectId)])
      .then(([costItems, logs]) => {
        if (!cancelled) {
          setItems(costItems);
          setTimeLogs(logs);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, activeTab]);

  // ── Handlers ────────────────────────────────────────────────
  const handleAddRow = async () => {
    const newItem = await createCostItem(projectId, {
      category: activeTab,
      description: '',
      cost_type: 'monthly',
      rate: 0,
      quantity: 1,
      rate_basis: activeTab === 'labour' ? 'monthly' : 'monthly',
      planned_hours: null,
      sort_order: items.length,
    });
    setItems((prev) => [...prev, newItem]);
    onCostChange();
  };

  const handleDeleteRow = async (id: number) => {
    await deleteCostItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    onCostChange();
  };

  const handleFieldChange = (id: number, field: string, value: string | number | null) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return updated;
      })
    );

    debounce(async () => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await updateCostItem(id, { [field]: value } as Partial<CostItem>);
      onCostChange();
    });
  };

  const handleTimeLogChange = async (costItemId: number, month: number, hours: number) => {
    setTimeLogs((prev) => {
      const existing = prev.find((l) => l.cost_item_id === costItemId && l.month === month);
      if (existing) {
        return prev.map((l) =>
          l.cost_item_id === costItemId && l.month === month ? { ...l, actual_hours: hours } : l
        );
      }
      return [
        ...prev,
        {
          id: 0,
          cost_item_id: costItemId,
          month,
          actual_hours: hours,
          notes: '',
          created_at: '',
          updated_at: '',
        },
      ];
    });

    debounce(async () => {
      await upsertTimeLog(costItemId, { month, actual_hours: hours });
      onCostChange();
    }, 800);
  };

  // ── Time log lookup ─────────────────────────────────────────
  function getTimeLogFor(costItemId: number, month: number): number {
    return timeLogs.find((l) => l.cost_item_id === costItemId && l.month === month)?.actual_hours ?? 0;
  }

  // ── Compute actual total per resource ───────────────────────
  function getActualTotal(costItemId: number): number {
    let total = 0;
    for (let m = 1; m <= project.current_month; m++) {
      total += getTimeLogFor(costItemId, m);
    }
    return total;
  }

  function getPlannedTotal(item: CostItem): number {
    const hrsPerMonth = item.rate_basis === 'hourly' ? (item.planned_hours ?? 160) : 160;
    return hrsPerMonth * (Number(item.quantity) || 1) * project.current_month;
  }

  // ── Type badge ──────────────────────────────────────────────
  function TypeBadge({ type }: { type: CostType }) {
    const styles: Record<CostType, string> = {
      monthly: 'bg-blue-100 text-blue-700',
      onetime: 'bg-amber-100 text-amber-700',
      perunit: 'bg-purple-100 text-purple-700',
    };
    const labels: Record<CostType, string> = {
      monthly: 'Monthly',
      onetime: 'One-time',
      perunit: 'Per-unit',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  }

  const isLabour = activeTab === 'labour';
  const filteredTimeLogItems = items.filter((i) => i.category === 'labour');

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-[#0f1923]">Cost Inputs</h2>
        <p className="mt-1 text-sm text-[#7a8fa0]">Add and manage your project cost items by category</p>
      </div>

      {/* ── Category Tabs ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {categoryMeta.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === cat.key
                ? 'border-[#0f1923] bg-[#0f1923] text-white'
                : 'border-[#dde4eb] bg-white text-[#3d4f5c] hover:bg-gray-50'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Cost Items Table ──────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde4eb] text-left text-[11px] uppercase text-[#7a8fa0] tracking-wider">
                  <th className="pb-2 pr-3 font-semibold">Description</th>
                  <th className="pb-2 pr-3 font-semibold">Type</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Rate</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Qty</th>
                  {isLabour && <th className="pb-2 pr-3 font-semibold">Rate Basis</th>}
                  {isLabour && <th className="pb-2 pr-3 text-right font-semibold">Planned Hrs</th>}
                  <th className="pb-2 pr-3 text-right font-semibold">{isLabour ? 'Monthly' : 'Total'}</th>
                  <th className="pb-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        className="w-full bg-transparent border-0 p-0 text-sm text-[#0f1923] font-medium focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                        value={item.description}
                        onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        className="bg-transparent border-0 p-0 text-sm focus:outline-none cursor-pointer"
                        value={item.cost_type}
                        onChange={(e) => handleFieldChange(item.id, 'cost_type', e.target.value as CostType)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="onetime">One-time</option>
                        <option value="perunit">Per-unit</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-24 bg-transparent border-0 p-0 text-sm text-right tabular-nums text-[#3d4f5c] focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                        value={item.rate}
                        onChange={(e) => handleFieldChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-16 bg-transparent border-0 p-0 text-sm text-right tabular-nums text-[#3d4f5c] focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                        value={item.quantity}
                        onChange={(e) => handleFieldChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    {isLabour && (
                      <td className="py-2 pr-3">
                        <select
                          className="bg-transparent border-0 p-0 text-sm focus:outline-none cursor-pointer"
                          value={item.rate_basis}
                          onChange={(e) => handleFieldChange(item.id, 'rate_basis', e.target.value as RateBasis)}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="hourly">Hourly</option>
                        </select>
                      </td>
                    )}
                    {isLabour && (
                      <td className="py-2 pr-3 text-right">
                        {item.rate_basis === 'hourly' ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-20 bg-transparent border-0 p-0 text-sm text-right tabular-nums text-[#3d4f5c] focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                            value={item.planned_hours ?? ''}
                            placeholder="—"
                            onChange={(e) =>
                              handleFieldChange(
                                item.id,
                                'planned_hours',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        ) : (
                          <span className="text-[#7a8fa0]">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-2 pr-3 text-right tabular-nums font-medium text-[#0f1923]">
                      {computeRowTotal(item, project.duration)}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDeleteRow(item.id)}
                        className="rounded p-1 text-[#7a8fa0] hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Row Button */}
            <button
              onClick={handleAddRow}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#dde4eb] py-2.5 text-sm font-medium text-[#7a8fa0] hover:border-[#0f1923] hover:text-[#0f1923] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
          </div>
        )}
      </div>

      {/* ── Time Tracking Section (Labour only) ───────────────── */}
      {isLabour && (
        <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
            <Clock className="h-4 w-4 text-[#7a8fa0]" />
            Time Tracking
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredTimeLogItems.length === 0 ? (
            <p className="text-sm text-[#7a8fa0]">No labour resources to track.</p>
          ) : (
            <div className="max-h-96 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dde4eb] text-left text-[11px] uppercase text-[#7a8fa0] tracking-wider">
                    <th className="pb-2 pr-3 font-semibold sticky left-0 bg-white min-w-[180px]">Resource</th>
                    {Array.from({ length: project.duration }, (_, i) => i + 1).map((m) => (
                      <th key={m} className={`pb-2 pr-2 text-right font-semibold min-w-[56px] ${m === project.current_month ? 'text-blue-600' : ''}`}>
                        M{m}
                      </th>
                    ))}
                    <th className="pb-2 pr-3 text-right font-semibold min-w-[72px]">Total Actual</th>
                    <th className="pb-2 font-semibold min-w-[72px]">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimeLogItems.map((item) => {
                    const actualTotal = getActualTotal(item.id);
                    const plannedTotal = getPlannedTotal(item);
                    const variance = actualTotal - plannedTotal;

                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 pr-3 font-medium text-[#0f1923] sticky left-0 bg-white whitespace-nowrap">
                          {item.description}
                        </td>
                        {Array.from({ length: project.duration }, (_, i) => i + 1).map((m) => {
                          const isPast = m < project.current_month;
                          const isCurrent = m === project.current_month;
                          const val = getTimeLogFor(item.id, m);

                          return (
                            <td
                              key={m}
                              className={`py-2 pr-2 text-right ${isCurrent ? 'border-l-2 border-l-blue-500' : ''} ${isPast ? 'opacity-60' : ''}`}
                            >
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="w-14 bg-transparent border-0 p-0 text-sm text-right tabular-nums text-[#3d4f5c] focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                                value={val || ''}
                                placeholder="—"
                                onChange={(e) =>
                                  handleTimeLogChange(item.id, m, parseFloat(e.target.value) || 0)
                                }
                              />
                            </td>
                          );
                        })}
                        <td className="py-2 pr-3 text-right tabular-nums font-medium text-[#0f1923]">
                          {actualTotal.toFixed(1)}
                        </td>
                        <td className="py-2">
                          <span
                            className={`tabular-nums text-sm font-semibold ${
                              variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-[#3d4f5c]'
                            }`}
                          >
                            {variance > 0 ? '+' : ''}
                            {variance.toFixed(1)}h
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}