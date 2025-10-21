import { E6_SERIES } from '../series/e6';

export const DEFAULT_RELATIVE_TOLERANCE = 0.02; // 2%
export const DEFAULT_SWEEP_ALPHAS = [0, 0.25, 0.5, 0.75, 1] as const;
export const DEFAULT_MIN_CAPACITANCE = 10e-12;
export const DEFAULT_MAX_CAPACITANCE = 10e-6;
export const DEFAULT_EPSILON_OHMS = 20;

const TARGET_Q = Math.SQRT1_2; // ≈0.707
const MIN_DECADE = -11; // 10 pF decade
const MAX_DECADE = -5; // 10 µF decade

export type PickedCapacitors = {
  c1: number;
  c2: number;
  q: number;
  f50: number;
  relErr: number;
  withinTolerance: boolean;
};

type CandidateScore = {
  c1: number;
  c2: number;
  f50: number;
  q: number;
  relErr: number;
  logError: number;
  qPenalty: number;
  totalCapacitance: number;
  spread: number;
};

function buildCapacitorValues(): Map<number, number[]> {
  const valuesByDecade = new Map<number, number[]>();

  for (let decade = MIN_DECADE; decade <= MAX_DECADE; decade += 1) {
    const decadeValues: number[] = [];
    for (const mantissa of E6_SERIES) {
      const value = mantissa * Math.pow(10, decade);
      if (value < DEFAULT_MIN_CAPACITANCE || value > DEFAULT_MAX_CAPACITANCE) {
        continue;
      }
      decadeValues.push(value);
    }
    if (decadeValues.length > 0) {
      valuesByDecade.set(decade, decadeValues);
    }
  }

  return valuesByDecade;
}

function compareCandidates(a: CandidateScore, b: CandidateScore): number {
  if (a.logError !== b.logError) {
    return a.logError - b.logError;
  }
  if (a.qPenalty !== b.qPenalty) {
    return a.qPenalty - b.qPenalty;
  }
  if (a.totalCapacitance !== b.totalCapacitance) {
    return a.totalCapacitance - b.totalCapacitance;
  }
  if (a.spread !== b.spread) {
    return a.spread - b.spread;
  }
  return 0;
}

function createCandidate(
  c1: number,
  c2: number,
  fTarget: number,
  r50: number,
): CandidateScore | null {
  const f50 = fcFromRRC(r50, c1, c2);
  if (!Number.isFinite(f50) || f50 <= 0) {
    return null;
  }
  if (!Number.isFinite(fTarget) || fTarget <= 0) {
    return null;
  }

  const q = qFromCaps(c1, c2);
  const relErr = Math.abs(f50 - fTarget) / fTarget;
  const logError = Math.abs(Math.log(f50 / fTarget));
  const qPenalty = Number.isFinite(q) ? Math.abs(q - TARGET_Q) : Number.POSITIVE_INFINITY;
  const totalCapacitance = c1 + c2;
  const spread = Math.max(c1, c2) / Math.min(c1, c2);

  return {
    c1,
    c2,
    f50,
    q,
    relErr,
    logError,
    qPenalty,
    totalCapacitance,
    spread,
  };
}

function sortedDecades(valuesByDecade: Map<number, number[]>, cBase?: number): number[] {
  const decades = Array.from(valuesByDecade.keys());
  decades.sort((a, b) => a - b);

  if (cBase === undefined || !Number.isFinite(cBase) || cBase <= 0) {
    return decades;
  }

  const baseDecade = Math.floor(Math.log10(cBase));
  return decades
    .map((decade) => ({ decade, distance: Math.abs(decade - baseDecade) }))
    .sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return left.decade - right.decade;
    })
    .map((item) => item.decade);
}

export function fcFromRRC(rOhms: number, c1Farads: number, c2Farads: number): number {
  if (rOhms <= 0 || c1Farads <= 0 || c2Farads <= 0) {
    return Number.NaN;
  }
  return 1 / (2 * Math.PI * rOhms * Math.sqrt(c1Farads * c2Farads));
}

export function qFromCaps(c1Farads: number, c2Farads: number): number {
  if (c1Farads <= 0 || c2Farads <= 0) {
    return Number.NaN;
  }
  return 0.5 * Math.sqrt(c1Farads / c2Farads);
}

export function pickE6CapsForF50(
  fTarget: number,
  rPotMax: number,
  cBase?: number,
  tolerance: number = DEFAULT_RELATIVE_TOLERANCE,
): PickedCapacitors | null {
  if (!Number.isFinite(fTarget) || fTarget <= 0) {
    return null;
  }
  if (!Number.isFinite(rPotMax) || rPotMax <= 0) {
    return null;
  }

  const r50 = 0.5 * rPotMax;
  if (r50 <= 0) {
    return null;
  }

  const valuesByDecade = buildCapacitorValues();
  if (valuesByDecade.size === 0) {
    return null;
  }

  const decadeOrder = sortedDecades(valuesByDecade, cBase);
  let bestOverall: CandidateScore | null = null;
  let bestWithinTolerance: CandidateScore | null = null;

  for (let count = 1; count <= decadeOrder.length; count += 1) {
    const allowedDecades = new Set(decadeOrder.slice(0, count));

    for (const decadeC1 of allowedDecades) {
      const c1Values = valuesByDecade.get(decadeC1);
      if (!c1Values) {
        continue;
      }
      for (const decadeC2 of allowedDecades) {
        const c2Values = valuesByDecade.get(decadeC2);
        if (!c2Values) {
          continue;
        }
        for (const c1 of c1Values) {
          for (const c2 of c2Values) {
            const candidate = createCandidate(c1, c2, fTarget, r50);
            if (!candidate) {
              continue;
            }

            if (!bestOverall || compareCandidates(candidate, bestOverall) < 0) {
              bestOverall = candidate;
            }

            if (candidate.relErr <= tolerance) {
              if (!bestWithinTolerance || compareCandidates(candidate, bestWithinTolerance) < 0) {
                bestWithinTolerance = candidate;
              }
            }
          }
        }
      }
    }

    if (bestWithinTolerance) {
      break;
    }
  }

  const chosen = bestWithinTolerance ?? bestOverall;
  if (!chosen) {
    return null;
  }

  return {
    c1: chosen.c1,
    c2: chosen.c2,
    q: chosen.q,
    f50: chosen.f50,
    relErr: chosen.relErr,
    withinTolerance: chosen.relErr <= tolerance,
  };
}

export type SweepPoint = {
  alpha: number;
  R: number;
  fc: number;
};

export function sweepPot(
  rPotMax: number,
  c1Farads: number,
  c2Farads: number,
  eps: number = DEFAULT_EPSILON_OHMS,
): SweepPoint[] {
  const clampedPotMax = Math.max(rPotMax, 0);
  const epsilon = Math.max(eps, 0);

  return DEFAULT_SWEEP_ALPHAS.map((alpha) => {
    const clampedAlpha = Math.min(Math.max(alpha, 0), 1);
    const resistance = Math.max(clampedAlpha * clampedPotMax, epsilon);
    const fc = fcFromRRC(resistance, c1Farads, c2Farads);
    return { alpha: clampedAlpha, R: resistance, fc };
  });
}
