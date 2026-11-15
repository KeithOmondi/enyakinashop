import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api-client';
import { api } from '@/lib/api';
import type { Business, Me } from '@/lib/types';

export const meKey = ['me'] as const;

export function useMe(enabled: boolean) {
  return useQuery<Me, ApiError>({
    queryKey: meKey,
    queryFn: async () => (await api.get<Me>('/auth/me')).data,
    enabled,
    staleTime: 5 * 60_000,
  });
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  businesses: Business[];
}

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  return (await api.post<LoginResult>('/auth/login', { email, password })).data;
}

export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  // Best effort: the local session is cleared whether or not the server hears about it.
  await api.post('/auth/logout', { refreshToken }, { skipAuthRefresh: true }).catch(() => undefined);
}

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}
