export type VoltageDividerField = 'vh' | 'vl' | 'r1' | 'r2' | 'vo';

export type VoltageDividerInputs = {
  vh?: number;
  vl?: number;
  r1?: number;
  r2?: number;
  vo?: number;
  lastChanged?: VoltageDividerField;
};

export type VoltageDividerResult = Partial<Record<VoltageDividerField, number>>;

const FIELDS: readonly VoltageDividerField[] = ['vh', 'vl', 'r1', 'r2', 'vo'];
const TOLERANCE = 1e-9;

function ensurePositive(value: number | undefined, name: string): Error | null {
  if (value === undefined || !Number.isFinite(value)) {
    return new Error(`${name} is required to compute the missing value.`);
  }
  if (value <= 0) {
    return new Error(`${name} must be greater than zero.`);
  }
  return null;
}

export function solveVoltageDivider(inputs: VoltageDividerInputs): VoltageDividerResult | Error {
  const definedFields = FIELDS.filter((field) => typeof inputs[field] === 'number' && Number.isFinite(inputs[field]!));
  let missingFields = FIELDS.filter((field) => inputs[field] === undefined);

  if (missingFields.length === 0) {
    const preferred = inputs.lastChanged && FIELDS.includes(inputs.lastChanged) ? inputs.lastChanged : 'vo';
    missingFields = [preferred];
  }

  if (missingFields.length !== 1) {
    return new Error('Please leave exactly one field empty so I can compute it.');
  }

  const target = missingFields[0];

  const values: Partial<Record<VoltageDividerField, number>> = {};
  definedFields.forEach((field) => {
    const value = inputs[field];
    if (typeof value === 'number' && Number.isFinite(value)) {
      values[field] = value;
    }
  });

  const requireFields = (required: VoltageDividerField[]): Error | null => {
    for (const field of required) {
      const value = values[field];
      if (value === undefined || !Number.isFinite(value)) {
        return new Error(`${field.toUpperCase()} is required to compute the missing value.`);
      }
    }
    return null;
  };

  const result: VoltageDividerResult = {};

  switch (target) {
    case 'vo': {
      const requirementError = requireFields(['vh', 'vl', 'r1', 'r2']);
      if (requirementError) {
        return requirementError;
      }
      const r1 = values.r1!;
      const r2 = values.r2!;
      const guardR1 = ensurePositive(r1, 'R1');
      if (guardR1) {
        return guardR1;
      }
      const guardR2 = ensurePositive(r2, 'R2');
      if (guardR2) {
        return guardR2;
      }
      const total = r1 + r2;
      if (total <= 0) {
        return new Error('R1 + R2 must be greater than zero.');
      }
      const delta = values.vh! - values.vl!;
      result.vo = values.vl! + (delta * r2) / total;
      break;
    }
    case 'r2': {
      const requirementError = requireFields(['vh', 'vl', 'r1', 'vo']);
      if (requirementError) {
        return requirementError;
      }
      const r1 = values.r1!;
      const guardR1 = ensurePositive(r1, 'R1');
      if (guardR1) {
        return guardR1;
      }
      const delta = values.vh! - values.vl!;
      const voPrime = values.vo! - values.vl!;
      if (Math.abs(delta - voPrime) < TOLERANCE) {
        return new Error('Unable to compute R2 because Δ equals V_o\'.');
      }
      const computed = (voPrime * r1) / (delta - voPrime);
      if (!Number.isFinite(computed)) {
        return new Error('Unable to compute R2 with the provided values.');
      }
      const rounded = Math.round(computed);
      if (rounded <= 0) {
        return new Error('Computed R2 must be greater than zero.');
      }
      result.r2 = rounded;
      break;
    }
    case 'r1': {
      const requirementError = requireFields(['vh', 'vl', 'r2', 'vo']);
      if (requirementError) {
        return requirementError;
      }
      const guardR2 = ensurePositive(values.r2!, 'R2');
      if (guardR2) {
        return guardR2;
      }
      const voPrime = values.vo! - values.vl!;
      if (Math.abs(voPrime) < TOLERANCE) {
        return new Error('Unable to compute R1 because V_o\' equals zero.');
      }
      const delta = values.vh! - values.vl!;
      const computed = ((delta - voPrime) / voPrime) * values.r2!;
      if (!Number.isFinite(computed)) {
        return new Error('Unable to compute R1 with the provided values.');
      }
      const rounded = Math.round(computed);
      if (rounded <= 0) {
        return new Error('Computed R1 must be greater than zero.');
      }
      result.r1 = rounded;
      break;
    }
    case 'vh': {
      const requirementError = requireFields(['vl', 'r1', 'r2', 'vo']);
      if (requirementError) {
        return requirementError;
      }
      const guardR1 = ensurePositive(values.r1!, 'R1');
      if (guardR1) {
        return guardR1;
      }
      const guardR2 = ensurePositive(values.r2!, 'R2');
      if (guardR2) {
        return guardR2;
      }
      const total = values.r1! + values.r2!;
      if (total <= 0) {
        return new Error('R1 + R2 must be greater than zero.');
      }
      const k = values.r2! / total;
      if (Math.abs(k) < TOLERANCE) {
        return new Error('Unable to compute Vh because R2 is zero.');
      }
      result.vh = (values.vo! - (1 - k) * values.vl!) / k;
      break;
    }
    case 'vl': {
      const requirementError = requireFields(['vh', 'r1', 'r2', 'vo']);
      if (requirementError) {
        return requirementError;
      }
      const guardR1 = ensurePositive(values.r1!, 'R1');
      if (guardR1) {
        return guardR1;
      }
      const guardR2 = ensurePositive(values.r2!, 'R2');
      if (guardR2) {
        return guardR2;
      }
      const total = values.r1! + values.r2!;
      if (total <= 0) {
        return new Error('R1 + R2 must be greater than zero.');
      }
      const k = values.r2! / total;
      if (Math.abs(1 - k) < TOLERANCE) {
        return new Error('Unable to compute Vl because R1 is zero.');
      }
      result.vl = (values.vo! - k * values.vh!) / (1 - k);
      break;
    }
    default:
      return new Error('Unable to determine which field to compute.');
  }

  return result;
}
