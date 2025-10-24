import { rParallel } from '../../lib/parallel/solve';

const within = (actual: number, expected: number, tolerancePercent = 0.5) => {
  const diff = Math.abs(actual - expected);
  const tolerance = (Math.abs(expected) * tolerancePercent) / 100;
  expect(diff).toBeLessThanOrEqual(tolerance);
};

describe('rParallel', () => {
  it('returns half the value when resistors are equal', () => {
    const result = rParallel(10_000, 10_000);
    expect(result).toBeCloseTo(5_000, 6);
  });

  it('handles typical values', () => {
    const result = rParallel(2_200, 4_700);
    within(result, 1_500);
  });

  it('handles disparate values without losing precision', () => {
    const result = rParallel(1_000_000, 1_000);
    within(result, 999, 0.1);
  });

  it('handles extremely disparate values stably', () => {
    const result = rParallel(100_000, 100);
    within(result, 99.9, 0.1);
  });

  it('rejects zero or negative values', () => {
    expect(() => rParallel(0, 10)).toThrow(/greater than zero/i);
    expect(() => rParallel(-5, 10)).toThrow(/greater than zero/i);
  });

  it('rejects non-finite numbers', () => {
    expect(() => rParallel(Number.POSITIVE_INFINITY, 10)).toThrow(/finite/i);
  });
});
