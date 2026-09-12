import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { Logo } from '../components/Logo';
import type { AuthResponse } from '../types';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const [email, setEmail] = useState('customer@shopsphere.dev');
  const [password, setPassword] = useState('customer12345');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState };

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <Logo />

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-slate-500">
            Sign in to continue to ShopSphere.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </label>

        {mutation.isError && (
          <p className="text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-slate-500">
          No account?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </p>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Demo credentials</p>
          <p>customer@shopsphere.dev / customer12345</p>
          <p>admin@shopsphere.dev / admin12345</p>
        </div>
      </form>
    </div>
  );
}
