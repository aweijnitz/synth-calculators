const SUFFIX_MULTIPLIERS: Record<string, number> = {
  '': 1,
  k: 1_000,
  M: 1_000_000,
};

const OHM_REGEX = /^([+-]?[0-9]*\.?[0-9]+(?:[eE][+-]?\d+)?)\s*([kM]?)$/;
const SIGNIFICANT_DIGITS = 3;

function trimTrailingZerosPreserveWhole(value: string): string {
  if (!value.includes('.')) {
    return value;
  }
  const original = value;
  let trimmed = value;
  while (trimmed.endsWith('0')) {
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed.endsWith('.')) {
    return original;
  }
  return trimmed;
}

export function parseOhms(input: string): number | Error {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return new Error('Please enter a value.');
  }

  const match = trimmed.match(OHM_REGEX);
  if (!match) {
    return new Error('Please enter a value using Ω, k, or M.');
  }

  const [, numericPart, suffix = ''] = match;
  const multiplier = SUFFIX_MULTIPLIERS[suffix];
  if (!multiplier) {
    return new Error('Only k (kilo) and M (mega) suffixes are supported.');
  }

  const numericValue = Number(numericPart);
  if (!Number.isFinite(numericValue) || Number.isNaN(numericValue)) {
    return new Error('Please enter a valid number.');
  }

  if (numericValue <= 0) {
    return new Error('Please enter a value greater than zero.');
  }

  return numericValue * multiplier;
}

export function formatOhms(ohms: number): string {
  if (!Number.isFinite(ohms)) {
    return '—';
  }

  const absValue = Math.abs(ohms);
  let value = ohms;
  let suffix = 'Ω';

  if (absValue >= 1_000_000) {
    value = ohms / 1_000_000;
    suffix = 'MΩ';
  } else if (absValue >= 1_000) {
    value = ohms / 1_000;
    suffix = 'kΩ';
  }

  const formatted = trimTrailingZerosPreserveWhole(value.toPrecision(SIGNIFICANT_DIGITS));
  return `${formatted}${suffix}`;
}
