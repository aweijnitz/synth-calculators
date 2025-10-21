'use client';

import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import * as React from 'react';
import { formatFarads, formatHertz, formatOhms } from '../../lib/rc/parse';
import type { SweepPoint } from '../../lib/sklp_equal/solve';

type ResultsCardProps = {
  c1?: number;
  c2?: number;
  q?: number;
  sweeps: SweepPoint[];
  insufficient?: boolean;
  warningMessage?: string | null;
  infoMessages?: string[];
  errorMessage?: string | null;
  targetFcHz?: number;
  fc50Hz?: number;
};

const POSITION_LABELS: Record<number, string> = {
  0: '0%',
  0.25: '25%',
  0.5: '50%',
  0.75: '75%',
  1: '100%',
};

function formatQualityFactor(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) <= 0) {
    return '—';
  }
  const q = value as number;
  return q >= 10 ? q.toFixed(2) : q.toFixed(3);
}

export default function ResultsCard({
  c1,
  c2,
  q,
  sweeps,
  insufficient = false,
  warningMessage,
  infoMessages = [],
  errorMessage,
  targetFcHz,
  fc50Hz,
}: ResultsCardProps) {
  const showSweeps = sweeps.length > 0 && !insufficient;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2">
            Results
          </Typography>

          {insufficient && (
            <Typography variant="body2" color="text.secondary">
              Enter the target f_c and potentiometer value to derive capacitors.
            </Typography>
          )}

          {errorMessage && (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          )}

          {warningMessage && (
            <Alert severity="warning" variant="outlined">
              {warningMessage}
            </Alert>
          )}

          {infoMessages.map((message) => (
            <Alert key={message} severity="info" variant="outlined">
              {message}
            </Alert>
          ))}

          {showSweeps && (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Capacitors
                </Typography>
                <Typography variant="h6" component="p">
                  C1 = {formatFarads(c1 ?? Number.NaN)}
                </Typography>
                <Typography variant="h6" component="p">
                  C2 = {formatFarads(c2 ?? Number.NaN)}
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  f_c at 50%
                </Typography>
                <Typography variant="h6" component="p">
                  Target ≈ {formatHertz(targetFcHz ?? Number.NaN)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actual ≈ {formatHertz(fc50Hz ?? Number.NaN)}
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Q-factor (unity gain)
                </Typography>
                <Typography variant="h6" component="p">
                  Q = {formatQualityFactor(q)}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Cutoff sweep
                </Typography>
                <Stack spacing={1}>
                  {sweeps.map((point) => {
                    const label = POSITION_LABELS[point.alpha] ?? `${Math.round(point.alpha * 100)}%`;
                    return (
                      <Stack key={point.alpha} spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">
                          {label}
                        </Typography>
                        <Typography variant="body1">
                          R = {formatOhms(point.R)} | f_c = {formatHertz(point.fc)}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
