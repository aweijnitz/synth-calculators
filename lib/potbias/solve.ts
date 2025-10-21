export type Inputs = {
  vsHi: number;
  vsLo: number;
  vTop: number;
  vBot: number;
  rPot: number;
};

export type Result = {
  rTop: number;
  rBottom: number;
};

const MIN_RESISTANCE_OHMS = 0;
const MIN_DELTA_VOLTS = 1e-9;

export function solvePotBias(inputs: Inputs): Result | Error {
  const { vsHi, vsLo, vTop, vBot, rPot } = inputs;

  if (!Number.isFinite(vsHi) || !Number.isFinite(vsLo) || !Number.isFinite(vTop) || !Number.isFinite(vBot)) {
    return new Error('All voltages must be finite numbers.');
  }
  if (!Number.isFinite(rPot) || rPot <= MIN_RESISTANCE_OHMS) {
    return new Error('Potentiometer resistance must be greater than zero.');
  }
  if (vsHi <= vsLo) {
    return new Error('Top rail must be greater than bottom rail.');
  }
  if (vTop >= vsHi) {
    return new Error('Desired top voltage must be less than the top rail.');
  }
  if (vBot <= vsLo) {
    return new Error('Desired bottom voltage must be greater than the bottom rail.');
  }
  if (vTop <= vBot) {
    return new Error('Desired top voltage must be greater than desired bottom voltage.');
  }

  const delta = vTop - vBot;
  if (delta <= MIN_DELTA_VOLTS) {
    return new Error('Desired voltages are too close together to compute reliable bias resistors.');
  }

  const current = delta / rPot;
  if (!Number.isFinite(current) || current <= 0) {
    return new Error('Unable to compute potentiometer current.');
  }

  const rTop = Math.max(0, Math.round(((vsHi - vTop) / delta) * rPot));
  const rBottom = Math.max(0, Math.round(((vBot - vsLo) / delta) * rPot));

  if (rTop <= 0 || rBottom <= 0) {
    return new Error('Calculated resistances must be greater than zero.');
  }

  return { rTop, rBottom };
}
