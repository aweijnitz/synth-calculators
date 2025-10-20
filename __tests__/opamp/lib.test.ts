import { formatDb, formatGain, formatOhms, parseOhms } from '../../lib/opamp/parse';
import { inputImpedance } from '../../lib/opamp/impedance';
import { nearestE24Neighbors } from '../../lib/opamp/e24';
import { solveInverting, solveNonInverting } from '../../lib/opamp/solve';

const within = (value: number | undefined) => {
  if (value === undefined) {
    throw new Error('Expected a number but received undefined');
  }
  return value;
};

describe('parseOhms', () => {
  it('parses common resistor strings', () => {
    expect(parseOhms('12k')).toBe(12_000);
    expect(parseOhms('12 k')).toBe(12_000);
    expect(parseOhms('1M')).toBe(1_000_000);
    expect(parseOhms('820')).toBe(820);
  });

  it('rejects invalid or unsupported suffixes', () => {
    expect(parseOhms('12K')).toBeInstanceOf(Error);
    expect(parseOhms('4g')).toBeInstanceOf(Error);
    expect(parseOhms('1.2 m')).toBeInstanceOf(Error);
  });

  it('rejects non-positive or empty values', () => {
    expect(parseOhms('-10')).toBeInstanceOf(Error);
    expect(parseOhms(' ')).toBeInstanceOf(Error);
  });
});

describe('format helpers', () => {
  it('formats ohms with suffixes and significant digits', () => {
    expect(formatOhms(820)).toBe('820Ω');
    expect(formatOhms(12_000)).toBe('12.0kΩ');
    expect(formatOhms(1_000_000)).toBe('1.00MΩ');
  });

  it('formats gain and dB values', () => {
    expect(formatGain(-2)).toBe('-2');
    expect(formatGain(-4.7)).toBe('-4.7');
    expect(formatDb(2)).toBe('6.02 dB');
  });
});

describe('solveInverting', () => {
  it('computes gain from resistors', () => {
    const result = solveInverting({ rin: 10_000, rf: 47_000 });
    expect(result).not.toBeInstanceOf(Error);
    const success = result as ReturnType<typeof solveInverting> & { gain: number };
    expect(success.gain).toBeCloseTo(-4.7, 2);
  });

  it('solves for Rf using gain and Rin', () => {
    const result = solveInverting({ gain: -10, rin: 12_000 });
    expect(result).not.toBeInstanceOf(Error);
    expect(within((result as any).rf)).toBe(120_000);
  });

  it('solves for Rin using gain magnitude and Rf', () => {
    const result = solveInverting({ gain: -2, rf: 24_000 });
    expect(result).not.toBeInstanceOf(Error);
    expect(within((result as any).rin)).toBe(12_000);
  });

  it('rounds computed resistors to nearest ohm', () => {
    const result = solveInverting({ gain: -3.333, rin: 1_001 });
    expect(result).not.toBeInstanceOf(Error);
    expect(within((result as any).rf)).toBe(3_336);
  });
});

describe('solveNonInverting', () => {
  it('computes gain from resistors', () => {
    const result = solveNonInverting({ rin: 10_000, rf: 47_000 });
    expect(result).not.toBeInstanceOf(Error);
    const success = result as ReturnType<typeof solveNonInverting> & { gain: number };
    expect(success.gain).toBeCloseTo(5.7, 2);
  });

  it('solves for Rf when gain and Rin are provided', () => {
    const result = solveNonInverting({ gain: 11, rin: 10_000 });
    expect(result).not.toBeInstanceOf(Error);
    expect(within((result as any).rf)).toBe(100_000);
  });

  it('solves for Rin when gain and Rf are provided', () => {
    const result = solveNonInverting({ gain: 3, rf: 22_000 });
    expect(result).not.toBeInstanceOf(Error);
    expect(within((result as any).rin)).toBe(11_000);
  });

  it('errors when gain is not greater than one for resistor solve', () => {
    const result = solveNonInverting({ gain: 1, rin: 10_000 });
    expect(result).toBeInstanceOf(Error);
  });
});

describe('nearestE24Neighbors', () => {
  it('finds neighbors across decades', () => {
    expect(nearestE24Neighbors(11_900)).toEqual({ below: 11_000, above: 12_000 });
    expect(nearestE24Neighbors(999)).toEqual({ below: 910, above: 1_000 });
  });

  it('returns nearest values around an exact E24 entry', () => {
    expect(nearestE24Neighbors(22_000)).toEqual({ below: 20_000, above: 24_000 });
  });
});

describe('inputImpedance', () => {
  it('returns Rin for inverting mode', () => {
    expect(inputImpedance('inverting', 12_000)).toBe('12.0kΩ');
  });

  it('returns infinity string for non-inverting mode', () => {
    expect(inputImpedance('non-inverting')).toContain('≈ ∞');
  });
});
