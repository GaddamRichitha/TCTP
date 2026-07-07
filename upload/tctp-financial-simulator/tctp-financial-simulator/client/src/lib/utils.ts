import { clsx } from 'clsx';

/* ─────────────────────── Formatting Utilities ─────────────────────── */

export function formatCurrency(
  value: number,
  currency: string = 'USD',
): string {
  if (value == null || isNaN(value)) return '—';

  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // Large number short-hand
  if (absVal >= 1_000_000) {
    return `${sign}${(absVal / 1_000_000).toFixed(1)}M`;
  }
  if (absVal >= 100_000) {
    return `${sign}${(absVal / 1_000).toFixed(0)}K`;
  }
  if (absVal >= 10_000) {
    return `${sign}${(absVal / 1_000).toFixed(1)}K`;
  }

  // Use 0–2 decimal places depending on magnitude
  let decimals = 0;
  if (absVal > 0 && absVal < 1) decimals = 2;
  else if (absVal < 100) decimals = 2;
  else if (absVal < 1_000) decimals = 1;

  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    CNY: '¥',
  };

  const sym = symbols[currency] ?? currency;
  return `${sign}${sym}${formatted}`;
}

export function formatNumber(value: number): string {
  if (value == null || isNaN(value)) return '—';
  if (Number.isInteger(value)) return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function formatPercent(value: number): string {
  if (value == null || isNaN(value)) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/* ─────────────────────────── Class Merger ─────────────────────────── */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return clsx(classes);
}

/* ───────────────────────── Category Constants ─────────────────────── */

import {
  Users,
  Server,
  Plug,
  Brain,
  Building,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryDef {
  key: 'labour' | 'infra' | 'apis' | 'llm' | 'overhead';
  label: string;
  icon: LucideIcon;
  color: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'labour', label: 'Labour', icon: Users, color: '#1a6cf0' },
  { key: 'infra', label: 'Infrastructure', icon: Server, color: '#0ea8a8' },
  { key: 'apis', label: 'APIs & Services', icon: Plug, color: '#7c3aed' },
  { key: 'llm', label: 'LLM / AI', icon: Brain, color: '#d97706' },
  { key: 'overhead', label: 'Overhead', icon: Building, color: '#6b7280' },
];