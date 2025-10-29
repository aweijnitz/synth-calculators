import { formatMilliAmps, formatOhms, formatVolts, parseCurrent, parseOhms, parseVolts } from '../../lib/diode/parse';

describe('parseCurrent', () => {
  it('parses milliamps with m suffix', () => {
    expect(parseCurrent('15m')).toBeCloseTo(0.015);
  });

  it('parses amps without suffix', () => {
    expect(parseCurrent('0.02')).toBeCloseTo(0.02);
  });

  it('rejects uppercase suffix, zero, negative, and invalid strings', () => {
    expect(parseCurrent('15M')).toBeInstanceOf(Error);
    expect(parseCurrent('0')).toBeInstanceOf(Error);
    expect(parseCurrent('-5m')).toBeInstanceOf(Error);
    expect(parseCurrent('abc')).toBeInstanceOf(Error);
  });
});

describe('parseOhms', () => {
  it('parses base ohms and suffixed values', () => {
    expect(parseOhms('330')).toBe(330);
    expect(parseOhms('4.7k')).toBeCloseTo(4_700);
    expect(parseOhms('1 M')).toBe(1_000_000);
  });

  it('rejects invalid suffixes and units', () => {
    expect(parseOhms('4.7K')).toBeInstanceOf(Error);
    expect(parseOhms('3 g')).toBeInstanceOf(Error);
  });
});

describe('formatters', () => {
  it('formats milliamps with up to three significant figures', () => {
    expect(formatMilliAmps(0.0123)).toBe('12.3 mA');
  });

  it('formats ohms and volts as requested', () => {
    expect(formatOhms(4_700)).toBe('4.7kΩ');
    expect(formatVolts(3.3)).toBe('3.30 V');
  });
});
