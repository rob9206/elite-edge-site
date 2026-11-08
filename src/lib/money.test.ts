import { describe, it, expect } from 'vitest';
import {
  roundCents,
  applyBps,
  centsToDecimalString,
  dollarsToCents,
  formatUsd,
} from './money';

describe('money', () => {
  it('rounds to nearest cent, half up', () => {
    expect(roundCents(100.4)).toBe(100);
    expect(roundCents(100.5)).toBe(101);
  });

  it('applies basis points', () => {
    expect(applyBps(10_000, 1000)).toBe(1000); // 10% of $100.00 = $10.00
    expect(applyBps(10_000, 1250)).toBe(1250); // 12.5%
    expect(applyBps(12_345, 800)).toBe(988); // round(987.6)
  });

  it('converts cents to a decimal string at the boundary', () => {
    expect(centsToDecimalString(123_456)).toBe('1234.56');
    expect(centsToDecimalString(5)).toBe('0.05');
    expect(centsToDecimalString(100)).toBe('1.00');
  });

  it('converts dollars to integer cents', () => {
    expect(dollarsToCents('1234.56')).toBe(123_456);
    expect(dollarsToCents(0.1)).toBe(10);
    expect(() => dollarsToCents('abc')).toThrow();
  });

  it('formats USD for display', () => {
    expect(formatUsd(123_456)).toBe('$1,234.56');
  });
});
