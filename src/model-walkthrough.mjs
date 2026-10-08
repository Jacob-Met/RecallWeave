import { DEFAULT_BKT, updateMastery } from './knowledge.mjs';

export const MAX_WALKTHROUGH_RESPONSES = 24;
const parameterNames = ['initial', 'guess', 'slip', 'learn'];

/** Copy a complete set of explicit probabilities; never coerce text or change defaults. */
export function walkthroughParameters(input = DEFAULT_BKT) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Supply initial, guess, slip, and learn probabilities.');
  }
  if (Object.keys(input).some(key => !parameterNames.includes(key))) {
    throw new TypeError('Only initial, guess, slip, and learn are supported.');
  }
  const result = {};
  for (const key of parameterNames) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`${key} must be a finite number from 0 to 1.`);
    }
    result[key] = value;
  }
  return Object.freeze(result);
}

/**
 * Explain one finite update using the shipped model's operation order.
 * The displayed next value is the actual updateMastery return, not a second model.
 * A zero likelihood has no conditional estimate; refuse it before a 0/0 result.
 */
export function explainMasteryUpdate(priorInput, correct, input = DEFAULT_BKT) {
  const parameters = walkthroughParameters(input);
  if (typeof priorInput !== 'number' || !Number.isFinite(priorInput)) {
    throw new RangeError('The prior must be a finite number.');
  }
  if (typeof correct !== 'boolean') throw new TypeError('A response must be correct or incorrect.');
  const prior = Math.min(1, Math.max(0, priorInput));
  const knownLikelihood = correct ? 1 - parameters.slip : parameters.slip;
  const unknownLikelihood = correct ? parameters.guess : 1 - parameters.guess;
  const knownContribution = prior * knownLikelihood;
  const unknownContribution = (1 - prior) * unknownLikelihood;
  const responseLikelihood = knownContribution + unknownContribution;
  if (responseLikelihood === 0) {
    throw new RangeError(`This ${correct ? 'correct' : 'incorrect'} response has zero probability under these assumptions at JavaScript precision. There is no conditional estimate; change the assumptions or the response.`);
  }
  const posterior = knownContribution / responseLikelihood;
  const learningContribution = (1 - posterior) * parameters.learn;
  const beforeFinalClipping = posterior + learningContribution;
  const next = updateMastery(priorInput, correct, parameters);
  if (!Number.isFinite(next)) throw new RangeError('The model did not return a finite estimate.');
  return Object.freeze({
    correct, priorInput, prior, priorClipped: prior !== priorInput,
    knownLikelihood, unknownLikelihood, knownContribution, unknownContribution,
    responseLikelihood, posterior, evidenceChange: posterior - prior,
    learningContribution, beforeFinalClipping, clippingChange: next - beforeFinalClipping,
    next, totalChange: next - prior
  });
}

/** Build a new immutable trace atomically; no input array or parameter object is changed. */
export function createWalkthrough(responses = [], input = DEFAULT_BKT) {
  const parameters = walkthroughParameters(input);
  if (!Array.isArray(responses) || responses.length > MAX_WALKTHROUGH_RESPONSES) {
    throw new RangeError(`Use an array of at most ${MAX_WALKTHROUGH_RESPONSES} hypothetical responses.`);
  }
  const steps = [];
  let prior = parameters.initial;
  for (let index = 0; index < responses.length; index++) {
    // An indexed loop also refuses sparse arrays rather than silently skipping holes.
    try {
      const step = explainMasteryUpdate(prior, responses[index], parameters);
      steps.push(step);
      prior = step.next;
    } catch (error) {
      throw new RangeError(`Response ${index + 1}: ${error.message}`);
    }
  }
  return Object.freeze({
    parameters, responses: Object.freeze([...responses]),
    steps: Object.freeze(steps), finalMastery: prior
  });
}

/** Readable, full JavaScript precision export of the applied hypothetical trace. */
export function walkthroughText(trace) {
  const verified = createWalkthrough(trace.responses, trace.parameters);
  const lines = [
    'RecallWeave — model walkthrough',
    'Hypothetical responses for one concept. No learner session was read or changed.',
    'Model state, not a grade or a calibrated guarantee of knowledge.',
    'The defaults are illustrative. Arithmetic below uses full JavaScript number precision.',
    '',
    'Applied assumptions',
    ...parameterNames.map(key => `${key}: ${verified.parameters[key]}`),
    ''
  ];
  if (!verified.steps.length) lines.push('No responses. The estimate is the initial assumption.');
  verified.steps.forEach((step, index) => {
    lines.push(
      `Response ${index + 1}: ${step.correct ? 'correct' : 'incorrect'}`,
      `  prior: ${step.prior}`,
      `  known contribution: ${step.prior} × ${step.knownLikelihood} = ${step.knownContribution}`,
      `  not-yet-known contribution: ${1 - step.prior} × ${step.unknownLikelihood} = ${step.unknownContribution}`,
      `  response likelihood: ${step.responseLikelihood}`,
      `  posterior: ${step.knownContribution} / ${step.responseLikelihood} = ${step.posterior}`,
      `  evidence change: ${step.evidenceChange}`,
      `  learning contribution: ${1 - step.posterior} × ${verified.parameters.learn} = ${step.learningContribution}`,
      `  before final clipping: ${step.beforeFinalClipping}`,
      `  clipping change: ${step.clippingChange}`,
      `  updateMastery return: ${step.next}`,
      ''
    );
  });
  lines.push(`Final model estimate: ${verified.finalMastery}`, '', 'All values refer only to this hypothetical sequence.');
  return lines.join('\n') + '\n';
}
