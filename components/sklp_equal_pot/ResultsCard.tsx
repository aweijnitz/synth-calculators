import { Card, CardContent, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import * as React from 'react';
import { formatFarads, formatHertz, formatOhms } from '../../lib/rc/parse';
import {
  DEFAULT_MAX_CAPACITANCE,
  DEFAULT_MIN_CAPACITANCE,
  DEFAULT_RELATIVE_TOLERANCE,
  type PickedCapacitors,
} from '../../lib/sklp_equal_pot/solve';

export type ResultsCardProps = {
  loading?: boolean;
  result: PickedCapacitors | null;
  fTarget50?: number;
  rPotMax?: number;
};

function formatQualityFactor(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return '—';
  }
  const safeValue = value ?? Number.NaN;
  if (!Number.isFinite(safeValue)) {
    return '—';
  }
  if (safeValue >= 10) {
    return safeValue.toFixed(2);
  }
  if (safeValue >= 1) {
    return safeValue.toFixed(3);
  }
  return safeValue.toFixed(4);
}

function renderErrorPercent(relErr?: number): string {
  if (!Number.isFinite(relErr ?? Number.NaN)) {
    return '—';
  }
  const safe = Math.abs(relErr ?? 0);
  if (safe < 0.0005) {
    return '<0.05%';
  }
  return `${(safe * 100).toFixed(2)}%`;
}

export default function ResultsCard({ loading = false, result, fTarget50, rPotMax }: ResultsCardProps) {
  const r50 = React.useMemo(() => {
    if (!Number.isFinite(rPotMax ?? Number.NaN) || (rPotMax ?? 0) <= 0) {
      return Number.NaN;
    }
    return 0.5 * (rPotMax ?? 0);
  }, [rPotMax]);

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                Optimized components
              </Typography>
              <Chip label="Low-pass" color="primary" variant="outlined" size="small" />
            </Stack>
            <Skeleton variant="rounded" height={140} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                Optimized components
              </Typography>
              <Chip label="Low-pass" color="primary" variant="outlined" size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Enter a target frequency and potentiometer value to compute the E6 capacitor pair.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const approxPrefix = result.withinTolerance ? '' : '≈ ';
  const toleranceNote = result.withinTolerance
    ? null
    : `Closest match outside ±${(DEFAULT_RELATIVE_TOLERANCE * 100).toFixed(0)}% window.`;

  const smallCapWarning = result.c1 <= DEFAULT_MIN_CAPACITANCE * 1.001 || result.c2 <= DEFAULT_MIN_CAPACITANCE * 1.001;
  const largeCapWarning = result.c1 >= DEFAULT_MAX_CAPACITANCE * 0.999 || result.c2 >= DEFAULT_MAX_CAPACITANCE * 0.999;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h2">
              Optimized components
            </Typography>
            <Chip label="Low-pass" color="primary" variant="outlined" size="small" />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="body1" fontWeight={600}>
              C1 = {formatFarads(result.c1)}
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              C2 = {formatFarads(result.c2)}
            </Typography>
          </Stack>

          <Divider flexItem />

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {approxPrefix}f₀@50% = {formatHertz(result.f50)} ({renderErrorPercent(result.relErr)} error)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Q = {formatQualityFactor(result.q)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              R₅₀ (per gang) = {formatOhms(r50)}
            </Typography>
            {Number.isFinite(fTarget50 ?? Number.NaN) && (
              <Typography variant="body2" color="text.secondary">
                Target f₀@50% = {formatHertz(fTarget50 ?? NaN)}
              </Typography>
            )}
          </Stack>

          {(toleranceNote || smallCapWarning || largeCapWarning) && (
            <Stack spacing={0.5}>
              {toleranceNote && (
                <Typography variant="body2" color="text.secondary">
                  {toleranceNote}
                </Typography>
              )}
              {smallCapWarning && (
                <Typography variant="body2" color="text.secondary">
                  Result pushes against the lower capacitor limit (~10 pF).
                </Typography>
              )}
              {largeCapWarning && (
                <Typography variant="body2" color="text.secondary">
                  Result pushes against the upper capacitor limit (~10 µF).
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
