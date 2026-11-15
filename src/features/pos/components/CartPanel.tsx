import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button, Input, MoneyInput } from '@/components/ui';
import { fmtQty } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { cartTotals, useCartStore, type CartLine } from '../store/cart';

function Line({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCartStore();
  const step = line.allowsFraction ? 0.5 : 1;
  const over = line.quantity > line.stock;
  return (
    <li className="border-b border-border py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{line.name}</p>
          <p className="text-xs text-muted-foreground">{formatKes(line.priceCents)} / {line.unit}</p>
        </div>
        <Button variant="ghost" className="min-h-9 px-2" aria-label={`Remove ${line.name}`} onClick={() => remove(line.productId)}><Trash2 /></Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" className="size-11 px-0" aria-label="Less" onClick={() => line.quantity - step > 0 ? setQuantity(line.productId, Math.round((line.quantity - step) * 1000) / 1000) : remove(line.productId)}><Minus /></Button>
          <Input
            aria-label={`Quantity of ${line.name}`}
            inputMode="decimal"
            className="w-20 text-center"
            defaultValue={fmtQty(line.quantity).replace(/,/g, '')}
            key={line.quantity}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n) || n <= 0) return remove(line.productId);
              setQuantity(line.productId, line.allowsFraction ? Math.round(n * 1000) / 1000 : Math.round(n));
            }}
          />
          <Button variant="outline" className="size-11 px-0" aria-label="More" onClick={() => setQuantity(line.productId, Math.round((line.quantity + step) * 1000) / 1000)}><Plus /></Button>
        </div>
        <p className="font-semibold tabular-nums">{formatKes(Math.round(line.priceCents * line.quantity))}</p>
      </div>
      {over && <p role="alert" className="mt-1 text-xs text-destructive">Only {fmtQty(line.stock)} {line.unit} in stock</p>}
    </li>
  );
}

export function CartPanel({ onCharge }: { onCharge: () => void }) {
  const { lines, discountCents, setDiscount, clear } = useCartStore();
  const t = cartTotals(lines, discountCents);
  const overStock = lines.some((l) => l.quantity > l.stock);

  return (
    <div className="flex flex-col">
      {lines.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">The cart is empty. Tap a product to add it.</p>
      ) : (
        <>
          <ul>{lines.map((l) => <Line key={l.productId} line={l} />)}</ul>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <label htmlFor="discount" className="font-medium">Discount (KES)</label>
            <MoneyInput id="discount" className="w-32 text-right" key={lines.length === 0 ? 'e' : 'f'} value={discountCents || null} onChange={(c) => setDiscount(c ?? 0)} placeholder="0" />
          </div>
          {discountCents > t.subtotal && <p role="alert" className="mt-1 text-xs text-destructive">Discount is more than the total</p>}
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold tabular-nums">{formatKes(t.total)}</span>
          </div>
          <Button className="mt-3 min-h-14 text-lg" disabled={overStock || t.total <= 0 || discountCents > t.subtotal} onClick={onCharge}>
            Charge {formatKes(t.total)}
          </Button>
          <Button variant="ghost" className="mt-1" onClick={() => window.confirm('Clear the whole cart?') && clear()}>Clear cart</Button>
        </>
      )}
    </div>
  );
}
