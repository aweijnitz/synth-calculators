import { E24_SERIES } from '../../lib/series/e24';
import { nearestNeighbors } from '../../lib/series/nearest';

describe('diode E24 neighbors', () => {
  it('finds neighbors for common resistor values', () => {
    expect(nearestNeighbors(300, E24_SERIES)).toEqual({ below: 270, above: 330 });
    expect(nearestNeighbors(995, E24_SERIES)).toEqual({ below: 910, above: 1_000 });
  });
});
