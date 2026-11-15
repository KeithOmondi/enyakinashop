import { isApiError } from '@/lib/api-client';
import { QueryClient } from '@tanstack/react-query';

/**
 * Online-only data layer (Stage 1 of the connectivity plan):
 * - Reads retry network failures and 5xx with backoff (1s, 2s, 4s; max 8s).
 *   4xx errors are final and shown immediately.
 * - TanStack's default networkMode 'online' pauses queries while the browser is
 *   offline and resumes them on reconnect.
 * - Writes are never auto-retried here. Checkout is protected by its idempotency key
 *   and its retry policy lives in the outbox (Stage 8), not in a blanket setting.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
