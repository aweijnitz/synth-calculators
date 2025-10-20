import { formatOhms, formatVolts, parseOhms, parseVolts } from '../../lib/vdiv/parse';

describe('parseOhms', () => {
  it('parses bare ohms', () => {
    expect(parseOhms('820')).toBe(820);
  });

  it('parses kilo-ohms', () => {
    expect(parseOhms('1.2k')).toBeCloseTo(1_200);
  });

  it('parses mega-ohms with spaces', () => {
    expect(parseOhms('1 M')).toBe(1_000_000);
  });

  it('rejects invalid suffixes', () => {
    expect(parseOhms('1K')).toBeInstanceOf(Error);
    expect(parseOhms('3 g')).toBeInstanceOf(Error);
  });

  it('rejects non-positive values', () => {
    expect(parseOhms('0')).toBeInstanceOf(Error);
    expect(parseOhms('-10')).toBeInstanceOf(Error);
  });
});

describe('parseVolts', () => {
  it('parses numeric voltages', () => {
    expect(parseVolts('11.5')).toBeCloseTo(11.5);
    expect(parseVolts('0')).toBe(0);
    expect(parseVolts('3.300')).toBeCloseTo(3.3);
  });

  it('rejects invalid voltages', () => {
    expect(parseVolts('abc')).toBeInstanceOf(Error);
  });
});

describe('formatters', () => {
  it('formats ohms with appropriate suffix', () => {
    expect(formatOhms(1_200)).toBe('1.2kΩ');
    expect(formatOhms(1_000_000)).toBe('1.00MΩ');
  });

  it('formats volts with up to three significant figures', () => {
    expect(formatVolts(3.3)).toBe('3.30 V');
  });
});
