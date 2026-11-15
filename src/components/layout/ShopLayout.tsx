import { Banknote, Home, LogOut, PackageCheck, Receipt, ScanBarcode, Warehouse, WifiOff } from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router';
import { queryClient } from '@/app/queryClient';
import { useSession } from '@/app/AuthGate';
import { useSessionStore } from '@/app/store/session';
import { Button, cn, Select } from '@/components/ui';
import { logoutRequest } from '@/features/auth/api';
import { useCartStore } from '@/features/pos/store/cart';

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean }[] = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/pos', label: 'Sell', icon: ScanBarcode },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/stock', label: 'Stock', icon: Warehouse },
  { to: '/receive', label: 'Receive', icon: PackageCheck },
  { to: '/closing', label: 'Close day', icon: Banknote },
];

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Desktop (lg and up): a sidebar with the menu, business and sign-out.
 * Phone and tablet: a slim top bar and a tab bar fixed to the bottom, within thumb reach.
 */
export function ShopLayout() {
  const { me, business } = useSession();
  const online = useOnline();
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const clear = useSessionStore((s) => s.clear);
  const setBusinessId = useSessionStore((s) => s.setBusinessId);
  const cartCount = useCartStore((s) => s.lines.length);

  async function signOut() {
    if (cartCount > 0 && !window.confirm('There is an unfinished sale in the cart. Sign out and discard it?')) return;
    await logoutRequest(refreshToken);
    useCartStore.getState().clear();
    queryClient.clear();
    clear();
  }

  function switchBusiness(id: string) {
    if (cartCount > 0 && !window.confirm('Switching business will discard the unfinished sale. Continue?')) return;
    useCartStore.getState().clear();
    queryClient.clear();
    setBusinessId(id);
  }

  const businessPicker =
    me.businesses.length > 1 ? (
      <Select aria-label="Business" value={business.id} onChange={(e) => switchBusiness(e.target.value)} className="w-full font-medium">
        {me.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
    ) : (
      <span className="font-semibold">{business.name}</span>
    );

  const badge = (to: string) =>
    to === '/pos' && cartCount > 0 ? (
      <span className="absolute right-3 top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 text-destructive-foreground lg:static lg:ml-auto lg:min-w-5 lg:text-xs lg:leading-5">
        {cartCount}
      </span>
    ) : null;

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar: desktop only */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-muted lg:flex">
        <div className="border-b border-border p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Shop</p>
          {businessPicker}
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-primary/40',
                  isActive && 'bg-primary text-primary-foreground hover:bg-primary',
                )
              }
            >
              <Icon className="size-5" /> {label} {badge(to)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="truncate px-1 text-sm font-medium">{me.user.name}</p>
          <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{me.user.email}</p>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}><LogOut /> Sign out</Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: phone and tablet only */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
          <div className="min-w-0 flex-1">{businessPicker}</div>
          <Button variant="outline" onClick={() => void signOut()} aria-label="Sign out"><LogOut /></Button>
        </header>

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-warning/15 px-3 py-2 text-sm font-medium text-warning">
            <WifiOff className="size-4" aria-hidden /> No connection. Sales cannot be saved until it returns.
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-3 pb-24 sm:p-4 sm:pb-24 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Tab bar: phone and tablet only */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto grid max-w-3xl grid-cols-6 gap-1 p-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-5" />
                {label === 'Close day' ? 'Close' : label}
                {badge(to)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
