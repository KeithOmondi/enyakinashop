import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button, ErrorNotice, Field, Input, Modal, MoneyInput, Select } from '@/components/ui';
import { useBusinessProfile } from '@/features/settings/api';
import { api } from '@/lib/api';
import { isApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/format';
import { formatKes } from '@/lib/money';
import type { PayMethod, Sale } from '@/lib/types';
import { cartTotals, useCartStore } from '../store/cart';
import { MpesaPrompt, type PaidPrompt } from './MpesaPrompt';

interface PayRow {
  id: number;
  method: PayMethod;
  amount: number | null;
  reference: string;
  /** Set once the customer has paid an M-Pesa prompt: the row is then locked. */
  mpesaRequestId?: string;
  /** The cashier chose to type an M-Pesa code instead of sending a prompt. */
  manual?: boolean;
}

const LABEL: Record<PayMethod, string> = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card' };
let rowId = 0;

function CheckoutForm({ onPaid, onClose }: { onPaid: (s: Sale) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const { lines, discountCents, paidMpesa, ensureKey, clear, addPaidMpesa } = useCartStore();
  const { total } = cartTotals(lines, discountCents);
  const mpesaMode = useBusinessProfile().data?.mpesaMode ?? 'off';
  const prompts = mpesaMode !== 'off';

  // Reopening the window restores prompts the customer already paid for this cart.
  const [rows, setRows] = useState<PayRow[]>(() => {
    const restored: PayRow[] = paidMpesa.map((p) => ({ id: ++rowId, method: 'mpesa', amount: p.amountCents, reference: p.receipt ?? '', mpesaRequestId: p.id }));
    const covered = paidMpesa.reduce((s, p) => s + p.amountCents, 0);
    return covered >= total && restored.length > 0 ? restored : [...restored, { id: ++rowId, method: 'cash', amount: null, reference: '' }];
  });
  const patch = (id: number, v: Partial<PayRow>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...v } : x)));

  const paid = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const cash = rows.filter((r) => r.method === 'cash').reduce((s, r) => s + (r.amount ?? 0), 0);
  const change = Math.max(0, paid - total);
  const short = Math.max(0, total - paid);
  const badChange = change > cash;
  // An M-Pesa line must be a confirmed prompt or carry a typed code (when prompts are on).
  const needsMpesa = prompts && rows.some((r) => r.method === 'mpesa' && (r.amount ?? 0) > 0 && !r.mpesaRequestId && r.reference.trim().length < 6);
  const ok = short === 0 && !badChange && !needsMpesa;

  const onPromptPaid = useCallback(
    (rowKey: number) => (p: PaidPrompt) => {
      addPaidMpesa(p);
      setRows((r) => r.map((x) => (x.id === rowKey ? { ...x, mpesaRequestId: p.id, reference: p.receipt ?? '', amount: p.amountCents } : x)));
    },
    [addPaidMpesa],
  );

  const pay = useMutation({
    mutationFn: async () => {
      // The same key is sent on every retry of this cart, so the server records the sale once.
      const key = ensureKey();
      return (
        await api.post<Sale>(
          '/sales',
          {
            items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
            payments: rows.filter((r) => (r.amount ?? 0) > 0).map((r) => ({
              method: r.method,
              amountCents: r.amount!,
              ...(r.mpesaRequestId ? { mpesaRequestId: r.mpesaRequestId } : r.reference.trim() ? { reference: r.reference.trim() } : {}),
            })),
            discountCents,
          },
          { headers: { 'Idempotency-Key': key } },
        )
      ).data;
    },
    onSuccess: (sale) => {
      clear();
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['sales'] });
      void qc.invalidateQueries({ queryKey: ['closings'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      onPaid(sale);
    },
  });

  const unsure = pay.isError && isApiError(pay.error) && (pay.error.status === 0 || pay.error.status >= 500);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between rounded-lg bg-muted p-3">
        <span className="text-muted-foreground">To pay</span>
        <span className="text-3xl font-bold tabular-nums">{formatKes(total)}</span>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const locked = Boolean(r.mpesaRequestId);
          return (
            <li key={r.id} className="rounded-lg border border-border p-3">
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Field label="Method">
                  {(p) => (
                    <Select {...p} disabled={locked} value={r.method} onChange={(e) => patch(r.id, { method: e.target.value as PayMethod, manual: false })}>
                      {(['cash', 'mpesa', 'card'] as const).map((m) => <option key={m} value={m}>{LABEL[m]}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Amount (KES)">
                  {(p) => <MoneyInput {...p} disabled={locked} key={`${r.id}-${r.amount === null ? 'n' : 'v'}`} autoFocus={rows.length === 1} value={r.amount} onChange={(c) => patch(r.id, { amount: c })} />}
                </Field>
                {rows.length > 1 && !locked ? (
                  <Button variant="ghost" className="px-2" aria-label="Remove payment" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}><Trash2 /></Button>
                ) : <span />}
              </div>

              {locked ? (
                <p role="status" className="mt-2 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm font-medium text-success">
                  <CheckCircle2 className="size-5" aria-hidden /> M-Pesa paid{r.reference ? ` · ${r.reference}` : ''}
                </p>
              ) : (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" className="min-h-9" onClick={() => patch(r.id, { amount: Math.max(0, total - (paid - (r.amount ?? 0))) })}>Exact amount</Button>
                    {r.method === 'card' && (
                      <Input aria-label="Reference" placeholder="Card reference" maxLength={80} className="min-h-9" value={r.reference} onChange={(e) => patch(r.id, { reference: e.target.value })} />
                    )}
                    {r.method === 'mpesa' && (!prompts || r.manual) && (
                      <Input aria-label="M-Pesa code" placeholder="M-Pesa code, e.g. QK12AB34CD" maxLength={80} className="min-h-9" value={r.reference} onChange={(e) => patch(r.id, { reference: e.target.value.toUpperCase() })} />
                    )}
                  </div>
                  {r.method === 'mpesa' && prompts && !r.manual && (
                    <div className="mt-3">
                      <MpesaPrompt amountCents={r.amount} simulator={mpesaMode === 'simulator'} onPaid={onPromptPaid(r.id)} />
                      <button type="button" className="mt-2 text-xs text-accent underline" onClick={() => patch(r.id, { manual: true })}>
                        Customer already paid? Enter the M-Pesa code instead
                      </button>
                    </div>
                  )}
                  {r.method === 'mpesa' && prompts && r.manual && (
                    <div className="mt-2 flex flex-col gap-1">
                      <p className="text-xs text-warning">Typed codes are not checked with M-Pesa. They are listed for review when you close the day.</p>
                      <button type="button" className="self-start text-xs text-accent underline" onClick={() => patch(r.id, { manual: false })}>Send a prompt instead</button>
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length < 3 && (
        <Button variant="outline" onClick={() => setRows((r) => [...r, { id: ++rowId, method: 'mpesa', amount: null, reference: '' }])}><Plus /> Split payment</Button>
      )}

      <div className="text-lg">
        {short > 0 ? (
          <p className="flex justify-between text-destructive"><span>Still to pay</span><span className="font-semibold tabular-nums">{formatKes(short)}</span></p>
        ) : badChange ? (
          <p role="alert" className="text-sm text-destructive">Change can only be given from cash. Lower the M-Pesa or card amount.</p>
        ) : (
          <p className="flex justify-between"><span>Change to give</span><span className="text-2xl font-bold tabular-nums">{formatKes(change)}</span></p>
        )}
      </div>
      {needsMpesa && short === 0 && !badChange && (
        <p className="text-sm text-muted-foreground">Send the M-Pesa prompt and wait for the customer to pay, or enter the M-Pesa code.</p>
      )}

      {pay.isError && (
        <ErrorNotice
          message={unsure ? `${errorMessage(pay.error)} If you are not sure the sale went through, press Confirm again: it will not be charged twice.` : errorMessage(pay.error)}
        />
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={pay.isPending}>Back</Button>
        <Button className="min-h-14 flex-1 text-lg" disabled={!ok || pay.isPending} onClick={() => pay.mutate()}>
          {pay.isPending && <Loader2 className="animate-spin" />} Confirm sale
        </Button>
      </div>
    </div>
  );
}

export function CheckoutModal({ open, onClose, onPaid }: { open: boolean; onClose: () => void; onPaid: (s: Sale) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Take payment">
      {open && <CheckoutForm onPaid={onPaid} onClose={onClose} />}
    </Modal>
  );
}
