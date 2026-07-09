import { useState } from 'react';
import { login, ApiError } from '@/lib/api';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token } = await login(username, password);
      localStorage.setItem('token', token);
      onLogin(token);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-ink">
            TC<span className="text-blue-500">TP</span>
          </h1>
          <p className="mt-1 text-xs text-ink-3">
            Software Financial Simulator
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-xs font-medium text-ink-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-ink-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ink py-2 text-sm font-semibold text-white transition hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}