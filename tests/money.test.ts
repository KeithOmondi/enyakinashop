import { describe, expect, it } from 'vitest';
import { formatKes, kesToCents } from '@/lib/money';

describe('money helpers', () => {
  it('parses typed amounts to integer cents without float error', () => {
    expect(kesToCents('1,200')).toBe(120000);
    expect(kesToCents('350.5')).toBe(35050);
    expect(kesToCents('0.07')).toBe(7);
    expect(kesToCents('19.99')).toBe(1999);
  });

  it('rejects anything that is not a plain amount', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1e3', '12.', '.5']) {
      expect(kesToCents(bad)).toBeNull();
    }
  });

  it('formats cents for display', () => {
    expect(formatKes(120050)).toMatch(/KES\s?1,200\.50/);
    expect(() => formatKes(1.5)).toThrow();
  });
});
