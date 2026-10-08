import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {buildBooleanExplorer, renderBooleanExplorer} from '../tools/build-boolean-logic.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const inputs = () => ({template: read('templates/boolean-logic-explorer.html'), validator: read('src/deck.mjs'), model: read('src/boolean-logic.mjs'), ui: read('src/boolean-logic-ui.mjs'), deckText: read('courses/boolean-logic.json')});

test('the committed direct-file explorer exactly reproduces from its native modules and checked deck', () => {
  const built = buildBooleanExplorer();
  assert.equal(built, read('courses/boolean-logic-explorer.html'));
  assert.equal((built.match(/<script\b/gu) ?? []).length, 1);
  assert.equal((built.match(/<\/script>/gu) ?? []).length, 1);
  const script = /<script type="module">([\s\S]+)<\/script>/u.exec(built)[1];
  assert.doesNotThrow(() => new Script(script));
  assert.ok(!/^import\s/gmu.test(script));
  assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)\s*=/giu.test(built));
});

test('literal course content cannot close the embedded script and is retained byte-for-byte', () => {
  const input = inputs();
  const document = JSON.parse(input.deckText);
  document.title = 'Logic </script><img src=x> $& $` ${value} \u2028 title';
  input.deckText = JSON.stringify(document, null, 2) + '\n';
  const html = renderBooleanExplorer(input);
  assert.equal((html.match(/<\/script>/gu) ?? []).length, 1);
  const line = /const BOOLEAN_COURSE_TEXT = (.+);/u.exec(html)[1];
  assert.equal(JSON.parse(line), input.deckText);
  assert.ok(!html.includes('<img src=x>'));
});

test('builder refuses invalid decks and ambiguous template/source boundaries', () => {
  const input = inputs();
  assert.throws(() => renderBooleanExplorer({...input, deckText: '{}'}));
  assert.throws(() => renderBooleanExplorer({...input, template: input.template + '__BOOLEAN_MODEL__'}), /exactly one/);
  assert.throws(() => renderBooleanExplorer({...input, model: input.model + '\nconst x = "</script>";'}), /closing script/);
  assert.throws(() => renderBooleanExplorer({...input, ui: input.ui + '\nimport\n{x}\nfrom "missing";'}), /unsupported import/);
});
