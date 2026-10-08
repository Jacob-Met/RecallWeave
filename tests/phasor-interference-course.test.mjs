import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';

const raw = await readFile(new URL('../courses/phasor-interference.json', import.meta.url), 'utf8');
const deck = parseDeck(raw);

test('the original phasor course meets the complete native deck contract', () => {
  assert.ok(Buffer.byteLength(raw) < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(raw), deck);
  assert.equal(deck.items.length, 16);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 4);
  assert.deepEqual([0,1,2,3].map(index => deck.items.filter(item => item.answer === index).length), [4,4,4,4]);
  assert.match(deck.attribution, /cosine convention/);
  assert.match(deck.license, /CC0-1\.0/);
  for (const item of deck.items) {
    assert.match(item.id, /^phasor-/);
    assert.equal(item.options.length, 4);
    assert.ok(item.explanation.length > 120);
    assert.ok(item.transfer.length > 45);
  }
});

test('the unchanged native selector reaches every imported item with bounded mastery estimates', () => {
  const mastery = initialMastery(deck.concepts);
  for (const concept of deck.concepts) mastery[concept] = concept === 'complex-amplitude' ? .01 : .95;
  assert.equal(selectNextItem(deck.items,new Set(),mastery).concept, 'complex-amplitude');
  const asked = new Set();
  for (let i=0;i<16;i++) {
    const item = selectNextItem(deck.items,asked,mastery);
    assert.ok(item && !asked.has(item.id));
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], i%3!==0);
    assert.ok(mastery[item.concept]>=0 && mastery[item.concept]<=1 && Number.isFinite(mastery[item.concept]));
  }
  assert.equal(asked.size,16);
  assert.equal(selectNextItem(deck.items,asked,mastery),null);
  assert.deepEqual(parseDeck(raw),deck);
});

test('course answer identities agree with the separately solved blind receiving key', () => {
  // /root/windows_runtime froze these answers from prompts/options before seeing authored keys.
  const independent = [2,0,3,1,1,3,0,2,3,2,1,0,0,2,1,3];
  assert.deepEqual(deck.items.map(item=>item.answer),independent);
  const correct = id => { const q=deck.items.find(item=>item.id===id); return q.options[q.answer]; };
  assert.equal(Number(correct('phasor-modulus')),Math.hypot(-3,4));
  assert.equal(Number(correct('phasor-in-phase')),1.5+2.5);
  assert.equal(Number(correct('phasor-quadrature')),Math.hypot(3,4));
  const meanSquare=(2**2+2**2+2*2*2*Math.cos(Math.PI/3))/2;
  assert.ok(Math.abs(Number(correct('phasor-cycle-mean-square'))-meanSquare)<1e-12);
  assert.match(correct('phasor-zero-phase'), /undefined/);
  assert.match(correct('phasor-phase-lead'), /leads x by 0.125/);
  assert.match(deck.items.find(q=>q.id==='phasor-cycle-mean-square').explanation,/not a calibrated intensity/);
});
