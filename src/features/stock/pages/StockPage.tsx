import { useState } from 'react';
import { toast } from 'sonner';
import { AdjustStockForm } from '@/features/inventory/components/AdjustStockForm';
import { useProducts } from '@/features/products/api';
import { Badge, EmptyState, ErrorNotice, Input, Modal, PageHeader, Pagination, Spinner } from '@/components/ui';
import { errorMessage, fmtQty } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import type { Product } from '@/lib/types';

export function StockPage() {
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const search = useDebounced(q.trim());
  const products = useProducts({ ...(search ? { q: search } : {}), status: 'active', ...(lowOnly ? { lowStock: true } : {}), page }, 20);

  return (
    <>
      <PageHeader title="Stock" description="What is on the shelf. Tap a product to correct a count." />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input className="flex-1" placeholder="Search products" aria-label="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} /> Low only</label>
      </div>
      {products.isPending ? <Spinner /> : products.isError ? (
        <ErrorNotice message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <EmptyState title="No products found" />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {products.data.items.map((p) => (
              <li key={p.id}>
                <button onClick={() => setAdjusting(p)} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-muted">
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.sku}</span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="block font-semibold">{fmtQty(p.quantity)} {p.unit}</span>
                    {p.quantity === 0 ? <Badge tone="danger">Out</Badge> : p.lowStock ? <Badge tone="warning">Low</Badge> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={products.data.pageSize} total={products.data.total} onPage={setPage} />
        </>
      )}
      <Modal open={adjusting !== null} onClose={() => setAdjusting(null)} title="Correct stock">
        {adjusting && <AdjustStockForm product={adjusting} onDone={(updated) => { if (updated !== adjusting) toast.success(`${updated.name}: now ${fmtQty(updated.quantity)} ${updated.unit}`); setAdjusting(null); }} />}
      </Modal>
      <p className="mt-4 text-center text-xs text-muted-foreground">New product or price change? Ask an administrator.</p>
    </>
  );
}
