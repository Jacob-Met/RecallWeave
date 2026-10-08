import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandout, createHandoutDocument} from '../src/course-handout.mjs';

const original = {
  "title": "A short activity <literal> 日本語",
  "attribution": "Original receiving fixture\nTeacher & group",
  "license": "Synthetic test content; retain this credit.",
  "concepts": [
    "First concept",
    "Second concept",
    "Unselected concept"
  ],
  "items": [
    {
      "id": "q-first",
      "concept": "First concept",
      "prerequisites": [],
      "prompt": "FIRST_PUBLIC_PROMPT",
      "options": [
        "A first",
        "B first"
      ],
      "answer": 1,
      "explanation": "FIRST_PRIVATE_EXPLANATION",
      "transfer": "FIRST_TRANSFER"
    },
    {
      "id": " q spaced ",
      "concept": "Second concept",
      "prerequisites": [
        "First concept"
      ],
      "prompt": "SECOND_PUBLIC_PROMPT <script>literal</script>\nNew line",
      "options": [
        "A second",
        "B second",
        "C second"
      ],
      "answer": 2,
      "explanation": "SECOND_PRIVATE_EXPLANATION",
      "transfer": "SECOND_TRANSFER"
    },
    {
      "id": "__proto__",
      "concept": "First concept",
      "prerequisites": [],
      "prompt": "THIRD_PUBLIC_PROMPT",
      "options": [
        "A third",
        "B third"
      ],
      "answer": 0,
      "explanation": "THIRD_PRIVATE_EXPLANATION",
      "transfer": "THIRD_TRANSFER"
    },
    {
      "id": "constructor",
      "concept": "Unselected concept",
      "prerequisites": [],
      "prompt": "FOURTH_EXCLUDED_PROMPT",
      "options": [
        "FOURTH_EXCLUDED_OPTION_A",
        "FOURTH_EXCLUDED_OPTION_B"
      ],
      "answer": 1,
      "explanation": "FOURTH_PRIVATE_EXPLANATION",
      "transfer": "FOURTH_EXCLUDED_TRANSFER"
    }
  ]
};
const lesson = () => structuredClone(original);
const hash = text => createHash('sha256').update(text).digest('hex');
const payload = html => JSON.parse(html.match(/<script id="handout-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test('selected questions retain source numbers and order, with only their source-ordered concepts', () => {
  const deck = lesson(), ids = ['__proto__', ' q spaced '];
  const before = structuredClone(deck);
  for (const kind of ['worksheet', 'answer-key']) {
    const result = createHandout(deck, kind, ids);
    assert.deepEqual(result.questions.map(q => q.id), [' q spaced ', '__proto__']);
    assert.deepEqual(result.questions.map(q => q.number), [2, 3]);
    assert.deepEqual(result.concepts, ['First concept', 'Second concept']);
    for (const field of ['title', 'attribution', 'license']) assert.equal(result[field], deck[field]);
    assert.deepEqual(result.questions.map(q => q.options), deck.items.slice(1, 3).map(q => q.options));
  }
  assert.deepEqual(ids, ['__proto__', ' q spaced ']);
  assert.deepEqual(deck, before);
});

test('complete selected worksheet excludes private data and omitted questions; the key matches its subset', () => {
  const deck = lesson(), ids = [' q spaced ', '__proto__'];
  const worksheet = createHandoutDocument(deck, 'worksheet', ids);
  assert.doesNotMatch(worksheet, /PRIVATE_EXPLANATION|FIRST_PUBLIC_PROMPT|FIRST_TRANSFER|FOURTH_EXCLUDED|Unselected concept/);
  const data = payload(worksheet);
  assert.deepEqual(data.questions.map(q => Object.keys(q)), [
    ['id', 'number', 'prompt', 'options', 'transfer'], ['id', 'number', 'prompt', 'options', 'transfer'],
  ]);
  const keyText = createHandoutDocument(deck, 'answer-key', ids), key = payload(keyText);
  assert.deepEqual(key.questions.map(q => [q.number, q.answer, q.explanation]), [
    [2, 2, 'SECOND_PRIVATE_EXPLANATION'], [3, 0, 'THIRD_PRIVATE_EXPLANATION'],
  ]);
  assert.doesNotMatch(keyText, /FIRST_PRIVATE_EXPLANATION|FOURTH_PRIVATE_EXPLANATION|FOURTH_EXCLUDED/);
  assert.equal(data.questions[0].prompt, deck.items[1].prompt);
  assert.doesNotMatch(worksheet, /<script>literal<\/script>/);
});

