'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useTCTPStore } from '@/lib/tctp-store';
import { AppBar } from './app-bar';
import { Sidebar } from './sidebar';
import { LoginPage } from './login-page';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSyncExternalStore } from 'react';
import type { PageKey } from '@/lib/tctp-types';
import {
  LayoutDashboard, Settings, DollarSign, Clock, Sliders, BarChart3, Target, FileText,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const DashboardPage = dynamic(() => import('@/pages/tctp/dashboard'));
const ProjectSetupPage = dynamic(() => import('@/pages/tctp/project-setup'));
const CostInputsPage = dynamic(() => import('@/pages/tctp/cost-inputs'));
const TimeTrackingPage = dynamic(() => import('@/pages/tctp/time-tracking'));
const AssumptionsPage = dynamic(() => import('@/pages/tctp/assumptions'));
const AnalysisPage = dynamic(() => import('@/pages/tctp/analysis'));
const EVMPage = dynamic(() => import('@/pages/tctp/evm-page'));
const ReportPage = dynamic(() => import('@/pages/tctp/report'));

const pageComponents: Record<PageKey, React.LazyExoticComponent<() => JSX.Element>> = {
  'dashboard': DashboardPage,
  'project-setup': ProjectSetupPage,
  'costs': CostInputsPage,
  'time-tracking': TimeTrackingPage,
  'assumptions': AssumptionsPage,
  'analysis': AnalysisPage,
  'evm': EVMPage,
  'report': ReportPage,
};

export function AppShell() {
  const { isAuthenticated, activePage, sidebarOpen, setActivePage, toggleSidebar } = useTCTPStore();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) return null;

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[activePage] ?? DashboardPage;

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={(open) => { if (!open) toggleSidebar(); }}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="p-4 space-y-6">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation</p>
                <nav className="space-y-0.5">
                  {([
                    { key: 'dashboard' as PageKey, label: 'Dashboard', icon: LayoutDashboard },
                    { key: 'project-setup' as PageKey, label: 'Project Setup', icon: Settings },
                    { key: 'costs' as PageKey, label: 'Cost Inputs', icon: DollarSign },
                    { key: 'time-tracking' as PageKey, label: 'Time Tracking', icon: Clock },
                    { key: 'assumptions' as PageKey, label: 'Assumptions', icon: Sliders },
                    { key: 'analysis' as PageKey, label: 'Analysis', icon: BarChart3 },
                    { key: 'evm' as PageKey, label: 'EVM', icon: Target },
                    { key: 'report' as PageKey, label: 'Report', icon: FileText },
                  ]).map((item) => {
                    const active = activePage === item.key;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActivePage(item.key)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                          active ? 'bg-teal-600 text-white dark:bg-teal-700' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 md:p-6 lg:p-8"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}