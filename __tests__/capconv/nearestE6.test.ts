import { nearestE6CapInUnit } from '../../lib/series/nearestE6Cap';

describe('nearestE6CapInUnit', () => {
  it('returns exact match for 22 nF', () => {
    const result = nearestE6CapInUnit(22e-9, 'nF');
    expect(result.label).toBe('22.0 nF');
    expect(result.valueInUnit).toBeCloseTo(22);
    expect(result.errorAbsInUnit).toBeCloseTo(0);
    expect(result.errorRelPct).toBeCloseTo(0);
  });

  it('chooses 22 nF for 20 nF', () => {
    const result = nearestE6CapInUnit(20e-9, 'nF');
    expect(result.label).toBe('22.0 nF');
    expect(result.errorAbsInUnit).toBeCloseTo(2);
    expect(result.errorRelPct).toBeCloseTo(10, 5);
  });

  it('prefers smaller neighbor when value is 1.1 nF', () => {
    const result = nearestE6CapInUnit(1.1e-9, 'nF');
    expect(result.label).toBe('1.0 nF');
    expect(result.errorAbsInUnit).toBeCloseTo(-0.1);
    expect(result.errorRelPct).toBeCloseTo(-9.0909, 3);
  });

  it('handles cross-decade lower edge', () => {
    const result = nearestE6CapInUnit(0.95e-9, 'nF');
    expect(result.label).toBe('1.0 nF');
    expect(result.valueInUnit).toBeCloseTo(1);
  });

  it('handles cross-decade upper edge', () => {
    const result = nearestE6CapInUnit(6.9e-9, 'nF');
    expect(result.label).toBe('6.8 nF');
    expect(result.errorAbsInUnit).toBeCloseTo(-0.1);
  });

  it('works in pF scale', () => {
    const result = nearestE6CapInUnit(980e-12, 'pF');
    expect(result.label).toBe('1000 pF');
    expect(result.errorAbsInUnit).toBeCloseTo(20);
  });

  it('prefers smaller value on exact midpoint', () => {
    const midpoint = 1.25e-9; // Midway between 1.0 nF and 1.5 nF
    const result = nearestE6CapInUnit(midpoint, 'nF');
    expect(result.label).toBe('1.0 nF');
  });
});
