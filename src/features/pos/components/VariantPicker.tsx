import { Modal, cn } from '@/components/ui';
import { fmtQty } from '@/lib/format';
import { pointOf, variantLabel, type ProductGroup } from '@/lib/groups';
import { formatKes } from '@/lib/money';
import type { Product } from '@/lib/types';

/**
 * The items of one product family laid out as a grid: a row per Point and a column per
 * category (e.g. Fresh / Deep Fry / Wet Fry). Tap a cell to add that item to the cart.
 */
export function VariantPicker({ group, onPick, onClose }: { group: ProductGroup | null; onPick: (p: Product) => void; onClose: () => void }) {
  const items = group?.items ?? [];
  const columns = [...new Set(items.map((p) => p.categoryName ?? '—'))].sort((a, b) => a.localeCompare(b));
  const hasPoints = items.some((p) => pointOf(p.name) !== null);
  const rowKeys = [...new Set(items.map((p) => pointOf(p.name) ?? 0))].sort((a, b) => a - b);
  // Usually one item per cell. Items that share a Point and category (Fries - Medium / Large) stack in one cell.
  const cell = (row: number, col: string) => items.filter((p) => (pointOf(p.name) ?? 0) === row && (p.categoryName ?? '—') === col);

  return (
    <Modal open={group !== null} onClose={onClose} title={group?.name ?? ''} wide>
      {group && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-2 text-left">
            <thead>
              <tr>
                {hasPoints && <th className="w-16 text-xs font-medium text-muted-foreground">Point</th>}
                {columns.map((c) => <th key={c} className="text-sm font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((r) => (
                <tr key={r}>
                  {hasPoints && <th scope="row" className="text-lg font-semibold tabular-nums">{r === 0 ? '—' : r}</th>}
                  {columns.map((c) => {
                    const ps = cell(r, c);
                    if (ps.length === 0) return <td key={c} />;
                    return (
                      <td key={c}>
                        <div className="flex flex-col gap-2">
                          {ps.map((p) => {
                            const out = p.quantity <= 0;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                disabled={out}
                                onClick={() => onPick(p)}
                                aria-label={`Add ${p.name}`}
                                className="flex min-h-16 w-full flex-col items-start justify-center rounded-lg border border-border px-3 py-2 text-left active:bg-muted disabled:opacity-50"
                              >
                                {ps.length > 1 && <span className="text-xs font-medium">{variantLabel(p.name)}</span>}
                                <span className="font-semibold tabular-nums">{formatKes(p.priceCents)}</span>
                                <span className={cn('text-xs', out ? 'text-destructive' : p.lowStock ? 'text-warning' : 'text-muted-foreground')}>
                                  {out ? 'Out of stock' : `${fmtQty(p.quantity)} ${p.unit}${p.lowStock ? ' left' : ''}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Tap an item to add it to the cart. Tap again to add another.</p>
        </div>
      )}
    </Modal>
  );
}
