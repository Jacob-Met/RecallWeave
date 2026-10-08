/** An ideal, uniform, one-second cosine sampling model for an offline lesson. */
export const SAMPLING_FORMAT = 'recallweave-sampling/1';
export const DURATION_SECONDS = 1;

export function validateSampling({ frequencyHz, sampleRateHz } = {}) {
  if (!Number.isFinite(frequencyHz) || frequencyHz < 0 || frequencyHz > 40 || !Number.isInteger(frequencyHz * 2)) {
    throw new RangeError('Choose a signal frequency from 0 to 40 Hz in steps of 0.5 Hz.');
  }
  if (!Number.isInteger(sampleRateHz) || sampleRateHz < 2 || sampleRateHz > 32) {
    throw new RangeError('Choose a whole-number sample rate from 2 to 32 samples per second.');
  }
  return Object.freeze({ frequencyHz, sampleRateHz });
}

/** Lowest nonnegative zero-phase cosine representative at this uniform rate. */
export function principalAlias(frequencyHz, sampleRateHz) {
  validateSampling({ frequencyHz, sampleRateHz });
  const remainder = frequencyHz % sampleRateHz;
  return Math.min(remainder, sampleRateHz - remainder);
}

export function cosineAt(frequencyHz, timeSeconds) {
  return Math.cos(2 * Math.PI * frequencyHz * timeSeconds);
}

/** The same immutable snapshot supplies the graph, table and exported numbers. */
export function analyzeSampling(parameters) {
  const { frequencyHz, sampleRateHz } = validateSampling(parameters);
  const aliasHz = principalAlias(frequencyHz, sampleRateHz);
  // Keep a genuinely different curve visible even when the reference is already
  // in baseband. This higher alias is not evidence of the unknown original.
  const comparisonHz = aliasHz === frequencyHz ? frequencyHz + sampleRateHz : aliasHz;
  const samples = Array.from({ length: sampleRateHz + 1 }, (_, index) => {
    const timeSeconds = index / sampleRateHz;
    return Object.freeze({ index, timeSeconds,
      reference: cosineAt(frequencyHz, timeSeconds),
      comparison: cosineAt(comparisonHz, timeSeconds) });
  });
  return Object.freeze({
    format: SAMPLING_FORMAT, frequencyHz, sampleRateHz, aliasHz, comparisonHz,
    durationSeconds: DURATION_SECONDS, intervalSeconds: 1 / sampleRateHz,
    halfSampleRateHz: sampleRateHz / 2,
    relation: frequencyHz < sampleRateHz / 2 ? 'below' : frequencyHz === sampleRateHz / 2 ? 'at' : 'above',
    samples: Object.freeze(samples),
  });
}

/** CSV is numeric only; full-precision values come from a freshly checked snapshot. */
export function samplingCsv(snapshot) {
  const checked = analyzeSampling(snapshot);
  const header = 'sample_index,time_seconds,reference_hz,sample_rate_hz,comparison_hz,lowest_alias_hz,reference_value,comparison_value';
  const rows = checked.samples.map(sample => [sample.index, sample.timeSeconds, checked.frequencyHz,
    checked.sampleRateHz, checked.comparisonHz, checked.aliasHz, sample.reference, sample.comparison].join(','));
  return header + '\n' + rows.join('\n') + '\n';
}
