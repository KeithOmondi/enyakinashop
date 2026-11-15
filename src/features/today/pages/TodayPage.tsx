import { AlertTriangle, Banknote, PackageCheck, ScanBarcode } from 'lucide-react';
import { Link } from 'react-router';
import { useSession } from '@/app/AuthGate';
import { Badge, Button, Card, ErrorNotice, PageHeader, Spinner } from '@/components/ui';
import { useDayPreview } from '@/features/closing/api';
import { useProducts } from '@/features/products/api';
import { errorMessage, fmtDate, fmtQty, todayISO } from '@/lib/format';
import { formatKes } from '@/lib/money';

export function TodayPage() {
  const { me, business } = useSession();
  const date = todayISO();
  const day = useDayPreview(date);
  const low = useProducts({ status: 'active', lowStock: true, page: 1 }, 8);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: me.timezone }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader title={`${greeting}, ${me.user.name.split(' ')[0]}`} description={`${business.name} · ${fmtDate(date)}`} />

      <Button asChild className="mb-4 min-h-16 w-full text-lg"><Link to="/pos"><ScanBarcode className="size-6" /> Start selling</Link></Button>

      {day.isPending ? <Spinner /> : day.isError ? (
        <ErrorNotice message={errorMessage(day.error)} onRetry={() => void day.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card className="col-span-2">
            <p className="text-xs text-muted-foreground">Sold today</p>
            <p className="text-3xl font-bold tabular-nums">{formatKes(day.data.totalCents)}</p>
            <p className="text-sm text-muted-foreground">{day.data.salesCount} sale{day.data.salesCount === 1 ? '' : 's'}</p>
          </Card>
          <Card><p className="text-xs text-muted-foreground">Cash</p><p className="font-semibold tabular-nums">{formatKes(day.data.cashCents)}</p></Card>
          <Card><p className="text-xs text-muted-foreground">M-Pesa + card</p><p className="font-semibold tabular-nums">{formatKes(day.data.mpesaCents + day.data.cardCents)}</p></Card>
        </div>
      )}

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-medium"><Banknote className="size-4" aria-hidden /> End of day</p>
          {day.data?.closing ? <Badge tone="success">Closed</Badge> : <Badge tone="warning">Not closed</Badge>}
        </div>
        {!day.data?.closing && <Button asChild variant="outline" className="mt-3 w-full"><Link to="/closing">Count the cash and close</Link></Button>}
      </Card>

      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-warning" aria-hidden /> Running low</h2>
          <Button asChild variant="ghost" className="min-h-9"><Link to="/receive"><PackageCheck /> Receive stock</Link></Button>
        </div>
        {low.isPending ? <Spinner /> : low.isError ? <ErrorNotice message={errorMessage(low.error)} /> : low.data.items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">Nothing is running low.</p>
        ) : (
          <ul className="divide-y divide-border">
            {low.data.items.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{p.name}</span>
                <span className="tabular-nums">{fmtQty(p.quantity)} {p.unit} <Badge tone={p.quantity === 0 ? 'danger' : 'warning'}>{p.quantity === 0 ? 'Out' : 'Low'}</Badge></span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
