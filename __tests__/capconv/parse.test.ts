import { formatCap, parseCapacitance } from '../../lib/capconv/parse';

describe('parseCapacitance', () => {
  it.each([
    ['1p', 1e-12],
    ['22n', 22e-9],
    ['4.7 u', 4.7e-6],
    ['2.2m', 2.2e-3],
    ['0.000001', 1e-6]
  ])('parses %s into %s farads', (input, expected) => {
    const result = parseCapacitance(input);
    expect(result).not.toBeInstanceOf(Error);
    expect(result as number).toBeCloseTo(expected);
  });

  it.each([
    ['1P', 'Only p, n, u, m suffixes are supported (lowercase).'],
    ['10 g', 'Only p, n, u, m suffixes are supported (lowercase).'],
    ['-1n', 'Please enter a positive capacitance.'],
    ['0', 'Please enter a positive capacitance.'],
    ['abc', 'Please enter a positive capacitance.']
  ])('rejects %s', (input, message) => {
    const result = parseCapacitance(input);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe(message);
  });
});

describe('formatCap', () => {
  const value = 22e-9;

  it('formats in pico farads', () => {
    expect(formatCap(value, 'pF')).toBe('22000 pF');
  });

  it('formats in nano farads', () => {
    expect(formatCap(value, 'nF')).toBe('22.0 nF');
  });

  it('formats in micro farads', () => {
    expect(formatCap(value, 'uF')).toBe('0.0220 uF');
  });

  it('formats in farads', () => {
    expect(formatCap(value, 'F')).toBe('2.20e-8 F');
  });
});
