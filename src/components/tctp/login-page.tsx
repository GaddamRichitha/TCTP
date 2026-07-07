'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTCTPStore } from '@/lib/tctp-store';
import { motion } from 'framer-motion';

export function LoginPage() {
  const { login } = useTCTPStore();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-teal-950/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border bg-white p-8 shadow-lg dark:bg-zinc-900 dark:border-zinc-800">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-1">
              <span className="text-3xl font-black tracking-tight">TC</span>
              <span className="text-3xl font-black tracking-tight text-teal-600 dark:text-teal-400">TP</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Software Financial Simulator</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 cursor-pointer">
              Sign In
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Any credentials will work for demo purposes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}