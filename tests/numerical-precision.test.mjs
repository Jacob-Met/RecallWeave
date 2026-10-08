import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { analyzeDecimalOperation, serializeWorkedExample, PRECISION_PRESETS } from '../src/numerical-precision.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const analyze = (a, op, b) => analyzeDecimalOperation(a, op, b);
const fraction = (record, key) => record.result[key].fraction;

test('small dyadic arithmetic keeps exact operand and result values', () => {
  const r = analyze('0.125', '+', '0.25');
  assert.equal(r.a.stored.fraction, '1/8');
  assert.equal(r.b.stored.fraction, '1/4');
  assert.equal(r.result.actual.fraction, '3/8');
  assert.equal(r.result.display, '0.375');
  assert.equal(r.result.exactMatch, true);
  for (const key of ['conversionContribution', 'arithmeticContribution', 'totalDiscrepancy']) {
    assert.equal(fraction(r, key), '0/1');
  }
  assert.equal(r.result.isInteger, false);
  assert.equal(r.result.isSafeInteger, false);
});

test('decimal sum retains exact conversion and operation contributions', () => {
  const r = analyze('0.1', '+', '0.2');
  assert.equal(r.a.stored.fraction, '3602879701896397/36028797018963968');
  assert.equal(r.a.conversionDiscrepancy.fraction, '1/180143985094819840');
  assert.equal(r.b.conversionDiscrepancy.fraction, '1/90071992547409920');
  assert.equal(fraction(r, 'decimalIntent'), '3/10');
  assert.equal(fraction(r, 'actual'), '1351079888211149/4503599627370496');
  assert.equal(fraction(r, 'conversionContribution'), '3/180143985094819840');
  assert.equal(fraction(r, 'arithmeticContribution'), '1/36028797018963968');
  assert.equal(fraction(r, 'totalDiscrepancy'), '1/22517998136852480');
  assert.equal(r.result.display, '0.30000000000000004');
  assert.equal(r.result.bits, '3fd3333333333334');
  assert.equal(r.result.exactMatch, false);
});

test('conversion can erase a difference while subtraction itself is exact', () => {
  const r = analyze('1.0000000000000001', '-', '1');
  assert.equal(r.a.stored.fraction, '1/1');
  assert.equal(r.b.stored.fraction, '1/1');
  assert.equal(r.result.decimalIntent.decimal, '0.0000000000000001');
  assert.equal(fraction(r, 'conversionContribution'), '-1/10000000000000000');
  assert.equal(fraction(r, 'arithmeticContribution'), '0/1');
  assert.equal(fraction(r, 'totalDiscrepancy'), '-1/10000000000000000');
  assert.equal(r.result.actual.decimal, '0');
});

test('operation rounding can lose an exact integer step', () => {
  const r = analyze('9007199254740992', '+', '1');
  assert.equal(r.a.conversionDiscrepancy.isZero, true);
  assert.equal(r.b.conversionDiscrepancy.isZero, true);
  assert.equal(r.result.decimalIntent.decimal, '9007199254740993');
  assert.equal(r.result.actual.decimal, '9007199254740992');
  assert.equal(fraction(r, 'conversionContribution'), '0/1');
  assert.equal(fraction(r, 'arithmeticContribution'), '-1/1');
  assert.equal(r.result.isInteger, true);
  assert.equal(r.result.isSafeInteger, false);
});

test('nonzero signed contributions can cancel at an exactly represented result', () => {
  const r = analyze('0.1', '+', '0.4');
  assert.equal(r.result.decimalIntent.decimal, '0.5');
  assert.equal(r.result.actual.decimal, '0.5');
  assert.equal(fraction(r, 'conversionContribution'), '1/36028797018963968');
  assert.equal(fraction(r, 'arithmeticContribution'), '-1/36028797018963968');
  assert.equal(fraction(r, 'totalDiscrepancy'), '0/1');
  assert.equal(r.result.exactMatch, true);
});

