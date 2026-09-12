import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { Logo } from '../components/Logo';
import type { CartResponse } from '../types';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<CartResponse>('/api/cart');
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">
              Signed in as <span className="font-medium text-slate-700">{user?.name}</span>
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            {user?.role}
          </span>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-medium">Your cart</h2>

          {cartQuery.isLoading && (
            <p className="mt-2 text-sm text-slate-500">Loading…</p>
          )}

          {cartQuery.isError && (
            <p className="mt-2 text-sm text-red-600">Failed to load cart.</p>
          )}

          {cartQuery.data && cartQuery.data.items.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">Your cart is empty.</p>
          )}

          {cartQuery.data && cartQuery.data.items.length > 0 && (
            <>
              <ul className="mt-3 divide-y divide-slate-100">
                {cartQuery.data.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-slate-500">
                          Qty {item.quantity} · {formatPrice(item.product.priceCents)} each
                        </p>
                      </div>
                    </div>
                    <p className="font-medium">
                      {formatPrice(item.product.priceCents * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-right font-semibold">
                Subtotal: {formatPrice(cartQuery.data.subtotalCents)}
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
