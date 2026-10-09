#!/usr/bin/env node
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_GRAPH_BYTES, parseNegativeGraph, analyzeNegativePaths, formatNegativePaths
} from '../src/negative-weight-paths.mjs';

const HELP = `Usage:
  node tools/negative-weight-paths.mjs --graph INPUT.json [--json]
  node tools/negative-weight-paths.mjs --stdin [--json]
  node tools/negative-weight-paths.mjs --help

Read one bounded directed graph; print synchronous Bellman–Ford rounds and final
finite/unreachable/unbounded-below results. --json prints the full teaching trace.
Input: {nodes, edges:[{from,to,weight}], source}; 1–7 vertices, at most 49 edges,
integer weights -50..50. UTF-8 JSON, at most 32768 bytes. File input must be an
ordinary nonsymlink regular file. Input and source files are never written.
Examples:
  node tools/negative-weight-paths.mjs --graph examples/negative-weight-paths/finite.json
  node tools/negative-weight-paths.mjs --stdin --json < examples/negative-weight-paths/reachable-cycle.json
`;

function argumentsFor(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  let file = null, stdin = false, json = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && !json) json = true;
    else if (args[i] === '--stdin' && !stdin && file === null) stdin = true;
    else if (args[i] === '--graph' && file === null && !stdin &&
             i + 1 < args.length && args[i + 1] && !args[i + 1].startsWith('--')) {
      file = args[++i];
    } else throw new Error('Unknown, repeated, missing or conflicting argument. Use --help.');
  }
  if (file === null && !stdin) throw new Error('Choose exactly one of --graph FILE or --stdin.');
  return { file, stdin, json };
}

function sameFile(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeNs === b.mtimeNs;
}
async function readGraphFile(path) {
  const before = await lstat(path, { bigint: true });
  if (before.isSymbolicLink() || !before.isFile()) throw new Error('Input must be a nonsymlink regular file.');
  if (before.size > BigInt(MAX_GRAPH_BYTES)) throw new Error('Input exceeds 32768 bytes.');
  // Reject a path switched to a link or FIFO between admission and open.
  const handle = await open(path, constants.O_RDONLY |
    (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameFile(before, opened)) throw new Error('Input changed during admission.');
    const bytes = Buffer.alloc(MAX_GRAPH_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_GRAPH_BYTES) throw new Error('Input exceeds 32768 bytes.');
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(path, { bigint: true });
    if (!sameFile(opened, after) || !sameFile(after, pathAfter) ||
        pathAfter.isSymbolicLink() || BigInt(length) !== after.size) {
      throw new Error('Input changed while reading.');
    }
    return bytes.subarray(0, length);
  } finally { await handle.close(); }
}
async function readStdin() {
  const parts = [];
  let length = 0;
  for await (const part of process.stdin) {
    const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
    length += bytes.length;
    if (length > MAX_GRAPH_BYTES) throw new Error('Input exceeds 32768 bytes.');
    parts.push(bytes);
  }
  return Buffer.concat(parts, length);
}

export async function main(args = process.argv.slice(2)) {
  const options = argumentsFor(args);
  if (options.help) { process.stdout.write(HELP); return; }
  const bytes = options.stdin ? await readStdin() : await readGraphFile(options.file);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error('Input must be valid UTF-8.'); }
  const report = analyzeNegativePaths(parseNegativeGraph(text));
  process.stdout.write(options.json ? JSON.stringify(report, null, 2) + '\n' : formatNegativePaths(report));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('negative-weight-paths: ' + error.message);
    process.exitCode = 2;
  });
}
