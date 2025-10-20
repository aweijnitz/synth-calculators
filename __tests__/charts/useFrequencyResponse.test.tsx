import { render, waitFor } from '@testing-library/react';
import * as React from 'react';
import {
  MIN_FREQUENCY_HZ,
  MAX_FREQUENCY_HZ,
  clampFrequency,
  generateFrequencies,
  magnitudeLP,
  magnitudeHP,
  useFrequencyResponse,
  type UseFrequencyResponseResult,
} from '../../components/charts/useFrequencyResponse';

describe('generateFrequencies', () => {
  it('produces logarithmically spaced samples within the requested span', () => {
    const fc = 1_000;
    const samples = generateFrequencies(fc, 5, 2);

    expect(samples).toHaveLength(5);
    expect(samples[0]).toBeCloseTo(100, 6);
    expect(samples[samples.length - 1]).toBeCloseTo(10_000, 6);

    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThan(samples[index - 1]);
    }
  });

  it('clamps frequencies for extremely small or large cutoff values', () => {
    const low = generateFrequencies(1e-6, 3, 4);
    expect(low[0]).toBeGreaterThanOrEqual(MIN_FREQUENCY_HZ);
    expect(low[low.length - 1]).toBeLessThanOrEqual(MIN_FREQUENCY_HZ * 1_000);

    const high = generateFrequencies(1e12, 3, 4);
    expect(high[0]).toBeGreaterThanOrEqual(MAX_FREQUENCY_HZ / 10_000);
    expect(high[high.length - 1]).toBeLessThanOrEqual(MAX_FREQUENCY_HZ);
  });
});

describe('magnitude responses', () => {
  const fc = 338.63; // ≈ 1 / (2π · 10kΩ · 47nF)

  it('matches known low-pass magnitudes', () => {
    expect(magnitudeLP(fc, fc)).toBeCloseTo(1 / Math.sqrt(2), 4);
    expect(magnitudeLP(0.1 * fc, fc)).toBeCloseTo(0.995, 3);
    expect(magnitudeLP(10 * fc, fc)).toBeCloseTo(0.0995, 4);
  });

  it('matches known high-pass magnitudes', () => {
    expect(magnitudeHP(fc, fc)).toBeCloseTo(1 / Math.sqrt(2), 4);
    expect(magnitudeHP(0.1 * fc, fc)).toBeCloseTo(0.0995, 4);
    expect(magnitudeHP(10 * fc, fc)).toBeCloseTo(0.995, 3);
  });
});

describe('clampFrequency', () => {
  it('clamps finite values to the supported range', () => {
    expect(clampFrequency(-10)).toBe(MIN_FREQUENCY_HZ);
    expect(clampFrequency(1e11)).toBe(MAX_FREQUENCY_HZ);
  });

  it('defaults to the minimum when provided an invalid value', () => {
    expect(clampFrequency(Number.NaN)).toBe(MIN_FREQUENCY_HZ);
    expect(clampFrequency(Number.POSITIVE_INFINITY)).toBe(MIN_FREQUENCY_HZ);
  });
});

describe('useFrequencyResponse', () => {
  function HookProbe({
    fc,
    mode,
    pointCount,
    decadeSpan,
    onResult,
  }: {
    fc: number;
    mode: 'lowpass' | 'highpass';
    pointCount: number;
    decadeSpan: number;
    onResult: (result: UseFrequencyResponseResult) => void;
  }) {
    const result = useFrequencyResponse({ fcHz: fc, mode, pointCount, decadeSpan });

    React.useEffect(() => {
      onResult(result);
    }, [onResult, result]);

    return null;
  }

  it('returns a stable dataset with logarithmic spacing', async () => {
    const spy = jest.fn();
    render(
      <HookProbe fc={1_000} mode="lowpass" pointCount={5} decadeSpan={2} onResult={spy} />
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());

    const { dataset, fc, xDomain } = spy.mock.calls.pop()?.[0] as UseFrequencyResponseResult;
    expect(fc).toBeCloseTo(1_000, 6);
    expect(dataset).toHaveLength(5);
    expect(xDomain.min).toBeCloseTo(100, 6);
    expect(xDomain.max).toBeCloseTo(10_000, 6);

    dataset.forEach((point, index) => {
      expect(point.frequency).toBeGreaterThan(0);
      expect(Number.isFinite(point.magnitudeDb)).toBe(true);
      if (index > 0) {
        expect(point.frequency).toBeGreaterThan(dataset[index - 1].frequency);
      }
    });
  });
});

