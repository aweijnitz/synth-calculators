import { formatOhms } from './parse';

export type OpAmpMode = 'inverting' | 'non-inverting';

export function inputImpedance(mode: OpAmpMode, rin?: number): string {
  if (mode === 'non-inverting') {
    return '≈ ∞ (TL072 high input impedance at DC)';
  }

  if (rin === undefined) {
    return '—';
  }

  return formatOhms(rin);
}
