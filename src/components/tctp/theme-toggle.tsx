'use client';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncExternalStore } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!mounted) return <Button variant="ghost" size="icon" className="h-9 w-9" disabled />;

  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}