export const E24_VALUES: readonly number[] = [
  10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62,
  68, 75, 82, 91
] as const;

export type E24Neighbors = {
  below: number | null;
  above: number | null;
};

function decadeExponent(value: number): number {
  if (value <= 0) {
    return 0;
  }
  return Math.floor(Math.log10(value)) - 1;
}

function toDecadeValue(value: number, exponent: number): number {
  return value * 10 ** exponent;
}

export function nearestE24Neighbors(targetOhms: number): E24Neighbors {
  if (!Number.isFinite(targetOhms) || targetOhms <= 0) {
    return { below: null, above: null };
  }

  const exponent = decadeExponent(targetOhms);
  const normalized = targetOhms / 10 ** exponent;

  let lowerIndex = -1;
  let upperIndex = -1;

  for (let i = 0; i < E24_VALUES.length; i += 1) {
    const value = E24_VALUES[i];
    if (value <= normalized) {
      lowerIndex = i;
    }
    if (value >= normalized && upperIndex === -1) {
      upperIndex = i;
    }
  }

  if (lowerIndex !== -1 && normalized === E24_VALUES[lowerIndex]) {
    lowerIndex -= 1;
    upperIndex = lowerIndex + 2;
  }

  let below: number | null = null;
  let above: number | null = null;

  if (lowerIndex >= 0) {
    below = toDecadeValue(E24_VALUES[lowerIndex], exponent);
  } else {
    below = toDecadeValue(E24_VALUES[E24_VALUES.length - 1], exponent - 1);
  }

  if (upperIndex !== -1 && upperIndex < E24_VALUES.length) {
    above = toDecadeValue(E24_VALUES[upperIndex], exponent);
  } else {
    above = toDecadeValue(E24_VALUES[0], exponent + 1);
  }

  return { below, above };
}
