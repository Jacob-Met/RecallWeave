#!/usr/bin/env node
/** Build this optional preparation tool without changing the learner or studio. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COURSE_CSV_TEMPLATE } from '../src/course-csv.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const courseCsvPath = join(root, 'csv-course.html');
export const courseCsvTemplatePath = join(root, 'examples/course-question-bank.csv');

export function buildCourseCsv() {
  const deck = readFileSync(join(root, 'src/deck.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const converter = readFileSync(join(root, 'src/course-csv.mjs'), 'utf8')
    .replace(/^import \{ MAX_DECK_BYTES, parseDeck, serializeDeck \} from '\.\/deck\.mjs';\n/, '')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(root, 'src/course-csv-ui.mjs'), 'utf8')
    .replace(/^import \{ COURSE_CSV_TEMPLATE, MAX_COURSE_CSV_BYTES, convertCourseCsv \} from '\.\/course-csv\.mjs';\n/, '');
  if (/^\s*(?:import|export)\s/m.test(deck + '\n' + converter + '\n' + ui)) {
    throw new Error('The standalone CSV tool contains an unsupported module declaration.');
  }
  if (/<\/script\b/i.test(deck + converter + ui)) {
    throw new Error('Standalone source must not contain an HTML script closing tag.');
  }
  let page = readFileSync(join(root, 'templates/csv-course.html'), 'utf8');
  for (const [marker, source] of [
    ['/* COURSE_CSV_DECK_SOURCE */', deck],
    ['/* COURSE_CSV_SOURCE */', converter],
    ['/* COURSE_CSV_UI_SOURCE */', ui]
  ]) {
    if (page.split(marker).length !== 2) throw new Error('Expected exactly one build marker: ' + marker);
    page = page.replace(marker, () => source);
  }
  return Object.freeze({ page, template: COURSE_CSV_TEMPLATE });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) {
    throw new Error('Usage: node tools/build_csv_course.mjs [--check]');
  }
  const result = buildCourseCsv();
  if (args.includes('--check')) {
    if (readFileSync(courseCsvPath, 'utf8') !== result.page ||
        readFileSync(courseCsvTemplatePath, 'utf8') !== result.template) {
      throw new Error('CSV preparation output is stale. Run node tools/build_csv_course.mjs.');
    }
    console.log('CSV preparation page and template match their sources.');
  } else {
    mkdirSync(dirname(courseCsvTemplatePath), { recursive: true });
    writeFileSync(courseCsvPath, result.page);
    writeFileSync(courseCsvTemplatePath, result.template);
    console.log('Built csv-course.html and examples/course-question-bank.csv.');
  }
}
