#!/usr/bin/env node
/** A dependency-free terminal experiment for the original interpolation lesson. */
import { openSync, readSync, closeSync, writeSync } from 'node:fs';
import { interpolatePolynomial } from '../src/polynomial-interpolation.mjs';

const usage = 'Usage: node tools/interpolate-polynomial.mjs INPUT|- [--format json|text]\n';
const limit = 65536;
function write(fd, text) {
  const bytes = Buffer.from(text, 'utf8');
  let offset = 0;
  while (offset < bytes.length) {
    const count = writeSync(fd, bytes, offset, bytes.length - offset);
    if (count === 0) throw new Error('Output made no progress.');
    offset += count;
  }
}
function read(path) {
  const fd = path === '-' ? 0 : openSync(path, 'r');
  const buffer = Buffer.alloc(limit + 1);
  let size = 0;
  try {
    while (size < buffer.length) {
      const count = readSync(fd, buffer, size, buffer.length - size, null);
      if (count === 0) break;
      size += count;
    }
  } finally {
    if (path !== '-') closeSync(fd);
  }
  if (size > limit) throw Object.assign(new Error('Input exceeds 65536 bytes.'), { admission: true });
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size)); }
  catch { throw Object.assign(new Error('Input must contain valid UTF-8.'), { admission: true }); }
}
function readable(result) {
  const lines = ['Polynomial interpolation — exact rational arithmetic',
    `Nodes: ${result.nodes.length}; effective degree: ${result.degree === null ? 'zero polynomial' : result.degree}`,
    `Sampled range: [${result.sampleRange.min}, ${result.sampleRange.max}]`,
    'Monomial coefficients (constant upward): ' + result.monomialCoefficients.join(', '),
    'Newton coefficients (authored node order): ' + result.newtonCoefficients.join(', '),
    '', 'Divided differences (one row per order):'];
  result.dividedDifferences.forEach((column, order) => lines.push(`${order}: ${column.join(', ')}`));
  lines.push('', 'Original-node reproduction:');
  result.nodeChecks.forEach(row => lines.push(`${row.index}: p(${row.x}) = ${row.actual}; supplied ${row.expected}; exact`));
  lines.push('', 'Requested evaluations:');
  result.evaluations.forEach(row => lines.push(`${row.index}: p(${row.x}) = ${row.value} [${row.relation}]`));
  if (!result.evaluations.length) lines.push('(none requested)');
  lines.push('', result.interpretation);
  return lines.join('\n') + '\n';
}

const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0] === '--help') {
    write(1, usage);
  } else if (![1, 3].includes(args.length) || args[0].startsWith('--')
      || (args.length === 3 && (args[1] !== '--format' || !['json', 'text'].includes(args[2])))) {
    process.exitCode = 2; write(2, usage);
  } else {
    const source = read(args[0]);
    let result;
    try { result = interpolatePolynomial(JSON.parse(source)); }
    catch (error) { throw Object.assign(error, { admission: true }); }
    const output = args[2] === 'text' ? readable(result) : JSON.stringify(result, null, 2) + '\n';
    write(1, output);
  }
} catch (error) {
  process.exitCode = error.admission ? 2 : 1;
  try { write(2, `Interpolation failed: ${error.message}\n`); } catch { /* The output channel itself may be closed. */ }
}
