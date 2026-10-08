import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, mkdir, copyFile, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {traceComponentsFromText} from '../src/strongly-connected-components.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const coursePath = 'courses/strongly-connected-components.json';
const guidePath = 'courses/strongly-connected-components.md';
const pagePath = 'courses/strongly-connected-components-explorer.html';
const builderPath = 'tools/build-strongly-connected-components.mjs';
const text = await readFile(join(root, coursePath), 'utf8');
const deck = parseDeck(text);
const answer = id => { const item = deck.items.find(item => item.id === id); assert.ok(item, id); return item.options[item.answer]; };

test('the authored course enters through the unchanged learner deck validator', () => {
  assert.equal(serializeDeck(deck), text);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.match(deck.attribution, /Cornell University/);
  assert.match(deck.attribution, /MIT OpenCourseWare/);
  assert.equal(Object.isFrozen(deck.items[0]), true);
});

test('worked ordering and component answers agree with the qualified graph model', () => {
  const chain = traceComponentsFromText('A B C', 'A B\nB C');
  assert.equal(answer('scc-finish'), chain.events.find(event => event.kind === 'reverse-order').finishOrder.join(', '));
  const ordered = traceComponentsFromText('A B C', 'B A\nA C');
  assert.equal(answer('scc-root-order'), ordered.result.rootOrder.join(', '));
  assert.equal(answer('scc-second-pass'), ordered.result.components.map(group => '{' + group.join(', ') + '}').join(', then '));
  const nine = traceComponentsFromText('A B C D E F G', 'A B\nB C\nC A\nC D\nD E\nE F\nF D\nF G\nG G');
  assert.equal(answer('scc-edge-work'), String(nine.counts.forwardEdgeVisits + nine.counts.transposeEdgeVisits));
});

test('the direct-open page embeds exact authored course and guide download bytes', async () => {
  const page = await readFile(join(root, pagePath), 'utf8');
  const match = page.match(/<script id="component-assets" type="application\/json">([^<]+)<\/script>/);
  assert.ok(match, 'embedded asset record');
  const assets = JSON.parse(match[1]);
  assert.deepEqual(Buffer.from(assets.course.base64, 'base64'), await readFile(join(root, coursePath)));
  assert.deepEqual(Buffer.from(assets.guide.base64, 'base64'), await readFile(join(root, guidePath)));
  assert.equal(assets.course.name, 'strongly-connected-components.json');
  assert.equal(assets.guide.name, 'strongly-connected-components.md');
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+href=|^\s*import\s/m);
  const checked = spawnSync(process.execPath, [builderPath, '--check'], {cwd: root, encoding: 'utf8'});
  assert.equal(checked.status, 0, checked.stderr);
});

test('the build gate detects a stale page and refuses an invalid deck before overwriting it', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'recall-components-build-'));
  try {
    const files = [coursePath, guidePath, pagePath, builderPath, 'src/deck.mjs', 'src/strongly-connected-components.mjs', 'src/strongly-connected-components-ui.mjs', 'courses/strongly-connected-components-explorer.template.html'];
    for (const file of files) {
      await mkdir(dirname(join(fixture, file)), {recursive: true});
      await copyFile(join(root, file), join(fixture, file));
    }
    const stale = Buffer.from('unchanged stale page sentinel\n');
    await writeFile(join(fixture, pagePath), stale);
    const check = spawnSync(process.execPath, [builderPath, '--check'], {cwd: fixture, encoding: 'utf8'});
    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /stale/);
    assert.deepEqual(await readFile(join(fixture, pagePath)), stale);
    const bad = JSON.parse(text); bad.items[0].answer = 99;
    await writeFile(join(fixture, coursePath), JSON.stringify(bad, null, 2) + '\n');
    const build = spawnSync(process.execPath, [builderPath], {cwd: fixture, encoding: 'utf8'});
    assert.notEqual(build.status, 0);
    assert.match(build.stderr, /answer/);
    assert.deepEqual(await readFile(join(fixture, pagePath)), stale);
  } finally {
    await rm(fixture, {recursive: true, force: true});
  }
});
