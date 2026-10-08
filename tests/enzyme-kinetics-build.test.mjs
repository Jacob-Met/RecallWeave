import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { buildEnzymeLab, enzymeLabPath } from '../tools/build-enzyme-kinetics.mjs';
import { parseDeck } from '../src/deck.mjs';

test('the committed standalone page exactly matches its native source builder', () => {
  const html = buildEnzymeLab();
  assert.equal(readFileSync(enzymeLabPath, 'utf8'), html);
  assert.doesNotMatch(html, /\/\*__ENZYME_/);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 2);
  new Script(scripts[1][1], { filename: 'enzyme-kinetics-standalone.js' });
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet/i);
  assert.doesNotMatch(scripts[1][1], /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
});

test('the actual embedded course text retains the qualified twelve-question identity byte for byte', () => {
  const html = buildEnzymeLab();
  const match = html.match(/<script id="enzyme-course-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const text = JSON.parse(match[1]);
  assert.equal(text, readFileSync(new URL('../courses/enzymes-energy-and-control.json', import.meta.url), 'utf8'));
  assert.equal(createHash('sha256').update(text).digest('hex'), 'f8539cc5ba82cdae6f128986cdec2d09b62d846c2cf3bc9bc221d406264ff64a');
  const deck = parseDeck(text);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.match(deck.items.find(item => item.id === 'enz-binding-2').prompt, /5\.0, 8\.0 and 9\.4/);
  assert.match(deck.items.find(item => item.id === 'enz-regulation-2').explanation, /does not by itself determine a complete kinetic inhibition class/);
});
