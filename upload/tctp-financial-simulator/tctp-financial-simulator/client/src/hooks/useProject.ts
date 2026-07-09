import { useState, useEffect, useCallback } from 'react';
import type { Project } from '@/types';
import { getProject } from '@/lib/api';

const STORAGE_KEY = 'tctp_current_project_id';

interface UseProjectReturn {
  project: Project | null;
  setProject: (p: Project | null) => void;
  setCurrentProjectId: (id: number | null) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProject(): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProject(id);
      setProject(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load project';
      setError(msg);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setCurrentProjectId = useCallback(
    (id: number | null) => {
      if (id == null) {
        localStorage.removeItem(STORAGE_KEY);
        setProject(null);
        return;
      }
      localStorage.setItem(STORAGE_KEY, String(id));
      void loadProject(id);
    },
    [loadProject],
  );

  const refresh = useCallback(async () => {
    if (project?.id) {
      await loadProject(project.id);
    }
  }, [project?.id, loadProject]);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      void loadProject(Number(stored));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    project,
    setProject,
    setCurrentProjectId,
    loading,
    error,
    refresh,
  };
}