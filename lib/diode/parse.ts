const OHM_SUFFIXES: Record<string, number> = {
  k: 1_000,
  M: 1_000_000
};

const OHM_PATTERN = /^([+]?(?:\d*\.?\d+))(?:([kM]))?$/;
const CURRENT_PATTERN = /^([+]?(?:\d*\.?\d+))(m?)$/;

function normalizeResistanceInput(raw: string): string {
  return raw.replace(/\s+/g, '');
}

function formatWithSigFigs(value: number, sigFigs: number, trimTrailingZeros: boolean): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  if (value === 0) {
    return '0';
  }

  const abs = Math.abs(value);
  const magnitude = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, Math.min(6, sigFigs - magnitude - 1));
  let text = value.toFixed(decimals);

  if (trimTrailingZeros && text.includes('.')) {
    text = text.replace(/(\.\d*?[1-9])0+$/, '$1');
    text = text.replace(/\.0+$/, '');
  }

  if (text === '-0') {
    return '0';
  }

  return text;
}

export function parseVolts(input: string): number | Error {
  const normalized = input.trim();
  if (!normalized) {
    return new Error('Please enter a value.');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return new Error('Please enter a valid voltage.');
  }

  return value;
}

export function parseOhms(input: string): number | Error {
  const normalized = normalizeResistanceInput(input);
  if (!normalized) {
    return new Error('Please enter a value.');
  }

  const match = normalized.match(OHM_PATTERN);
  if (!match) {
    return new Error('Please enter a valid resistance (allow `k` or `M`).');
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return new Error('Please enter a valid resistance (allow `k` or `M`).');
  }

  if (value <= 0) {
    return new Error('Resistance must be greater than zero.');
  }

  const suffix = match[2];
  const multiplier = suffix ? OHM_SUFFIXES[suffix] : 1;
  return value * multiplier;
}

export function parseCurrent(input: string): number | Error {
  const normalized = input.trim();
  if (!normalized) {
    return new Error('Please enter a value.');
  }

  const match = normalized.match(CURRENT_PATTERN);
  if (!match) {
    return new Error('Please enter a valid current (allow optional `m`).');
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return new Error('Please enter a valid current (allow optional `m`).');
  }

  if (value <= 0) {
    return new Error('Current must be greater than zero.');
  }

  const suffix = match[2];
  const multiplier = suffix === 'm' ? 0.001 : 1;
  return value * multiplier;
}

export function formatVolts(volts: number): string {
  if (!Number.isFinite(volts)) {
    return '—';
  }

  const text = volts === 0 ? '0' : formatWithSigFigs(volts, 3, false);
  return `${text} V`;
}

export function formatOhms(ohms: number): string {
  if (!Number.isFinite(ohms)) {
    return '—';
  }

  let suffix = 'Ω';
  let scaled = ohms;
  const abs = Math.abs(ohms);

  if (abs >= 1_000_000) {
    scaled = ohms / 1_000_000;
    suffix = 'MΩ';
  } else if (abs >= 1_000) {
    scaled = ohms / 1_000;
    suffix = 'kΩ';
  }

  const trim = suffix !== 'MΩ';
  const text = scaled === 0 ? '0' : formatWithSigFigs(scaled, 3, trim);
  return `${text}${suffix}`;
}

export function formatMilliAmps(currentAmps: number): string {
  if (!Number.isFinite(currentAmps)) {
    return '—';
  }

  const milliAmps = currentAmps * 1_000;
  const text = milliAmps === 0 ? '0' : formatWithSigFigs(milliAmps, 3, false);
  return `${text} mA`;
}
