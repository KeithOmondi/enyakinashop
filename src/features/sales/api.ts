import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Page, PayMethod, Sale, SaleRow } from '@/lib/types';

export interface SaleParams {
  from?: string;
  to?: string;
  status?: 'completed' | 'voided';
  receiptNo?: number;
  page: number;
}

export function useSales(p: SaleParams, pageSize = 25) {
  return useQuery({
    queryKey: ['sales', p, pageSize],
    queryFn: async () => (await api.get<Page<SaleRow>>('/sales', { params: { ...p, pageSize } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sale', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<Sale>(`/sales/${id}`)).data,
  });
}

export function useVoidSale(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => (await api.post<Sale>(`/sales/${id}/void`, { reason })).data,
    onSuccess: (sale) => {
      qc.setQueryData(['sale', id], sale);
      void qc.invalidateQueries({ queryKey: ['sales'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export interface CheckoutPayload {
  items: { productId: string; quantity: number }[];
  payments: { method: PayMethod; amountCents: number; reference?: string | null }[];
  discountCents: number;
  note?: string | null;
}
