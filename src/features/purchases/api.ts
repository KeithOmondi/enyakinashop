import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { newIdempotencyKey } from '@/lib/api-client';
import type { Page, Purchase, PurchaseRow } from '@/lib/types';

export function usePurchases(page: number) {
  return useQuery({
    queryKey: ['purchases', page],
    queryFn: async () => (await api.get<Page<PurchaseRow>>('/purchases', { params: { page, pageSize: 20 } })).data,
    placeholderData: keepPreviousData,
  });
}

export function usePurchase(id: string | null) {
  return useQuery({
    queryKey: ['purchase', id],
    enabled: id !== null,
    queryFn: async () => (await api.get<Purchase>(`/purchases/${id}`)).data,
  });
}

export interface PurchasePayload {
  supplierId: string | null;
  reference: string | null;
  note: string | null;
  items: { productId: string; quantity: number; unitCostCents: number }[];
}

/**
 * The idempotency key is supplied by the form and kept until the purchase succeeds,
 * so pressing "Save" again after a dropped connection cannot add the stock twice.
 */
export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { body: PurchasePayload; key: string }) =>
      (await api.post<Purchase>('/purchases', v.body, { headers: { 'Idempotency-Key': v.key } })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['purchases'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export { newIdempotencyKey };
