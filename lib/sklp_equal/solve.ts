export const DEFAULT_SWEEP_ALPHAS = [0, 0.25, 0.5, 0.75, 1] as const;
export const DEFAULT_EPSILON_OHMS = 20;

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
