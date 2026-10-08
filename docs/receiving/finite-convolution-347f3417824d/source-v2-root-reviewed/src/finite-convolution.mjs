/** Finite linear convolution with zero extension and sample index zero at each list's start. */
export const MAX_CONVOLUTION_SAMPLES = 24;
export const MAX_CONVOLUTION_VALUE = 100;
const SCALE = 10000;
const PRODUCT_SCALE = SCALE * SCALE;

function samples(values, name) {
  if (!Array.isArray(values) || values.length < 1 || values.length > MAX_CONVOLUTION_SAMPLES) {
    throw new RangeError(name + ' needs 1–24 numbers.');
  }
  const ticks = Array.from(values, value => {
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_CONVOLUTION_VALUE) {
      throw new RangeError(name + ' values must be finite numbers from −100 to 100.');
    }
    const integer = Math.round(value * SCALE);
    if (integer / SCALE !== value) throw new RangeError(name + ' values may have at most four decimal places.');
    return integer === 0 ? 0 : integer;
  });
  return { ticks, values: ticks.map(value => value / SCALE) };
}

/** Admit decimal literals separated by whitespace or commas; empty comma fields are errors. */
export function parseConvolutionSequence(text, name = 'Sequence') {
  if (typeof text !== 'string' || text.length > 4096 || !text.trim()) {
    throw new RangeError(name + ' needs 1–24 numbers.');
  }
  const fields = text.trim().split(',');
  if (fields.some(field => !field.trim())) throw new RangeError(name + ' has an empty comma-separated value.');
  const tokens = fields.flatMap(field => field.trim().split(/\s+/));
  if (tokens.some(token => !/^[+-]?(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(token))) {
    throw new RangeError(name + ' accepts decimal numbers with at most four decimal places; use commas or spaces.');
  }
  return Object.freeze(samples(tokens.map(Number), name).values);
}

function fullOutput(x, h) {
  // The largest integer accumulation is 24 × 1,000,000², safely below 2^53.
  const numerators = Array(x.length + h.length - 1).fill(0);
  for (let k = 0; k < x.length; k++) {
    for (let j = 0; j < h.length; j++) numerators[k + j] += x[k] * h[j];
  }
  return Object.freeze(numerators.map(value => value / PRODUCT_SCALE));
}

/** Keep the full N+M−1 output, including any leading or trailing zero values. */
export function finiteConvolution(x, h) {
  return fullOutput(samples(x, 'Input x').ticks, samples(h, 'Kernel h').ticks);
}

function stepWithSamples(x, h, n) {
  const length = x.ticks.length + h.ticks.length - 1;
  if (!Number.isInteger(n) || n < 0 || n >= length) {
    throw new RangeError('Choose an output index from 0 to ' + (length - 1) + '.');
  }
  let numerator = 0;
  const terms = x.ticks.map((value, k) => {
    const kernelIndex = n - k;
    const inKernel = kernelIndex >= 0 && kernelIndex < h.ticks.length;
    const kernelTick = inKernel ? h.ticks[kernelIndex] : 0;
    const product = value === 0 || kernelTick === 0 ? 0 : value * kernelTick;
    numerator += product;
    return Object.freeze({
      k, input: x.values[k], kernelIndex, inKernel,
      kernel: kernelTick / SCALE, product: product / PRODUCT_SCALE
    });
  });
  return Object.freeze({ n, terms: Object.freeze(terms), value: numerator / PRODUCT_SCALE });
}

/** Inspect every input term x[k]h[n−k], including out-of-kernel zero contributions. */
export function convolutionStep(x, h, n) {
  return stepWithSamples(samples(x, 'Input x'), samples(h, 'Kernel h'), n);
}

/** A self-contained, immutable record of the displayed finite calculation. */
export function createConvolutionRecord(x, h) {
  const input = samples(x, 'Input x');
  const kernel = samples(h, 'Kernel h');
  const y = fullOutput(input.ticks, kernel.ticks);
  return Object.freeze({
    format: 'recallweave-finite-convolution/1',
    convention: 'y[n] = sum_k x[k] h[n-k]; each list begins at index 0 and is zero elsewhere; full linear output',
    x: Object.freeze(input.values), h: Object.freeze(kernel.values), y,
    steps: Object.freeze(y.map((_, n) => stepWithSamples(input, kernel, n)))
  });
}

/** Product sums have at most eight decimal places under this lab's admitted number domain. */
export function formatConvolutionValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError('Display needs a finite value.');
  const text = value.toFixed(8).replace(/\.?0+$/, '');
  return text === '' || text === '-0' ? '0' : text;
}
