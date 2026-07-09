'use client';
import { Menu, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './theme-toggle';
import { useTCTPStore } from '@/lib/tctp-store';

export function AppBar() {
  const { toggleSidebar, logout, project } = useTCTPStore();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 dark:bg-zinc-900 dark:border-zinc-800">
      <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-1.5">
        <span className="text-lg font-black tracking-tight">TC</span>
        <span className="text-lg font-black tracking-tight text-teal-600 dark:text-teal-400">TP</span>
        <span className="ml-1.5 hidden text-xs font-medium text-muted-foreground sm:inline">Software Financial Simulator</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Live</span>
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-bold">
                  {project.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}