test('individual exact integers outside the safe interval are kept distinct from the API guarantee', () => {
  const r = analyze('9007199254740992', '+', '2');
  assert.equal(r.result.actual.decimal, '9007199254740994');
  assert.equal(r.result.exactMatch, true);
  assert.equal(r.result.isInteger, true);
  assert.equal(r.result.isSafeInteger, false);
  const lowerTie = analyze('9007199254740993', '+', '0');
  const upperTie = analyze('9007199254740995', '+', '0');
  assert.equal(lowerTie.a.stored.decimal, '9007199254740992');
  assert.equal(lowerTie.a.conversionDiscrepancy.decimal, '-1');
  assert.equal(upperTie.a.stored.decimal, '9007199254740996');
  assert.equal(upperTie.a.conversionDiscrepancy.decimal, '1');
});

test('signs, exact raw strings and negative zero remain explicit', () => {
  const r = analyze(' +000.125 ', '+', '-2.5');
  assert.equal(r.a.input, ' +000.125 ');
  assert.equal(r.a.exact.fraction, '1/8');
  assert.equal(r.result.actual.fraction, '-19/8');
  assert.equal(r.result.display, '-2.375');
  assert.equal(r.result.exactMatch, true);
  const zero = analyze('-0', '+', '-0.0');
  assert.equal(zero.result.actual.fraction, '0/1');
  assert.equal(zero.result.display, '-0');
  assert.equal(zero.result.bits, '8000000000000000');
  assert.equal(zero.result.isNegativeZero, true);
  assert.equal(zero.a.isNegativeZero, true);
  assert.equal(zero.b.isNegativeZero, true);
});

test('the declared decimal input bounds admit edges and refuse other syntax', () => {
  const small = analyze('0.000000000000000001', '-', '0');
  assert.equal(small.a.exact.fraction, '1/1000000000000000000');
  assert.equal(small.result.decimalIntent.decimal, '0.000000000000000001');
  const large = analyze('999999999999999999.999999999999999999', '+', '0');
  assert.equal(large.a.exact.fraction, '999999999999999999999999999999999999/1000000000000000000');
  for (const value of ['', ' ', null, 0, false, undefined, '1e3', 'Infinity', 'NaN',
    '1,000', '0x10', '1+2', '.5', '1.', '−1', '1'.repeat(19),
    '0.' + '1'.repeat(19), ' '.repeat(129) + '1']) {
    assert.throws(() => analyze(value, '+', '1'), error => error.field === 'a');
    assert.throws(() => analyze('1', '+', value), error => error.field === 'b');
  }
  for (const op of ['*', '/', '', null, '+ ', '__proto__']) {
    assert.throws(() => analyze('1', op, '2'), error => error.field === 'operation');
  }
});

test('worked records are complete, deterministic and deeply immutable', () => {
  const r = analyze('0.1', '+', '0.2');
  assert.equal(r.identityVerified, true);
  assert.equal(r.format, 'recallweave-numerical-worked/1');
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.a.stored) && Object.isFrozen(r.result));
  assert.throws(() => { r.result.actual.numerator = '0'; }, TypeError);
  const text = serializeWorkedExample('0.1', '+', '0.2');
  assert.equal(text, JSON.stringify(r, null, 2) + '\n');
  assert.deepEqual(JSON.parse(text), r);
  assert.equal(text, serializeWorkedExample('0.1', '+', '0.2'));
  assert.equal(PRECISION_PRESETS.length, 6);
  for (const preset of PRECISION_PRESETS) {
    assert.equal(analyze(preset.a, preset.operation, preset.b).identityVerified, true);
  }
});

test('the original lesson passes the unchanged native deck contract with exact export parity', async () => {
  const raw = await readFile(new URL('../courses/numerical-precision.json', import.meta.url), 'utf8');
  const deck = parseDeck(raw);
  assert.equal(deck.concepts.length, 4);
  assert.equal(deck.items.length, 12);
  assert.equal(serializeDeck(deck), raw);
  const counts = [0, 0, 0, 0];
  for (const item of deck.items) {
    assert.equal(item.options.length, 4);
    counts[item.answer]++;
  }
  assert.deepEqual(counts, [3, 3, 3, 3]);
});

