import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, ErrorNotice, Field, Input, MoneyInput, PageHeader, Pagination, Spinner, Table, cn } from '@/components/ui';
import { errorMessage, fmtDate, fmtDateTime, todayISO } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { useClosings, useCloseDay, useDayPreview } from '../api';

const signed = (c: number) => (c > 0 ? '+' : '') + formatKes(c);

export function ClosingPage() {
  const date = todayISO();
  const preview = useDayPreview(date);
  const [page, setPage] = useState(1);
  const history = useClosings(page);
  const close = useCloseDay();
  const [counted, setCounted] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const p = preview.data;
  const variance = p && counted !== null ? counted - p.expectedCashCents : null;

  return (
    <>
      <PageHeader title="Close the day" description={`End-of-day cash count for ${fmtDate(date)}.`} />
      {preview.isPending ? <Spinner /> : preview.isError ? (
        <ErrorNotice message={errorMessage(preview.error)} onRetry={() => void preview.refetch()} />
      ) : p && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">Today&apos;s sales</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Sales</dt><dd className="text-right tabular-nums">{p.salesCount}</dd>
              <dt className="text-muted-foreground">Cash</dt><dd className="text-right tabular-nums">{formatKes(p.cashCents)}</dd>
              <dt className="text-muted-foreground">M-Pesa</dt><dd className="text-right tabular-nums">{formatKes(p.mpesaCents)}</dd>
              <dt className="text-muted-foreground">Card</dt><dd className="text-right tabular-nums">{formatKes(p.cardCents)}</dd>
              <dt className="border-t border-border pt-2 font-semibold">Total</dt><dd className="border-t border-border pt-2 text-right text-lg font-bold tabular-nums">{formatKes(p.totalCents)}</dd>
            </dl>
            {p.unverifiedMpesaCents > 0 && (
              <p role="note" className="mt-3 rounded-md bg-warning/15 p-3 text-xs text-warning">
                {formatKes(p.unverifiedMpesaCents)} of today&apos;s M-Pesa was typed in by hand, not confirmed by a prompt. Check it against your M-Pesa statement.
              </p>
            )}
            {p.voidedCount > 0 && <p className="mt-2 text-xs text-muted-foreground">{p.voidedCount} voided sale{p.voidedCount === 1 ? '' : 's'} not counted.</p>}
          </Card>

          <Card>
            {p.closing ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="size-10 text-success" aria-hidden />
                <p className="font-semibold">Today is closed</p>
                <p className="text-sm text-muted-foreground">Counted {formatKes(p.closing.countedCashCents)} · {fmtDateTime(p.closing.createdAt)}</p>
                <p className={cn('text-sm font-medium', p.closing.varianceCents === 0 ? 'text-success' : 'text-destructive')}>
                  {p.closing.varianceCents === 0 ? 'Cash matched exactly' : `Difference ${signed(p.closing.varianceCents)}`}
                </p>
              </div>
            ) : (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (counted === null) return;
                  close.mutate(
                    { date, countedCashCents: counted, note: note.trim() || null },
                    { onSuccess: (r) => toast.success(r.varianceCents === 0 ? 'Day closed. Cash matches.' : `Day closed. Difference ${signed(r.varianceCents)}`) },
                  );
                }}
              >
                <h2 className="font-semibold">Count the cash drawer</h2>
                <p className="text-sm text-muted-foreground">Expected cash from sales: <strong>{formatKes(p.expectedCashCents)}</strong>. Count only the cash taken today, not your opening float.</p>
                <Field label="Cash counted (KES)">{(f) => <MoneyInput {...f} required autoFocus value={counted} onChange={setCounted} />}</Field>
                {variance !== null && (
                  <p className={cn('rounded-md p-3 text-sm font-medium', variance === 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                    {variance === 0 ? 'Matches the sales.' : variance > 0 ? `Over by ${formatKes(variance)}` : `Short by ${formatKes(-variance)}`}
                  </p>
                )}
                <Field label="Note (optional)">{(f) => <Input {...f} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
                {close.isError && <ErrorNotice message={errorMessage(close.error)} />}
                <Button type="submit" disabled={counted === null || close.isPending}>Close the day</Button>
              </form>
            )}
          </Card>
        </div>
      )}

      <h2 className="mb-2 mt-8 font-semibold">Previous days</h2>
      {history.isPending ? <Spinner /> : history.isError ? <ErrorNotice message={errorMessage(history.error)} /> : history.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No days closed yet.</p>
      ) : (
        <>
          <Table>
            <thead><tr><th>Date</th><th className="text-right">Sales</th><th className="text-right">Total</th><th className="text-right">Counted</th><th className="text-right">Difference</th></tr></thead>
            <tbody>
              {history.data.items.map((c) => (
                <tr key={c.id}>
                  <td>{fmtDate(c.businessDate)}</td>
                  <td className="text-right tabular-nums">{c.salesCount}</td>
                  <td className="text-right tabular-nums">{formatKes(c.totalCents)}</td>
                  <td className="text-right tabular-nums">{formatKes(c.countedCashCents)}</td>
                  <td className={cn('text-right tabular-nums', c.varianceCents !== 0 && 'text-destructive')}>{c.varianceCents === 0 ? '—' : signed(c.varianceCents)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={history.data.pageSize} total={history.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
