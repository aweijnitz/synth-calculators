import * as React from 'react';
import type { RcFilterMode } from '../../lib/rc/types';

export const MIN_FREQUENCY_HZ = 0.1;
export const MAX_FREQUENCY_HZ = 20_000;
const LOG_BASE_10 = Math.log(10);
const MIN_MAGNITUDE = 1e-9;

export type FilterMode = RcFilterMode;

export type FrequencyResponsePoint = {
  frequency: number;
  magnitude: number;
  magnitudeDb: number;
};

export type UseFrequencyResponseOptions = {
  fcHz: number;
  mode: FilterMode;
  pointCount?: number;
  decadeSpan?: number;
};

export type UseFrequencyResponseResult = {
  dataset: FrequencyResponsePoint[];
  fc: number;
  xDomain: { min: number; max: number };
  yDomain: { min: number; max: number };
};

export function clampFrequency(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_FREQUENCY_HZ;
  }
  return Math.min(Math.max(value, MIN_FREQUENCY_HZ), MAX_FREQUENCY_HZ);
}

export function generateFrequencies(fcHz: number, pointCount: number, decadeSpan: number): number[] {
  const safePointCount = Math.max(1, Math.trunc(pointCount));
  const span = Math.max(0, decadeSpan);
  const fc = clampFrequency(fcHz);
  const halfDecades = span / 2;
  const lowerBound = fc / Math.pow(10, halfDecades);
  const upperBound = fc * Math.pow(10, halfDecades);
  const start = Math.max(MIN_FREQUENCY_HZ, lowerBound);
  const end = Math.min(MAX_FREQUENCY_HZ, upperBound);

  if (safePointCount === 1 || start === end) {
    return [start];
  }

  const logStart = Math.log(start) / LOG_BASE_10;
  const logEnd = Math.log(end) / LOG_BASE_10;
  const step = (logEnd - logStart) / (safePointCount - 1);

  return Array.from({ length: safePointCount }, (_, index) => {
    const exponent = logStart + step * index;
    return Math.pow(10, exponent);
  });
}

export function magnitudeLP(frequency: number, fc: number): number {
  if (fc <= 0) {
    return 0;
  }
  const ratio = frequency / fc;
  return 1 / Math.sqrt(1 + ratio * ratio);
}

export function magnitudeHP(frequency: number, fc: number): number {
  if (fc <= 0) {
    return 0;
  }
  const ratio = frequency / fc;
  return ratio / Math.sqrt(1 + ratio * ratio);
}

function magnitude(mode: FilterMode, frequency: number, fc: number): number {
  return mode === 'lowpass' ? magnitudeLP(frequency, fc) : magnitudeHP(frequency, fc);
}

function toDecibels(value: number): number {
  const safeValue = Math.max(value, MIN_MAGNITUDE);
  return 20 * Math.log10(safeValue);
}

export function useFrequencyResponse({
  fcHz,
  mode,
  pointCount = 100,
  decadeSpan = 4,
}: UseFrequencyResponseOptions): UseFrequencyResponseResult {
  return React.useMemo(() => {
    const fc = clampFrequency(fcHz);
    const frequencies = generateFrequencies(fc, pointCount, decadeSpan);
    const dataset = frequencies.map((frequency) => {
      const mag = magnitude(mode, frequency, fc);
      return {
        frequency,
        magnitude: mag,
        magnitudeDb: toDecibels(mag),
      };
    });

    const magnitudesDb = dataset.map((point) => point.magnitudeDb);
    const minDb = Math.min(...magnitudesDb);
    const maxDb = Math.max(...magnitudesDb);

    return {
      dataset,
      fc,
      xDomain: { min: frequencies[0] ?? fc, max: frequencies[frequencies.length - 1] ?? fc },
      yDomain: { min: minDb, max: maxDb },
    };
  }, [decadeSpan, fcHz, mode, pointCount]);
}
