import { Printer, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { ProductThumb } from '@/components/ProductThumb';
import { Receipt } from '@/components/Receipt';
import { Badge, Button, EmptyState, ErrorNotice, Input, Modal, Spinner, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { useCategories, useProducts } from '@/features/products/api';
import { errorMessage, fmtQty } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { formatKes } from '@/lib/money';
import type { Page, Product, Sale } from '@/lib/types';
import { toast } from 'sonner';
import { CartPanel } from '../components/CartPanel';
import { CheckoutModal } from '../components/CheckoutModal';
import { cartTotals, useCartStore } from '../store/cart';

export function PosPage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<Sale | null>(null);
  const search = useDebounced(q.trim(), 250);
  const categories = useCategories();
  const products = useProducts({ ...(search ? { q: search } : {}), ...(categoryId ? { categoryId } : {}), status: 'active', page: 1 }, 60);
  const { lines, discountCents, add } = useCartStore();
  const t = cartTotals(lines, discountCents);
  const itemCount = lines.length;

  function addProduct(p: Product) {
    if (p.quantity <= 0) return toast.error(`${p.name} is out of stock`);
    add(p, 1);
  }

  /** A scanner types the barcode then presses Enter: add the exact match straight away. */
  async function onEnter() {
    const code = q.trim();
    if (!code) return;
    try {
      const { data } = await api.get<Page<Product>>('/products', { params: { q: code, status: 'active', pageSize: 5 } });
      const hit = data.items.find((p) => p.barcode === code) ?? (data.items.length === 1 ? data.items[0] : undefined);
      if (hit) {
        addProduct(hit);
        setQ('');
      } else toast.error('No product with that code');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const cart = <CartPanel onCharge={() => { setCartOpen(false); setPaying(true); }} />;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Products">
          <Input
            autoFocus
            placeholder="Search, or scan a barcode"
            aria-label="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void onEnter(); } }}
          />
          {categories.data && categories.data.length > 0 && (
            <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
              {[{ id: '', name: 'All' }, ...categories.data].map((c) => (
                <button key={c.id} onClick={() => setCategoryId(c.id)} className={cn('min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium', categoryId === c.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{c.name}</button>
              ))}
            </div>
          )}
          <div className="mt-3">
            {products.isPending ? <Spinner /> : products.isError ? (
              <ErrorNotice message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
            ) : products.data.items.length === 0 ? (
              <EmptyState title="No products found" />
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {products.data.items.map((p) => {
                  const out = p.quantity <= 0;
                  return (
                    <li key={p.id}>
                      <button onClick={() => addProduct(p)} disabled={out} className="flex h-full min-h-24 w-full flex-col overflow-hidden rounded-lg border border-border text-left active:bg-muted disabled:opacity-50">
                        <ProductThumb url={p.imageUrl} alt="" className="aspect-[4/3] w-full" />
                        <span className="flex flex-1 flex-col justify-between gap-2 p-3">
                          <span className="text-sm font-medium leading-snug">{p.name}</span>
                          <span>
                            <span className="block font-semibold tabular-nums">{formatKes(p.priceCents)}</span>
                            <span className="text-xs text-muted-foreground">{out ? <Badge tone="danger">Out of stock</Badge> : p.lowStock ? <Badge tone="warning">{fmtQty(p.quantity)} {p.unit} left</Badge> : `${fmtQty(p.quantity)} ${p.unit}`}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside aria-label="Cart" className="hidden self-start rounded-lg border border-border bg-muted/50 p-4 lg:sticky lg:top-6 lg:block">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><ShoppingCart className="size-4" /> Cart</h2>
          {cart}
        </aside>
      </div>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <Button className="min-h-14 w-full justify-between text-base shadow-lg" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2"><ShoppingCart /> {itemCount} item{itemCount === 1 ? '' : 's'}</span>
            <span className="tabular-nums">{formatKes(t.total)}</span>
          </Button>
        </div>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Cart">{cartOpen && cart}</Modal>
      <CheckoutModal open={paying} onClose={() => setPaying(false)} onPaid={(s) => { setPaying(false); setDone(s); }} />

      <Modal open={done !== null} onClose={() => setDone(null)} title={done ? `Sale complete: #${done.receiptNo}` : 'Sale complete'}>
        {done && (
          <div className="flex flex-col gap-4">
            {done.changeCents > 0 && (
              <p className="rounded-lg bg-success/10 p-3 text-center text-lg font-semibold text-success">Give change: {formatKes(done.changeCents)}</p>
            )}
            <Receipt sale={done} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
              <Button className="flex-1" onClick={() => setDone(null)}>New sale</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
