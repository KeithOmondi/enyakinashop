import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessProfile } from '@/lib/types';

export function useBusinessProfile() {
  return useQuery({
    queryKey: ['business', 'current'],
    queryFn: async () => (await api.get<BusinessProfile>('/businesses/current')).data,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; phone: string | null; address: string | null; receiptFooter: string | null }) =>
      (await api.patch<BusinessProfile>('/businesses/current', body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['business', 'current'], data);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
