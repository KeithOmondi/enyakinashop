import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdjustStockForm } from '@/features/inventory/components/AdjustStockForm';
import { MOVEMENT_LABEL, balanceBefore } from '@/lib/movements';
import type { Product } from '@/lib/types';

const product = {
  id: 'p1', sku: 'S', barcode: null, name: 'Omena Point 1 - Fresh', categoryId: null, categoryName: null, unit: 'pcs',
  allowsFraction: false, priceCents: 6000, costCents: 4000, reorderLevel: 5, active: true, imageUrl: null, quantity: 20, lowStock: false,
} as Product;

afterEach(cleanup);

describe('stock in', () => {
  it('works out the stock before a movement', () => {
    expect(balanceBefore({ balanceAfter: 25, quantity: 5 })).toBe(20);
    expect(balanceBefore({ balanceAfter: 7, quantity: -3 })).toBe(10);
    expect(MOVEMENT_LABEL.cold_room).toBe('New from cold room');
  });

  it('offers New Stock and New from Cold Room, and shows current, added and new total', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdjustStockForm product={product} onDone={() => undefined} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('option', { name: 'New Stock' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'New from Cold Room' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('How many were added?'), { target: { value: '12' } });
    const summary = screen.getByLabelText('Stock summary');
    expect(summary.textContent).toContain('20 pcs');
    expect(summary.textContent).toContain('+12');
    expect(summary.textContent).toContain('32 pcs');
  });
});
