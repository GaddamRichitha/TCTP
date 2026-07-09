'use client';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn, getVerdictBg, getVerdictColor } from '@/lib/tctp-utils';

interface VerdictBoxProps {
  verdict: 'go' | 'caution' | 'nogo';
  description: string;
  title?: string;
}

const config = {
  go: { icon: CheckCircle, title: 'PROJECT IS VIABLE', border: 'border-2 border-emerald-300 dark:border-emerald-700' },
  caution: { icon: AlertTriangle, title: 'PROCEED WITH CAUTION', border: 'border-2 border-amber-300 dark:border-amber-700' },
  nogo: { icon: XCircle, title: 'PROJECT NOT VIABLE', border: 'border-2 border-red-300 dark:border-red-700' },
};

export function VerdictBox({ verdict, description, title }: VerdictBoxProps) {
  const c = config[verdict];
  const Icon = c.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('rounded-xl p-5', getVerdictBg(verdict), c.border)}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-6 w-6 shrink-0', getVerdictColor(verdict))} />
        <div>
          <p className={cn('text-lg font-bold tracking-wide', getVerdictColor(verdict))}>{title ?? c.title}</p>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}