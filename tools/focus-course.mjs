#!/usr/bin/env node
import { MAX_DECK_BYTES, parseDeck } from '../src/deck.mjs';
import { createFocusedLesson, planCourseFocus } from '../src/course-focus.mjs';

const HELP = `Prepare a checked focused lesson from UTF-8 JSON on stdin.

Usage:
  node tools/focus-course.mjs --list < course.json
  node tools/focus-course.mjs --title "Lesson title" --concept "Exact concept" < course.json
  node tools/focus-course.mjs --help

Repeat --concept to select more concepts. Required concepts are included by
the existing Lesson focus planner. --list shows exact IDs and requirements.
Flags and values are separate arguments; quote spaces and literal characters.
Input is limited to 262144 raw bytes. Output is JSON on stdout; errors go to
stderr. A shell > redirection may truncate its destination before this command
runs. Use a new destination or an explicit staging path.
`;

class UsageError extends Error {}

function parseArguments(args) {
  if (args.length === 1 && args[0] === '--help') return { mode: 'help' };
  if (args.length === 1 && args[0] === '--list') return { mode: 'list' };
  let title;
  const concepts = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag !== '--title' && flag !== '--concept') {
      throw new UsageError('Unknown or misplaced argument: ' + flag + '. Use --help.');
    }
    if (i + 1 === args.length) throw new UsageError(flag + ' requires a value.');
    const value = args[++i];
    if (flag === '--title') {
      if (title !== undefined) throw new UsageError('Use --title only once.');
      title = value;
    } else {
      concepts.push(value);
      if (concepts.length > 32) throw new UsageError('Choose at most 32 target concepts.');
    }
  }
  if (title === undefined || concepts.length === 0) {
    throw new UsageError('Provide --title and at least one --concept, or use --list or --help alone.');
  }
  return { mode: 'focus', title, concepts };
}

async function readCourse() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_DECK_BYTES) throw new Error('Input exceeds the 262144-byte course limit.');
    chunks.push(chunk);
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
  } catch {
    throw new Error('Input is not valid UTF-8.');
  }
  return parseDeck(text);
}

function inspectCourse(deck) {
  return {
    format: 'recallweave-course-focus-inspection/1',
    title: deck.title,
    attribution: deck.attribution,
    license: deck.license,
    concepts: deck.concepts.map(id => ({
      id,
      questionCount: deck.items.filter(item => item.concept === id).length,
      requiredConcepts: planCourseFocus(deck, [id]).required
    }))
  };
}

async function writeOutput(text) {
  // Keep the error listener until process exit: a failed write may emit its
  // stream error after invoking the write callback.
  await new Promise((resolve, reject) => {
    process.stdout.once('error', reject);
    process.stdout.write(text, error => error ? reject(error) : resolve());
  });
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.mode === 'help') return writeOutput(HELP);
  const deck = await readCourse();
  const output = args.mode === 'list'
    ? JSON.stringify(inspectCourse(deck), null, 2) + '\n'
    : createFocusedLesson(deck, args.concepts, args.title).json;
  await writeOutput(output);
}

try {
  await main();
} catch (error) {
  process.stderr.write('focus-course: ' + error.message + '\n');
  process.exitCode = error instanceof UsageError ? 2 : 1;
}
