import { parseDeck } from './deck.mjs';
import { planCourseFocus } from './course-focus.mjs';

const prerequisiteFrozenList = values => Object.freeze([...values]);

/** First shortest path, using source concept order to break every tie. */
function prerequisitePath(direct, from, to) {
  const queue = [[from]];
  const seen = new Set([from]);
  for (let head = 0; head < queue.length; head += 1) {
    const path = queue[head];
    for (const next of direct[path.at(-1)]) {
      if (seen.has(next)) continue;
      const extended = [...path, next];
      if (next === to) return prerequisiteFrozenList(extended);
      seen.add(next);
      queue.push(extended);
    }
  }
  throw new Error('The declared prerequisite path could not be found.');
}

/** Review authored links only. A concept union is not a learner mastery judgment. */
export function inspectCoursePrerequisites(text, selectedConceptIndex = 0) {
  const deck = parseDeck(text);
  if (!Number.isInteger(selectedConceptIndex) || selectedConceptIndex < 0 ||
      selectedConceptIndex >= deck.concepts.length) {
    throw new Error('Choose a source concept index from this course.');
  }
  const indexByName = new Map(deck.concepts.map((name, index) => [name, index]));
  const questions = deck.items.map((item, index) => Object.freeze({
    index, id: item.id, conceptIndex: indexByName.get(item.concept), prompt: item.prompt,
    prerequisiteIndices: prerequisiteFrozenList(item.prerequisites.map(name => indexByName.get(name)))
  }));
  const direct = deck.concepts.map((_, index) => {
    const found = new Set(questions.filter(item => item.conceptIndex === index)
      .flatMap(item => item.prerequisiteIndices));
    return deck.concepts.flatMap((name, i) => found.has(i) ? [i] : []);
  });
  const required = deck.concepts.map(name =>
    planCourseFocus(deck, [name]).required.map(other => indexByName.get(other)));
  const levels = [];
  const level = index => {
    if (levels[index] === undefined) {
      levels[index] = direct[index].length ? 1 + Math.max(...direct[index].map(level)) : 0;
    }
    return levels[index];
  };
  const concepts = deck.concepts.map((name, index) => Object.freeze({
    index, name,
    questionIndices: prerequisiteFrozenList(questions.filter(item => item.conceptIndex === index)
      .map(item => item.index)),
    directPrerequisites: prerequisiteFrozenList(direct[index]),
    directDependents: prerequisiteFrozenList(direct.flatMap((values, i) => values.includes(index) ? [i] : [])),
    required: prerequisiteFrozenList(required[index]),
    downstream: prerequisiteFrozenList(required.flatMap((values, i) => values.includes(index) ? [i] : [])),
    level: level(index)
  }));
  const links = concepts.flatMap(concept => concept.directPrerequisites.map(prerequisiteIndex =>
    Object.freeze({
      prerequisiteIndex, conceptIndex: concept.index,
      questionIndices: prerequisiteFrozenList(questions.filter(item =>
        item.conceptIndex === concept.index && item.prerequisiteIndices.includes(prerequisiteIndex))
        .map(item => item.index))
    })));
  const selected = concepts[selectedConceptIndex];
  return Object.freeze({
    format: 'recallweave-course-prerequisites/1',
    course: Object.freeze({ title: deck.title, attribution: deck.attribution, license: deck.license }),
    concepts: prerequisiteFrozenList(concepts),
    questions: prerequisiteFrozenList(questions),
    links: prerequisiteFrozenList(links),
    selection: Object.freeze({
      index: selectedConceptIndex,
      requirementPaths: prerequisiteFrozenList(selected.required.map(index => Object.freeze({
        index, path: prerequisitePath(direct, selectedConceptIndex, index)
      }))),
      dependentPaths: prerequisiteFrozenList(selected.downstream.map(index => Object.freeze({
        index, path: prerequisitePath(direct, index, selectedConceptIndex)
      })))
    })
  });
}
