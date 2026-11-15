import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AxiosAdapter, AxiosResponse } from 'axios';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { useSessionStore } from '@/app/store/session';
import { cartTotals, useCartStore } from '@/features/pos/store/cart';
import { apiClient } from '@/lib/api';

const me = {
  user: { id: 'u1', email: 'a@b.c', name: 'Test User', isSuperAdmin: false },
  businesses: [{ id: 'b1', code: 'go-fish', name: 'Go-fish', role: 'shop_manager' }],
  timezone: 'Africa/Nairobi',
};
const tilapia = {
  id: 'p1', sku: 'T1', barcode: null, name: 'Tilapia', categoryId: null, categoryName: null, unit: 'pcs',
  allowsFraction: false, priceCents: 35000, costCents: 20000, reorderLevel: 0, active: true, imageUrl: 'https://img.test/tilapia.webp', quantity: 10, lowStock: false,
};
const preview = {
  date: '2026-11-14', salesCount: 3, totalCents: 105000, cashCents: 70000, mpesaCents: 35000, cardCents: 0,
  voidedCount: 0, expectedCashCents: 70000, closing: null,
};

function mockApi(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    '/auth/me': me,
    '/products': { items: [tilapia], total: 1, page: 1, pageSize: 60 },
    '/categories': { items: [] },
    '/closings/preview': preview,
    '/businesses/current': { id: 'b1', code: 'go-fish', name: 'Go-fish', phone: null, address: null, receiptFooter: null, timezone: 'Africa/Nairobi', currency: 'KES' },
    ...overrides,
  };
  const adapter: AxiosAdapter = (config) => {
    const body = data[config.url ?? ''];
    const res = { status: body ? 200 : 404, statusText: '', data: body ?? {}, headers: {}, config } as AxiosResponse;
    return res.status === 200 ? Promise.resolve(res) : Promise.reject(Object.assign(new Error('404'), { isAxiosError: true, response: res, config }));
  };
  apiClient.http.defaults.adapter = adapter;
}

function mount(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ accessToken: 'a', refreshToken: 'r', businessId: 'b1' });
  useCartStore.getState().clear();
  mockApi();
});
afterEach(cleanup);

describe('shop app', () => {
  it('sends signed-out visitors to the sign-in page', async () => {
    useSessionStore.setState({ accessToken: null, refreshToken: null, businessId: null });
    mount('/pos');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('shows today\'s totals on the home screen', async () => {
    mount('/');
    expect(await screen.findByText(/Start selling/)).toBeTruthy();
    expect(await screen.findByText(/KES\s?1,050\.00/)).toBeTruthy();
  });

  it('adds a product to the cart from the till and shows the charge', async () => {
    mount('/pos');
    fireEvent.click(await screen.findByRole('button', { name: /Tilapia/ }));
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect((await screen.findAllByRole('button', { name: /Charge KES\s?350\.00/ })).length).toBeGreaterThan(0);
  });

  it('shows the product photo on the till card', async () => {
    const { container } = mount('/pos');
    await screen.findByRole('button', { name: /Tilapia/ });
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://img.test/tilapia.webp');
  });

  it('shows the close-the-day form with the expected cash', async () => {
    mount('/closing');
    expect(await screen.findByText(/Expected cash from sales/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close the day' })).toBeTruthy();
  });
});

describe('cart', () => {
  it('computes totals in whole cents and caps the discount at the subtotal', () => {
    const line = { productId: 'p', name: 'x', unit: 'kg', allowsFraction: true, priceCents: 33333, stock: 5, quantity: 0.5 };
    expect(cartTotals([line], 0)).toEqual({ subtotal: 16667, discount: 0, total: 16667 });
    expect(cartTotals([line], 99999).total).toBe(0);
  });

  it('keeps the checkout key across retries but replaces it when the cart changes', () => {
    const s = useCartStore.getState();
    s.add(tilapia, 1);
    const key = useCartStore.getState().ensureKey();
    expect(useCartStore.getState().ensureKey()).toBe(key); // retry of the same cart
    useCartStore.getState().setQuantity('p1', 2);
    expect(useCartStore.getState().checkoutKey).toBeNull(); // edited cart is a new sale
    expect(useCartStore.getState().ensureKey()).not.toBe(key);
  });
});
