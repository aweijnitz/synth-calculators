export type NeighborResult = {
  below: number | null;
  above: number | null;
};

export function nearestNeighbors(target: number, normalizedSeries: readonly number[]): NeighborResult {
  if (!Number.isFinite(target) || target <= 0 || normalizedSeries.length === 0) {
    return { below: null, above: null };
  }

  const exponent = Math.floor(Math.log10(target)) - 1;
  const decadeBase = 10 ** exponent;
  const normalizedTarget = target / decadeBase;

  let lowerIndex = -1;
  let upperIndex = -1;

  const tolerance = 1e-9;

  for (let index = 0; index < normalizedSeries.length; index += 1) {
    const value = normalizedSeries[index];
    if (value <= normalizedTarget || Math.abs(value - normalizedTarget) < tolerance) {
      lowerIndex = index;
    }
    if (upperIndex === -1 && (value >= normalizedTarget || Math.abs(value - normalizedTarget) < tolerance)) {
      upperIndex = index;
    }
  }

  let belowIndex = lowerIndex;
  let aboveIndex = upperIndex;

  if (lowerIndex >= 0 && Math.abs(normalizedTarget - normalizedSeries[lowerIndex]) < tolerance) {
    belowIndex = lowerIndex - 1;
    aboveIndex = lowerIndex + 1;
  }

  const lastIndex = normalizedSeries.length - 1;
  let below: number | null;
  if (belowIndex !== null && belowIndex !== undefined && belowIndex >= 0) {
    below = normalizedSeries[belowIndex] * decadeBase;
  } else {
    const lowerDecadeBase = 10 ** (exponent - 1);
    below = normalizedSeries[lastIndex] * lowerDecadeBase;
  }

  let above: number | null;
  if (aboveIndex !== null && aboveIndex !== undefined && aboveIndex !== -1 && aboveIndex <= lastIndex) {
    above = normalizedSeries[aboveIndex] * decadeBase;
  } else {
    const upperDecadeBase = 10 ** (exponent + 1);
    above = normalizedSeries[0] * upperDecadeBase;
  }

  return { below, above };
}
