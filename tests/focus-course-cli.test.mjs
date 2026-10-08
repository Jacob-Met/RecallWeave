import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createFocusedLesson } from '../src/course-focus.mjs';
import { parseDeck, MAX_DECK_BYTES } from '../src/deck.mjs';

const cli = fileURLToPath(new URL('../tools/focus-course.mjs', import.meta.url));
const item = (id, concept, prerequisites = []) => ({
  id, concept, prerequisites, prompt: 'Literal question ' + id + ' <b>Ω</b>',
  options: ['First ' + id, 'Second ' + id], answer: 1,
  explanation: 'Authored explanation ' + id, transfer: 'Apply ' + id
});
const source = {
  format: 'recallweave-deck/1', title: 'Source Ω',
  attribution: 'Original author � <script>literal</script>', license: 'CC BY 4.0',
  concepts: ['finish', 'base', 'side', 'middle'],
  items: [
    item('finish-1', 'finish', ['middle']), item('side-1', 'side'),
    item('base-1', 'base'), item('middle-1', 'middle', ['base']),
    item('finish-2', 'finish', ['base']), item('base-2', 'base')
  ]
};
const json = JSON.stringify(source);
const args = ['--title', 'Focused Ω', '--concept', 'finish'];
function run(argv, input = json) {
  const result = spawnSync(process.execPath, [cli, ...argv], {
    input, encoding: 'utf8', timeout: 5000, maxBuffer: 2 * MAX_DECK_BYTES
  });
  assert.equal(result.signal, null, 'child must not hit its deadline');
  if (result.error) assert.equal(result.error.code, 'EPIPE', 'only early stdin closure may report EPIPE');
  return result;
}
function refusal(result, code) {
  assert.equal(result.status, code, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^focus-course: .+/);
}
function withoutClosingInput(argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...argv], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Waited for stdin despite terminal argument mode')); }, 5000);
    child.stdout.setEncoding('utf8').on('data', value => { stdout += value; });
    child.stderr.setEncoding('utf8').on('data', value => { stderr += value; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (status, signal) => {
      clearTimeout(timer); child.stdin.destroy(); resolve({ status, signal, stdout, stderr });
    });
  });
}

test('help and argument refusals complete before stdin closes', async () => {
  const help = await withoutClosingInput(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--concept/);
  assert.match(help.stdout, /truncate/);
  assert.equal(help.stderr, '');
  for (const argv of [[], ['--list', '--help'], ['--help', '--list'],
    ['--title'], ['--concept'], ['--title', 'T'], ['--concept', 'finish'],
    ['--title', 'T', '--title', 'T', '--concept', 'finish'],
    ['--unknown'], ['--title=T', '--concept', 'finish'], ['course.json'], ['--'],
    ['--title', 'T', ...Array.from({ length: 33 }, () => ['--concept', 'base']).flat()]]) {
    refusal(await withoutClosingInput(argv), 2);
  }
});

test('inspection keeps exact concept order, counts, required concepts and credit', () => {
  const result = run(['--list']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), {
    format: 'recallweave-course-focus-inspection/1',
    title: source.title, attribution: source.attribution, license: source.license,
    concepts: [
      { id: 'finish', questionCount: 2, requiredConcepts: ['base', 'middle'] },
      { id: 'base', questionCount: 2, requiredConcepts: [] },
      { id: 'side', questionCount: 1, requiredConcepts: [] },
      { id: 'middle', questionCount: 1, requiredConcepts: ['base'] }
    ]
  });
});

test('focused output is the exact native consumer JSON with every retained field intact', () => {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, createFocusedLesson(parseDeck(json), ['finish'], 'Focused Ω').json);
  const deck = parseDeck(result.stdout);
  assert.deepEqual(deck.concepts, ['finish', 'base', 'middle']);
  assert.deepEqual(deck.items.map(x => x.id), ['finish-1', 'base-1', 'middle-1', 'finish-2', 'base-2']);
  for (const retained of deck.items) assert.deepEqual(retained, source.items.find(x => x.id === retained.id));
  assert.equal(json, JSON.stringify(source));
});

