import { open, stat, mkdtemp, writeFile, link, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { MAX_DECK_BYTES } from '../src/deck.mjs';
import { exportCourseCsv } from '../src/course-csv-export.mjs';

const usage = 'Usage: node tools/export_course_csv.mjs --input lesson.json --output question-bank.csv';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function writeStdout(text) {
  return new Promise((resolve, reject) => {
    process.stdout.once('error', reject);
    process.stdout.write(text, error => {
      // A failed callback is followed by a stream error; keep its listener.
      if (error) reject(error);
      else { process.stdout.removeListener('error', reject); resolve(); }
    });
  });
}

function argumentsFor(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    if (option !== '--input' && option !== '--output') throw new Error('Unknown argument: ' + option);
    if (values.has(option)) throw new Error('Repeated argument: ' + option);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + option);
    values.set(option, value);
  }
  if (values.size !== 2) throw new Error('Both --input and --output are required.');
  return { input: resolve(values.get('--input')), output: resolve(values.get('--output')) };
}

async function readBoundedInput(path) {
  if (!(await stat(path)).isFile()) throw new Error('The input must be a regular JSON file.');
  const handle = await open(path, 'r');
  try {
    if (!(await handle.stat()).isFile()) throw new Error('The input must be a regular JSON file.');
    const buffer = Buffer.alloc(MAX_DECK_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
    return buffer.subarray(0, length);
  } finally { await handle.close(); }
}

async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    await writeStdout(usage + '\n' +
      'Creates a new CSV only. Keep the JSON receipt: metadata is separate from the fixed CSV columns.\n');
    return;
  }
  const { input, output } = argumentsFor(args);
  const bytes = await readBoundedInput(input);
  let jsonText;
  try { jsonText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error('The input must contain valid UTF-8; invalid bytes were not replaced.'); }
  const result = exportCourseCsv(jsonText);
  // All validation and the existing-importer round trip precede even staging.
  // A complete sibling file is linked into the requested name without replacing
  // any existing file, directory or symlink.
  let published = false;
  try {
    const stage = await mkdtemp(join(dirname(output), '.recallweave-csv-'));
    try {
      const complete = join(stage, 'complete.csv');
      await writeFile(complete, result.csv, { encoding: 'utf8', flag: 'wx' });
      await link(complete, output);
      published = true;
    } finally { await rm(stage, { recursive: true, force: true }); }
    await writeStdout(JSON.stringify({
      format: 'recallweave-course-csv-export/1',
      input, input_sha256: digest(bytes), output,
      csv_sha256: digest(Buffer.from(result.csv, 'utf8')),
      question_count: result.questionCount, concept_count: result.conceptCount,
      metadata: result.metadata
    }, null, 2) + '\n');
  } catch (error) {
    if (published) {
      throw new Error('A complete CSV was created at ' + JSON.stringify(output) +
        ', but completion failed: ' + error.message +
        '. Keep the CSV and source lesson; metadata remains in the source lesson.', { cause: error });
    }
    throw error;
  }
}

try { await main(process.argv.slice(2)); }
catch (error) {
  process.stderr.write('CSV export: ' + error.message + '\n' + usage + '\n');
  process.exitCode = 1;
}
