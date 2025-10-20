import { E12_SERIES } from '../../lib/series/e12';
import { E24_SERIES } from '../../lib/series/e24';
import { nearestNeighbors } from '../../lib/series/nearest';

describe('nearestNeighbors', () => {
  it('finds resistor neighbors across decades', () => {
    expect(nearestNeighbors(11_900, E24_SERIES)).toEqual({ below: 11_000, above: 12_000 });
    expect(nearestNeighbors(999, E24_SERIES)).toEqual({ below: 910, above: 1_000 });
  });

  it('finds capacitor neighbors using E12 series', () => {
    const result = nearestNeighbors(48e-9, E12_SERIES);
    expect(result.below).toBeCloseTo(47e-9, 15);
    expect(result.above).toBeCloseTo(56e-9, 15);
  });

  it('returns immediate neighbors around exact matches', () => {
    const exact = nearestNeighbors(22e-9, E12_SERIES);
    expect(exact.below).toBeCloseTo(18e-9, 15);
    expect(exact.above).toBeCloseTo(27e-9, 15);
  });

  it('returns null neighbors for invalid targets', () => {
    expect(nearestNeighbors(-1, E24_SERIES)).toEqual({ below: null, above: null });
  });
});
