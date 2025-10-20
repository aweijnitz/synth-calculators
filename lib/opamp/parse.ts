const SUFFIX_MULTIPLIERS: Record<string, number> = {
  '': 1,
  k: 1_000,
  M: 1_000_000
};

const OHM_REGEX = /^([0-9]*\.?[0-9]+(?:[eE][+-]?\d+)?)\s*([kM]?)$/;

const SIGNIFICANT_DIGITS_OHMS = 3;
const SIGNIFICANT_DIGITS_GAIN = 4;

function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) {
    return value;
  }
  let trimmed = value;
  while (trimmed.endsWith('0')) {
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed.endsWith('.')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

function formatWithSignificantDigits(value: number, digits: number, trim = false): string {
  if (!Number.isFinite(value)) {
    return 'NaN';
  }

  if (value === 0) {
    return '0';
  }

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const decimalPlaces = Math.max(0, digits - 1 - exponent);
  const formatted = value.toFixed(decimalPlaces);

  if (trim && decimalPlaces > 0) {
    return trimTrailingZeros(formatted);
  }

  return formatted;
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
  let suffix = 'Ω';
  let value = ohms;

  if (absValue >= 1_000_000) {
    suffix = 'MΩ';
    value = ohms / 1_000_000;
  } else if (absValue >= 1_000) {
    suffix = 'kΩ';
    value = ohms / 1_000;
  }

  const formatted = formatWithSignificantDigits(value, SIGNIFICANT_DIGITS_OHMS, false);
  return `${formatted}${suffix}`;
}

export function formatGain(gain: number): string {
  if (!Number.isFinite(gain)) {
    return '—';
  }

  const sign = gain < 0 ? '-' : '';
  const magnitude = Math.abs(gain);
  const formattedMagnitude = formatWithSignificantDigits(magnitude, SIGNIFICANT_DIGITS_GAIN, true);
  return `${sign}${formattedMagnitude}`;
}

export function formatDb(gain: number): string {
  if (!Number.isFinite(gain) || gain === 0) {
    return '−∞ dB';
  }

  const db = 20 * Math.log10(Math.abs(gain));
  return `${db.toFixed(2)} dB`;
}
