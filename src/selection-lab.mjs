import { DEFAULT_BKT, expectedInformationGain, initialMastery, selectNextItem, updateMastery } from './knowledge.mjs';
import { validateDeck } from './deck.mjs';

/** A rehearsal is deliberately separate from the learner's answers and archives. */
export const SELECTION_EXPERIMENT_FORMAT = 'recallweave-selection-experiment/1';
const selectionExperiments = new WeakSet();

function checkedStarting(deck, supplied) {
  if (supplied === undefined) return Object.freeze(initialMastery(deck.concepts, DEFAULT_BKT));
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) {
    throw new TypeError('Starting probabilities must name every course concept.');
  }
  const names = Object.keys(supplied);
  if (names.length !== deck.concepts.length || names.some(name => !deck.concepts.includes(name))) {
    throw new RangeError('Starting probabilities must name exactly the course concepts.');
  }
  return Object.freeze(Object.fromEntries(deck.concepts.map(concept => {
    const value = supplied[concept];
    if (!Object.hasOwn(supplied, concept) || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError('Each starting probability must be a finite number from 0 to 1.');
    }
    return [concept, value];
  })));
}

function requireExperiment(experiment) {
  if (!selectionExperiments.has(experiment)) {
    throw new TypeError('Use a current selection experiment created by this lab.');
  }
}

/** Replay only explicit synthetic evidence through the original model. */
function replaySelection(deck, starting, responses) {
  let mastery = starting;
  const asked = new Set();
  const steps = [];
  for (const [index, syntheticCorrect] of responses.entries()) {
    if (typeof syntheticCorrect !== 'boolean') throw new TypeError('Synthetic evidence must be correct or incorrect.');
    const selected = selectNextItem(deck.items, asked, mastery, DEFAULT_BKT);
    if (!selected) throw new RangeError('Every question has already been used in this experiment.');
    const prior = mastery[selected.concept];
    const after = updateMastery(prior, syntheticCorrect, DEFAULT_BKT);
    mastery = Object.freeze({ ...mastery, [selected.concept]: after });
    asked.add(selected.id);
    const next = selectNextItem(deck.items, asked, mastery, DEFAULT_BKT);
    steps.push(Object.freeze({
      number: index + 1, questionId: selected.id, concept: selected.concept,
      syntheticCorrect, prior, after, nextQuestionId: next?.id ?? null
    }));
  }
  const experiment = Object.freeze({
    deck, starting, mastery, asked: Object.freeze([...asked]),
    syntheticResponses: Object.freeze([...responses]), steps: Object.freeze(steps)
  });
  selectionExperiments.add(experiment);
  return experiment;
}

/** All concept values are hypothetical; published model parameters remain fixed. */
export function createExperiment(sourceDeck, starting) {
  const deck = validateDeck(sourceDeck);
  return replaySelection(deck, checkedStarting(deck, starting), []);
}

export function takeSyntheticStep(experiment, syntheticCorrect) {
  requireExperiment(experiment);
  if (typeof syntheticCorrect !== 'boolean') throw new TypeError('Choose correct or incorrect synthetic evidence.');
  return replaySelection(experiment.deck, experiment.starting, [...experiment.syntheticResponses, syntheticCorrect]);
}

export function rewindExperiment(experiment) {
  requireExperiment(experiment);
  return replaySelection(experiment.deck, experiment.starting, experiment.syntheticResponses.slice(0, -1));
}

export function restartExperiment(experiment) {
  requireExperiment(experiment);
  return replaySelection(experiment.deck, experiment.starting, []);
}

/**
 * The native selector is authoritative. Explanatory rows stay in original deck
 * order; their local score check detects drift instead of replacing selection.
 */
export function inspectExperiment(experiment) {
  requireExperiment(experiment);
  const { deck, mastery } = experiment;
  const asked = new Set(experiment.asked);
  const remaining = deck.items.filter(item => !asked.has(item.id));
  const selected = selectNextItem(deck.items, asked, mastery, DEFAULT_BKT);
  const candidates = remaining.map(item => {
    const prior = mastery[item.concept];
    const downstreamCount = remaining.filter(next => next.id !== item.id && next.prerequisites.includes(item.concept)).length;
    const informationGainBits = expectedInformationGain(prior, DEFAULT_BKT);
    const prerequisiteRepair = (1 - prior) * Math.min(3, downstreamCount) * 0.12;
    return Object.freeze({
      id: item.id, concept: item.concept, prior, informationGainBits,
      downstreamCount, prerequisiteRepair,
      totalScore: informationGainBits + prerequisiteRepair,
      selected: item.id === selected?.id
    });
  });
  const explanatoryWinner = [...candidates].sort((a, b) =>
    b.totalScore - a.totalScore || a.id.localeCompare(b.id))[0];
  if ((explanatoryWinner?.id ?? null) !== (selected?.id ?? null) ||
      candidates.some(row => !Number.isFinite(row.totalScore))) {
    throw new Error('The explanation no longer matches native selection. Check the model source before continuing.');
  }
  const branches = selected ? [true, false].map(syntheticCorrect => {
    const prior = mastery[selected.concept];
    const after = updateMastery(prior, syntheticCorrect, DEFAULT_BKT);
    const branchMastery = { ...mastery, [selected.concept]: after };
    const next = selectNextItem(deck.items, new Set([...asked, selected.id]), branchMastery, DEFAULT_BKT);
    return Object.freeze({ syntheticCorrect, prior, after, nextQuestionId: next?.id ?? null });
  }) : [];
  return Object.freeze({
    mastery, asked: experiment.asked, selectedQuestionId: selected?.id ?? null,
    remaining: remaining.length, candidates: Object.freeze(candidates), branches: Object.freeze(branches)
  });
}

/** Inspect-only JSON: this format is intentionally not a learner trace or resume file. */
export function serializeExperiment(experiment) {
  requireExperiment(experiment);
  return JSON.stringify({
    format: SELECTION_EXPERIMENT_FORMAT,
    kind: 'synthetic',
    purpose: 'Hypothetical question-selection rehearsal; not learner answers or evidence of learning.',
    deck: experiment.deck,
    model: { source: 'src/knowledge.mjs', parameters: DEFAULT_BKT },
    starting: experiment.starting,
    syntheticResponses: experiment.syntheticResponses,
    steps: experiment.steps,
    current: inspectExperiment(experiment)
  }, null, 2) + '\n';
}
