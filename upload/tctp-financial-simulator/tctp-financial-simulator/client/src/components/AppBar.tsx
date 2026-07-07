import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { Project, User } from '@/types';

interface AppBarProps {
  user: User;
  projects: Project[];
  currentProjectId: number | null;
  onSelectProject: (id: number) => void;
  onLogout: () => void;
}

export default function AppBar({
  user,
  projects,
  currentProjectId,
  onSelectProject,
  onLogout,
}: AppBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="app-bar sticky top-0 z-50 flex h-[52px] items-center justify-between bg-ink px-4 text-white print:hidden">
      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <span className="text-xl font-black tracking-tight">
          TC<span className="text-blue-400">TP</span>
        </span>
        <span className="hidden text-xs font-medium text-ink-4 sm:inline">
          Software Financial Simulator
        </span>
      </div>

      {/* Right — Status + Project + User */}
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
          <span className="text-xs font-medium text-ink-4">Live</span>
        </div>

        {/* Project selector */}
        {projects.length > 1 && (
          <div className="relative">
            <select
              value={currentProjectId ?? ''}
              onChange={(e) => onSelectProject(Number(e.target.value))}
              className="appearance-none rounded-md border border-ink-2 bg-ink-2/50 py-1 pl-2 pr-7 text-xs font-medium text-white outline-none focus:border-blue-400"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-ink text-white">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          </div>
        )}

        {/* User avatar & menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white transition hover:bg-blue-400"
            title={user.full_name}
          >
            {initials}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-surface py-1 shadow-lg">
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-semibold text-ink">{user.full_name}</p>
                <p className="text-xs text-ink-3">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-2 transition hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}