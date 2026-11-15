import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category, Page, Product } from '@/lib/types';

export interface ProductParams {
  q?: string;
  categoryId?: string;
  status?: 'active' | 'inactive' | 'all';
  lowStock?: boolean;
  page: number;
}

export function useProducts(p: ProductParams, pageSize = 20) {
  return useQuery({
    queryKey: ['products', p, pageSize],
    queryFn: async () => (await api.get<Page<Product>>('/products', { params: { ...p, pageSize } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['categories', includeInactive],
    queryFn: async () =>
      (await api.get<{ items: Category[] }>('/categories', { params: { includeInactive } })).data.items,
  });
}

export interface ProductPayload {
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string | null;
  unit: string;
  allowsFraction: boolean;
  priceCents: number;
  costCents: number;
  reorderLevel: number;
  openingStock?: number;
  active?: boolean;
}

export function useSaveProduct(existingId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProductPayload) =>
      existingId
        ? (await api.patch<Product>(`/products/${existingId}`, body)).data
        : (await api.post<Product>('/products', body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id?: string; name?: string; active?: boolean }) =>
      v.id
        ? (await api.patch<Category>(`/categories/${v.id}`, { name: v.name, active: v.active })).data
        : (await api.post<Category>('/categories', { name: v.name })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => void (await api.delete(`/categories/${id}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

/** Uploads a (browser-resized) photo, or removes the current one when `blob` is null. */
export function useProductPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; blob: Blob | null }) =>
      v.blob
        ? (await api.put<Product>(`/products/${v.id}/image`, v.blob, { headers: { 'Content-Type': v.blob.type } })).data
        : (await api.delete<Product>(`/products/${v.id}/image`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
