import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Receipt } from '@/components/Receipt';
import { Badge, Button, Card, ErrorNotice, Spinner } from '@/components/ui';
import { errorMessage } from '@/lib/format';
import { useSale } from '../api';

export function SaleDetailPage() {
  const { id } = useParams();
  const sale = useSale(id);
  if (sale.isPending) return <Spinner />;
  if (sale.isError) return <ErrorNotice message={errorMessage(sale.error)} onRetry={() => void sale.refetch()} />;
  const s = sale.data;
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" className="-ml-3"><Link to="/sales"><ArrowLeft /> Sales</Link></Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
      </div>
      {s.status === 'voided' && (
        <Card className="mb-3 border-destructive/40 text-sm"><Badge tone="danger">Voided</Badge> {s.voidReason}</Card>
      )}
      <Card className="mx-auto max-w-sm"><Receipt sale={s} /></Card>
      <p className="mx-auto mt-3 max-w-sm text-center text-xs text-muted-foreground">To void a sale, ask an administrator.</p>
    </>
  );
}
