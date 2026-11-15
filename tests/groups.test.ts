import { describe, expect, it } from 'vitest';
import { groupProducts, pointOf, productGroupName } from '../src/lib/groups';
import type { Product } from '../src/lib/types';

const p = (name: string, over: Partial<Product> = {}): Product => ({
  id: name, sku: name, barcode: null, name, categoryId: null, categoryName: null, unit: 'pcs',
  allowsFraction: false, priceCents: 10000, costCents: 5000, reorderLevel: 0, active: true,
  imageUrl: null, quantity: 10, lowStock: false, ...over,
});

describe('product groups', () => {
  it('derives the family from the name', () => {
    expect(productGroupName('Tilapia Point 3 - Deep Fry')).toBe('Tilapia');
    expect(productGroupName('Cap - Kids')).toBe('Cap');
    expect(productGroupName('Sports T-Shirt - Adults')).toBe('Sports T-Shirt');
    expect(productGroupName('Hand Bag')).toBe('Hand Bag');
    expect(productGroupName('TILAPIA POINT 1')).toBe('TILAPIA');
  });

  it('reads the point from the name', () => {
    expect(pointOf('Omena Point 4 - Wet Fry')).toBe(4);
    expect(pointOf('TILAPIA POINT 1')).toBe(1);
    expect(pointOf('Cap - Kids')).toBeNull();
  });

  it('collects variants into one group with totals', () => {
    const groups = groupProducts([
      p('Tilapia Point 1 - Fresh', { priceCents: 15000, quantity: 20 }),
      p('Tilapia Point 2 - Fresh', { priceCents: 20000, quantity: 20, lowStock: true }),
      p('Omena Point 1 - Fresh', { quantity: 5, imageUrl: 'http://x/y.webp' }),
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Omena', 'Tilapia']);
    const t = groups.find((g) => g.name === 'Tilapia')!;
    expect(t.items).toHaveLength(2);
    expect(t.totalQuantity).toBe(40);
    expect([t.minPriceCents, t.maxPriceCents]).toEqual([15000, 20000]);
    expect(t.lowStockCount).toBe(1);
    expect(groups[0]!.imageUrl).toBe('http://x/y.webp');
  });
});
