#!/usr/bin/env node
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
import { analyzeGameTree } from '../src/adversarial-game-trees.mjs';

const LIMIT = 32768;
const USAGE = `Usage:
  node tools/adversarial-game-trees.mjs --tree PATH [--json]
  node tools/adversarial-game-trees.mjs --stdin [--json]
  node tools/adversarial-game-trees.mjs --help

Analyze an explicit alternating MAX/MIN tree. Utilities are integers from -100
through 100, always from MAX's perspective. Maximum: 31 nodes, depth 6, four
children per internal node, and 32768 UTF-8 input bytes.

--json emits the exact-reference result and separate alpha-beta traversal.
The readable report labels cutoff returns as bounds, not exact node values.
Input is read only; this command writes no file and uses no network.
`;

function parse(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  let file = null;
  let stdin = false;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--tree') {
      if (file !== null || index + 1 >= args.length || args[index + 1].startsWith('--')) {
        throw new TypeError('--tree requires one path and cannot be repeated.');
      }
      file = args[++index];
      if (!file) throw new TypeError('--tree requires a nonempty path.');
    } else if (arg === '--stdin') {
      if (stdin) throw new TypeError('--stdin cannot be repeated.');
      stdin = true;
    } else if (arg === '--json') {
      if (json) throw new TypeError('--json cannot be repeated.');
      json = true;
    } else {
      throw new TypeError('Unknown argument; use --help for usage.');
    }
  }
  if ((file !== null ? 1 : 0) + (stdin ? 1 : 0) !== 1) {
    throw new TypeError('Choose exactly one of --tree PATH and --stdin.');
  }
  return { file, stdin, json };
}

function capture(descriptor) {
  const bytes = Buffer.alloc(LIMIT + 1);
  let length = 0;
  while (length < bytes.length) {
    const count = readSync(descriptor, bytes, length, bytes.length - length, null);
    if (count === 0) break;
    length += count;
  }
  if (length > LIMIT) throw new TypeError('Input exceeds 32768 bytes.');
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, length));
}

function readInput(options) {
  if (options.stdin) return capture(0);
  const before = lstatSync(options.file);
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new TypeError('--tree must name an ordinary nonsymlink regular file.');
  }
  const descriptor = openSync(options.file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || before.dev !== opened.dev || before.ino !== opened.ino) {
      throw new TypeError('Input file changed while opening.');
    }
    if (opened.size > LIMIT) throw new TypeError('Input exceeds 32768 bytes.');
    return capture(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function readable(result) {
  const { minimax, alphaBeta: search } = result;
  const lines = [
    'Adversarial game tree — exact reference and separate search',
    'All utilities are from MAX\'s perspective; root player: ' + result.rootPlayer,
    'Exact minimax value: ' + minimax.value,
    'Chosen root move: ' + (minimax.chosenChild ?? '(terminal root; no move)'),
    'Principal variation (first optimal child on ties): ' + minimax.principalVariation.join(' → '),
    'Reference: all ' + result.nodeCount + ' nodes and ' + result.leafCount + ' terminal leaves.',
    'Alpha-beta: value ' + search.value + '; visited ' + search.visitedNodeCount + '/' +
      result.nodeCount + ' nodes and ' + search.visitedLeafCount + '/' + result.leafCount +
      ' terminal leaves; pruned ' + search.prunedNodeCount + ' nodes.',
    'Traversal counts exclude the full reference calculation; they are not a timing measurement.'
  ];
  if (search.cutoffs.length === 0) lines.push('No remaining subtree was cut off.');
  for (const cutoff of search.cutoffs) {
    lines.push('Cutoff at ' + cutoff.nodeId + ' (' + cutoff.role + '): ' + cutoff.bound +
      ' bound ' + cutoff.boundValue + ', alpha=' + cutoff.alpha + ', beta=' + cutoff.beta +
      '; skipped child roots: ' + cutoff.skippedChildIds.join(', ') + '. This bound is not an exact-value claim.');
  }
  return lines.join('\n') + '\n';
}

try {
  const options = parse(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
  } else {
    const text = readInput(options);
    const result = analyzeGameTree(JSON.parse(text));
    process.stdout.write(options.json ? JSON.stringify(result, null, 2) + '\n' : readable(result));
  }
} catch (error) {
  const message = String(error?.message || 'Input refused.').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 512);
  process.stderr.write('Game tree refused: ' + message + '\n');
  process.exitCode = 2;
}
