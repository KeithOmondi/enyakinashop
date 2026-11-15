import { Search } from 'lucide-react';
import { useState } from 'react';
import { ProductThumb } from '@/components/ProductThumb';
import { Input } from '@/components/ui';
import { useProducts } from '@/features/products/api';
import { fmtQty } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import type { Product } from '@/lib/types';

/**
 * Type to search products by name, SKU or barcode and pick one. A barcode scanner works
 * too: it "types" the code and presses Enter, which picks an exact barcode match.
 */
export function ProductPicker({
  onPick,
  placeholder = 'Search or scan a product',
  autoFocus,
}: {
  onPick: (p: Product) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 250);
  const results = useProducts({ q, status: 'active', page: 1 }, 8);
  const show = q.length > 0 && text.trim() === q;

  function pick(p: Product) {
    onPick(p);
    setText('');
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden />
      <Input
        className="pl-9"
        placeholder={placeholder}
        aria-label="Find a product"
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const hit = results.data?.items.find((p) => p.barcode === text.trim()) ?? (results.data?.items.length === 1 ? results.data.items[0] : undefined);
          if (hit && show) pick(hit);
        }}
      />
      {show && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {results.isPending && <li className="p-3 text-sm text-muted-foreground">Searching…</li>}
          {results.data?.items.length === 0 && <li className="p-3 text-sm text-muted-foreground">No matching products</li>}
          {results.data?.items.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                <span className="flex items-center gap-3">
                  <ProductThumb url={p.imageUrl} alt="" className="size-9 rounded" />
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{p.sku}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtQty(p.quantity)} {p.unit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
