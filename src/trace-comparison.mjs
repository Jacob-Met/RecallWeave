import { validateDeck } from './deck.mjs';
import { readTraceArchive, TRACE_ARCHIVE_MAX_BYTES } from './trace-archive.mjs';

function traceComparisonInput(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > TRACE_ARCHIVE_MAX_BYTES) {
    throw new RangeError('Choose a completed learning trace no larger than 2 MiB.');
  }
  let document;
  try { document = JSON.parse(text); }
  catch { throw new RangeError('This file is not valid learning trace JSON.'); }
  const course = validateDeck(document?.deck);
  // Validation supplies display content. Keep the original raw deck for the
  // archive owner's exact identity check, including older bundled-course files.
  const trace = readTraceArchive(text, document.deck);
  return { document, course, trace };
}

function traceComparisonCourse(course) {
  return Object.freeze({
    title: course.title, attribution: course.attribution, license: course.license,
    concepts: course.concepts, questionCount: course.items.length,
  });
}

/** Inspect one completed file without accepting another course into a learner. */
export function inspectTraceForComparison(text) {
  const { course, trace } = traceComparisonInput(text);
  return Object.freeze({
    course: traceComparisonCourse(course),
    savedAt: trace.savedAt,
    summary: trace.summary,
  });
}

function traceComparisonAnswers(trace) {
  const first = new Map(trace.answers.map((answer, index) => [
    answer.item, Object.freeze({
      choice: answer.choice, correct: answer.correct, position: index + 1,
    }),
  ]));
  const practice = new Map((trace.practice?.answers ?? []).map(answer => [answer.item, answer]));
  return { first, practice, practiceStarted: trace.practice !== null };
}

function traceComparisonSide(record, id) {
  const first = record.first.get(id);
  const retry = record.practice.get(id);
  let state = 'not-needed';
  if (!first.correct) state = retry ? 'answered' : record.practiceStarted ? 'pending' : 'unstarted';
  return Object.freeze({
    first,
    practice: Object.freeze({
      state, choice: retry?.choice ?? null, correct: retry?.correct ?? null,
    }),
  });
}

/**
 * Join two complete archives by course question identity, never by answer order.
 * The native archive reader checks the second file against the first raw course
 * and current model before any paired rows are returned.
 */
export function compareTraceArchives(leftText, rightText) {
  const { document, course, trace: left } = traceComparisonInput(leftText);
  const right = readTraceArchive(rightText, document.deck);
  const leftAnswers = traceComparisonAnswers(left);
  const rightAnswers = traceComparisonAnswers(right);
  const rows = course.items.map(item => {
    const a = traceComparisonSide(leftAnswers, item.id);
    const b = traceComparisonSide(rightAnswers, item.id);
    return Object.freeze({
      id: item.id, concept: item.concept, prompt: item.prompt,
      options: item.options, answer: item.answer,
      explanation: item.explanation, transfer: item.transfer,
      left: a, right: b,
      firstChanged: a.first.choice !== b.first.choice,
      practiceChanged: a.practice.state !== b.practice.state || a.practice.choice !== b.practice.choice,
    });
  });
  return Object.freeze({
    course: traceComparisonCourse(course),
    left: Object.freeze({ savedAt: left.savedAt, summary: left.summary }),
    right: Object.freeze({ savedAt: right.savedAt, summary: right.summary }),
    rows: Object.freeze(rows),
    changes: Object.freeze({
      firstAnswers: rows.filter(row => row.firstChanged).length,
      practice: rows.filter(row => row.practiceChanged).length,
    }),
  });
}
