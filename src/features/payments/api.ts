import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MpesaRequest, MpesaRequestRow, Page } from '@/lib/types';

/** Terminal states: once reached, nothing further will change. */
export const isFinal = (s: MpesaRequest['status']) => s !== 'pending';

export function useSendPrompt() {
  return useMutation({
    mutationFn: async (v: { phone: string; amountCents: number; requestKey: string }) =>
      (await api.post<MpesaRequest>('/payments/mpesa/requests', v)).data,
  });
}

/** Polls a prompt every 2 seconds while the customer is deciding. */
export function useMpesaStatus(id: string | null) {
  return useQuery({
    queryKey: ['mpesa', 'request', id],
    enabled: id !== null,
    queryFn: async () => (await api.get<MpesaRequest>(`/payments/mpesa/requests/${id}`)).data,
    refetchInterval: (q) => (q.state.data && isFinal(q.state.data.status) ? false : 2000),
    // A flaky connection must not abandon a payment that is in progress.
    retry: true,
    retryDelay: 2000,
  });
}

export function useMpesaRequests(p: { status?: string; unmatched?: boolean; page: number }) {
  return useQuery({
    queryKey: ['mpesa', 'list', p],
    queryFn: async () => (await api.get<Page<MpesaRequestRow>>('/payments/mpesa/requests', { params: { ...p, pageSize: 25 } })).data,
    placeholderData: keepPreviousData,
  });
}
