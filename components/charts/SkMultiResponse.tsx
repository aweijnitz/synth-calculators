'use client';

import { Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import { LineChart } from '@mui/x-charts/LineChart';
import * as React from 'react';
import { formatHertz } from '../../lib/rc/parse';
import { clampFrequency, generateFrequencies, magnitudeLP } from './useFrequencyResponse';

const DEFAULT_POINT_COUNT = 120;
const DEFAULT_DECADE_SPAN = 4;
const DEFAULT_HEIGHT = 320;

export type ResponseSeries = {
  label: string;
  fc: number;
};

export type SkMultiResponseProps = {
  series: ResponseSeries[];
  loading?: boolean;
  showDb?: boolean;
  pointCount?: number;
  decadeSpan?: number;
  height?: number;
};

type SeriesPoint = {
  frequency: number;
  magnitude: number;
  magnitudeDb: number;
};

function toDecibels(value: number): number {
  const MIN_MAG = 1e-9;
  const safeValue = Math.max(value, MIN_MAG);
  return 20 * Math.log10(safeValue);
}

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

function tooltipFormatter(dataset: SeriesPoint[], showDb: boolean) {
  return (value: number | null, context: { dataIndex?: number }) => {
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

export default function SkMultiResponse({
  series,
  loading = false,
  showDb = true,
  pointCount = DEFAULT_POINT_COUNT,
  decadeSpan = DEFAULT_DECADE_SPAN,
  height = DEFAULT_HEIGHT,
}: SkMultiResponseProps) {
  const validSeries = React.useMemo(() => series.filter((item) => Number.isFinite(item.fc) && item.fc > 0), [series]);

  const axisFrequencies = React.useMemo(() => {
    if (validSeries.length === 0) {
      return [];
    }
    const clamped = validSeries.map((item) => clampFrequency(item.fc));
    const min = Math.min(...clamped);
    const max = Math.max(...clamped);
    const base = Math.sqrt(min * max);
    return generateFrequencies(base || clamped[0], pointCount, decadeSpan);
  }, [decadeSpan, pointCount, validSeries]);

  const datasets = React.useMemo(() => {
    return validSeries.map((item) => {
      const fcClamped = clampFrequency(item.fc);
      const data = axisFrequencies.map<SeriesPoint>((frequency) => {
        const magnitude = magnitudeLP(frequency, fcClamped);
        return {
          frequency,
          magnitude,
          magnitudeDb: toDecibels(magnitude),
        };
      });
      return { ...item, data };
    });
  }, [axisFrequencies, validSeries]);

  const yAxisLabel = showDb ? 'Magnitude (dB)' : 'Magnitude |H|';

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                Frequency response sweep
              </Typography>
              <Chip label="Low-pass" color="primary" variant="outlined" size="small" />
            </Stack>
            <Skeleton variant="rounded" height={height} data-testid="frequency-response-skeleton" />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (axisFrequencies.length === 0 || datasets.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                Frequency response sweep
              </Typography>
              <Chip label="Low-pass" color="primary" variant="outlined" size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Provide valid component values to preview the sweep.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const xAxisData = axisFrequencies;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h2">
              Frequency response sweep
            </Typography>
            <Chip label="Low-pass" color="primary" variant="outlined" size="small" />
          </Stack>

          <LineChart
            xAxis={[
              {
                data: xAxisData,
                valueFormatter: (value) => formatHertz(value as number),
                scaleType: 'log',
                label: 'Frequency (Hz)',
              },
            ]}
            yAxis={[
              {
                label: yAxisLabel,
                min: showDb ? undefined : 0,
                valueFormatter: (value) => (showDb ? formatDecibels(value as number) : `${formatMagnitude(value as number)} |H|`),
              },
            ]}
            series={datasets.map((dataset) => ({
              id: dataset.label,
              label: dataset.label,
              data: showDb
                ? dataset.data.map((point) => point.magnitudeDb)
                : dataset.data.map((point) => point.magnitude),
              valueFormatter: tooltipFormatter(dataset.data, showDb),
              showMark: false,
            }))}
            height={height}
            margin={{ top: 16, right: 24, bottom: 48, left: 64 }}
            slotProps={{ legend: { position: { vertical: 'top', horizontal: 'right' } } }}
          >
            {datasets.map((dataset) => (
              <ChartsReferenceLine
                key={dataset.label}
                x={clampFrequency(dataset.fc)}
                label={dataset.label}
                lineStyle={{ strokeDasharray: '4 4' }}
                labelAlign="end"
              />
            ))}
          </LineChart>
        </Stack>
      </CardContent>
    </Card>
  );
}
