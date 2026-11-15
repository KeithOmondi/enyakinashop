import { Loader2, Trash2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { ProductPicker } from '@/components/ProductPicker';
import { Button, ErrorNotice, Field, Input, MoneyInput, Select, Table } from '@/components/ui';
import { useSuppliers } from '@/features/suppliers/api';
import { errorMessage, fmtQty } from '@/lib/format';
import { formatKes } from '@/lib/money';
import type { Product } from '@/lib/types';
import { newIdempotencyKey, useCreatePurchase } from '../api';

interface Line {
  product: Product;
  quantity: string;
  unitCost: number | null;
}

/** Receive stock: pick products, enter quantity and unit cost, save. Used by admin and the shop's Receive screen. */
export function PurchaseForm({ onSaved }: { onSaved: (summary: string) => void }) {
  const suppliers = useSuppliers();
  const create = useCreatePurchase();
  const [lines, setLines] = useState<Line[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const parsed = lines.map((l) => ({ ...l, qty: Number(l.quantity) }));
  const total = parsed.reduce(
    (s, l) => s + (l.unitCost !== null && l.qty > 0 ? Math.round(l.unitCost * l.qty) : 0),
    0,
  );

  function add(p: Product) {
    setLines((cur) => (cur.some((l) => l.product.id === p.id) ? cur : [...cur, { product: p, quantity: '1', unitCost: p.costCents }]));
  }
  const patch = (id: string, v: Partial<Line>) => setLines((cur) => cur.map((l) => (l.product.id === id ? { ...l, ...v } : l)));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return setError('Add at least one product');
    for (const l of parsed) {
      if (!(l.qty > 0)) return setError(`Enter a quantity for ${l.product.name}`);
      if (!l.product.allowsFraction && !Number.isInteger(l.qty)) return setError(`${l.product.name} is received in whole units`);
      if (l.unitCost === null) return setError(`Enter a valid unit cost for ${l.product.name}`);
    }
    setError(null);
    create.mutate(
      {
        key: key.current,
        body: {
          supplierId: supplierId || null,
          reference: reference.trim() || null,
          note: note.trim() || null,
          items: parsed.map((l) => ({ productId: l.product.id, quantity: l.qty, unitCostCents: l.unitCost! })),
        },
      },
      {
        onSuccess: () => {
          key.current = newIdempotencyKey(); // next receipt is a new action
          const summary = `Received ${lines.length} product${lines.length === 1 ? '' : 's'} (${formatKes(total)})`;
          setLines([]);
          setReference('');
          setNote('');
          onSaved(summary);
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier">
          {(p) => (
            <Select {...p} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">No supplier</option>
              {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Invoice / reference">
          {(p) => <Input {...p} maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />}
        </Field>
      </div>

      <ProductPicker onPick={add} placeholder="Add a product: search or scan" />

      {lines.length > 0 && (
        <Table>
          <thead>
            <tr><th>Product</th><th className="w-28">Quantity</th><th className="w-36">Unit cost (KES)</th><th className="text-right">Line total</th><th><span className="sr-only">Remove</span></th></tr>
          </thead>
          <tbody>
            {parsed.map((l) => (
              <tr key={l.product.id}>
                <td>
                  <div className="font-medium">{l.product.name}</div>
                  <div className="text-xs text-muted-foreground">Now {fmtQty(l.product.quantity)} {l.product.unit}</div>
                </td>
                <td><Input aria-label={`Quantity of ${l.product.name}`} inputMode="decimal" value={l.quantity} onChange={(e) => patch(l.product.id, { quantity: e.target.value })} /></td>
                <td><MoneyInput aria-label={`Unit cost of ${l.product.name}`} value={l.unitCost} onChange={(c) => patch(l.product.id, { unitCost: c })} /></td>
                <td className="text-right tabular-nums">{l.unitCost !== null && l.qty > 0 ? formatKes(Math.round(l.unitCost * l.qty)) : '—'}</td>
                <td>
                  <Button variant="ghost" className="min-h-9 px-2" aria-label={`Remove ${l.product.name}`} onClick={() => setLines((c) => c.filter((x) => x.product.id !== l.product.id))}>
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Field label="Note">{(p) => <Input {...p} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      {error && <ErrorNotice message={error} />}
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold">Total {formatKes(total)}</p>
        <Button type="submit" disabled={create.isPending || lines.length === 0}>
          {create.isPending && <Loader2 className="animate-spin" />} Save and add to stock
        </Button>
      </div>
    </form>
  );
}
