import { solveVoltageDivider } from '../../lib/vdiv/solve';

describe('solveVoltageDivider', () => {
  it('computes Volt_out when resistors and rails are provided', () => {
    const result = solveVoltageDivider({ vh: 12, vl: 0, r1: 1_000, r2: 1_000 });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { vo?: number }).vo).toBeCloseTo(6);
  });

  it('computes Volt_out for asymmetrical rails', () => {
    const result = solveVoltageDivider({ vh: 11.5, vl: 0, r1: 8_200, r2: 3_300 });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { vo?: number }).vo).toBeCloseTo(3.3, 2);
  });

  it('computes R2 from the target voltage', () => {
    const result = solveVoltageDivider({ vh: 5, vl: 0, r1: 10_000, vo: 3.3 });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { r2?: number }).r2).toBe(19_412);
  });

  it('computes R1 from the target voltage', () => {
    const result = solveVoltageDivider({ vh: 5, vl: 0, r2: 10_000, vo: 3.3 });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { r1?: number }).r1).toBe(5_152);
  });

  it('computes Vh when R1 and R2 are known', () => {
    const result = solveVoltageDivider({ vl: 0, r1: 2_000, r2: 1_000, vo: 1 });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { vh?: number }).vh).toBeCloseTo(3);
  });

  it('computes Vl when R1 and R2 are known', () => {
    const result = solveVoltageDivider({ vh: 3, r1: 2_000, r2: 1_000, vo: 1 });
    expect(result).not.toBeInstanceOf(Error);
    expect((result as { vl?: number }).vl).toBeCloseTo(0);
  });

  it('errors when denominators collapse', () => {
    const result = solveVoltageDivider({ vh: 5, vl: 0, r1: 10_000, vo: 5 });
    expect(result).toBeInstanceOf(Error);
  });
});
