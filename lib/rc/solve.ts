const TAU = 2 * Math.PI;

export type SolveCutoffArgs = {
  r?: number;
  c?: number;
  fc?: number;
};

export type SolveCutoffResult = {
  r?: number;
  c?: number;
  fc: number;
};

function isNonPositive(value: number | undefined): boolean {
  return value !== undefined && (!Number.isFinite(value) || value <= 0);
}

export function solveCutoff({ r, c, fc }: SolveCutoffArgs): SolveCutoffResult | Error {
  const provided = [r, c, fc].filter((value) => value !== undefined);

  if (provided.length !== 2) {
    return new Error('Provide exactly two values to compute the third.');
  }

  if (isNonPositive(r) || isNonPositive(c) || isNonPositive(fc)) {
    return new Error('Please enter a value greater than zero.');
  }

  if (r !== undefined && c !== undefined) {
    const computedFc = 1 / (TAU * r * c);
    if (!Number.isFinite(computedFc) || computedFc <= 0) {
      return new Error('Unable to compute cutoff frequency.');
    }
    return { r, c, fc: computedFc };
  }

  if (fc !== undefined && r !== undefined) {
    const computedC = 1 / (TAU * fc * r);
    if (!Number.isFinite(computedC) || computedC <= 0) {
      return new Error('Unable to compute capacitance.');
    }
    return { r, c: computedC, fc };
  }

  if (fc !== undefined && c !== undefined) {
    const computedR = 1 / (TAU * fc * c);
    if (!Number.isFinite(computedR) || computedR <= 0) {
      return new Error('Unable to compute resistance.');
    }
    const rounded = Math.max(1, Math.round(computedR));
    return { r: rounded, c, fc };
  }

  return new Error('Unable to compute cutoff values.');
}
