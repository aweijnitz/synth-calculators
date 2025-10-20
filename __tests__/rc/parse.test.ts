import { formatFarads, formatHertz, formatOhms, parseFarads, parseHertz, parseOhms } from '../../lib/rc/parse';

describe('parseOhms', () => {
  it('parses resistor strings with optional suffixes and spaces', () => {
    expect(parseOhms('820')).toBe(820);
    expect(parseOhms('1.2k')).toBe(1_200);
    expect(parseOhms(' 1.2 k ')).toBe(1_200);
    expect(parseOhms('1MΩ')).toBe(1_000_000);
  });

  it('rejects invalid suffixes or values', () => {
    expect(parseOhms('1K')).toBeInstanceOf(Error);
    expect(parseOhms('10g')).toBeInstanceOf(Error);
    expect(parseOhms('-10')).toBeInstanceOf(Error);
    expect(parseOhms('0')).toBeInstanceOf(Error);
  });
});

describe('parseFarads', () => {
  it('parses capacitance strings with supported suffixes', () => {
    expect(parseFarads('100n')).toBeCloseTo(100e-9, 12);
    expect(parseFarads('1 u')).toBeCloseTo(1e-6, 12);
    expect(parseFarads('220pF')).toBeCloseTo(220e-12, 15);
    expect(parseFarads('2.2m')).toBeCloseTo(2.2e-3, 12);
  });

  it('rejects unsupported suffixes or invalid values', () => {
    expect(parseFarads('1U')).toBeInstanceOf(Error);
    expect(parseFarads('3 x')).toBeInstanceOf(Error);
    expect(parseFarads('-1n')).toBeInstanceOf(Error);
    expect(parseFarads('0')).toBeInstanceOf(Error);
  });
});

describe('parseHertz', () => {
  it('parses frequency strings with k/M suffixes', () => {
    expect(parseHertz('14k')).toBe(14_000);
    expect(parseHertz('1.00 M')).toBe(1_000_000);
    expect(parseHertz('60')).toBe(60);
  });

  it('rejects invalid frequencies', () => {
    expect(parseHertz('1K')).toBeInstanceOf(Error);
    expect(parseHertz('0')).toBeInstanceOf(Error);
    expect(parseHertz('-5')).toBeInstanceOf(Error);
  });
});

describe('format helpers', () => {
  it('formats resistance with compact suffixes', () => {
    expect(formatOhms(1_200)).toBe('1.2kΩ');
    expect(formatOhms(1_000_000)).toBe('1.00MΩ');
    expect(formatOhms(820)).toBe('820Ω');
  });

  it('formats capacitance values', () => {
    expect(formatFarads(1e-6)).toBe('1.0uF');
    expect(formatFarads(47e-9)).toBe('47nF');
    expect(formatFarads(220e-12)).toBe('220pF');
    expect(formatFarads(2.2e-3)).toBe('2.2mF');
  });

  it('formats frequency values', () => {
    expect(formatHertz(14_000)).toBe('14kHz');
    expect(formatHertz(1_000_000)).toBe('1.00MHz');
    expect(formatHertz(999)).toBe('999Hz');
  });
});
