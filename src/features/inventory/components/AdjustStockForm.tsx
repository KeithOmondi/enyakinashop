import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, ErrorNotice, Field, Input, Select } from '@/components/ui';
import { errorMessage, fmtQty } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useAdjustStock } from '../api';

const REASONS = ['Stock count', 'Damaged', 'Expired', 'Stolen or lost', 'Given as sample', 'Other'];

/** Correct a product's stock. Every change is written to the movements ledger and the audit log. */
export function AdjustStockForm({ product, onDone }: { product: Product; onDone: (updated: Product) => void }) {
  const adjust = useAdjustStock();
  const [mode, setMode] = useState<'set' | 'delta'>('set');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState(REASONS[0]!);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const n = Number(qty);
  const valid = qty.trim() !== '' && Number.isFinite(n);
  const after = !valid ? null : mode === 'set' ? n : product.quantity + n;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return setError('Enter a number');
    setError(null);
    adjust.mutate(
      { productId: product.id, mode, quantity: n, reason: detail.trim() ? `${reason}: ${detail.trim()}` : reason },
      { onSuccess: onDone, onError: (err) => setError(errorMessage(err)) },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm">
        <span className="font-medium">{product.name}</span>: currently {fmtQty(product.quantity)} {product.unit}
      </p>
      <Field label="What are you doing?">
        {(p) => (
          <Select {...p} value={mode} onChange={(e) => setMode(e.target.value as 'set' | 'delta')}>
            <option value="set">I counted the shelf: set the stock to…</option>
            <option value="delta">Add or remove some (use − to remove)</option>
          </Select>
        )}
      </Field>
      <Field label={mode === 'set' ? 'Counted quantity' : 'Change in quantity'} hint={after !== null ? `Stock will be ${fmtQty(after)} ${product.unit}` : undefined}>
        {(p) => <Input {...p} inputMode="decimal" autoFocus required value={qty} onChange={(e) => setQty(e.target.value)} />}
      </Field>
      <Field label="Reason">
        {(p) => (
          <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </Select>
        )}
      </Field>
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
