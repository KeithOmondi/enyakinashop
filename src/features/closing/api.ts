import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Closing, DayPreview, Page } from '@/lib/types';

export function useDayPreview(date: string) {
  return useQuery({
    queryKey: ['closings', 'preview', date],
    queryFn: async () => (await api.get<DayPreview>('/closings/preview', { params: { date } })).data,
    refetchInterval: 60_000, // keeps the Today screen fresh while the shop is open
  });
}

export function useClosings(page: number) {
  return useQuery({
    queryKey: ['closings', 'list', page],
    queryFn: async () => (await api.get<Page<Closing>>('/closings', { params: { page, pageSize: 10 } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useCloseDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { date: string; countedCashCents: number; note: string | null }) =>
      (await api.post('/closings', body)).data as { varianceCents: number },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['closings'] }),
  });
}
