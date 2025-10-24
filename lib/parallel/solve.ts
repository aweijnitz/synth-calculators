export function rParallel(r1: number, r2: number): number {
  if (!Number.isFinite(r1) || !Number.isFinite(r2)) {
    throw new Error('Both resistances must be finite numbers.');
  }
  if (r1 <= 0 || r2 <= 0) {
    throw new Error('Resistances must be greater than zero.');
  }

  const sum = r1 + r2;
  if (!Number.isFinite(sum) || sum === 0) {
    throw new Error('Resistances result in an invalid sum.');
  }

  const product = r1 * r2;
  let result = product / sum;

  if (!Number.isFinite(result) || result <= 0) {
    const reciprocalSum = 1 / r1 + 1 / r2;
    if (!Number.isFinite(reciprocalSum) || reciprocalSum <= Number.EPSILON) {
      throw new Error('Unable to compute a stable parallel resistance.');
    }
    result = 1 / reciprocalSum;
  }

  if (!Number.isFinite(result) || result <= 0) {
    throw new Error('Unable to compute a stable parallel resistance.');
  }

  return result;
}
