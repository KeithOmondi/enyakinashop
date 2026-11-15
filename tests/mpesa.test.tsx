import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutModal } from '@/features/pos/components/CheckoutModal';
import { MpesaPrompt } from '@/features/pos/components/MpesaPrompt';
import { useCartStore } from '@/features/pos/store/cart';
import { useSessionStore } from '@/app/store/session';
import { apiClient } from '@/lib/api';

type Handler = (config: InternalAxiosRequestConfig) => { status?: number; data: unknown };
let calls: InternalAxiosRequestConfig[];

function mockApi(handlers: Record<string, Handler>) {
  calls = [];
  const adapter: AxiosAdapter = (config) => {
    calls.push(config);
    const h = handlers[`${(config.method ?? 'get').toUpperCase()} ${config.url}`];
    const out = h ? h(config) : { status: 404, data: {} };
    const res = { status: out.status ?? 200, statusText: '', data: out.data, headers: {}, config } as AxiosResponse;
    return res.status < 400 ? Promise.resolve(res) : Promise.reject(Object.assign(new Error(String(res.status)), { isAxiosError: true, response: res, config }));
  };
  apiClient.http.defaults.adapter = adapter;
}

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const request = (over: object = {}) => ({
  id: 'req-1', status: 'pending', amountCents: 35000, phone: '254712***678', receipt: null, resultDesc: null, expiresAt: '2030-01-01T00:00:00Z', saleId: null, ...over,
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSessionStore.setState({ accessToken: 'a', refreshToken: 'r', businessId: 'b1' });
  useCartStore.getState().clear();
  // jsdom has no native <dialog> modal support.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
afterEach(cleanup);

const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('M-Pesa prompt', () => {
  it('waits for the customer, then reports the paid prompt with its receipt', async () => {
    let polls = 0;
    mockApi({
      'POST /payments/mpesa/requests': () => ({ status: 201, data: request() }),
      'GET /payments/mpesa/requests/req-1': () => ({ data: ++polls < 2 ? request() : request({ status: 'paid', receipt: 'QK12AB34CD' }) }),
    });
    const onPaid = vi.fn();
    wrap(<MpesaPrompt amountCents={35000} simulator={false} onPaid={onPaid} />);

    type(/M-Pesa number/, '0712 345 678');
    fireEvent.click(screen.getByRole('button', { name: /Send prompt/ }));

    expect(await screen.findByText(/Waiting for the customer/)).toBeTruthy();
    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(onPaid).toHaveBeenCalledWith({ id: 'req-1', receipt: 'QK12AB34CD', phone: '254712***678', amountCents: 35000 });
    expect(await screen.findByText(/QK12AB34CD/)).toBeTruthy();
    expect(JSON.parse(calls.find((c) => c.method === 'post')!.data)).toMatchObject({ phone: '0712 345 678', amountCents: 35000 });
  }, 10_000);

  it('shows why the payment failed and lets the cashier try again', async () => {
    mockApi({
      'POST /payments/mpesa/requests': () => ({ status: 201, data: request() }),
      'GET /payments/mpesa/requests/req-1': () => ({ data: request({ status: 'cancelled', resultDesc: 'The customer cancelled the prompt' }) }),
    });
    const onPaid = vi.fn();
    wrap(<MpesaPrompt amountCents={35000} simulator={false} onPaid={onPaid} />);
    type(/M-Pesa number/, '0712345671');
    fireEvent.click(screen.getByRole('button', { name: /Send prompt/ }));
    expect(await screen.findByText('The customer cancelled the prompt')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Send again/ })).toBeTruthy();
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('will not send an amount with cents: M-Pesa takes whole shillings', () => {
    mockApi({});
    wrap(<MpesaPrompt amountCents={35050} simulator={false} onPaid={vi.fn()} />);
    type(/M-Pesa number/, '0712345678');
    expect((screen.getByRole('button', { name: /Send prompt/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/whole shillings/)).toBeTruthy();
  });

  it('explains the simulator numbers when running against the simulator', () => {
    mockApi({});
    wrap(<MpesaPrompt amountCents={35000} simulator onPaid={vi.fn()} />);
    expect(screen.getByText(/ending in 1 = customer cancels/)).toBeTruthy();
  });
});

describe('checkout with M-Pesa', () => {
  const tilapia = { id: 'p1', sku: 'T1', barcode: null, name: 'Tilapia', categoryId: null, categoryName: null, unit: 'pcs', allowsFraction: false, priceCents: 35000, costCents: 20000, reorderLevel: 0, active: true, imageUrl: null, quantity: 10, lowStock: false };
  const profile = (mpesaMode: string) => ({ id: 'b1', code: 'x', name: 'Shop', phone: null, address: null, receiptFooter: null, timezone: 'Africa/Nairobi', currency: 'KES', imagesEnabled: false, mpesaMode });
  const sale = { id: 's1', receiptNo: 1, status: 'completed', totalCents: 35000, items: [], payments: [] };

  it('only lets the sale through once the customer has paid the prompt, then sends the prompt id', async () => {
    mockApi({
      'GET /businesses/current': () => ({ data: profile('simulator') }),
      'POST /payments/mpesa/requests': () => ({ status: 201, data: request() }),
      'GET /payments/mpesa/requests/req-1': () => ({ data: request({ status: 'paid', receipt: 'SIM1A2B3C4D' }) }),
      'POST /sales': () => ({ status: 201, data: sale }),
    });
    useCartStore.getState().add(tilapia as never, 1);
    const onPaid = vi.fn();
    wrap(<CheckoutModal open onClose={vi.fn()} onPaid={onPaid} />);

    fireEvent.change(await screen.findByLabelText('Method'), { target: { value: 'mpesa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Exact amount' }));
    expect((screen.getByRole('button', { name: /Confirm sale/ }) as HTMLButtonElement).disabled).toBe(true); // nothing paid yet

    type(/M-Pesa number/, '0712345678');
    fireEvent.click(screen.getByRole('button', { name: /Send prompt/ }));
    expect(await screen.findByText(/M-Pesa paid · SIM1A2B3C4D/)).toBeTruthy();

    const confirm = screen.getByRole('button', { name: /Confirm sale/ }) as HTMLButtonElement;
    await waitFor(() => expect(confirm.disabled).toBe(false));
    fireEvent.click(confirm);
    await waitFor(() => expect(onPaid).toHaveBeenCalled());

    const body = JSON.parse(calls.find((c) => c.method === 'post' && c.url === '/sales')!.data);
    expect(body.payments).toEqual([{ method: 'mpesa', amountCents: 35000, mpesaRequestId: 'req-1' }]);
    expect(useCartStore.getState().paidMpesa).toEqual([]); // consumed with the sale
  });

  it('keeps a paid prompt if the window is closed, so the customer is never asked to pay twice', async () => {
    mockApi({
      'GET /businesses/current': () => ({ data: profile('simulator') }),
      'POST /payments/mpesa/requests': () => ({ status: 201, data: request() }),
      'GET /payments/mpesa/requests/req-1': () => ({ data: request({ status: 'paid', receipt: 'SIM1A2B3C4D' }) }),
    });
    useCartStore.getState().add(tilapia as never, 1);
    const first = wrap(<CheckoutModal open onClose={vi.fn()} onPaid={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Method'), { target: { value: 'mpesa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Exact amount' }));
    type(/M-Pesa number/, '0712345678');
    fireEvent.click(screen.getByRole('button', { name: /Send prompt/ }));
    await screen.findByText(/M-Pesa paid/);
    first.unmount();

    wrap(<CheckoutModal open onClose={vi.fn()} onPaid={vi.fn()} />);
    expect(await screen.findByText(/M-Pesa paid · SIM1A2B3C4D/)).toBeTruthy(); // restored, locked
    expect((screen.getByRole('button', { name: /Confirm sale/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps the old typed-code behaviour when prompts are off', async () => {
    mockApi({ 'GET /businesses/current': () => ({ data: profile('off') }) });
    useCartStore.getState().add(tilapia as never, 1);
    wrap(<CheckoutModal open onClose={vi.fn()} onPaid={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Method'), { target: { value: 'mpesa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Exact amount' }));
    expect(screen.queryByRole('button', { name: /Send prompt/ })).toBeNull();
    expect(screen.getByLabelText('M-Pesa code')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Confirm sale/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
