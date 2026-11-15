/**
 * The shop's instance of the shared API client, wired to the shop session store.
 * Feature api.ts files import `api` from here; nothing else creates HTTP clients.
 *
 * Checkout and stock entries will NOT call `api` directly from components: from
 * Stage 3 they go through the outbox interface in lib/outbox (online-only for now),
 * so queued offline sync can be added in Stage 8 without rewriting callers.
 */
import { createApiClient } from '@/lib/api-client';
import { useSessionStore } from '@/app/store/session';
import { env } from './env';

export const apiClient = createApiClient({
  baseURL: env.VITE_API_URL,
  session: {
    getAccessToken: () => useSessionStore.getState().accessToken,
    getRefreshToken: () => useSessionStore.getState().refreshToken,
    setTokens: (tokens) => useSessionStore.getState().setTokens(tokens),
    getBusinessId: () => useSessionStore.getState().businessId,
    clearSession: () => useSessionStore.getState().clear(),
  },
});

export const api = apiClient.http;
export const onSessionExpired = apiClient.onSessionExpired;
