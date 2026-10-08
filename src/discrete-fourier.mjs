/** Direct DFT for a small, real, finite sample grid. No continuous-signal inference. */
export const FOURIER_FORMAT = 'recallweave-discrete-fourier/1';
const FOURIER_LENGTHS = new Set([4, 8, 16]);
const FOURIER_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function copyFourierSamples(samples) {
  if (!Array.isArray(samples) || !FOURIER_LENGTHS.has(samples.length)) {
    throw new Error('Enter exactly 4, 8 or 16 real samples.');
  }
  return Array.from(samples, value => {
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1000) {
      throw new Error('Each sample must be a finite number between -1000 and 1000.');
    }
    return value;
  });
}

/** Decimal/scientific notation only; commas or whitespace separate samples. */
export function parseFourierSamples(text) {
  if (typeof text !== 'string' || text.length > 4096) {
    throw new Error('Sample text must contain at most 4096 characters.');
  }
  const trimmed = text.trim();
  if (!trimmed || /^,|,$|,\s*,/.test(trimmed)) {
    throw new Error('Use a number between each comma, or separate numbers with spaces.');
  }
  const tokens = trimmed.split(/[,\s]+/u);
  if (tokens.some(token => !FOURIER_NUMBER.test(token))) {
    throw new Error('Use decimal numbers or scientific notation, not expressions.');
  }
  return copyFourierSamples(tokens.map(Number));
}

function fourierSum(values) {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    correction += Math.abs(sum) >= Math.abs(value)
      ? (sum - next) + value : (value - next) + sum;
    sum = next;
  }
  return sum + correction;
}

function copyFourierPairs(selectedPairs, N) {
  if (selectedPairs === null) return Array.from({ length: N / 2 + 1 }, (_, pair) => pair);
  if (!Array.isArray(selectedPairs)) throw new Error('Selected pairs must be an array or null.');
  const pairs = Array.from(selectedPairs);
  if (pairs.some(pair => !Number.isInteger(pair) || pair < 0 || pair > N / 2)) {
    throw new Error('Select integer pair indices from 0 through N/2.');
  }
  if (new Set(pairs).size !== pairs.length) throw new Error('Select each frequency pair only once.');
  return pairs.sort((a, b) => a - b);
}

/**
 * Forward: unscaled negative-exponential DFT.
 * Inverse: positive-exponential sum divided by N.
 * Interior selection p includes both p and N-p; DC and Nyquist are singletons.
 */
export function analyzeFourier(samples, { selectedPairs = null } = {}) {
  const input = copyFourierSamples(samples);
  const N = input.length;
  const pairs = copyFourierPairs(selectedPairs, N);
  const chosen = new Set(pairs);
  const phaseResolution = Math.max(
    64 * Number.EPSILON * N * fourierSum(input.map(Math.abs)),
    64 * N * Number.MIN_VALUE
  );
  const bins = Array.from({ length: N }, (_, k) => {
    const real = fourierSum(input.map((x, n) => x * Math.cos(2 * Math.PI * k * n / N)));
    const imaginary = fourierSum(input.map((x, n) => -x * Math.sin(2 * Math.PI * k * n / N)));
    const magnitude = Math.hypot(real, imaginary);
    const phaseResolved = magnitude > phaseResolution;
    return Object.freeze({
      k, real, imaginary, magnitude,
      phaseRadians: phaseResolved ? Math.atan2(imaginary, real) : null,
      phaseResolved, pair: Math.min(k, N - k)
    });
  });
  const selectedBins = bins.filter(bin => chosen.has(bin.pair));
  const reconstruction = Array.from({ length: N }, (_, n) => {
    const real = fourierSum(selectedBins.map(bin => {
      const angle = 2 * Math.PI * bin.k * n / N;
      return bin.real * Math.cos(angle) - bin.imaginary * Math.sin(angle);
    })) / N;
    const imaginary = fourierSum(selectedBins.map(bin => {
      const angle = 2 * Math.PI * bin.k * n / N;
      return bin.real * Math.sin(angle) + bin.imaginary * Math.cos(angle);
    })) / N;
    return Object.freeze({ n, real, imaginary, error: real - input[n] });
  });
  return Object.freeze({
    format: FOURIER_FORMAT,
    samples: Object.freeze(input), N, selectedPairs: Object.freeze(pairs),
    bins: Object.freeze(bins), reconstruction: Object.freeze(reconstruction),
    inputEnergy: fourierSum(input.map(x => x * x)),
    coefficientEnergy: fourierSum(bins.map(bin => bin.magnitude * bin.magnitude)) / N,
    reconstructionEnergy: fourierSum(reconstruction.map(point => point.real * point.real + point.imaginary * point.imaginary)),
    maxResidual: Math.max(...reconstruction.map(point => Math.abs(point.error))),
    rmsResidual: Math.sqrt(fourierSum(reconstruction.map(point => point.error * point.error)) / N),
    maxImaginaryResidual: Math.max(...reconstruction.map(point => Math.abs(point.imaginary))),
    phaseResolution
  });
}

/** Recompute derived fields from admitted inputs; never export supplied stale calculations. */
export function serializeFourierRecord(record) {
  if (!record || record.format !== FOURIER_FORMAT) throw new Error('Choose a discrete Fourier analysis record.');
  return JSON.stringify(analyzeFourier(record.samples, { selectedPairs: record.selectedPairs }), null, 2) + '\n';
}