test('language-specific worked examples agree with actual native Number and BigInt operations', () => {
  assert.equal(String(0.1 + 0.2), '0.30000000000000004');
  assert.equal(Number('1.0000000000000001') - 1, 0);
  const x = 0.1 + 0.2;
  assert.equal(x === 0.3, false);
  assert.equal(Math.abs(x - 0.3) <= 1e-12, true);
  assert.equal(x.toFixed(2), '0.30');
  assert.equal(x === 0.3, false);
  const a = 10000000000000000, b = -10000000000000000, c = 1;
  assert.equal((a + b) + c, 1);
  assert.equal(a + (b + c), 0);
  assert.equal(Number.MAX_SAFE_INTEGER, 9007199254740991);
  assert.equal(Number.MIN_SAFE_INTEGER, -9007199254740991);
  assert.equal(Number('9007199254740992') === Number('9007199254740993'), true);
  assert.equal(BigInt('9007199254740992') === BigInt('9007199254740993'), false);
  assert.equal(9007199254740992 + 2, 9007199254740994);
  assert.equal(Number.isSafeInteger(9007199254740994), false);
});

test('the directly openable explorer is an exact build of its native inputs', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const result = spawnSync(process.execPath, ['tools/build-numerical-precision.mjs', '--check'],
    { cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /matches its exact source inputs/);
});

test('embedded lesson download preserves exact source bytes', async () => {
  const [html, originalDeck, originalGuide] = await Promise.all([
    readFile(new URL('../courses/numerical-precision-explorer.html', import.meta.url), 'utf8'),
    readFile(new URL('../courses/numerical-precision.json', import.meta.url), 'utf8'),
    readFile(new URL('../courses/numerical-precision.md', import.meta.url), 'utf8')
  ]);
  assert.match(originalDeck, /</, 'the authored tolerance prompt exercises HTML-safe escaping');
  const payload = id => {
    const match = html.match(new RegExp('<script id="' + id + '" type="application/json">([\\s\\S]*?)</script>'));
    assert.ok(match, 'the standalone contains ' + id);
    return match[1];
  };
  const blobs = new Map();
  const downloaded = [];
  const elements = new Map();
  class Element {
    constructor(name) {
      this.name = name;
      this.children = [];
      this.dataset = {};
      this.attributes = new Map();
      this.listeners = new Map();
      this.textContent = '';
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(name, callback) {
      const callbacks = this.listeners.get(name) ?? [];
      callbacks.push(callback);
      this.listeners.set(name, callbacks);
    }
    focus() { document.activeElement = this; }
    remove() {}
    click() {
      if (this.name === 'a') downloaded.push({ name: this.download, blob: blobs.get(this.href) });
      for (const callback of this.listeners.get('click') ?? []) callback({ preventDefault() {} });
    }
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], new Element('existing'));
  const document = {
    body: new Element('body'),
    getElementById(id) {
      assert.ok(elements.has(id), 'the existing HTML declares ' + id);
      return elements.get(id);
    },
    createElement(name) { return new Element(name); }
  };
  document.getElementById('precision-deck-json').textContent = payload('precision-deck-json');
  document.getElementById('precision-guide-json').textContent = payload('precision-guide-json');
  assert.equal(payload('precision-deck-json').includes('<'), false, 'HTML-safe escaping remains enabled');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(script, 'the standalone contains the actual built model and UI');
  runInNewContext(script[1], {
    document, Blob,
    URL: {
      createObjectURL(blob) {
        const url = 'blob:receiving-' + blobs.size;
        blobs.set(url, blob);
        return url;
      },
      revokeObjectURL(url) { blobs.delete(url); }
    },
    setTimeout(callback) { callback(); return 0; }
  }, { timeout: 1000 });
  assert.equal(document.getElementById('number-result').textContent, '0.30000000000000004');
  assert.equal(document.getElementById('precision-questions').children.length, 12);
  document.getElementById('download-guide').click();
  document.getElementById('download-lesson').click();
  assert.deepEqual(downloaded.map(row => row.name), ['numerical-precision-guide.md', 'numerical-precision.json']);
  assert.equal(await downloaded[0].blob.text(), originalGuide, 'the existing guide download remains byte-preserved');
  const receivedDeck = await downloaded[1].blob.text();
  assert.deepEqual(JSON.parse(receivedDeck), JSON.parse(originalDeck), 'course semantics remain unchanged');
  assert.equal(Buffer.byteLength(receivedDeck), Buffer.byteLength(originalDeck),
    'lesson download preserves literal source bytes after HTML embedding');
  assert.equal(receivedDeck, originalDeck, 'the actual UI download handler restores all exact JSON source text');
});
