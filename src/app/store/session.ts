import type { Tokens } from '@/lib/api-client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The shop app's auth store: tokens plus the business this device is working for.
 *
 * - accessToken: memory only; recovered after a reload with the refresh token.
 * - refreshToken: persisted so a reload or app restart does not log the manager out.
 * - businessId: the user's business (or the one picked when they have several, Stage 2).
 *   Sent as X-Business-Id. No switcher in this app.
 *
 * User profile, business name and logo come from GET /auth/me through TanStack Query,
 * not from this store.
 */
interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  businessId: string | null;
  setTokens: (tokens: Tokens) => void;
  setBusinessId: (id: string | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      businessId: null,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setBusinessId: (businessId) => set({ businessId }),
      clear: () => set({ accessToken: null, refreshToken: null, businessId: null }),
    }),
    {
      name: 'shop.session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ refreshToken: s.refreshToken, businessId: s.businessId }),
      version: 1,
    },
  ),
);
