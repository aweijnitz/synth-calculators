const SUFFIXES: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  m: 1e-3
};

type CapUnit = 'pF' | 'nF' | 'uF' | 'F';

export const UNIT_FACTORS: Record<CapUnit, number> = {
  pF: 1e12,
  nF: 1e9,
  uF: 1e6,
  F: 1
};

export const MIN_FARADS = 1e-15;
export const MAX_FARADS = 10;

export function parseCapacitance(input: string): number | Error {
  const trimmed = input.trim();
  if (!trimmed) {
    return new Error('Please enter a positive capacitance.');
  }

  const match = trimmed.match(/^([+-]?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)(?:\s*([pnum]))?$/);
  if (!match) {
    if (/^[0-9.+-].*[A-Za-z]$/.test(trimmed)) {
      return new Error('Only p, n, u, m suffixes are supported (lowercase).');
    }
    return new Error('Please enter a positive capacitance.');
  }

  const [, numericPart, suffix] = match;
  const value = Number(numericPart);
  if (!Number.isFinite(value) || value <= 0) {
    return new Error('Please enter a positive capacitance.');
  }

  const multiplier = suffix ? SUFFIXES[suffix] : 1;
  if (!multiplier) {
    return new Error('Only p, n, u, m suffixes are supported (lowercase).');
  }

  const farads = value * multiplier;

  return farads;
}

function toSignificantDigits(value: number, digits: number): string {
  if (value === 0) {
    return '0';
  }
  const abs = Math.abs(value);
  const exponent = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, digits - exponent - 1);
  return value.toFixed(decimals);
}

export function formatCap(valueF: number, unit: CapUnit): string {
  const scale = UNIT_FACTORS[unit];
  const valueInUnit = valueF * scale;

  if (!Number.isFinite(valueInUnit)) {
    return `-- ${unit}`;
  }

  if (unit === 'F') {
    if (valueInUnit === 0) {
      return '0 F';
    }
    const abs = Math.abs(valueInUnit);
    if (abs >= 1e3 || abs <= 1e-6) {
      return `${valueInUnit.toExponential(2)} F`;
    }
    return `${toSignificantDigits(valueInUnit, 3)} F`;
  }

  const formatted = toSignificantDigits(valueInUnit, 3);
  return `${formatted} ${unit}`;
}

export function formatAllUnits(valueF: number) {
  return {
    pF: formatCap(valueF, 'pF'),
    nF: formatCap(valueF, 'nF'),
    uF: formatCap(valueF, 'uF'),
    F: formatCap(valueF, 'F')
  };
}

export function convertToUnit(valueF: number, unit: CapUnit): number {
  return valueF * UNIT_FACTORS[unit];
}

export function convertFromUnit(value: number, unit: CapUnit): number {
  return value / UNIT_FACTORS[unit];
}

export type { CapUnit };
