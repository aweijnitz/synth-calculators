import {
  computeQ,
  effectiveR,
  fcFromR,
  sweepPot,
  solveCapacitorsForTarget,
  DEFAULT_SWEEP_ALPHAS,
} from '../../lib/sklp_equal/solve';

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

  it('selects capacitors from the E6 series to match the target cutoff at 50%', () => {
    const targetFc = 6_366; // Hz, approx for 25 kΩ with 10 nF caps
    const rPotMax = 50_000; // 50 kΩ dual-gang

    const selection = solveCapacitorsForTarget({ targetFcHz: targetFc, rPotMax });
    if (selection instanceof Error) {
      throw selection;
    }

    expect(selection.c1).toBeCloseTo(10e-9, 6);
    expect(selection.c2).toBeCloseTo(10e-9, 6);
    expect(selection.deviation).toBeCloseTo(0, 3);
  });

  it('biases capacitor choice using the optional seed value', () => {
    const targetFc = 1_000; // Hz
    const rPotMax = 20_000; // 20 kΩ

    const selectionWithoutSeed = solveCapacitorsForTarget({ targetFcHz: targetFc, rPotMax });
    if (selectionWithoutSeed instanceof Error) {
      throw selectionWithoutSeed;
    }

    const seed = 220e-9; // 220 nF
    const selectionWithSeed = solveCapacitorsForTarget({ targetFcHz: targetFc, rPotMax, cBase: seed });
    if (selectionWithSeed instanceof Error) {
      throw selectionWithSeed;
    }

    expect(selectionWithSeed.c2).not.toBe(selectionWithoutSeed.c2);
    expect(Math.abs(Math.log10(selectionWithSeed.c2 / seed))).toBeLessThan(
      Math.abs(Math.log10(selectionWithoutSeed.c2 / seed)),
    );
  });
});
