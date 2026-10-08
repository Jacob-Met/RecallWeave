import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { renderInformationExplorer } from '../tools/build-information-theory.mjs';

const files = {
  template: '../courses/information-theory-explorer.template.html',
  model: '../src/information-theory.mjs',
  ui: '../src/information-theory-ui.mjs',
  courseText: '../courses/information-theory.json',
  guideText: '../courses/information-theory.md'
};
const inputs = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, relative]) =>
  [key, await readFile(new URL(relative, import.meta.url), 'utf8')])));
const generated = await readFile(new URL('../courses/information-theory-explorer.html', import.meta.url), 'utf8');

function scriptFrom(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'Expected an inline application script');
  return match[1];
}
function savedText(script, variable) {
  const match = script.match(new RegExp('^const ' + variable + ' = (.+);$', 'm'));
  assert.ok(match, 'Expected an exact embedded text constant');
  return JSON.parse(match[1]);
}

test('the unchanged learner importer accepts the complete sixteen-question lesson', () => {
  assert.ok(Buffer.byteLength(inputs.courseText, 'utf8') < MAX_DECK_BYTES);
  const parsed = parseDeck(inputs.courseText);
  assert.equal(parsed.items.length, 16);
  assert.equal(parsed.concepts.length, 5);
  assert.deepEqual(parsed, JSON.parse(inputs.courseText));
  assert.deepEqual(parseDeck(serializeDeck(parsed)), parsed);
  assert.equal(Object.isFrozen(parsed.items[0].options), true);
  assert.equal(Object.isFrozen(parsed.items[0].prerequisites), true);
  assert.match(parsed.attribution, /AI/i);
  assert.match(parsed.license, /CC0-1\.0/);
  for (const item of parsed.items) {
    assert.equal(item.options.length, 4);
    assert.ok(item.explanation.trim().length > 0);
    assert.ok(item.transfer.trim().length > 0);
  }
});

test('generated artifact is deterministic, script-complete and bound by its CSP hash', () => {
  assert.equal(renderInformationExplorer(inputs), generated);
  const script = scriptFrom(generated);
  assert.doesNotThrow(() => new vm.Script(script));
  const digest = createHash('sha256').update(script, 'utf8').digest('base64');
  assert.ok(generated.includes("script-src 'sha256-" + digest + "'"));
  assert.ok(generated.includes("connect-src 'none'"));
  assert.equal((generated.match(/<script>/g) || []).length, 1);
  assert.equal((generated.match(/<\/script>/g) || []).length, 1);
  assert.ok(!generated.includes('__INFORMATION_SCRIPT'));
});

test('embedded course and guide preserve exact authored bytes without reserialization', () => {
  const script = scriptFrom(generated);
  assert.equal(savedText(script, 'informationCourseText'), inputs.courseText);
  assert.equal(savedText(script, 'informationGuideText'), inputs.guideText);
  assert.deepEqual(Buffer.from(savedText(script, 'informationCourseText'), 'utf8'), Buffer.from(inputs.courseText, 'utf8'));
  const ids = parseDeck(inputs.courseText).items.map(item => item.id);
  for (const id of ids) assert.ok(inputs.guideText.includes(id), 'Missing worked transfer for ' + id);
});

test('script-like text and line separators remain inert exact download content', () => {
  const deck = JSON.parse(inputs.courseText);
  deck.attribution += '\nLiteral <script> & </script> \u2028 \u2029';
  const courseText = JSON.stringify(deck, null, 2) + '\r\n';
  const guideText = 'Literal </script><script>throw new Error("text only")</script>\r\n\u2028\u2029 & < >\n';
  const html = renderInformationExplorer({ ...inputs, courseText, guideText });
  const script = scriptFrom(html);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.equal(savedText(script, 'informationCourseText'), courseText);
  assert.equal(savedText(script, 'informationGuideText'), guideText);
  assert.equal(parseDeck(savedText(script, 'informationCourseText')).items.length, 16);
});

test('assembly refuses missing or duplicated markers and unexpected module dependencies', () => {
  assert.throws(() => renderInformationExplorer({ ...inputs, template: inputs.template.replace('__INFORMATION_SCRIPT__', '') }), /exactly one/);
  assert.throws(() => renderInformationExplorer({ ...inputs, template: inputs.template + '__INFORMATION_SCRIPT__' }), /exactly one/);
  assert.throws(() => renderInformationExplorer({ ...inputs, ui: 'import unrelated from "./other.mjs";\n' + inputs.ui }), /model import/);
  assert.throws(() => renderInformationExplorer({ ...inputs, model: inputs.model + '\nimport other from "./other.mjs";\n' }), /module dependency/);
  assert.throws(() => renderInformationExplorer({ ...inputs, model: inputs.model + '\n// </script>\n' }), /script terminator/);
  assert.throws(() => renderInformationExplorer({ ...inputs, guideText: null }), TypeError);
});
