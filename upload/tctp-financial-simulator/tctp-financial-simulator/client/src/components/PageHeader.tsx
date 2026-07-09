import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  children,
}: PageHeaderProps) {
  return (
    <div className="sticky top-[52px] z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}