const OHM_SUFFIXES: Record<string, number> = {
  '': 1,
  k: 1_000,
  M: 1_000_000
};

const FARAD_SUFFIXES: Record<string, number> = {
  '': 1,
  m: 1e-3,
  u: 1e-6,
  n: 1e-9,
  p: 1e-12
};

const HERTZ_SUFFIXES: Record<string, number> = {
  '': 1,
  k: 1_000,
  M: 1_000_000
};

const OHM_PATTERN = /^([0-9]*\.?[0-9]+(?:[eE][+-]?\d+)?)\s*([kM]?)\s*(?:Ω)?$/;
const FARAD_PATTERN = /^([0-9]*\.?[0-9]+(?:[eE][+-]?\d+)?)\s*([munp]?)\s*(?:F)?$/;
const HERTZ_PATTERN = /^([0-9]*\.?[0-9]+(?:[eE][+-]?\d+)?)\s*([kM]?)\s*(?:Hz)?$/;

function applyFractionFormatting(raw: string, minFractionDigits: number, ensureDecimal: boolean): string {
  if (!raw.includes('.')) {
    if (!ensureDecimal && minFractionDigits === 0) {
      return raw;
    }
    const decimals = ensureDecimal ? Math.max(1, minFractionDigits) : minFractionDigits;
    if (decimals <= 0) {
      return ensureDecimal ? `${raw}.0` : raw;
    }
    return `${raw}.${'0'.repeat(decimals)}`;
  }

  const [integerPart, rawFraction] = raw.split('.');
  let fraction = rawFraction;
  while (fraction.length > minFractionDigits && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1);
  }

  if (fraction.length < minFractionDigits) {
    fraction = fraction.padEnd(minFractionDigits, '0');
  }

  if (fraction.length === 0) {
    if (ensureDecimal) {
      return `${integerPart}.0`;
    }
    if (minFractionDigits > 0) {
      return `${integerPart}.${'0'.repeat(minFractionDigits)}`;
    }
    return integerPart;
  }

  return `${integerPart}.${fraction}`;
}

function formatWithSignificantDigits(
  value: number,
  digits: number,
  options: { minFractionDigits?: number; ensureDecimal?: boolean } = {}
): string {
  const { minFractionDigits = 0, ensureDecimal = false } = options;

  if (!Number.isFinite(value)) {
    return 'NaN';
  }

  if (value === 0) {
    if (ensureDecimal || minFractionDigits > 0) {
      const decimals = ensureDecimal ? Math.max(1, minFractionDigits) : minFractionDigits;
      if (decimals <= 0) {
        return ensureDecimal ? '0.0' : '0';
      }
      return `0.${'0'.repeat(decimals)}`;
    }
    return '0';
  }

  const abs = Math.abs(value);
  const exponent = Math.floor(Math.log10(abs));
  const decimalPlaces = Math.max(minFractionDigits, digits - 1 - exponent);
  const raw = value.toFixed(decimalPlaces);
  return applyFractionFormatting(raw, minFractionDigits, ensureDecimal);
}

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

function parseWithPattern(
  input: string,
  suffixes: Record<string, number>,
  pattern: RegExp,
  unsupportedMessage: string
): number | Error {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return new Error('Please enter a value.');
  }

  const match = trimmed.match(pattern);
  if (!match) {
    return new Error(unsupportedMessage);
  }

  const [, numericPart, suffix = ''] = match;
  const multiplier = suffixes[suffix];

  if (multiplier === undefined) {
    return new Error(unsupportedMessage);
  }

  const numericValue = Number(numericPart);
  if (!Number.isFinite(numericValue)) {
    return new Error('Please enter a valid number.');
  }

  if (numericValue <= 0) {
    return new Error('Please enter a value greater than zero.');
  }

  return numericValue * multiplier;
}

export function parseOhms(input: string): number | Error {
  return parseWithPattern(input, OHM_SUFFIXES, OHM_PATTERN, 'Only k/M for R & f; p/n/u/m for C (case-sensitive).');
}

export function parseFarads(input: string): number | Error {
  return parseWithPattern(input, FARAD_SUFFIXES, FARAD_PATTERN, 'Only k/M for R & f; p/n/u/m for C (case-sensitive).');
}

export function parseHertz(input: string): number | Error {
  return parseWithPattern(input, HERTZ_SUFFIXES, HERTZ_PATTERN, 'Only k/M for R & f; p/n/u/m for C (case-sensitive).');
}

export function formatOhms(ohms: number): string {
  if (!Number.isFinite(ohms) || ohms <= 0) {
    return '—';
  }

  const abs = Math.abs(ohms);
  if (abs >= 1_000_000) {
    const value = ohms / 1_000_000;
    const ensureDecimal = value < 10;
    const minFractionDigits = ensureDecimal ? 2 : 0;
    const formatted = formatWithSignificantDigits(value, 3, {
      minFractionDigits,
      ensureDecimal
    });
    return `${formatted}MΩ`;
  }

  if (abs >= 1_000) {
    const value = ohms / 1_000;
    const ensureDecimal = value < 10;
    const formatted = formatWithSignificantDigits(value, 3, {
      minFractionDigits: ensureDecimal ? 1 : 0,
      ensureDecimal
    });
    return `${formatted}kΩ`;
  }

  const formatted = formatWithSignificantDigits(ohms, 3);
  return `${formatted}Ω`;
}

export function formatFarads(farads: number): string {
  if (!Number.isFinite(farads) || farads <= 0) {
    return '—';
  }

  const abs = Math.abs(farads);
  const units = [
    { threshold: 1, factor: 1, suffix: 'F' },
    { threshold: 1e-3, factor: 1e-3, suffix: 'mF' },
    { threshold: 1e-6, factor: 1e-6, suffix: 'uF' },
    { threshold: 1e-9, factor: 1e-9, suffix: 'nF' },
    { threshold: 1e-12, factor: 1e-12, suffix: 'pF' }
  ];

  for (const unit of units) {
    if (abs >= unit.threshold) {
      const value = farads / unit.factor;
      const ensureDecimal = value < 10;
      const formatted = formatWithSignificantDigits(value, 3, {
        minFractionDigits: ensureDecimal ? 1 : 0,
        ensureDecimal
      });
      return `${formatted}${unit.suffix}`;
    }
  }

  const formatted = formatWithSignificantDigits(farads, 3, {
    ensureDecimal: abs < 10,
    minFractionDigits: abs < 10 ? 1 : 0
  });
  return `${formatted}F`;
}

export function formatHertz(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) {
    return '—';
  }

  const abs = Math.abs(hz);
  if (abs >= 1_000_000) {
    const value = hz / 1_000_000;
    return `${value.toFixed(2)}MHz`;
  }

  if (abs >= 1_000) {
    const value = hz / 1_000;
    return `${trimTrailingZeros(value.toFixed(2))}kHz`;
  }

  return `${trimTrailingZeros(hz.toFixed(2))}Hz`;
}
