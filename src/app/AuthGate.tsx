import { createContext, useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Button, ErrorNotice, Spinner } from '@/components/ui';
import { useMe } from '@/features/auth/api';
import { SelectBusinessPage } from '@/features/auth/pages/SelectBusinessPage';
import { errorMessage } from '@/lib/format';
import type { Business, Me } from '@/lib/types';
import { useSessionStore } from './store/session';

interface Session {
  me: Me;
  business: Business;
}
const SessionContext = createContext<Session | null>(null);

/** The signed-in user and the business this device is working for. Only valid below AuthGate. */
export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside AuthGate');
  return s;
}

/**
 * Sends signed-out visitors to /login, loads the profile and makes sure a valid business
 * is chosen. A dead session clears the store (see providers.tsx), which redirects here.
 */
export function AuthGate() {
  const location = useLocation();
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const businessId = useSessionStore((s) => s.businessId);
  const setBusinessId = useSessionStore((s) => s.setBusinessId);
  const clear = useSessionStore((s) => s.clear);
  const me = useMe(refreshToken !== null);
  const businesses = me.data?.businesses;
  const business = businesses?.find((b) => b.id === businessId);

  useEffect(() => {
    if (businesses && !business && businesses.length === 1) setBusinessId(businesses[0]!.id);
  }, [businesses, business, setBusinessId]);

  if (!refreshToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me.isPending) return <Spinner label="Loading" />;
  if (me.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <ErrorNotice message={errorMessage(me.error)} onRetry={() => void me.refetch()} />
        <Button variant="outline" onClick={clear}>Sign out</Button>
      </main>
    );
  }
  if (!business) return <SelectBusinessPage businesses={me.data.businesses} />;

  return (
    <SessionContext.Provider value={{ me: me.data, business }}>
      <Outlet />
    </SessionContext.Provider>
  );
}
