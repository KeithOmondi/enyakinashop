import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, ErrorNotice, Field, Input, Select, cn } from '@/components/ui';
import { errorMessage, fmtQty } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useAdjustStock } from '../api';

/** Stock coming in. Each is tracked under its own type, so you can see where stock came from. */
const STOCK_IN = [
  { label: 'New Stock', source: 'new_stock' as const },
  { label: 'New from Cold Room', source: 'cold_room' as const },
];
const OTHER_REASONS = ['Stock count', 'Damaged', 'Expired', 'Stolen or lost', 'Given as sample', 'Other'];

/** Change a product's stock. Every change is written to the movements ledger and the audit log. */
export function AdjustStockForm({ product, onDone }: { product: Product; onDone: (updated: Product) => void }) {
  const adjust = useAdjustStock();
  const [reason, setReason] = useState(STOCK_IN[0]!.label);
  const [mode, setMode] = useState<'set' | 'delta'>('set');
  const [qty, setQty] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stockIn = STOCK_IN.find((s) => s.label === reason);
  const effectiveMode = stockIn ? 'delta' : mode;
  const n = Number(qty);
  const valid = qty.trim() !== '' && Number.isFinite(n) && (!stockIn || n > 0);
  const added = !valid ? null : effectiveMode === 'set' ? n - product.quantity : n;
  const total = !valid ? null : effectiveMode === 'set' ? n : product.quantity + n;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return setError(stockIn ? 'Enter how many were added' : 'Enter a number');
    setError(null);
    adjust.mutate(
      {
        productId: product.id,
        mode: effectiveMode,
        quantity: n,
        reason: detail.trim() ? `${reason}: ${detail.trim()}` : reason,
        ...(stockIn ? { source: stockIn.source } : {}),
      },
      { onSuccess: onDone, onError: (err) => setError(errorMessage(err)) },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="font-medium">{product.name}</p>
      <Field label="Reason">
        {(p) => (
          <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
            <optgroup label="Stock coming in">
              {STOCK_IN.map((s) => <option key={s.source}>{s.label}</option>)}
            </optgroup>
            <optgroup label="Corrections">
              {OTHER_REASONS.map((r) => <option key={r}>{r}</option>)}
            </optgroup>
          </Select>
        )}
      </Field>
      {!stockIn && (
        <Field label="What are you doing?">
          {(p) => (
            <Select {...p} value={mode} onChange={(e) => setMode(e.target.value as 'set' | 'delta')}>
              <option value="set">I counted the shelf: set the stock to…</option>
              <option value="delta">Add or remove some (use − to remove)</option>
            </Select>
          )}
        </Field>
      )}
      <Field label={stockIn ? 'How many were added?' : mode === 'set' ? 'Counted quantity' : 'Change in quantity'}>
        {(p) => <Input {...p} inputMode="decimal" autoFocus required value={qty} onChange={(e) => setQty(e.target.value)} />}
      </Field>

      <dl className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/50 p-3 text-center" aria-label="Stock summary">
        <div>
          <dt className="text-xs text-muted-foreground">Current stock</dt>
          <dd className="font-semibold tabular-nums">{fmtQty(product.quantity)} {product.unit}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{added !== null && added < 0 ? 'Removed' : 'Added'}</dt>
          <dd className={cn('font-semibold tabular-nums', added !== null && added < 0 ? 'text-destructive' : 'text-success')}>
            {added === null ? '—' : `${added > 0 ? '+' : ''}${fmtQty(added)}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">New total</dt>
          <dd className="font-semibold tabular-nums">{total === null ? '—' : `${fmtQty(total)} ${product.unit}`}</dd>
        </div>
      </dl>

      <Field label="Details (optional)">{(p) => <Input {...p} maxLength={150} value={detail} onChange={(e) => setDetail(e.target.value)} />}</Field>
      {error && <ErrorNotice message={error} />}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDone(product)}>Cancel</Button>
        <Button type="submit" disabled={adjust.isPending}>
          {adjust.isPending && <Loader2 className="animate-spin" />} Save
        </Button>
      </div>
    </form>
  );
}
