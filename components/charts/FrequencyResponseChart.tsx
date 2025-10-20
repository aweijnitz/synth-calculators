'use client';

import { Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import * as React from 'react';
import { formatHertz } from '../../lib/rc/parse';
import type { RcFilterMode } from '../../lib/rc/types';
import {
  useFrequencyResponse,
  type FilterMode,
  type FrequencyResponsePoint,
} from './useFrequencyResponse';

export type FrequencyResponseChartProps = {
  mode: FilterMode;
  rOhms?: number;
  cFarads?: number;
  fcHz?: number;
  title?: string;
  showDb?: boolean;
  pointCount?: number;
  decadeSpan?: number;
  height?: number;
  loading?: boolean;
};

const DEFAULT_TITLE = 'Frequency response';
const DEFAULT_POINT_COUNT = 100;
const DEFAULT_DECADE_SPAN = 4;
const DEFAULT_HEIGHT = 280;

const MODE_LABEL: Record<RcFilterMode, string> = {
  lowpass: 'Low-pass',
  highpass: 'High-pass',
};

function formatMagnitude(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (value >= 0.1) {
    return value.toFixed(3);
  }
  if (value >= 0.01) {
    return value.toFixed(4);
  }
  return value.toExponential(2);
}

function formatDecibels(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(2)} dB`;
}

type CutoffState =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; fc: number };

function resolveCutoff({
  fcHz,
  rOhms,
  cFarads,
}: {
  fcHz?: number;
  rOhms?: number;
  cFarads?: number;
}): CutoffState {
  if (fcHz !== undefined) {
    if (!Number.isFinite(fcHz) || fcHz <= 0) {
      return { status: 'error', message: 'Cutoff frequency must be greater than zero to plot the response.' };
    }
    return { status: 'ready', fc: fcHz };
  }

  const hasR = rOhms !== undefined;
  const hasC = cFarads !== undefined;

  if (hasR && (!Number.isFinite(rOhms!) || rOhms! <= 0)) {
    return { status: 'error', message: 'Resistance must be a positive value to compute f_c.' };
  }

  if (hasC && (!Number.isFinite(cFarads!) || cFarads! <= 0)) {
    return { status: 'error', message: 'Capacitance must be a positive value to compute f_c.' };
  }

  if (hasR && hasC) {
    const computedFc = 1 / (2 * Math.PI * (rOhms as number) * (cFarads as number));
    if (!Number.isFinite(computedFc) || computedFc <= 0) {
      return { status: 'error', message: 'Unable to compute cutoff frequency from the provided values.' };
    }
    return { status: 'ready', fc: computedFc };
  }

  if (hasR || hasC) {
    return { status: 'empty' };
  }

  return { status: 'empty' };
}

function tooltipFormatter(
  dataset: FrequencyResponsePoint[],
  showDb: boolean,
): (value: number | null, context: { dataIndex?: number }) => string {
  return (value, context) => {
    if (value === null || value === undefined) {
      return '—';
    }

    const index = context?.dataIndex ?? 0;
    const point = dataset[index];

    if (!point) {
      return showDb ? formatDecibels(value) : `${formatMagnitude(value)} |H|`;
    }

    if (showDb) {
      return `${formatDecibels(value)} (|H| = ${formatMagnitude(point.magnitude)})`;
    }

    return `${formatMagnitude(value)} |H| (${formatDecibels(point.magnitudeDb)})`;
  };
}

export default function FrequencyResponseChart({
  mode,
  rOhms,
  cFarads,
  fcHz,
  title = DEFAULT_TITLE,
  showDb = true,
  pointCount = DEFAULT_POINT_COUNT,
  decadeSpan = DEFAULT_DECADE_SPAN,
  height = DEFAULT_HEIGHT,
  loading = false,
}: FrequencyResponseChartProps) {
  const cutoff = React.useMemo(() => resolveCutoff({ fcHz, rOhms, cFarads }), [cFarads, fcHz, rOhms]);
  const effectiveFc = cutoff.status === 'ready' ? cutoff.fc : 1;
  const response = useFrequencyResponse({
    fcHz: effectiveFc,
    mode,
    pointCount,
    decadeSpan,
  });

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                {title}
              </Typography>
              <Chip label={MODE_LABEL[mode]} color="primary" variant="outlined" size="small" />
            </Stack>
            <Skeleton variant="rounded" height={height} data-testid="frequency-response-skeleton" />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (cutoff.status === 'empty') {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                {title}
              </Typography>
              <Chip label={MODE_LABEL[mode]} color="primary" variant="outlined" size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Enter any two values (R, C, f_c) to preview the response.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (cutoff.status === 'error') {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                {title}
              </Typography>
              <Chip label={MODE_LABEL[mode]} color="primary" variant="outlined" size="small" />
            </Stack>
            <Typography variant="body2" color="error">
              {cutoff.message}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const { dataset, fc, xDomain } = response;

  const seriesKey = showDb ? 'magnitudeDb' : 'magnitude';
  const yAxisLabel = showDb ? 'Magnitude (dB)' : 'Magnitude |H|';
  const seriesValueFormatter = tooltipFormatter(dataset, showDb);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h2">
              {title}
            </Typography>
            <Chip label={MODE_LABEL[mode]} color="primary" variant="outlined" size="small" />
          </Stack>

          <LineChart
            dataset={dataset}
            xAxis={[
              {
                dataKey: 'frequency',
                label: 'Frequency (Hz)',
                valueFormatter: (value) => formatHertz(value as number),
                scaleType: 'log',
                min: xDomain.min,
                max: xDomain.max,
              },
            ]}
            yAxis={[
              {
                label: yAxisLabel,
                valueFormatter: (value) => (showDb ? formatDecibels(value as number) : formatMagnitude(value as number)),
                min: showDb ? undefined : 0,
              },
            ]}
            series={[
              {
                id: 'response',
                dataKey: seriesKey,
                showMark: false,
                label: MODE_LABEL[mode],
                valueFormatter: seriesValueFormatter,
              },
            ]}
            height={height}
            margin={{ top: 16, right: 24, bottom: 48, left: 64 }}
            slotProps={{
              legend: { hidden: true },
            }}
            sx={{ width: '100%' }}
          >
            <ChartsReferenceLine x={fc} label="f_c" lineStyle={{ strokeDasharray: '4 4' }} labelAlign="end" />
          </LineChart>
        </Stack>
      </CardContent>
    </Card>
  );
}