test('target order does not reorder source contents; flag positions and literal hyphen values work', () => {
  const a = run(['--title', 'T', '--concept', 'side', '--concept', 'base']);
  const b = run(['--concept', 'base', '--title', 'T', '--concept', 'side']);
  assert.equal(a.status, 0, a.stderr); assert.equal(b.status, 0, b.stderr);
  assert.equal(a.stdout, b.stdout);
  assert.deepEqual(JSON.parse(a.stdout).items.map(x => x.id), ['side-1', 'base-1', 'base-2']);
  const literal = run(['--title', '--list', '--concept', 'base']);
  assert.equal(literal.status, 0, literal.stderr);
  assert.equal(JSON.parse(literal.stdout).title, '--list');
});

test('semantic refusals emit no stale or partial prepared JSON', () => {
  for (const argv of [
    ['--title', 'T', '--concept', 'absent'], ['--title', 'T', '--concept', ''],
    ['--title', 'T', '--concept', '--help'],
    ['--title', 'T', '--concept', 'base', '--concept', 'base'],
    ['--title', '', '--concept', 'base'], ['--title', ' ', '--concept', 'base'],
    ['--title', 'a'.repeat(161), '--concept', 'base']
  ]) refusal(run(argv), 1);
  for (const change of [
    d => { d.items[2].prerequisites = ['finish']; },
    d => { d.items[1].id = d.items[0].id; },
    d => { d.items[1].answer = 2; },
    d => { delete d.attribution; }
  ]) {
    const invalid = structuredClone(source); change(invalid);
    refusal(run(args, JSON.stringify(invalid)), 1);
  }
});

test('strict UTF-8 accepts BOM and literal replacement characters but refuses damaged input', () => {
  const plain = run(args);
  const bom = run(args, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(json)]));
  assert.equal(bom.status, 0, bom.stderr);
  assert.equal(bom.stdout, plain.stdout);
  assert.ok(JSON.parse(bom.stdout).attribution.includes('�'));
  for (const input of [Buffer.from([0xc3, 0x28]), Buffer.from([0xe2, 0x82]), Buffer.from('{}\xff', 'latin1'), '{', '']) {
    refusal(run(args, input), 1);
  }
});

test('the raw-byte boundary is enforced before parsing, including the BOM', () => {
  const bytes = Buffer.from(json);
  const exact = Buffer.concat([bytes, Buffer.alloc(MAX_DECK_BYTES - bytes.length, 0x20)]);
  const valid = run(args, exact);
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(valid.stdout, run(args).stdout);
  refusal(run(args, Buffer.concat([exact, Buffer.from(' ')])), 1);
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const exactBom = Buffer.concat([bom, bytes, Buffer.alloc(MAX_DECK_BYTES - bytes.length - bom.length, 0x20)]);
  assert.equal(run(args, exactBom).status, 0);
  refusal(run(args, Buffer.concat([bom, exact])), 1);
});

test('UTF-8 sequences split across real stdin writes decode only after bounded collection', async () => {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args]);
    const output = [], errors = [];
    const timer = setTimeout(() => { child.kill(); reject(new Error('Split-input child deadline')); }, 5000);
    child.stdout.on('data', chunk => output.push(chunk));
    child.stderr.on('data', chunk => errors.push(chunk));
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, stdout: Buffer.concat(output).toString('utf8'), stderr: Buffer.concat(errors).toString('utf8') });
    });
    const bytes = Buffer.from(json), split = bytes.indexOf(Buffer.from('Ω')) + 1;
    child.stdin.write(bytes.subarray(0, split));
    setImmediate(() => child.stdin.end(bytes.subarray(split)));
  });
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, run(args).stdout);
});
