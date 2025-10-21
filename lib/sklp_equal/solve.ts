import { generateE6Capacitors } from '../sklp/solve';

export const DEFAULT_SWEEP_ALPHAS = [0, 0.25, 0.5, 0.75, 1] as const;
export const DEFAULT_EPSILON_OHMS = 20;
const COMPARISON_TOLERANCE = 1e-9;

export function computeQ(c1Farads: number, c2Farads: number): number {
  if (c1Farads <= 0 || c2Farads <= 0) {
    return Number.NaN;
  }
  return 0.5 * Math.sqrt(c1Farads / c2Farads);
}

export function effectiveR(
  alpha: number,
  rPotMax: number,
  rSeriesTop: number,
  rSeriesBottom: number,
  eps: number = DEFAULT_EPSILON_OHMS,
): number {
  if (!Number.isFinite(alpha)) {
    return Number.NaN;
  }
  const clampedAlpha = Math.min(Math.max(alpha, 0), 1);
  const clampedPotMax = Math.max(rPotMax, 0);
  const clampedTop = Math.max(rSeriesTop, 0);
  const clampedBottom = Math.max(rSeriesBottom, 0);
  const epsilon = Math.max(eps, 0);
  const potContribution = Math.max(clampedAlpha * clampedPotMax, epsilon);
  return clampedTop + potContribution + clampedBottom;
}

export function fcFromR(rOhms: number, c1Farads: number, c2Farads: number): number {
  if (rOhms <= 0 || c1Farads <= 0 || c2Farads <= 0) {
    return Number.NaN;
  }
  return 1 / (2 * Math.PI * rOhms * Math.sqrt(c1Farads * c2Farads));
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
  rSeriesTop = 0,
  rSeriesBottom = 0,
  eps: number = DEFAULT_EPSILON_OHMS,
): SweepPoint[] {
  return DEFAULT_SWEEP_ALPHAS.map((alpha) => {
    const R = effectiveR(alpha, rPotMax, rSeriesTop, rSeriesBottom, eps);
    const fc = fcFromR(R, c1Farads, c2Farads);
    return { alpha, R, fc };
  });
}

type CapacitorCandidate = {
  c1: number;
  c2: number;
  fc: number;
  fcDelta: number;
  baseDelta: number;
  ratioDelta: number;
};

function evaluateCandidate({
  c1,
  c2,
  targetFcHz,
  rEffective,
  cBase,
}: {
  c1: number;
  c2: number;
  targetFcHz: number;
  rEffective: number;
  cBase?: number;
}): CapacitorCandidate | null {
  const fc = fcFromR(rEffective, c1, c2);
  if (!Number.isFinite(fc) || fc <= 0) {
    return null;
  }

  const ratio = c1 >= c2 ? c1 / c2 : c2 / c1;
  const fcDelta = Math.abs(Math.log10(fc / targetFcHz));
  const ratioDelta = Math.abs(Math.log10(ratio));
  const baseDelta =
    cBase && Number.isFinite(cBase) && cBase > 0 ? Math.abs(Math.log10(c2 / cBase)) : 0;

  return { c1, c2, fc, fcDelta, baseDelta, ratioDelta };
}

function compareCapacitorCandidates(a: CapacitorCandidate, b: CapacitorCandidate): number {
  if (a.fcDelta < b.fcDelta - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.fcDelta > b.fcDelta + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.baseDelta < b.baseDelta - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.baseDelta > b.baseDelta + COMPARISON_TOLERANCE) {
    return 1;
  }

  if (a.ratioDelta < b.ratioDelta - COMPARISON_TOLERANCE) {
    return -1;
  }
  if (a.ratioDelta > b.ratioDelta + COMPARISON_TOLERANCE) {
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

export type CapacitorSelection = {
  c1: number;
  c2: number;
  fc50: number;
  deviation: number;
};

export type SolveCapacitorsArgs = {
  targetFcHz: number;
  rPotMax: number;
  cBase?: number;
  rSeriesTop?: number;
  rSeriesBottom?: number;
  eps?: number;
};

export function solveCapacitorsForTarget({
  targetFcHz,
  rPotMax,
  cBase,
  rSeriesTop = 0,
  rSeriesBottom = 0,
  eps = DEFAULT_EPSILON_OHMS,
}: SolveCapacitorsArgs): CapacitorSelection | Error {
  if (!Number.isFinite(targetFcHz) || targetFcHz <= 0) {
    return new Error('Target frequency must be greater than zero.');
  }
  if (!Number.isFinite(rPotMax) || rPotMax <= 0) {
    return new Error('Potentiometer maximum must be greater than zero.');
  }
  if (cBase !== undefined && (!Number.isFinite(cBase) || cBase <= 0)) {
    return new Error('Capacitor seed must be positive when provided.');
  }
  if (rSeriesTop < 0 || rSeriesBottom < 0) {
    return new Error('Series resistors must be non-negative.');
  }

  const rEffective = effectiveR(0.5, rPotMax, rSeriesTop, rSeriesBottom, eps);
  if (!Number.isFinite(rEffective) || rEffective <= 0) {
    return new Error('Unable to determine effective resistance at 50%.');
  }

  const capacitors = generateE6Capacitors();
  let best: CapacitorCandidate | null = null;

  for (const c1 of capacitors) {
    for (const c2 of capacitors) {
      const candidate = evaluateCandidate({
        c1,
        c2,
        targetFcHz,
        rEffective,
        cBase,
      });
      if (!candidate) {
        continue;
      }

      if (!best || compareCapacitorCandidates(candidate, best) < 0) {
        best = candidate;
      }
    }
  }

  if (!best) {
    return new Error('No capacitor combination from E6 satisfies the request.');
  }

  const deviation = best.fc > 0 ? (best.fc - targetFcHz) / targetFcHz : 0;
  return { c1: best.c1, c2: best.c2, fc50: best.fc, deviation };
}
