'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/tctp-utils';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'teal' | 'green' | 'amber' | 'red' | 'purple' | 'blue';
  trend?: string;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-card border-border text-foreground',
  teal: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
  green: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  red: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  purple: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  blue: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300',
};

export function KPICard({ label, value, sub, variant = 'default', trend, className }: KPICardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn('rounded-xl border p-5 shadow-sm', variantStyles[variant], className)}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums">{value}</p>
      {(sub || trend) && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {trend && <span className={trend.startsWith('+') || trend.startsWith('▲') ? 'text-emerald-600 dark:text-emerald-400' : trend.startsWith('-') || trend.startsWith('▼') ? 'text-red-600 dark:text-red-400' : ''}>{trend} </span>}
          {sub}
        </p>
      )}
    </motion.div>
  );
}