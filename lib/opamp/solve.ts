export type SolveArgs = {
  rin?: number;
  rf?: number;
  gain?: number;
};

export type SolveResult = {
  rin?: number;
  rf?: number;
  gain: number;
};

function countProvided(args: SolveArgs): number {
  return ['rin', 'rf', 'gain'].reduce(
    (count, key) => (args[key as keyof SolveArgs] !== undefined ? count + 1 : count),
    0
  );
}

function validatePositive(value: number | undefined, label: string): Error | null {
  if (value === undefined) {
    return null;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return new Error(`${label} must be greater than zero.`);
  }
  return null;
}

function roundToNearestOhm(value: number): number {
  return Math.round(value);
}

export function solveInverting(args: SolveArgs): SolveResult | Error {
  const provided = countProvided(args);
  if (provided < 2) {
    return new Error('Please provide at least two values to solve the circuit.');
  }
  if (provided > 2) {
    return new Error('Please adjust one value at a time to avoid conflicts.');
  }

  const { rin, rf, gain } = args;

  const rinValidation = validatePositive(rin, 'Rin');
  if (rinValidation) return rinValidation;
  const rfValidation = validatePositive(rf, 'Rf');
  if (rfValidation) return rfValidation;

  if (rin !== undefined && rf !== undefined) {
    return { rin, rf, gain: -rf / rin };
  }

  if (rin !== undefined && gain !== undefined) {
    if (gain === 0) {
      return new Error('Gain must be non-zero for inverting amplifiers.');
    }
    const targetGain = gain < 0 ? gain : -Math.abs(gain);
    const computedRf = roundToNearestOhm(Math.abs(targetGain) * rin);
    if (computedRf <= 0) {
      return new Error('Computed feedback resistor is invalid.');
    }
    return { rin, rf: computedRf, gain: targetGain };
  }

  if (rf !== undefined && gain !== undefined) {
    if (gain === 0) {
      return new Error('Gain must be non-zero for inverting amplifiers.');
    }
    const gainMagnitude = Math.abs(gain);
    const computedRin = roundToNearestOhm(rf / gainMagnitude);
    if (computedRin <= 0) {
      return new Error('Computed input resistor is invalid.');
    }
    const signedGain = gain < 0 ? gain : -gainMagnitude;
    return { rin: computedRin, rf, gain: signedGain };
  }

  return new Error('Unable to solve with the provided values.');
}

export function solveNonInverting(args: SolveArgs): SolveResult | Error {
  const provided = countProvided(args);
  if (provided < 2) {
    return new Error('Please provide at least two values to solve the circuit.');
  }
  if (provided > 2) {
    return new Error('Please adjust one value at a time to avoid conflicts.');
  }

  const { rin, rf, gain } = args;

  const rinValidation = validatePositive(rin, 'Rin');
  if (rinValidation) return rinValidation;
  const rfValidation = validatePositive(rf, 'Rf');
  if (rfValidation) return rfValidation;

  if (rin !== undefined && rf !== undefined) {
    return { rin, rf, gain: 1 + rf / rin };
  }

  if (rin !== undefined && gain !== undefined) {
    if (gain <= 1) {
      return new Error('Gain must be greater than 1 to solve for Rf in non-inverting mode.');
    }
    const computedRf = roundToNearestOhm((gain - 1) * rin);
    if (computedRf <= 0) {
      return new Error('Computed feedback resistor is invalid.');
    }
    return { rin, rf: computedRf, gain };
  }

  if (rf !== undefined && gain !== undefined) {
    if (gain <= 1) {
      return new Error('Gain must be greater than 1 to solve for Rin in non-inverting mode.');
    }
    const computedRin = roundToNearestOhm(rf / (gain - 1));
    if (computedRin <= 0) {
      return new Error('Computed input resistor is invalid.');
    }
    return { rin: computedRin, rf, gain };
  }

  return new Error('Unable to solve with the provided values.');
}
