import { E24_SERIES } from '../../lib/series/e24';
import { nearestNeighbors } from '../../lib/series/nearest';
import { solvePotBias, type Inputs } from '../../lib/potbias/solve';

describe('solvePotBias', () => {
  const createInputs = (overrides: Partial<Inputs> = {}): Inputs => ({
    vsHi: 12,
    vsLo: 0,
    vTop: 10,
    vBot: 3,
    rPot: 10_000,
    ...overrides
  });

  it('computes expected resistor values for the reference example', () => {
    const result = solvePotBias(createInputs());
    if (result instanceof Error) {
      throw result;
    }
    expect(result.rTop).toBe(2857);
    expect(result.rBottom).toBe(4286);

    const neighborsTop = nearestNeighbors(result.rTop, E24_SERIES);
    expect(neighborsTop.below).toBeCloseTo(2700, 0);
    expect(neighborsTop.above).toBeCloseTo(3000, 0);
  });

  it('returns equal resistors for symmetric targets', () => {
    const result = solvePotBias(
      createInputs({ vsHi: 10, vTop: 7.5, vBot: 2.5, rPot: 20_000 })
    );
    if (result instanceof Error) {
      throw result;
    }
    expect(result.rTop).toBe(10_000);
    expect(result.rBottom).toBe(10_000);
  });

  it('rejects when V_TOP_TARGET <= V_BOT_TARGET', () => {
    const result = solvePotBias(createInputs({ vTop: 3, vBot: 3 }));
    expect(result).toBeInstanceOf(Error);
  });

  it('rejects when V_TOP_TARGET exceeds V_SUP_HI', () => {
    const result = solvePotBias(createInputs({ vTop: 12 }));
    expect(result).toBeInstanceOf(Error);
  });

  it('rejects when V_BOT_TARGET is below V_SUP_LO', () => {
    const result = solvePotBias(createInputs({ vBot: -1 }));
    expect(result).toBeInstanceOf(Error);
  });

  it('rejects non-positive potentiometer values', () => {
    const result = solvePotBias(createInputs({ rPot: 0 }));
    expect(result).toBeInstanceOf(Error);
  });

  it('warns about extremely tight spans via error when delta is tiny', () => {
    const result = solvePotBias(createInputs({ vTop: 5.0000000001, vBot: 5 }));
    expect(result).toBeInstanceOf(Error);
  });

  it('rejects non-finite voltage values', () => {
    const result = solvePotBias(createInputs({ vsHi: Number.POSITIVE_INFINITY }));
    expect(result).toBeInstanceOf(Error);
  });

  it('rejects when rails are not ordered correctly', () => {
    const result = solvePotBias(createInputs({ vsHi: 5, vsLo: 5 }));
    expect(result).toBeInstanceOf(Error);
  });

  it('rejects when rounding leads to zero-ohm bias resistor', () => {
    const result = solvePotBias({
      vsHi: 5.1,
      vsLo: 3,
      vTop: 5,
      vBot: 4,
      rPot: 1
    });
    expect(result).toBeInstanceOf(Error);
  });
});
