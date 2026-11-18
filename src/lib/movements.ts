import type { Movement } from './types';

/** Plain-language names for every kind of stock movement. */
export const MOVEMENT_LABEL: Record<Movement['type'], string> = {
  opening: 'Opening stock',
  purchase: 'Received from supplier',
  new_stock: 'New stock',
  cold_room: 'New from cold room',
  sale: 'Sold',
  void: 'Sale cancelled (returned)',
  adjustment: 'Correction',
};

/** Stock coming in, as opposed to a sale or a correction. */
export const STOCK_IN_TYPES: Movement['type'][] = ['opening', 'purchase', 'new_stock', 'cold_room'];

/** What the stock was before a movement happened. */
export const balanceBefore = (m: Pick<Movement, 'balanceAfter' | 'quantity'>): number =>
  Math.round((m.balanceAfter - m.quantity) * 1000) / 1000;
