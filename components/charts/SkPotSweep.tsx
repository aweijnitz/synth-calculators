'use client';

import * as React from 'react';
import SkMultiResponse, { type ResponseSeries } from './SkMultiResponse';
import { DEFAULT_SWEEP_ALPHAS, DEFAULT_EPSILON_OHMS, fcFromRRC } from '../../lib/sklp_equal_pot/solve';

export type SkPotSweepProps = {
  c1?: number;
  c2?: number;
  rPotMax?: number;
  loading?: boolean;
};

const LABELS: Record<number, string> = {
  0: '0%',
  0.25: '25%',
  0.5: '50%',
  0.75: '75%',
  1: '100%',
};

function buildSeries(c1?: number, c2?: number, rPotMax?: number): ResponseSeries[] {
  if (!Number.isFinite(c1 ?? Number.NaN) || !Number.isFinite(c2 ?? Number.NaN) || !Number.isFinite(rPotMax ?? Number.NaN)) {
    return [];
  }
  const cap1 = c1 ?? 0;
  const cap2 = c2 ?? 0;
  const pot = rPotMax ?? 0;
  if (cap1 <= 0 || cap2 <= 0 || pot <= 0) {
    return [];
  }

  return DEFAULT_SWEEP_ALPHAS.map((alpha) => {
    const resistance = Math.max(alpha * pot, DEFAULT_EPSILON_OHMS);
    const fc = fcFromRRC(resistance, cap1, cap2);
    return {
      label: LABELS[alpha] ?? `${Math.round(alpha * 100)}%`,
      fc,
    };
  }).filter((item) => Number.isFinite(item.fc) && item.fc > 0);
}

export default function SkPotSweep({ c1, c2, rPotMax, loading = false }: SkPotSweepProps) {
  const series = React.useMemo(() => buildSeries(c1, c2, rPotMax), [c1, c2, rPotMax]);

  return <SkMultiResponse series={series} loading={loading} showDb />;
}
