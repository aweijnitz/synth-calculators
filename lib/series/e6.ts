export const E6_SERIES: readonly number[] = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8] as const;

export const MIN_E6_DECADE = -12;
export const MAX_E6_DECADE = 12;

export type E6Mantissa = (typeof E6_SERIES)[number];

export function generateE6SeriesAround(value: number) {
  if (value <= 0 || !Number.isFinite(value)) {
    return [];
  }
  const exponent = Math.floor(Math.log10(value));
  const candidates: number[] = [];
  for (let offset = -1; offset <= 1; offset += 1) {
    const power = exponent + offset;
    const decade = Math.pow(10, power);
    E6_SERIES.forEach((mantissa) => {
      candidates.push(mantissa * decade);
    });
  }
  return candidates.sort((a, b) => a - b);
}
