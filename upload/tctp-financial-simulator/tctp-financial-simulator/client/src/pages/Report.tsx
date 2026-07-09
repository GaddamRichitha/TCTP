
import { useEffect, useState, useCallback } from 'react';
import type { Project, FinancialSummary, EVMMetrics, SensitivityScenario } from '@/types';
import { getSummary, getEVM, getSensitivity } from '@/lib/api';
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Printer,
  Info,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
const catLabels = ['Labour', 'Infrastructure', 'APIs & Services', 'LLM Costs', 'Overhead'] as const;
const catKeys = ['labour', 'infra', 'apis', 'llm', 'overhead'] as const;

function fmt(n: number, currency = '$'): string {
  if (n === Infinity) return '∞';
  if (n === null) return 'N/A';
  if (Math.abs(n) >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}K`;
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDec(n: number, d = 2): string {
  if (n === Infinity || n === null) return '∞';
  return n.toFixed(d);
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// ── Verdict Box (same as Analysis) ────────────────────────────
function VerdictBox({
  verdict,
  description,
  loading,
}: {
  verdict: 'go' | 'caution' | 'nogo';
  description: string;
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-28 w-full" />;
  }

  const styles = {
    go: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      icon: <CheckCircle className="h-8 w-8 text-green-600" />,
      title: 'PROJECT IS VIABLE',
      titleColor: 'text-green-800',
      descColor: 'text-green-700',
    },
    caution: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      icon: <AlertTriangle className="h-8 w-8 text-amber-600" />,
      title: 'PROCEED WITH CAUTION',
      titleColor: 'text-amber-800',
      descColor: 'text-amber-700',
    },
    nogo: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      icon: <XCircle className="h-8 w-8 text-red-600" />,
      title: 'PROJECT NOT VIABLE',
      titleColor: 'text-red-800',
      descColor: 'text-red-700',
    },
  };

  const s = styles[verdict];

  return (
    <div className={`rounded-xl border-2 p-5 ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-3">
        {s.icon}
        <div>
          <div className={`text-xl font-extrabold tracking-wide ${s.titleColor}`}>{s.title}</div>
          <div className={`mt-1 text-sm leading-relaxed ${s.descColor}`}>{description}</div>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
interface Props {
  projectId: number;
  project: Project;
}

export default function Report({ projectId, project }: Props) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [evm, setEVM] = useState<EVMMetrics | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityScenario[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getSummary(projectId), getEVM(projectId), getSensitivity(projectId)])
      .then(([s, e, sen]) => {
        if (!cancelled) {
          setSummary(s);
          setEVM(e);
          setSensitivity(sen);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const c = project.currency;

  // ── Verdict ──────────────────────────────────────────────────
  const baseScenario = sensitivity?.scenarios.find((s) => s.volumeMultiplier === 0);
  const verdict: 'go' | 'caution' | 'nogo' = baseScenario?.verdict ?? 'caution';
  const roi = summary?.revenue.roi ?? 0;
  const payback = summary?.revenue.paybackMonths ?? 0;

  const verdictDesc = {
    go: `ROI ${fmtDec(roi)}%, payback ${fmtDec(payback, 1)}mo — all thresholds met.`,
    caution: `ROI ${fmtDec(roi)}%, payback ${fmtDec(payback, 1)}mo — some thresholds not fully met.`,
    nogo: `ROI ${fmtDec(roi)}%, payback ${payback === Infinity ? '∞' : `${fmtDec(payback, 1)}mo`} — does not meet viability criteria.`,
  };

  // ── Export CSV ───────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (!summary) return;

    const rows: string[][] = [];

    // Header
    rows.push(['TCTP Financial Simulator — Report']);
    rows.push([`Project: ${project.name}`, `Date: ${new Date().toLocaleDateString()}`]);
    rows.push([]);

    // Project overview
    rows.push(['Project Overview']);
    rows.push(['Field', 'Value']);
    rows.push(['Project Name', project.name]);
    rows.push(['Description', project.description || '—']);
    rows.push(['Duration', `${project.duration} months`]);
    rows.push(['Currency', project.currency]);
    rows.push(['Target Volume', `${project.target_volume} ${project.unit_label}`]);
    rows.push(['Current Month', `${project.current_month}`]);
    rows.push([]);

    // Cost summary
    rows.push(['Cost Summary']);
    rows.push(['Category', 'Monthly Cost', 'One-time Cost', 'Per-Unit Cost', 'Total Cost']);
    let totalMonthly = 0;
    let totalOnetime = 0;
    let totalPerunit = 0;
    let totalTotal = 0;

    for (let i = 0; i < catKeys.length; i++) {
      const cat = summary.catTotals[catKeys[i]];
      const mc = cat.monthly;
      const oc = cat.onetime;
      const pu = cat.perunit;
      const tot = cat.total;
      totalMonthly += mc;
      totalOnetime += oc;
      totalPerunit += pu;
      totalTotal += tot;
      rows.push([catLabels[i], mc.toFixed(2), oc.toFixed(2), pu.toFixed(2), tot.toFixed(2)]);
    }
    rows.push(['TOTAL', totalMonthly.toFixed(2), totalOnetime.toFixed(2), totalPerunit.toFixed(2), totalTotal.toFixed(2)]);
    rows.push([]);

    // Pricing & Profitability
    rows.push(['Pricing & Profitability']);
    rows.push(['Metric', 'Value']);
    rows.push(['Cost Per Unit', summary.costPerUnit.toFixed(2)]);
    rows.push(['Selling Price', summary.sellingPrice.toFixed(2)]);
    rows.push(['Gross Margin %', `${summary.grossMarginPct.toFixed(2)}%`]);
    rows.push(['Target Revenue', summary.targetRevenue.toFixed(2)]);
    rows.push(['Net Profit', summary.netProfit.toFixed(2)]);
    rows.push(['ROI', `${summary.roi.toFixed(2)}%`]);
    rows.push(['Payback Months', summary.paybackMonths === Infinity ? 'N/A' : summary.paybackMonths.toFixed(1)]);
    rows.push([]);

    // EVM
    if (evm && evm.PV > 0) {
      rows.push(['EVM Summary']);
      rows.push(['Metric', 'Value']);
      rows.push(['CPI', evm.CPI.toFixed(2)]);
      rows.push(['SPI', evm.SPI.toFixed(2)]);
      rows.push(['CV ($)', evm.CV.toFixed(2)]);
      rows.push(['SV ($)', evm.SV.toFixed(2)]);
      rows.push(['EAC', evm.EAC ? evm.EAC.toFixed(2) : 'N/A']);
      rows.push(['VAC', evm.VAC.toFixed(2)]);
    }

    // Build CSV content
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [summary, evm, project]);

  // ── Print / PDF ─────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Check if labour items exist for EVM section ─────────────
  const hasLabour = evm ? evm.PV > 0 : false;

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0f1923]">Financial Report</h2>
          <p className="mt-1 text-sm text-[#7a8fa0]">
            {project.name} — generated {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dde4eb] bg-white px-4 py-2 text-sm font-medium text-[#3d4f5c] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dde4eb] bg-white px-4 py-2 text-sm font-medium text-[#3d4f5c] hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* ── Project Overview ──────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <FileText className="h-4 w-4 text-[#7a8fa0]" />
          Project Overview
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Project Name', value: project.name },
            { label: 'Duration', value: `${project.duration} months` },
            { label: 'Currency', value: project.currency },
            { label: 'Target Volume', value: `${project.target_volume} ${project.unit_label}` },
            { label: 'Current Month', value: `${project.current_month}` },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
                {item.label}
              </div>
              <div className="mt-0.5 text-sm font-medium text-[#0f1923]">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cost Summary ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <FileText className="h-4 w-4 text-[#7a8fa0]" />
          Cost Summary
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !summary ? null : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde4eb] text-left text-[11px] uppercase text-[#7a8fa0] tracking-wider">
                  <th className="pb-2 pr-4 font-semibold">Category</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Monthly Cost</th>
                  <th className="pb-2 pr-4 text-right font-semibold">One-time Cost</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Per-Unit Cost</th>
                  <th className="pb-2 text-right font-semibold">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {catKeys.map((key, i) => {
                  const cat = summary.catTotals[key];
                  return (
                    <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-[#0f1923]">{catLabels[i]}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{fmt(cat.monthly, c)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{fmt(cat.onetime, c)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-[#3d4f5c]">{fmt(cat.perunit, c)}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-[#0f1923]">{fmt(cat.total, c)}</td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr className="bg-[#f0f4f8] font-bold">
                  <td className="py-3 pr-4 text-[#0f1923]">Total</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-[#0f1923]">{fmt(summary.totalMonthly, c)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-[#0f1923]">{fmt(summary.totalOnetime, c)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-[#0f1923]">{fmt(summary.totalPerunit, c)}</td>
                  <td className="py-3 text-right tabular-nums text-[#0f1923] text-base">{fmt(summary.totalProject, c)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pricing & Profitability ───────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <FileText className="h-4 w-4 text-[#7a8fa0]" />
          Pricing & Profitability
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : !summary ? null : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Cost Per Unit', value: fmt(summary.costPerUnit, c), color: '' },
              { label: 'Selling Price', value: fmt(summary.sellingPrice, c), color: '' },
              { label: 'Gross Margin', value: `${fmtDec(summary.grossMarginPct)}%`, color: summary.grossMarginPct >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'Target Revenue', value: fmt(summary.targetRevenue, c), color: '' },
              { label: 'Net Profit', value: fmt(summary.netProfit, c), color: summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'ROI', value: `${fmtDec(summary.roi)}%`, color: summary.roi >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'Payback Period', value: summary.paybackMonths === Infinity ? 'N/A' : `${fmtDec(summary.paybackMonths, 1)} months`, color: '' },
              { label: 'Churn Impact', value: `${summary.churnedUnits.toLocaleString()} ${project.unit_label.toLowerCase()}/yr`, color: '' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[#dde4eb] bg-white p-3">
                <div className="text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
                  {item.label}
                </div>
                <div className={`mt-1 text-lg font-bold tabular-nums ${item.color || 'text-[#0f1923]'}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── EVM Summary (if labour items exist) ───────────────── */}
      {hasLabour && (
        <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
            <FileText className="h-4 w-4 text-[#7a8fa0]" />
            EVM Summary
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : !evm ? null : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'CPI', value: fmtDec(evm.CPI), color: evm.CPI >= 1 ? 'text-green-600' : evm.CPI >= 0.85 ? 'text-amber-600' : 'text-red-600' },
                { label: 'SPI', value: fmtDec(evm.SPI), color: evm.SPI >= 1 ? 'text-green-600' : evm.SPI >= 0.85 ? 'text-amber-600' : 'text-red-600' },
                { label: 'CV', value: fmt(evm.CV, c), color: evm.CV >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: 'SV', value: fmt(evm.SV, c), color: evm.SV >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: 'EAC', value: evm.EAC ? fmt(evm.EAC, c) : 'N/A', color: 'text-[#0f1923]' },
                { label: 'VAC', value: fmt(evm.VAC, c), color: evm.VAC >= 0 ? 'text-green-600' : 'text-red-600' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-[#dde4eb] bg-white p-3">
                  <div className="text-[11px] uppercase font-semibold text-[#7a8fa0] tracking-wider">
                    {item.label}
                  </div>
                  <div className={`mt-1 text-lg font-bold tabular-nums ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Go/No-Go Verdict ──────────────────────────────────── */}
      <div className="rounded-xl border border-[#dde4eb] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f1923]">
          <Info className="h-4 w-4 text-[#7a8fa0]" />
          Project Verdict
        </div>
        <VerdictBox verdict={verdict} description={verdictDesc[verdict]} loading={loading} />
      </div>
    </div>
  );
}