test('omitted selection and explicit all-selection retain captured legacy HTML bytes', () => {
  const expected = {
    worksheet: '5af58ee687c3f4c6c51d6e0a2e2a6b4c24b7217f31a3e65fead1f25dd85c0a24',
    'answer-key': '369e2722d7a2934177efd6442e0eaaa96a2e718ffc2cb2f47dc0b5e931f869fd',
  };
  const deck = lesson(), all = deck.items.map(q => q.id).reverse();
  for (const kind of ['worksheet', 'answer-key']) {
    const legacy = createHandoutDocument(deck, kind);
    assert.equal(hash(legacy), expected[kind]);
    assert.equal(createHandoutDocument(deck, kind, all), legacy);
    assert.deepEqual(createHandout(deck, kind, all), createHandout(deck, kind));
  }
});

test('selection refuses empty, duplicate, sparse, inherited, unknown and wrong-type IDs without mutation', () => {
  const sparse = new Array(2); sparse[1] = 'q-first';
  const inherited = new Array(1);
  Object.setPrototypeOf(inherited, Object.assign(Object.create(Array.prototype), {0: 'q-first'}));
  const invalid = [null, {}, '', 2, true, new Set(['q-first']), [], [undefined], [null], [0],
    ['missing'], ['q-first', 'q-first'], ['q-first', 'missing'], sparse, inherited,
    ['q-first', ' q spaced ', '__proto__', 'constructor', 'extra']];
  const deck = lesson(), before = structuredClone(deck);
  for (const ids of invalid) {
    assert.throws(() => createHandout(deck, 'worksheet', ids), /selection|select|question|Choose/i);
    assert.throws(() => createHandoutDocument(deck, 'answer-key', ids));
  }
  assert.deepEqual(deck, before);
});

test('exact text IDs are not trimmed, coerced or treated as object properties', () => {
  const deck = lesson();
  for (const id of [' q spaced ', '__proto__', 'constructor']) {
    assert.deepEqual(createHandout(deck, 'worksheet', [id]).questions.map(q => q.id), [id]);
  }
  for (const id of ['q spaced', ' Q spaced ', new String('__proto__')]) {
    assert.throws(() => createHandout(deck, 'worksheet', [id]));
  }
});

test('selecting a question does not silently add its prerequisite questions', () => {
  const only = createHandout(lesson(), 'worksheet', [' q spaced ']);
  assert.deepEqual(only.questions.map(q => q.number), [2]);
  assert.deepEqual(only.concepts, ['Second concept']);
});

test('the entire checked deck remains required and selected snapshots are detached and frozen', () => {
  const invalid = lesson(); invalid.items[3].answer = 99;
  assert.throws(() => createHandout(invalid, 'worksheet', ['q-first']), /answer/);
  const deck = lesson(), ids = [' q spaced '];
  const result = createHandout(deck, 'answer-key', ids);
  ids[0] = 'constructor'; deck.items[1].options[2] = 'changed'; deck.items[1].explanation = 'changed';
  assert.equal(result.questions[0].options[2], 'C second');
  assert.equal(result.questions[0].explanation, 'SECOND_PRIVATE_EXPLANATION');
  assert.throws(() => { result.questions[0].answer = 0; }, TypeError);
  assert.throws(() => result.concepts.push('new'), TypeError);
  assert.throws(() => result.questions[0].options.push('new'), TypeError);
});

test('all 100 admitted question identities retain their original numbering in arbitrary selection order', () => {
  const deck = lesson();
  deck.concepts = ['First concept'];
  deck.items = Array.from({length: 100}, (_, i) => ({...original.items[0], id: 'q-' + i}));
  const selected = ['q-99', 'q-0', 'q-50'];
  const result = createHandout(deck, 'answer-key', selected);
  assert.deepEqual(result.questions.map(q => q.number), [1, 51, 100]);
  assert.equal(createHandoutDocument(deck, 'worksheet', deck.items.map(q => q.id).reverse()), createHandoutDocument(deck));
});
