import {
  buildRatioOptions,
  compareCandidates,
  computeNaturalFrequencyHz,
  computeQualityFactor,
  generateE6Capacitors,
  solveResistorsForCapacitors,
  solveSallenKeyLP,
} from '../../lib/sklp/solve';

describe('Sallen-Key solver utilities', () => {
  it('computes natural frequency and Q per TI formulas', () => {
    const r1 = 1800;
    const r2 = 2700;
    const c1 = 4.7e-9;
    const c2 = 1e-9;

    const fc = computeNaturalFrequencyHz({ r1, r2, c1, c2 });
    const q = computeQualityFactor({ r1, r2, c1, c2 });

    const expectedFc = 1 / (2 * Math.PI * Math.sqrt(r1 * r2 * c1 * c2));
    const expectedQ = Math.sqrt(r1 * r2 * c1 * c2) / (c2 * (r1 + r2));

    expect(fc).toBeCloseTo(expectedFc, 9);
    expect(q).toBeCloseTo(expectedQ, 9);
  });

  it('reconstructs resistors from capacitor selections', () => {
    const fcHz = 1_200;
    const Q = 0.9;
    const c1 = 3.3e-9;
    const c2 = 1e-9;

    const result = solveResistorsForCapacitors({ fcHz, Q, c1, c2 });
    if (result instanceof Error) {
      throw result;
    }

    const { r1, r2 } = result;
    const product = r1 * r2;
    const sum = r1 + r2;

    const omega0 = 2 * Math.PI * fcHz;
    const expectedProduct = 1 / (omega0 * omega0 * c1 * c2);
    const expectedSum = 1 / (omega0 * Q * c2);

    expect(product).toBeCloseTo(expectedProduct, 6);
    expect(sum).toBeCloseTo(expectedSum, 6);
  });

  it('rejects infeasible capacitor pairs when Q exceeds 0.5 with equal caps', () => {
    const result = solveResistorsForCapacitors({ fcHz: 1_000, Q: 0.707, c1: 1e-9, c2: 1e-9 });
    expect(result).toBeInstanceOf(Error);
  });

  it('searches E6 capacitors within the specified bounds without duplicates', () => {
    const caps = generateE6Capacitors();
    expect(caps[0]).toBeGreaterThanOrEqual(100e-12);
    expect(caps.at(-1)!).toBeLessThanOrEqual(10e-6);
    const unique = new Set(caps);
    expect(unique.size).toBe(caps.length);
  });

  it('selects resistor pairs with minimal spread and returns recomputed values', () => {
    const result = solveSallenKeyLP({ fcHz: 1_000, Q: 0.707 });
    if (result instanceof Error) {
      throw result;
    }

    expect(result.c1 / result.c2).toBeGreaterThan(1.1);
    expect(result.r1).toBeGreaterThan(0);
    expect(result.r2).toBeGreaterThan(0);
    expect(result.fc).toBeCloseTo(1_000, 2);
    expect(result.Q).toBeCloseTo(0.707, 3);
  });

  it('prefers candidates with tighter resistor spread before smaller absolute values', () => {
    const better = {
      c1: 4.7e-9,
      c2: 1e-9,
      r1: 1_500,
      r2: 2_000,
      spread: 2_000 / 1_500,
      maxR: 2_000,
      capRatio: 4.7,
      baseDelta: 0,
    } as const;
    const worse = {
      c1: 3.3e-9,
      c2: 1e-9,
      r1: 1_000,
      r2: 3_000,
      spread: 3,
      maxR: 3_000,
      capRatio: 3.3,
      baseDelta: 0,
    } as const;

    expect(compareCandidates(better, worse)).toBeLessThan(0);
    expect(compareCandidates(worse, better)).toBeGreaterThan(0);
  });

  it('provides ratio options derived from E6 mantissas', () => {
    const options = buildRatioOptions();
    expect(options).toEqual([
      { value: 1, label: '1:1' },
      { value: 1.5, label: '1.5:1' },
      { value: 2.2, label: '2.2:1' },
      { value: 3.3, label: '3.3:1' },
      { value: 4.7, label: '4.7:1' },
      { value: 6.8, label: '6.8:1' },
    ]);
  });
});
