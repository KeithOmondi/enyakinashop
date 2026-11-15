import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, EmptyState, ErrorNotice, Field, Input, PageHeader, Pagination, Spinner } from '@/components/ui';
import { errorMessage, fmtDateTime, titleCase, todayISO } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { useSales } from '../api';

export function SalesPage() {
  const [date, setDate] = useState(todayISO());
  const [page, setPage] = useState(1);
  const sales = useSales({ from: date, to: date, page }, 20);

  return (
    <>
      <PageHeader title="Sales" description="Tap a sale to see or print its receipt." />
      <div className="mb-4 max-w-48">
        <Field label="Day">{(p) => <Input {...p} type="date" max={todayISO()} value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setPage(1); } }} />}</Field>
      </div>
      {sales.isPending ? <Spinner /> : sales.isError ? (
        <ErrorNotice message={errorMessage(sales.error)} onRetry={() => void sales.refetch()} />
      ) : sales.data.items.length === 0 ? (
        <EmptyState title="No sales on this day" />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sales.data.items.map((s) => (
              <li key={s.id}>
                <Link to={`/sales/${s.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-muted">
                  <div>
                    <p className="font-medium">#{s.receiptNo} {s.status === 'voided' && <Badge tone="danger">Voided</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(s.createdAt)} · {s.itemCount} item{s.itemCount === 1 ? '' : 's'} · {s.methods ? s.methods.split(', ').map((m) => (m === 'mpesa' ? 'M-Pesa' : titleCase(m))).join(', ') : ''}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatKes(s.totalCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={sales.data.pageSize} total={sales.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
