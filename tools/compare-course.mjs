#!/usr/bin/env node
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MAX_DECK_BYTES } from '../src/deck.mjs';
import { compareCourses } from '../src/course-comparison.mjs';

const USAGE = 'Usage: node tools/compare-course.mjs BEFORE.json AFTER.json [--format json|text]\n';
class InputError extends Error {}

function argumentsFor(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  if ((argv.length !== 2 && argv.length !== 4) ||
      argv.slice(0, 2).some(path => !path || path.startsWith('-') || path.includes('\0')) ||
      (argv.length === 4 && (argv[2] !== '--format' || !['json', 'text'].includes(argv[3])))) {
    throw new InputError(USAGE.trim());
  }
  return { before: argv[0], after: argv[1], format: argv[3] ?? 'json' };
}

async function readInput(path) {
  // Nonblocking open prevents an unread named pipe from hanging at admission.
  // It has no effect on ordinary regular-file reads.
  const file = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new InputError(JSON.stringify(path) + ' must be a regular file.');
    if (info.size > MAX_DECK_BYTES) throw new InputError(JSON.stringify(path) + ' exceeds 256 KiB.');
    const chunks = [];
    let total = 0;
    const buffer = Buffer.alloc(8192);
    while (total <= MAX_DECK_BYTES) {
      const size = Math.min(buffer.length, MAX_DECK_BYTES + 1 - total);
      const { bytesRead } = await file.read(buffer, 0, size, null);
      if (bytesRead === 0) break;
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
      total += bytesRead;
    }
    if (total > MAX_DECK_BYTES) throw new InputError(JSON.stringify(path) + ' exceeds 256 KiB.');
    const bytes = Buffer.concat(chunks, total);
    let text;
    try {
      // Preserve BOM as text; the existing JSON parser decides its admission.
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new InputError(JSON.stringify(path) + ' is not valid UTF-8.');
    }
    return {
      bytes,
      text,
      identity: { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
    };
  } finally {
    await file.close();
  }
}

function textReport(report) {
  const { comparison: c } = report;
  const lines = [
    'Course revision comparison',
    'This reports literal validated-content changes, not correctness or archive compatibility.',
    'Before file: ' + JSON.stringify(report.files.before),
    'After file: ' + JSON.stringify(report.files.after),
    'Same bytes: ' + report.sameBytes,
    'Same validated content: ' + c.sameContent,
    'Metadata changes: ' + JSON.stringify(c.metadataChanges),
    'Concepts: ' + JSON.stringify(c.concepts),
    'Question order before: ' + JSON.stringify(c.questions.beforeOrder),
    'Question order after: ' + JSON.stringify(c.questions.afterOrder),
    'Retained question order changed: ' + c.questions.retainedOrderChanged,
    'Question summary: ' + JSON.stringify(c.questions.summary)
  ];
  for (const item of c.questions.added) lines.push('Added question: ' + JSON.stringify(item));
  for (const item of c.questions.removed) lines.push('Removed question: ' + JSON.stringify(item));
  for (const row of c.questions.retained) {
    if (row.changedFields.length || row.positionChanged) {
      lines.push('Retained question change: ' + JSON.stringify(row));
    }
  }
  return lines.join('\n') + '\n';
}

function write(stream, text) {
  return new Promise((resolve, reject) => {
    stream.write(text, error => error ? reject(error) : resolve());
  });
}

// A failed pipe emits both a callback error and an error event. The callback is
// reported by main; these listeners prevent a second uncaught stream exception.
process.stdout.on('error', () => {});
process.stderr.on('error', () => { process.exitCode = 1; });

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (args.help) {
    await write(process.stdout, USAGE);
    return;
  }
  const before = await readInput(args.before);
  const after = await readInput(args.after);
  let comparison;
  try {
    comparison = compareCourses(before.text, after.text);
  } catch (error) {
    throw new InputError(error.message);
  }
  const report = {
    format: 'recallweave-course-comparison-files/1',
    files: { before: before.identity, after: after.identity },
    sameBytes: before.bytes.equals(after.bytes),
    comparison
  };
  const output = args.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : textReport(report);
  await write(process.stdout, output);
}

try {
  await main();
} catch (error) {
  process.exitCode = error instanceof InputError ? 2 : 1;
  try {
    await write(process.stderr, JSON.stringify({ error: error.message ?? String(error) }) + '\n');
  } catch {
    process.exitCode = 1;
  }
}
