import { solveDiodeSeries } from '../../lib/diode/solve';

describe('solveDiodeSeries', () => {
  it('computes the resistor value from Vs, Vf, and If', () => {
    const result = solveDiodeSeries({ vs: 5, vf: 2, ifA: 0.01, lastChanged: 'r' });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { r?: number }).r).toBe(300);
  });

  it('computes the current when the resistor is known', () => {
    const result = solveDiodeSeries({ vs: 9, vf: 0.7, r: 1_000, lastChanged: 'ifA' });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { ifA?: number }).ifA).toBeCloseTo(0.0083, 4);
  });

  it('computes Vs from Vf, If, and R', () => {
    const result = solveDiodeSeries({ vf: 2.0, ifA: 0.02, r: 150, lastChanged: 'vs' });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { vs?: number }).vs).toBeCloseTo(5.0);
  });

  it('computes Vf from Vs, If, and R', () => {
    const result = solveDiodeSeries({ vs: 12, ifA: 0.015, r: 470, lastChanged: 'vf' });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { vf?: number }).vf).toBeCloseTo(4.95);
  });

  it('rejects cases without headroom when solving R or I', () => {
    const resistorAttempt = solveDiodeSeries({ vs: 2, vf: 2.5, ifA: 0.01, lastChanged: 'r' });
    expect(resistorAttempt).toBeInstanceOf(Error);

    const currentAttempt = solveDiodeSeries({ vs: 2.2, vf: 2.5, r: 470, lastChanged: 'ifA' });
    expect(currentAttempt).toBeInstanceOf(Error);
  });

  it('rejects non-positive resistors or current inputs', () => {
    const zeroCurrent = solveDiodeSeries({ vs: 5, vf: 2, ifA: 0, lastChanged: 'r' });
    expect(zeroCurrent).toBeInstanceOf(Error);

    const negativeResistor = solveDiodeSeries({ vs: 5, vf: 2, ifA: 0.01, r: -10, lastChanged: 'vs' });
    expect(negativeResistor).toBeInstanceOf(Error);
  });
});
