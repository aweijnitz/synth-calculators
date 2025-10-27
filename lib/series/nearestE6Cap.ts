import { E6_SERIES } from './e6';
import type { CapUnit } from '../capconv/parse';
import { convertFromUnit, convertToUnit } from '../capconv/parse';

type NearestE6Result = {
  valueInUnit: number;
  label: string;
  errorAbsInUnit: number;
  errorRelPct: number;
};

export function nearestE6CapInUnit(valueF: number, unit: CapUnit): NearestE6Result {
  const valueInUnit = convertToUnit(valueF, unit);

  if (!Number.isFinite(valueInUnit) || valueInUnit <= 0) {
    return {
      valueInUnit: Number.NaN,
      label: `-- ${unit}`,
      errorAbsInUnit: Number.NaN,
      errorRelPct: Number.NaN
    };
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(valueInUnit)));
  let best = valueInUnit;
  let bestError = Number.POSITIVE_INFINITY;

  for (let expOffset = -2; expOffset <= 2; expOffset += 1) {
    const decade = magnitude * Math.pow(10, expOffset);
    E6_SERIES.forEach((mantissa) => {
      const candidate = mantissa * decade;
      const error = Math.abs(candidate - valueInUnit);
      if (error < bestError - Number.EPSILON || (Math.abs(error - bestError) <= Number.EPSILON && candidate < best)) {
        best = candidate;
        bestError = error;
      }
    });
  }

  const errorAbsInUnit = best - valueInUnit;
  const errorRelPct = (errorAbsInUnit / valueInUnit) * 100;

  const bestF = convertFromUnit(best, unit);
  const label = formatLabel(bestF, unit);

  return {
    valueInUnit: best,
    label,
    errorAbsInUnit,
    errorRelPct
  };
}

function formatLabel(valueF: number, unit: CapUnit): string {
  const scaleValue = convertToUnit(valueF, unit);
  if (!Number.isFinite(scaleValue)) {
    return `-- ${unit}`;
  }
  const abs = Math.abs(scaleValue);
  if (abs === 0) {
    return `0 ${unit}`;
  }
  const exponent = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, 3 - exponent - 1);
  let formatted = scaleValue.toFixed(decimals);
  if (decimals > 0 && formatted.includes('.')) {
    formatted = formatted.replace(/0+$/, '');
    if (formatted.endsWith('.')) {
      formatted = `${formatted}0`;
    }
  }
  return `${formatted} ${unit}`;
}

export type { NearestE6Result };
