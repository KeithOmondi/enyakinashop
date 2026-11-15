import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { useCartStore } from '@/features/pos/store/cart';
import { onSessionExpired } from '@/lib/api';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';
import { queryClient } from './queryClient';

/** Drops cached data from the ended session straight away. */
function SessionExpiryHandler() {
  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear();
        useCartStore.getState().clear();
        toast.error('Your session has ended. Please sign in again.');
        // The auth gate sees the cleared token and redirects to /login.
      }),
    [],
  );
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryHandler />
      <PwaUpdatePrompt />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
