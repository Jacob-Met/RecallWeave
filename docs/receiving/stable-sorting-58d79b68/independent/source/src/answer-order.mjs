/** A session-local display order; each value remains the original answer-option index. */
export function orderOptions(count, random = Math.random) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Option count must be a nonnegative integer.');
  const order = Array.from({length: count}, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const value = random();
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('The option-order source must return a number from zero up to one.');
    }
    const target = Math.floor(value * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  return Object.freeze(order);
}
