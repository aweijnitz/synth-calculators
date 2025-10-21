import {
  DEFAULT_RELATIVE_TOLERANCE,
  fcFromRRC,
  pickE6CapsForF50,
  qFromCaps,
  sweepPot,
  DEFAULT_SWEEP_ALPHAS,
} from '../../lib/sklp_equal_pot/solve';

describe('sklp_equal_pot math', () => {
  it('computes cutoff frequency for equal resistors', () => {
    const fc = fcFromRRC(10_000, 10e-9, 10e-9);
    expect(fc).toBeCloseTo(1_591.549, 3);
  });

  it('computes Q using capacitor ratio', () => {
    const q = qFromCaps(4.7e-9, 1e-9);
    expect(q).toBeCloseTo(0.5 * Math.sqrt(4.7), 6);
  });

  it('selects E6 capacitors to hit the 50% target within tolerance when possible', () => {
    const result = pickE6CapsForF50(1_000, 46_800);
    expect(result).not.toBeNull();
    expect(result?.withinTolerance).toBe(true);
    expect(result?.relErr ?? 1).toBeLessThanOrEqual(DEFAULT_RELATIVE_TOLERANCE);
    expect(Math.abs((result?.f50 ?? 0) - 1_000)).toBeLessThan(0.5);
  });

  it('falls back to the closest option when target exceeds capacitor search window', () => {
    const result = pickE6CapsForF50(5_000_000, 10_000);
    expect(result).not.toBeNull();
    expect(result?.withinTolerance).toBe(false);
    expect(result?.relErr ?? 0).toBeGreaterThan(DEFAULT_RELATIVE_TOLERANCE);
  });

  it('produces monotonically decreasing cutoff frequencies across the sweep', () => {
    const design = pickE6CapsForF50(1_000, 50_000);
    expect(design).not.toBeNull();
    const sweep = sweepPot(50_000, design!.c1, design!.c2);
    expect(sweep).toHaveLength(DEFAULT_SWEEP_ALPHAS.length);

    const frequencies = sweep.map((point) => point.fc);
    const resistances = sweep.map((point) => point.R);

    for (let index = 1; index < frequencies.length; index += 1) {
      expect(frequencies[index]).toBeLessThan(frequencies[index - 1]);
      expect(resistances[index]).toBeGreaterThan(resistances[index - 1]);
    }

    const alphaZero = sweep[0];
    expect(alphaZero.R).toBeGreaterThanOrEqual(20);
    const expectedFc = fcFromRRC(alphaZero.R, design!.c1, design!.c2);
    expect(alphaZero.fc).toBeCloseTo(expectedFc, 6);
  });
});
