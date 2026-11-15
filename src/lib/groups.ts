import type { Product } from './types';

/**
 * The family a product belongs to, taken from its name:
 *   "Tilapia Point 3 - Deep Fry"  ->  "Tilapia"
 *   "Cap - Kids"                  ->  "Cap"
 *   "Hand Bag"                    ->  "Hand Bag"
 */
export function productGroupName(name: string): string {
  const base = name
    .replace(/\s+-\s+[^-]+$/, '')
    .replace(/\s+point\s+\d+$/i, '')
    .trim();
  return base || name.trim();
}

/** The "Point N" size grade in a name, or null: "Tilapia Point 3 - Fresh" -> 3. */
export function pointOf(name: string): number | null {
  const m = /\bpoint\s+(\d+)\b/i.exec(name);
  return m ? Number(m[1]) : null;
}

export interface ProductGroup {
  key: string;
  name: string;
  items: Product[];
  imageUrl: string | null;
  totalQuantity: number;
  minPriceCents: number;
  maxPriceCents: number;
  lowStockCount: number;
  unit: string;
}

export const groupKey = (name: string): string => productGroupName(name).toLowerCase();

export function groupProducts(products: Product[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const p of products) {
    const key = groupKey(p.name);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        name: productGroupName(p.name),
        items: [],
        imageUrl: null,
        totalQuantity: 0,
        minPriceCents: p.priceCents,
        maxPriceCents: p.priceCents,
        lowStockCount: 0,
        unit: p.unit,
      };
      map.set(key, g);
    }
    g.items.push(p);
    g.imageUrl ??= p.imageUrl;
    g.totalQuantity += Number(p.quantity);
    g.minPriceCents = Math.min(g.minPriceCents, p.priceCents);
    g.maxPriceCents = Math.max(g.maxPriceCents, p.priceCents);
    if (p.lowStock) g.lowStockCount++;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
