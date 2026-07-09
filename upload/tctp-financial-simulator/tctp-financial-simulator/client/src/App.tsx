import { useState, useEffect, useCallback } from 'react';
import type { User, Project, CategoryTotals } from '@/types';
import { getProfile, getProjects, getSummary } from '@/lib/api';
import { useProject } from '@/hooks/useProject';
import type { PageKey } from '@/components/Sidebar';
import LoginPage from '@/components/LoginPage';
import AppBar from '@/components/AppBar';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import CostInputs from '@/pages/CostInputs';
import Assumptions from '@/pages/Assumptions';
import Analysis from '@/pages/Analysis';
import Report from '@/pages/Report';

/* ─────────────────── Main App ──────────────────────── */

export default function App() {
  /* Auth */
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token'),
  );
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* Data */
  const [projects, setProjects] = useState<Project[]>([]);
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [catTotals, setCatTotals] = useState<CategoryTotals | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    project,
    setCurrentProjectId,
    refresh: refreshProject,
  } = useProject();

  /* Fetch user profile */
  const loadUser = useCallback(async () => {
    try {
      const u = await getProfile();
      setUser(u);
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /* Fetch all projects */
  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
      // Auto-select first project if none selected
      if (list.length > 0 && !project) {
        setCurrentProjectId(list[0].id);
      }
    } catch {
      // silently fail — sidebar will just show empty
    }
  }, [project, setCurrentProjectId]);

  /* Fetch summary for category totals */
  const loadSummary = useCallback(async () => {
    if (!project?.id) return;
    try {
      const summary = await getSummary(project.id);
      setCatTotals(summary.catTotals);

      // Derive item counts from category totals keys
      const counts: Record<string, number> = {};
      for (const key of Object.keys(summary.catTotals)) {
        counts[key] = summary.catTotals[key].total > 0 ? 1 : 0;
      }
      setCatCounts(counts);
    } catch {
      // non-critical
    }
  }, [project?.id, refreshKey]);

  /* Effects */
  useEffect(() => {
    if (token) {
      void loadUser();
    } else {
      setAuthLoading(false);
    }
  }, [token, loadUser]);

  useEffect(() => {
    if (user) {
      void loadProjects();
    }
  }, [user, loadProjects]);

  useEffect(() => {
    if (project?.id) {
      void loadSummary();
    }
  }, [project?.id, loadSummary]);

  /* Handlers */
  function handleLogin(newToken: string) {
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tctp_current_project_id');
    setToken(null);
    setUser(null);
    setProjects([]);
  }

  function handleSelectProject(id: number) {
    setCurrentProjectId(id);
  }

  function handleCostChange() {
    setRefreshKey(k => k + 1);
    void refreshProject();
  }

  function handleProjectUpdate(p: Project) {
    // Just trigger a full refresh
    setRefreshKey(k => k + 1);
    void refreshProject();
  }

  /* ──── Auth gate ──── */
  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-2 border-t-ink" />
      </div>
    );
  }

  /* ──── Page routing ──── */
  let pageContent: React.ReactNode;
  switch (activePage) {
    case 'dashboard':
      pageContent = project ? (
        <Dashboard projectId={project.id} project={project} />
      ) : (
        <EmptyProjectState />
      );
      break;
    case 'costs':
      pageContent = project ? (
        <CostInputs projectId={project.id} project={project} onCostChange={handleCostChange} />
      ) : (
        <EmptyProjectState />
      );
      break;
    case 'assumptions':
      pageContent = project ? (
        <Assumptions projectId={project.id} project={project} onProjectUpdate={handleProjectUpdate} />
      ) : (
        <EmptyProjectState />
      );
      break;
    case 'analysis':
      pageContent = project ? (
        <Analysis projectId={project.id} project={project} />
      ) : (
        <EmptyProjectState />
      );
      break;
    case 'report':
      pageContent = project ? (
        <Report projectId={project.id} project={project} />
      ) : (
        <EmptyProjectState />
      );
      break;
    default:
      pageContent = <EmptyProjectState />;
  }

  /* ──── Main layout ──── */
  return (
    <div className="flex min-h-screen flex-col">
      <AppBar
        user={user!}
        projects={projects}
        currentProjectId={project?.id ?? null}
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
      />

      <div className="flex flex-1">
        <Sidebar
          activePage={activePage}
          onPageChange={setActivePage}
          catCounts={catCounts}
          totals={catTotals}
          currency={project?.currency ?? '$'}
        />

        <main className="flex-1 overflow-y-auto custom-scroll bg-[#f0f4f8]">
          {pageContent}
        </main>
      </div>
    </div>
  );
}

function EmptyProjectState() {
  return (
    <div className="flex h-96 items-center justify-center">
      <p className="text-[#7a8fa0]">No project selected. Create or select a project to get started.</p>
    </div>
  );
}