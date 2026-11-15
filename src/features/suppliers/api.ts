import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Supplier } from '@/lib/types';

export function useSuppliers(includeInactive = false) {
  return useQuery({
    queryKey: ['suppliers', includeInactive],
    queryFn: async () =>
      (await api.get<{ items: Supplier[] }>('/suppliers', { params: { includeInactive } })).data.items,
  });
}

export interface SupplierPayload {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active?: boolean;
}

export function useSaveSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id?: string; body: Partial<SupplierPayload> }) =>
      v.id
        ? (await api.patch<Supplier>(`/suppliers/${v.id}`, v.body)).data
        : (await api.post<Supplier>('/suppliers', v.body)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
