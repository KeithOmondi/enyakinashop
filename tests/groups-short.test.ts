import { describe, expect, it } from 'vitest';
import { shortName, variantLabel } from '../src/lib/groups';
import type { Product } from '../src/lib/types';

const p = (name: string, categoryId: string | null): Product => ({
  id: name, sku: name, barcode: null, name, categoryId, categoryName: null, unit: 'pcs', allowsFraction: false,
  priceCents: 1, costCents: 1, reorderLevel: 0, active: true, imageUrl: null, quantity: 1, lowStock: false,
});

describe('short names inside a family', () => {
  it('drops the repeated Point and category when the columns already show them', () => {
    const a = p('Obambla Point 1 - Fresh', 'fresh');
    const b = p('Obambla Point 1 - Deep Fry', 'fry');
    expect(shortName(a, [a, b])).toBe('Obambla');
  });
  it('keeps the full name when two items would look the same', () => {
    const m = p('Fries - Medium', 'food');
    const l = p('Fries - Large', 'food');
    expect(shortName(m, [m, l])).toBe('Fries - Medium');
    expect(variantLabel('Fries - Large')).toBe('Large');
  });
});
