/**
 * Transparent Bayesian Knowledge Tracing and adaptive item selection.
 * Parameters are pedagogical defaults, not fitted or validated estimates.
 * @typedef {{id:string, concept:string, prerequisites:string[], options:string[], answer:number, prompt:string, explanation:string, transfer:string}} Item
 * @typedef {{initial:number, learn:number, guess:number, slip:number}} BktParameters
 */
export const DEFAULT_BKT = Object.freeze({ initial: 0.22, learn: 0.18, guess: 0.2, slip: 0.1 });
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Bernoulli entropy in bits. @param {number} p */
export function entropy(p) {
  const q = clamp(p);
  if (q === 0 || q === 1) return 0;
  return -q * Math.log2(q) - (1 - q) * Math.log2(1 - q);
}

/**
 * One BKT update. Correctness is evidence, not certainty; a guess and a slip remain possible.
 * @param {number} prior
 * @param {boolean} correct
 * @param {BktParameters} parameters
 */
export function updateMastery(prior, correct, parameters = DEFAULT_BKT) {
  const p = clamp(prior);
  const { guess, slip, learn } = parameters;
  for (const [key, value] of Object.entries(parameters)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${key} must be in [0,1]`);
  }
  const pCorrect = p * (1 - slip) + (1 - p) * guess;
  const posterior = correct ? p * (1 - slip) / pCorrect : p * slip / (p * slip + (1 - p) * (1 - guess));
  return clamp(posterior + (1 - posterior) * learn);
}

/** Expected reduction in uncertainty from an item response under its concept mastery.
 * @param {number} mastery
 * @param {BktParameters} parameters
 */
export function expectedInformationGain(mastery, parameters = DEFAULT_BKT) {
  const p = clamp(mastery);
  const { guess, slip } = parameters;
  const pCorrect = p * (1 - slip) + (1 - p) * guess;
  // A zero-probability response contributes zero conditional entropy.
  // Do not evaluate its undefined posterior (0/0), even in an unused term.
  const correctEntropy = pCorrect === 0 ? 0 : entropy(p * (1 - slip) / pCorrect);
  const pWrong = p * slip + (1 - p) * (1 - guess);
  const wrongEntropy = pWrong === 0 ? 0 : entropy(p * slip / pWrong);
  return Math.max(0, entropy(p) - pCorrect * correctEntropy - (1 - pCorrect) * wrongEntropy);
}

/**
 * Select an unseen item maximizing uncertainty reduction plus prerequisite repair.
 * Default ties use the current locale's item-id order. A recorded ID may choose
 * another exact maximum-score tie without changing the default choice.
 * @param {Item[]} items
 * @param {Set<string>} asked
 * @param {Record<string,number>} mastery
 * @param {BktParameters} parameters
 * @param {string} [preferredItemId] recorded identity, honored only at the exact maximum score
 * @returns {Item|null}
 */
export function selectNextItem(items, asked, mastery, parameters = DEFAULT_BKT, preferredItemId) {
  const candidates = items.filter(item => !asked.has(item.id));
  if (!candidates.length) return null;
  const score = item => {
    const m = mastery[item.concept] ?? parameters.initial;
    // Prefer a weak concept that unlocks several still-unanswered downstream ideas.
    const downstream = candidates.filter(next => next.id !== item.id && next.prerequisites.includes(item.concept)).length;
    const prerequisiteRepair = (1 - m) * Math.min(3, downstream) * 0.12;
    return expectedInformationGain(m, parameters) + prerequisiteRepair;
  };
  const selected = candidates.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0];
  if (preferredItemId === undefined) return selected;
  const preferred = candidates.find(item => item.id === preferredItemId);
  return preferred && score(preferred) === score(selected) ? preferred : selected;
}

/** Clone session probabilities so learners' local run has no shared state. */
export function initialMastery(concepts, parameters = DEFAULT_BKT) {
  return Object.fromEntries(concepts.map(concept => [concept, parameters.initial]));
}

/**
 * Reproducible toy learner run; simulated evidence is never real learner data.
 * @param {Item[]} items
 * @param {string[]} concepts
 * @param {Record<string,number>} latentKnowledge simulated probability of knowing each concept
 * @param {boolean} adaptive use the information-gain selector, or fixed deck order
 * @param {number} seed deterministic pseudo-random seed
 */
export function runLearnerSimulation(items, concepts, latentKnowledge, adaptive = true, seed = 20261005) {
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const stateByConcept = initialMastery(concepts);
  const asked = new Set();
  const trace = [];
  while (asked.size < items.length) {
    const item = adaptive ? selectNextItem(items, asked, stateByConcept) : items.find(candidate => !asked.has(candidate.id));
    const knowledge = clamp(latentKnowledge[item.concept] ?? 0.5);
    const correct = random() < 0.18 + knowledge * 0.72;
    asked.add(item.id);
    stateByConcept[item.concept] = updateMastery(stateByConcept[item.concept], correct);
    trace.push({ item: item.id, concept: item.concept, correct });
  }
  const meanEstimatedMastery = concepts.reduce((sum, concept) => sum + stateByConcept[concept], 0) / concepts.length;
  return { trace, mastery: stateByConcept, meanEstimatedMastery };
}
