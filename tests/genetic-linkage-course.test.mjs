import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { parseDeck } from '../src/deck.mjs';
import { analyzeLinkage } from '../src/genetic-linkage.mjs';
import { buildGeneticLinkageLab, geneticLinkageLabPath } from '../tools/build-genetic-linkage.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const courseText = readFileSync(join(root, 'courses/genetic-linkage.json'), 'utf8');
const deck = parseDeck(courseText);
const inputs = ['src/deck.mjs', 'src/genetic-linkage.mjs', 'src/genetic-linkage-ui.mjs',
  'courses/genetic-linkage.json', 'templates/genetic-linkage-lab.html', 'tools/build-genetic-linkage.mjs'];
function isolatedBuilder() {
  const dir = mkdtempSync(join(tmpdir(), 'recall-linkage-build-'));
  for (const file of inputs) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(root, file), join(dir, file));
  }
  return dir;
}
function run(dir, ...args) {
  return spawnSync(process.execPath, [join(dir, 'tools/build-genetic-linkage.mjs'), ...args], { encoding: 'utf8' });
}
test('native parser admits twelve original questions across four prerequisite concepts', () => {
  assert.equal(deck.title, 'Linked genes: same genotype, different gametes');
  assert.equal(deck.items.length, 12);
  assert.deepEqual(deck.concepts, ['Chromosome phase', 'Parental and recombinant gametes', 'Weighted test crosses', 'Interpreting recombination evidence']);
  assert.match(deck.license, /CC0-1.0/);
  assert.match(deck.attribution, /openstax.org/);
  assert.match(deck.attribution, /genome.gov/);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual(deck.items.map(item => item.id), [
    'gl-phase-1', 'gl-phase-2', 'gl-phase-3',
    'gl-recombination-1', 'gl-recombination-2', 'gl-recombination-3',
    'gl-testcross-1', 'gl-testcross-2', 'gl-testcross-3',
    'gl-evidence-1', 'gl-evidence-2', 'gl-evidence-3'
  ]);
  assert.ok(deck.items.every(item => item.explanation.length > 80 && item.transfer.length > 30));
});
test('worked numerical answers agree with the pure testcross model', () => {
  const item = id => deck.items.find(question => question.id === id);
  const chosen = id => { const q = item(id); return q.options[q.answer]; };
  const p = (phase, percent, gamete) => analyzeLinkage({ phase, recombinationPercent: percent }).rows.find(row => row.gamete === gamete).probability;
  const text = fraction => fraction.numerator + '/' + fraction.denominator;
  assert.equal(chosen('gl-recombination-1'), text(p('coupling', 20, 'AB')) + ' and ' + text(p('coupling', 20, 'Ab')));
  assert.equal(chosen('gl-testcross-2'), text(p('coupling', 40, 'ab')));
  assert.equal(chosen('gl-testcross-1'), 'aaBb');
  assert.ok(chosen('gl-testcross-3').startsWith(text(p('repulsion', 20, 'AB')) + ';'));
  assert.match(chosen('gl-evidence-1'), /does not establish chromosome location/);
  assert.match(chosen('gl-evidence-2'), /actual count.*can differ/);
});
test('deterministic checked-in HTML embeds the exact raw deck, not a reserialized substitute', () => {
  const before = inputs.map(file => readFileSync(join(root, file)));
  const html = buildGeneticLinkageLab();
  assert.equal(html, readFileSync(geneticLinkageLabPath, 'utf8'));
  assert.equal(buildGeneticLinkageLab(), html);
  const literal = html.match(/const LINKAGE_DECK_TEXT = (.*);\n/);
  assert.ok(literal);
  assert.equal(JSON.parse(literal[1]), courseText);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new vm.Script(scripts[0][1]);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:/);
  inputs.forEach((file, index) => assert.deepEqual(readFileSync(join(root, file)), before[index]));
});
test('standalone build CLI checks parity, rejects unknown flags without writes and follows its alias', () => {
  const dir = isolatedBuilder();
  try {
    const output = join(dir, 'courses/genetic-linkage-lab.html');
    let result = run(dir);
    assert.equal(result.status, 0, result.stderr);
    const first = readFileSync(output);
    result = run(dir, '--check');
    assert.equal(result.status, 0, result.stderr);
    for (const args of [['--unknown'], ['--check', '--check'], ['--check', 'extra']]) {
      result = run(dir, ...args);
      assert.notEqual(result.status, 0);
      assert.deepEqual(readFileSync(output), first);
    }
    const alias = join(dir, 'build-alias.mjs');
    symlinkSync(join(dir, 'tools/build-genetic-linkage.mjs'), alias);
    result = spawnSync(process.execPath, [alias, '--check'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    writeFileSync(output, 'stale');
    result = run(dir, '--check');
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(output, 'utf8'), 'stale');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('builder rejects ambiguous markers, unsupported declarations and script-closing source', () => {
  const dir = isolatedBuilder();
  try {
    const template = join(dir, 'templates/genetic-linkage-lab.html');
    const original = readFileSync(template, 'utf8');
    writeFileSync(template, original + '\n/* LINKAGE_UI */');
    assert.notEqual(run(dir).status, 0);
    writeFileSync(template, original);
    const model = join(dir, 'src/genetic-linkage.mjs');
    const source = readFileSync(model, 'utf8');
    writeFileSync(model, source + '\nexport class Unsupported {}\n');
    assert.notEqual(run(dir).status, 0);
    writeFileSync(model, source + '\n// </script>\n');
    assert.notEqual(run(dir).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
