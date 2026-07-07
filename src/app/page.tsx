'use client';
import { ThemeProvider } from 'next-themes';
import { AppShell } from '@/components/tctp/app-shell';

export default function Page() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppShell />
    </ThemeProvider>
  );
}