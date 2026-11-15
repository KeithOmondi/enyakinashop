import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { VariantPicker } from '@/features/pos/components/VariantPicker';
import { groupProducts } from '@/lib/groups';
import type { Product } from '@/lib/types';

const p = (name: string, categoryName: string, priceCents: number, quantity = 10): Product => ({
  id: name, sku: name, barcode: null, name, categoryId: null, categoryName, unit: 'pcs', allowsFraction: false,
  priceCents, costCents: 100, reorderLevel: 0, active: true, imageUrl: null, quantity, lowStock: false,
});

// jsdom has no <dialog> modal support.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
});

afterEach(cleanup);

describe('variant picker', () => {
  const group = groupProducts([
    p('Tilapia Point 1 - Fresh', 'Fresh Fish', 15000),
    p('Tilapia Point 1 - Deep Fry', 'Deep Fry Fish', 25000),
    p('Tilapia Point 2 - Fresh', 'Fresh Fish', 20000, 0),
  ])[0]!;

  it('lays out points as rows and categories as columns, and adds the tapped item', () => {
    const onPick = vi.fn();
    render(<VariantPicker group={group} onPick={onPick} onClose={() => undefined} />);
    expect(screen.getByText('Deep Fry Fish')).toBeTruthy();
    expect(screen.getByText('Fresh Fish')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add Tilapia Point 1 - Deep Fry' }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tilapia Point 1 - Deep Fry' }));
  });

  it('disables items that are out of stock', () => {
    render(<VariantPicker group={group} onPick={() => undefined} onClose={() => undefined} />);
    expect((screen.getByRole('button', { name: 'Add Tilapia Point 2 - Fresh' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
