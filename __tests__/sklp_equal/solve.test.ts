import { computeQ, effectiveR, fcFromR, sweepPot, DEFAULT_SWEEP_ALPHAS } from '../../lib/sklp_equal/solve';

describe('sklp_equal math utilities', () => {
  it('computes Q using simplified formula', () => {
    const c1 = 4.7e-9; // 4.7 nF
    const c2 = 1e-9; // 1 nF
    const q = computeQ(c1, c2);
    expect(q).toBeCloseTo(0.5 * Math.sqrt(4.7), 6);
  });

  it('computes f_c from R and capacitors', () => {
    const r = 10_000; // 10 kΩ
    const c1 = 10e-9;
    const c2 = 10e-9;
    const fc = fcFromR(r, c1, c2);
    expect(fc / 1_000).toBeCloseTo(1.5915, 3);
  });

  it('sweeps potentiometer positions producing monotonically increasing resistance', () => {
    const rPotMax = 50_000;
    const c1 = 10e-9;
    const c2 = 10e-9;
    const sweep = sweepPot(rPotMax, c1, c2, 0, 0, 20);

    expect(sweep).toHaveLength(DEFAULT_SWEEP_ALPHAS.length);

    const resistances = sweep.map((point) => point.R);
    const frequencies = sweep.map((point) => point.fc);

    for (let index = 1; index < resistances.length; index += 1) {
      expect(resistances[index]).toBeGreaterThan(resistances[index - 1]);
      expect(frequencies[index]).toBeLessThan(frequencies[index - 1]);
    }

    const alphaZero = sweep[0];
    expect(alphaZero.R).toBeGreaterThanOrEqual(20);
    expect(alphaZero.fc).toBeGreaterThan(100_000); // very high cutoff at end-stop

    const alphaQuarter = sweep[1];
    const expectedQuarter = 1 / (2 * Math.PI * alphaQuarter.R * Math.sqrt(c1 * c2));
    expect(alphaQuarter.fc).toBeCloseTo(expectedQuarter, 6);

    const alphaFull = sweep[sweep.length - 1];
    const expectedFull = 1 / (2 * Math.PI * alphaFull.R * Math.sqrt(c1 * c2));
    expect(alphaFull.fc).toBeCloseTo(expectedFull, 6);
  });
});
