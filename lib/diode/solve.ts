export type DiodeField = 'vs' | 'vf' | 'ifA' | 'r';

export type Inputs = {
  vs?: number;
  vf?: number;
  ifA?: number;
  r?: number;
  lastChanged?: DiodeField;
};

export type Result = {
  vs?: number;
  vf?: number;
  ifA?: number;
  r?: number;
};

const FIELDS: readonly DiodeField[] = ['vs', 'vf', 'ifA', 'r'];

function requireFinite(value: number | undefined, label: string): Error | null {
  if (value === undefined || !Number.isFinite(value)) {
    return new Error(`${label} is required to compute the missing value.`);
  }
  return null;
}

function ensurePositive(value: number, label: string): Error | null {
  if (value <= 0) {
    return new Error(`${label} must be greater than zero.`);
  }
  return null;
}

const HEADROOM_ERROR = 'Supply must exceed forward drop to drive current through the resistor.';
const EMPTY_FIELD_ERROR = 'Leave exactly one field empty to calculate it.';

export function solveDiodeSeries(inputs: Inputs): Result | Error {
  const missing = FIELDS.filter((field) => inputs[field] === undefined);

  let target: DiodeField | undefined;
  if (missing.length === 1) {
    target = missing[0];
  } else if (missing.length === 0) {
    const preferred = inputs.lastChanged && FIELDS.includes(inputs.lastChanged) ? inputs.lastChanged : 'vs';
    target = preferred;
  } else {
    return new Error(EMPTY_FIELD_ERROR);
  }

  if (!target) {
    return new Error('Unable to determine which field to compute.');
  }

  const values: Partial<Record<DiodeField, number>> = {};
  FIELDS.forEach((field) => {
    const value = inputs[field];
    if (typeof value === 'number' && Number.isFinite(value)) {
      values[field] = value;
    }
  });

  const result: Result = {};

  switch (target) {
    case 'r': {
      const requirementError = requireFinite(values.vs, 'Vs') || requireFinite(values.vf, 'Vf') || requireFinite(values.ifA, 'If');
      if (requirementError) {
        return requirementError;
      }
      const vs = values.vs!;
      const vf = values.vf!;
      const current = values.ifA!;
      const currentGuard = ensurePositive(current, 'Current');
      if (currentGuard) {
        return currentGuard;
      }
      if (vs <= vf) {
        return new Error(HEADROOM_ERROR);
      }
      const computed = (vs - vf) / current;
      if (!Number.isFinite(computed)) {
        return new Error('Unable to compute the resistor with the provided values.');
      }
      const rounded = Math.round(computed);
      if (rounded <= 0) {
        return new Error('Computed resistor must be greater than zero.');
      }
      result.r = rounded;
      result.vs = vs;
      result.vf = vf;
      result.ifA = current;
      break;
    }
    case 'ifA': {
      const requirementError =
        requireFinite(values.vs, 'Vs') || requireFinite(values.vf, 'Vf') || requireFinite(values.r, 'R');
      if (requirementError) {
        return requirementError;
      }
      const vs = values.vs!;
      const vf = values.vf!;
      const resistor = values.r!;
      const resistorGuard = ensurePositive(resistor, 'Resistor');
      if (resistorGuard) {
        return resistorGuard;
      }
      if (vs <= vf) {
        return new Error(HEADROOM_ERROR);
      }
      const computed = (vs - vf) / resistor;
      if (!Number.isFinite(computed)) {
        return new Error('Unable to compute the current with the provided values.');
      }
      if (computed <= 0) {
        return new Error('Computed current must be greater than zero.');
      }
      result.ifA = computed;
      result.vs = vs;
      result.vf = vf;
      result.r = resistor;
      break;
    }
    case 'vs': {
      const requirementError =
        requireFinite(values.vf, 'Vf') || requireFinite(values.ifA, 'If') || requireFinite(values.r, 'R');
      if (requirementError) {
        return requirementError;
      }
      const vf = values.vf!;
      const current = values.ifA!;
      const resistor = values.r!;
      const currentGuard = ensurePositive(current, 'Current');
      if (currentGuard) {
        return currentGuard;
      }
      const resistorGuard = ensurePositive(resistor, 'Resistor');
      if (resistorGuard) {
        return resistorGuard;
      }
      const computed = vf + current * resistor;
      if (!Number.isFinite(computed)) {
        return new Error('Unable to compute the supply voltage with the provided values.');
      }
      result.vs = computed;
      result.vf = vf;
      result.ifA = current;
      result.r = resistor;
      break;
    }
    case 'vf': {
      const requirementError =
        requireFinite(values.vs, 'Vs') || requireFinite(values.ifA, 'If') || requireFinite(values.r, 'R');
      if (requirementError) {
        return requirementError;
      }
      const vs = values.vs!;
      const current = values.ifA!;
      const resistor = values.r!;
      const currentGuard = ensurePositive(current, 'Current');
      if (currentGuard) {
        return currentGuard;
      }
      const resistorGuard = ensurePositive(resistor, 'Resistor');
      if (resistorGuard) {
        return resistorGuard;
      }
      const computed = vs - current * resistor;
      if (!Number.isFinite(computed)) {
        return new Error('Unable to compute the forward voltage with the provided values.');
      }
      result.vf = computed;
      result.vs = vs;
      result.ifA = current;
      result.r = resistor;
      break;
    }
    default:
      return new Error('Unable to determine which field to compute.');
  }

  return result;
}
