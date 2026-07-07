import type { Category } from './tctp-types';

export function formatCurrency(value: number, currency = '$'): string {
  if (value == null || isNaN(value)) return '—';
  if (!isFinite(value)) return '∞';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${currency}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 100_000) return `${sign}${currency}${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 10_000) return `${sign}${currency}${(abs / 1_000).toFixed(1)}K`;
  let d = 0;
  if (abs > 0 && abs < 1) d = 2;
  else if (abs < 100) d = 2;
  else if (abs < 1000) d = 1;
  return `${sign}${currency}${abs.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function formatNumber(value: number): string {
  if (value == null || isNaN(value)) return '—';
  if (!isFinite(value)) return '∞';
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatPercent(value: number): string {
  if (value == null || isNaN(value)) return '—';
  return `${value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
}

export const CATEGORIES: { key: Category; label: string; color: string; icon: string }[] = [
  { key: 'labour', label: 'Labour', color: '#1a6cf0', icon: 'Users' },
  { key: 'infra', label: 'Infrastructure', color: '#0ea8a8', icon: 'Server' },
  { key: 'apis', label: 'APIs & Services', color: '#7c3aed', icon: 'Plug' },
  { key: 'llm', label: 'LLM / AI', color: '#d97706', icon: 'Brain' },
  { key: 'overhead', label: 'Overhead', color: '#6b7280', icon: 'Building' },
];

export function generateId(): string {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getVerdictColor(verdict: 'go' | 'caution' | 'nogo'): string {
  switch (verdict) {
    case 'go': return 'text-emerald-600 dark:text-emerald-400';
    case 'caution': return 'text-amber-600 dark:text-amber-400';
    case 'nogo': return 'text-red-600 dark:text-red-400';
  }
}

export function getVerdictBg(verdict: 'go' | 'caution' | 'nogo'): string {
  switch (verdict) {
    case 'go': return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
    case 'caution': return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
    case 'nogo': return 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800';
  }
}

export function formatMonths(months: number): string {
  if (months <= 0) return '0 mo';
  if (months === 1) return '1 mo';
  if (months < 12) return `${months.toFixed(1)} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years}y`;
  return `${years}y ${Math.round(rem)}mo`;
}