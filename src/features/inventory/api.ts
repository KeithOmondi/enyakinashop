import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InventorySummary, Movement, Page, Product } from '@/lib/types';

export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => (await api.get<InventorySummary>('/inventory/summary')).data,
  });
}

export interface MovementParams {
  productId?: string;
  type?: string;
  from?: string;
  to?: string;
  page: number;
}

export function useMovements(p: MovementParams) {
  return useQuery({
    queryKey: ['inventory', 'movements', p],
    queryFn: async () => (await api.get<Page<Movement>>('/inventory/movements', { params: { ...p, pageSize: 25 } })).data,
    placeholderData: keepPreviousData,
  });
}

export interface AdjustPayload {
  productId: string;
  mode: 'delta' | 'set';
  quantity: number;
  reason: string;
  /** new_stock / cold_room are stock coming in; everything else is a plain correction. */
  source?: 'adjustment' | 'new_stock' | 'cold_room';
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AdjustPayload) => (await api.post<Product>('/inventory/adjustments', body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
