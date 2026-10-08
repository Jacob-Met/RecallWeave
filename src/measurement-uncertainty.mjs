/**
 * Educational two-component model for repeated measurements.
 * The readings estimate repeatability. One additive correction, with a rectangular
 * uncertainty distribution, is shared by every reading. The two components are
 * assumed independent; a sample-size projection is not additional observed data.
 * References and limits: courses/measurement-uncertainty.md.
 */
export const MEASUREMENT_LIMITS = Object.freeze({
  minReadings: 2,
  maxReadings: 100,
  minNonzeroMagnitude: 1e-12,
  maxMagnitude: 1e9,
  maxTextLength: 12000,
  maxProjectedReadings: 10000,
});

const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function checkedNumber(value, name, nonnegative = false) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  if (Math.abs(value) > MEASUREMENT_LIMITS.maxMagnitude ||
      (value !== 0 && Math.abs(value) < MEASUREMENT_LIMITS.minNonzeroMagnitude)) {
    throw new Error(`${name} must be zero or have magnitude from 1e-12 to 1e9.`);
  }
  if (nonnegative && value < 0) throw new Error(`${name} must be zero or positive.`);
  return value === 0 ? 0 : value;
}

export function parseMeasurementNumber(text, name = 'Value', nonnegative = false) {
  if (typeof text !== 'string' || !decimal.test(text.trim())) {
    throw new Error(`${name} must be one decimal number, for example 10.2 or 1.02e1.`);
  }
  const value = Number(text.trim());
  // A nonzero decimal too small for Number must not silently become an exact zero.
  if (value === 0 && /[1-9]/.test(text.trim().split(/[eE]/)[0])) {
    throw new Error(`${name} is too small; use zero or a magnitude of at least 1e-12.`);
  }
  return checkedNumber(value, name, nonnegative);
}

export function parseReadings(text) {
  if (typeof text !== 'string' || text.length > MEASUREMENT_LIMITS.maxTextLength) {
    throw new Error('Readings must be text of at most 12,000 characters.');
  }
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter at least two readings.');
  // Whitespace may separate readings, but an empty comma-separated field is a
  // missing observation. Never silently discard it and change the sample size.
  const parts = trimmed.split(',');
  if (parts.some(part => !part.trim())) {
    throw new Error('A reading is missing beside a comma. Enter it or remove that comma.');
  }
  const tokens = parts.flatMap(part => part.trim().split(/\s+/));
  if (tokens.length < MEASUREMENT_LIMITS.minReadings || tokens.length > MEASUREMENT_LIMITS.maxReadings) {
    throw new Error('Enter 2–100 readings of the same quantity.');
  }
  return Object.freeze(tokens.map((token, index) => parseMeasurementNumber(token, `Reading ${index + 1}`)));
}

function compensatedSum(values) {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    correction += Math.abs(sum) >= Math.abs(value)
      ? (sum - next) + value
      : (value - next) + sum;
    sum = next;
  }
  return sum + correction;
}

export function summarizeMeasurements({ readings, correction = 0, calibrationHalfWidth = 0 }) {
  if (!Array.isArray(readings) || readings.length < MEASUREMENT_LIMITS.minReadings ||
      readings.length > MEASUREMENT_LIMITS.maxReadings) {
    throw new Error('Supply 2–100 readings of the same quantity.');
  }
  const accepted = Object.freeze(Array.from(readings, (value, index) => checkedNumber(value, `Reading ${index + 1}`)));
  const appliedCorrection = checkedNumber(correction, 'Additive correction');
  const halfWidth = checkedNumber(calibrationHalfWidth, 'Calibration half-width', true);
  const n = accepted.length;
  // Center on a reading before summation, avoiding subtraction of nearly equal
  // raw second moments when the readings have a large common offset.
  const anchor = accepted[0];
  const deviations = accepted.map(value => value - anchor);
  const meanDeviation = compensatedSum(deviations) / n;
  // Use the compensated original sum for the estimate: adding a large anchor
  // back to its nearly cancelling mean deviation can lose a small true mean.
  const rawMean = compensatedSum(accepted) / n;
  const centered = deviations.map(value => value - meanDeviation);
  const scale = Math.max(...centered.map(Math.abs));
  const sampleSD = scale === 0 ? 0 : scale * Math.sqrt(
    compensatedSum(centered.map(value => (value / scale) ** 2)) / (n - 1));
  const meanUncertainty = sampleSD / Math.sqrt(n);
  const calibrationUncertainty = halfWidth / Math.sqrt(3);
  return Object.freeze({
    readings: accepted,
    n,
    rawMean,
    correction: appliedCorrection,
    correctedMean: rawMean + appliedCorrection,
    sampleSD,
    meanUncertainty,
    calibrationHalfWidth: halfWidth,
    calibrationUncertainty,
    combinedUncertainty: Math.hypot(meanUncertainty, calibrationUncertainty),
  });
}

/** Hold the estimated reading scatter and shared calibration information fixed. */
export function projectUncertainty({ sampleSD, calibrationHalfWidth, sampleSizes }) {
  if (typeof sampleSD !== 'number' || !Number.isFinite(sampleSD) || sampleSD < 0 ||
      sampleSD > 2 * MEASUREMENT_LIMITS.maxMagnitude) {
    throw new Error('Projected reading scatter must be finite and between 0 and 2e9.');
  }
  const halfWidth = checkedNumber(calibrationHalfWidth, 'Calibration half-width', true);
  if (!Array.isArray(sampleSizes) || sampleSizes.length < 1 || sampleSizes.length > 100 ||
      Array.from(sampleSizes).some(n => !Number.isInteger(n) || n < 2 || n > MEASUREMENT_LIMITS.maxProjectedReadings)) {
    throw new Error('Projected sample sizes must be integers from 2 to 10,000.');
  }
  const calibrationUncertainty = halfWidth / Math.sqrt(3);
  return Object.freeze(sampleSizes.map(n => {
    const meanUncertainty = sampleSD / Math.sqrt(n);
    return Object.freeze({
      n,
      meanUncertainty,
      calibrationUncertainty,
      combinedUncertainty: Math.hypot(meanUncertainty, calibrationUncertainty),
    });
  }));
}
