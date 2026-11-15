import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newIdempotencyKey } from '@/lib/api-client';
import type { Product } from '@/lib/types';
import type { PaidPrompt } from '../components/MpesaPrompt';

export interface CartLine {
  productId: string;
  name: string;
  unit: string;
  allowsFraction: boolean;
  priceCents: number;
  /** Stock when the product was last loaded. A hint only: the server decides. */
  stock: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  discountCents: number;
  /**
   * One key per cart contents. Retrying a failed checkout reuses it, so a sale whose
   * response was lost cannot be recorded twice; any edit to the cart makes a new key.
   */
  checkoutKey: string | null;
  /**
   * M-Pesa prompts the customer has already paid for this cart. Kept here (and saved) so
   * closing the payment window, or reloading, never loses a confirmed payment and the
   * cashier is never tempted to send a second prompt.
   */
  paidMpesa: PaidPrompt[];
  addPaidMpesa: (p: PaidPrompt) => void;
  add: (p: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  setDiscount: (cents: number) => void;
  ensureKey: () => string;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      discountCents: 0,
      checkoutKey: null,
      paidMpesa: [],
      addPaidMpesa: (p) => set((s) => (s.paidMpesa.some((x) => x.id === p.id) ? s : { paidMpesa: [...s.paidMpesa, p] })),
      add: (p, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === p.id);
          const lines = existing
            ? s.lines.map((l) =>
                l.productId === p.id
                  ? { ...l, stock: p.quantity, quantity: Math.round((l.quantity + quantity) * 1000) / 1000 }
                  : l,
              )
            : [
                ...s.lines,
                {
                  productId: p.id,
                  name: p.name,
                  unit: p.unit,
                  allowsFraction: p.allowsFraction,
                  priceCents: p.priceCents,
                  stock: p.quantity,
                  quantity,
                },
              ];
          return { lines, checkoutKey: null };
        }),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
          checkoutKey: null,
        })),
      remove: (productId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId), checkoutKey: null })),
      setDiscount: (discountCents) => set({ discountCents, checkoutKey: null }),
      ensureKey: () => {
        const existing = get().checkoutKey;
        if (existing) return existing;
        const key = newIdempotencyKey();
        set({ checkoutKey: key });
        return key;
      },
      clear: () => set({ lines: [], discountCents: 0, checkoutKey: null, paidMpesa: [] }),
    }),
    {
      name: 'shop.cart',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export function cartTotals(lines: CartLine[], discountCents: number) {
  const subtotal = lines.reduce((s, l) => s + Math.round(l.priceCents * l.quantity), 0);
  const discount = Math.min(discountCents, subtotal);
  return { subtotal, discount, total: subtotal - discount };
}
