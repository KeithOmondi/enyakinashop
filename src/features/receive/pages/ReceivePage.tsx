import { toast } from 'sonner';
import { PageHeader } from '@/components/ui';
import { PurchaseForm } from '@/features/purchases/components/PurchaseForm';

export function ReceivePage() {
  return (
    <>
      <PageHeader title="Receive stock" description="A delivery arrived: add what you received to the shelf." />
      <PurchaseForm onSaved={(summary) => toast.success(summary)} />
    </>
  );
}
