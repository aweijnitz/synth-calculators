import { solveCutoff, type SolveCutoffResult } from '../../lib/rc/solve';

const ensureResult = (value: SolveCutoffResult | Error): SolveCutoffResult => {
  if (value instanceof Error) {
    throw value;
  }
  return value;
};

describe('solveCutoff', () => {
  it('computes cutoff frequency from resistance and capacitance', () => {
    const result = ensureResult(solveCutoff({ r: 10_000, c: 47e-9 }));
    expect(result.fc).toBeCloseTo(338.63, 2);
    expect(result.r).toBe(10_000);
    expect(result.c).toBeCloseTo(47e-9);
  });

  it('computes capacitance from resistance and cutoff frequency', () => {
    const result = ensureResult(solveCutoff({ r: 3_300, fc: 1_000 }));
    expect(result.c).toBeCloseTo(48.25e-9, 4);
    expect(result.fc).toBe(1_000);
  });

  it('computes resistance from capacitance and cutoff frequency and rounds to the nearest ohm', () => {
    const result = ensureResult(solveCutoff({ c: 47e-9, fc: 1_000 }));
    expect(result.r).toBe(3_386);
    expect(result.fc).toBe(1_000);
  });

  it('requires exactly two values', () => {
    expect(solveCutoff({ r: 10_000 })).toBeInstanceOf(Error);
    expect(solveCutoff({ r: 10_000, c: 47e-9, fc: 1_000 })).toBeInstanceOf(Error);
  });

  it('rejects non-positive inputs', () => {
    expect(solveCutoff({ r: -1, c: 1e-9 })).toBeInstanceOf(Error);
    expect(solveCutoff({ fc: 0, r: 1_000 })).toBeInstanceOf(Error);
  });
});
