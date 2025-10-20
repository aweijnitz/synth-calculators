import { E6_SERIES } from '../series/e6';

export type SolveSallenKeyLPArgs = {
  fcHz: number;
  Q: number;
  cBase?: number;
  ratio?: number;
};

export type SolveSallenKeyLPResult = {
  c1: number;
  c2: number;
  r1: number;
  r2: number;
  fc: number;
  Q: number;
};

export type ResistorPair = {
  r1: number;
  r2: number;
};

export const MIN_CAPACITANCE_F = 100e-12;
export const MAX_CAPACITANCE_F = 10e-6;
export const MIN_RESISTANCE_OHMS = 100;
export const MAX_RESISTANCE_OHMS = 10_000_000;

const RATIO_TOLERANCE = 1e-6;
const DISCRIMINANT_TOLERANCE = 1e-9;
const COMPARISON_TOLERANCE = 1e-9;

export function generateE6Capacitors(min = MIN_CAPACITANCE_F, max = MAX_CAPACITANCE_F): number[] {
  if (!(Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min)) {
    throw new Error('Invalid capacitor range provided.');
  }

  const values = new Set<number>();

  for (let exponent = -12; exponent <= 6; exponent += 1) {
    const decade = 10 ** exponent;
    for (const mantissa of E6_SERIES) {
      const candidate = mantissa * decade;
      if (candidate < min - Number.EPSILON) {
        continue;
      }
      if (candidate > max + Number.EPSILON) {
        continue;
      }
      const rounded = Number.parseFloat(candidate.toPrecision(12));
      values.add(rounded);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

export function computeNaturalFrequencyHz({
  r1,
  r2,
  c1,
  c2,
}: {
  r1: number;
  r2: number;
  c1: number;
  c2: number;
}): number {
  const product = r1 * r2 * c1 * c2;
  if (!Number.isFinite(product) || product <= 0) {
    return Number.NaN;
  }
  const omega0 = 1 / Math.sqrt(product);
  return omega0 / (2 * Math.PI);
}

export function computeQualityFactor({
  r1,
  r2,
  c1,
  c2,
}: {
  r1: number;
  r2: number;
  c1: number;
  c2: number;
}): number {
  const sqrtTerm = Math.sqrt(r1 * r2 * c1 * c2);
  const denominator = c2 * (r1 + r2);
  if (!Number.isFinite(sqrtTerm) || sqrtTerm <= 0 || !Number.isFinite(denominator) || denominator <= 0) {
    return Number.NaN;
  }
  return sqrtTerm / denominator;
}

export function solveResistorsForCapacitors({
  fcHz,
  Q,
  c1,
  c2,
}: {
  fcHz: number;
  Q: number;
  c1: number;
  c2: number;
}): ResistorPair | Error {
  if (!Number.isFinite(fcHz) || fcHz <= 0) {
    return new Error('Cutoff frequency must be greater than zero.');
  }
  if (!Number.isFinite(Q) || Q <= 0) {
    return new Error('Quality factor must be greater than zero.');
  }
  if (!Number.isFinite(c1) || c1 <= 0 || !Number.isFinite(c2) || c2 <= 0) {
    return new Error('Capacitance values must be positive.');
  }

  const requiredMinimum = 4 * Q * Q * c2;
  if (c1 + Number.EPSILON < requiredMinimum) {
    return new Error('Selected capacitors cannot realize the requested Q for unity-gain Sallen-Key.');
  }

  const omega0 = 2 * Math.PI * fcHz;
  const product = 1 / (omega0 * omega0 * c1 * c2);
  const sum = 1 / (omega0 * Q * c2);

  const discriminant = sum * sum - 4 * product;
  if (discriminant < -DISCRIMINANT_TOLERANCE) {
    return new Error('Selected capacitors produce imaginary resistors for the requested cutoff.');
  }

  const sqrtTerm = Math.sqrt(Math.max(0, discriminant));
  const r1 = (sum - sqrtTerm) / 2;
  const r2 = (sum + sqrtTerm) / 2;

  if (!Number.isFinite(r1) || !Number.isFinite(r2) || r1 <= 0 || r2 <= 0) {
    return new Error('Unable to compute positive resistor values for the provided parameters.');
  }

  return r1 <= r2 ? { r1, r2 } : { r1: r2, r2: r1 };
}

type CandidateSolution = {
  c1: number;
  c2: number;
  r1: number;
  r2: number;
  spread: number;
  maxR: number;
  capRatio: number;
  baseDelta: number;
};

function evaluateCandidate({
  c1,
  c2,
  r1,
  r2,
  cBase,
}: {
  c1: number;
  c2: number;
  r1: number;
  r2: number;
  cBase?: number;
}): CandidateSolution {
  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);
  const minC = Math.min(c1, c2);
  const maxC = Math.max(c1, c2);
  const spread = maxR / minR;
  const capRatio = maxC / minC;
  const baseDelta =
    cBase && Number.isFinite(cBase) && cBase > 0 ? Math.abs(Math.log10(c2 / cBase)) : 0;
  return {
    c1,
    c2,
    r1,
    r2,
    spread,
    maxR,
    capRatio,
    baseDelta,
  };
}

export function compareCandidates(a: CandidateSolution, b: CandidateSolution): number {
  if (a.spread < b.spread - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.spread > b.spread + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.maxR < b.maxR - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.maxR > b.maxR + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.capRatio < b.capRatio - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.capRatio > b.capRatio + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.baseDelta < b.baseDelta - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.baseDelta > b.baseDelta + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.c2 < b.c2 - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.c2 > b.c2 + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.c1 < b.c1 - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.c1 > b.c1 + COMPARISON_TOLERANCE) {
    return 1;
  }

  return 0;
}

export function solveSallenKeyLP({ fcHz, Q, cBase, ratio }: SolveSallenKeyLPArgs): SolveSallenKeyLPResult | Error {
  if (!Number.isFinite(fcHz) || fcHz <= 0) {
    return new Error('Cutoff frequency must be greater than zero.');
  }
  if (!Number.isFinite(Q) || Q <= 0) {
    return new Error('Quality factor must be greater than zero.');
  }

  const capacitors = generateE6Capacitors();
  let best: CandidateSolution | null = null;

  for (const c1 of capacitors) {
    for (const c2 of capacitors) {
      if (ratio && ratio > 0) {
        const actualRatio = c1 / c2;
        if (Math.abs(actualRatio - ratio) / ratio > RATIO_TOLERANCE) {
          continue;
        }
      }

      const resistorPair = solveResistorsForCapacitors({ fcHz, Q, c1, c2 });
      if (resistorPair instanceof Error) {
        continue;
      }

      const { r1, r2 } = resistorPair;
      if (
        r1 < MIN_RESISTANCE_OHMS ||
        r2 < MIN_RESISTANCE_OHMS ||
        r1 > MAX_RESISTANCE_OHMS ||
        r2 > MAX_RESISTANCE_OHMS
      ) {
        continue;
      }

      const candidate = evaluateCandidate({ c1, c2, r1, r2, cBase });
      if (!best || compareCandidates(candidate, best) < 0) {
        best = candidate;
      }
    }
  }

  if (!best) {
    return new Error('No feasible capacitor pair found for the requested cutoff and Q.');
  }

  const fc = computeNaturalFrequencyHz(best);
  const q = computeQualityFactor(best);

  return {
    c1: best.c1,
    c2: best.c2,
    r1: best.r1,
    r2: best.r2,
    fc,
    Q: q,
  };
}

export function buildRatioOptions(): Array<{ value: number; label: string }> {
  const options: Array<{ value: number; label: string }> = [];
  for (const mantissa of E6_SERIES) {
    const ratio = mantissa;
    const label = `${mantissa}:1`;
    options.push({ value: ratio, label });
  }
  return options;
}
