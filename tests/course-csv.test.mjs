import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COURSE_CSV_COLUMNS, COURSE_CSV_TEMPLATE, MAX_COURSE_CSV_BYTES, convertCourseCsv
} from '../src/course-csv.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { buildCourseCsv } from '../tools/build_csv_course.mjs';

const metadata = { title: 'A recorded sequence', attribution: 'Original synthetic test fixture.', license: 'Synthetic test content.' };
const columns = ['id', 'concept', 'prompt', 'option_1', 'option_2', 'option_3',
  'option_4', 'option_5', 'option_6', 'correct_option', 'explanation', 'transfer', 'prerequisites'];
const required = ['id', 'concept', 'prompt', 'option_1', 'option_2',
  'correct_option', 'explanation', 'transfer'];
const row = overrides => ({
  id: 'q-1', concept: 'root', prompt: 'Which entry is first?',
  option_1: 'A', option_2: 'B', option_3: '', option_4: '', option_5: '', option_6: '',
  correct_option: '1', explanation: 'A was recorded first.', transfer: 'Describe the recorded order.',
  prerequisites: '', ...overrides
});
const quote = value => '"' + value.replaceAll('"', '""') + '"';
function csv(rows, header = columns, ending = '\r\n') {
  return [header, ...rows.map(record => header.map(name => Object.hasOwn(record, name) ? record[name] : ''))]
    .map(record => record.map(quote).join(',')).join(ending) + ending;
}
const convert = (rows, header = columns, meta = metadata) => convertCourseCsv(csv(rows, header), meta);
const reject = (rows, pattern, header = columns) => assert.throws(() => convert(rows, header), pattern);

test('the explicit template is checked native JSON with a literal numbered answer key', () => {
  assert.deepEqual(COURSE_CSV_COLUMNS, columns);
  const result = convertCourseCsv(COURSE_CSV_TEMPLATE, metadata);
  assert.equal(result.deck.items.length, 2);
  assert.deepEqual(result.deck.concepts, ['observation', 'sequence']);
  assert.deepEqual(result.deck.items.map(item => item.answer), [1, 0]);
  assert.deepEqual(result.deck.items[1].prerequisites, ['observation']);
  assert.equal(result.json, serializeDeck(result.deck));
  assert.deepEqual(parseDeck(result.json), result.deck);
  assert.equal(result.json.endsWith('\n'), true);
  assert.equal(readFileSync(new URL('../examples/course-question-bank.csv', import.meta.url), 'utf8'), COURSE_CSV_TEMPLATE);
});

test('one template mixes two through six options without padding the native choices', () => {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const count = index + 2;
    const record = row({ id: 'q-' + count, correct_option: String(count) });
    for (let number = 1; number <= 6; number++) record['option_' + number] = number <= count ? 'Choice ' + number : '';
    return record;
  });
  const result = convert(rows);
  assert.deepEqual(result.deck.items.map(item => item.options.length), [2, 3, 4, 5, 6]);
  assert.deepEqual(result.deck.items.map(item => item.answer), [1, 2, 3, 4, 5]);
  assert.deepEqual(result.deck.items.map(item => item.id), rows.map(item => item.id));
});

test('required-only headers and their reordered positions preserve exact cell bindings', () => {
  const record = row();
  const reversed = [...required].reverse();
  assert.deepEqual(convert([record], required), convert([record], reversed));
  assert.deepEqual(convert([record], required).deck.items[0].prerequisites, []);
});

test('text, CRLF/LF/bare CR inside quotes, commas, quotes, Unicode and markup stay literal', () => {
  const record = row({
    id: ' id 1 ', concept: '概念, "one"',
    prompt: 'Before\r\nAfter\nThen\rLast <script>literal text</script>',
    option_1: ' A,\n"quoted" ', option_2: 'é 😀\tvalue',
    explanation: 'Why\r\nexactly', transfer: 'Try <b>this</b>',
    correct_option: '2'
  });
  const meta = { title: '  Title\nkept  ', attribution: ' A\r\nB ', license: '許可 "provided"' };
  const result = convert([record], columns, meta);
  for (const name of ['id', 'concept', 'prompt', 'explanation', 'transfer']) assert.equal(result.deck.items[0][name], record[name]);
  assert.deepEqual(result.deck.items[0].options, [record.option_1, record.option_2]);
  assert.equal(result.deck.items[0].answer, 1);
  assert.equal(result.deck.title, meta.title);
  assert.equal(result.deck.attribution, meta.attribution);
  assert.equal(result.deck.license, meta.license);
});

test('first-seen concepts and prototype-shaped names keep native identity', () => {
  const rows = [row({ id: '__proto__', concept: '__proto__' }),
    row({ id: 'constructor', concept: 'constructor', prerequisites: '["__proto__"]' }),
    row({ id: 'other', concept: '__proto__' }),
    row({ id: 'spaces', concept: ' __proto__ ' })];
  const result = convert(rows);
  assert.deepEqual(result.deck.concepts, ['__proto__', 'constructor', ' __proto__ ']);
  assert.deepEqual(result.deck.items.map(item => item.id), ['__proto__', 'constructor', 'other', 'spaces']);
});

test('a BOM and LF or CRLF record endings produce the same admitted deck', () => {
  const rows = [row()];
  const expected = convert(rows);
  assert.deepEqual(convertCourseCsv('\uFEFF' + csv(rows), metadata), expected);
  assert.deepEqual(convertCourseCsv(csv(rows, columns, '\n'), metadata), expected);
  assert.deepEqual(convertCourseCsv(csv(rows).slice(0, -2), metadata), expected);
});

test('the result is detached and deeply frozen through native admission', () => {
  const meta = { ...metadata };
  const result = convert([row()], columns, meta);
  meta.title = 'Changed after admission';
  assert.equal(result.deck.title, metadata.title);
  for (const value of [result, result.deck, result.deck.concepts, result.deck.items,
    result.deck.items[0], result.deck.items[0].options, result.deck.items[0].prerequisites]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => { result.deck.items[0].answer = 1; }, TypeError);
});

test('duplicate headers report both original one-based positions', () => {
  const header = [...columns]; header[1] = 'id';
  assert.throws(() => convertCourseCsv(csv([row()], header), metadata), /"id".*columns 1 and 2/);
});

for (const name of ['ID', ' id', 'id ', 'option_0', 'answer', '__proto__']) {
  test('unknown header refuses exact spelling: ' + JSON.stringify(name), () => {
    const header = [...columns]; header[0] = name;
    assert.throws(() => convertCourseCsv(csv([row()], header), metadata), /header column 1 is unknown/);
  });
}
test('missing required headers and gapped optional header sets are refused', () => {
  reject([row()], /missing required column "id"/, columns.filter(name => name !== 'id'));
  reject([row()], /"option_4" without "option_3"/, columns.filter(name => name !== 'option_3'));
});

test('missing and extra data fields fail at their source record', () => {
  const header = required.map(quote).join(',') + '\n';
  for (const width of [7, 9]) {
    assert.throws(() => convertCourseCsv(header + Array(width).fill('"x"').join(','), metadata),
      new RegExp('CSV record 2.*expected 8 fields, received ' + width));
  }
});

test('extra blank records and absent question records are never silently skipped', () => {
  assert.throws(() => convertCourseCsv(csv([row()]) + '\r\n', metadata), /CSV record 3.*expected 13 fields, received 1/);
  assert.throws(() => convertCourseCsv(columns.map(quote).join(','), metadata), /at least one question/);
  for (const text of ['', '\uFEFF']) assert.throws(() => convertCourseCsv(text, metadata), /needs a header/);
});

for (const [name, text, pattern] of [
  ['unclosed field', '"unclosed', /no closing quote/],
  ['quote in a plain field', 'plain"quote', /quote must start a field/],
  ['characters after a closing quote', '"closed"junk', /only a comma/],
  ['whitespace after a closing quote', '"closed" ', /only a comma/]
]) {
  test('ambiguous CSV refuses ' + name, () => {
    assert.throws(() => convertCourseCsv(columns.map(quote).join(',') + '\n' + text, metadata), pattern);
  });
}
test('a bare CR between records is refused rather than guessed', () => {
  assert.throws(() => convertCourseCsv(csv([row()], columns, '\r'), metadata), /bare CR is ambiguous/);
});

for (const answer of ['0', '7', '01', '+1', '1.0', '1e0', ' 1', '1 ', 'A', '１', '', '3']) {
  test('ambiguous or absent answer reference refuses ' + JSON.stringify(answer), () => {
    reject([row({ correct_option: answer })], /correct_option.*one digit/);
  });
}
test('internal option gaps and whitespace-only required options refuse the entire bank', () => {
  reject([row({ option_2: '', option_3: 'C' })], /option_3.*follows an empty option/);
  reject([row({ option_1: '' })], /option_2.*follows an empty option/);
  reject([row({ option_1: '   ' })], /options\[0\].*nonempty/);
  reject([row({ option_2: 'A' })], /options must be distinct/);
});

test('malformed or non-array prerequisite cells fail without substituting empty links', () => {
  for (const cell of ['["root"', '{}', 'null', '"root"', '[1]']) {
    reject([row({ id: 'a' }), row({ id: 'b', concept: 'tail', prerequisites: cell })], /prerequisites/);
  }
});
test('native unknown, duplicate, self and cross-question cycle constraints stay authoritative', () => {
  for (const links of ['["ghost"]', '["root","root"]', '["tail"]']) {
    reject([row({ id: 'a' }), row({ id: 'b', concept: 'tail', prerequisites: links })], /prerequisites|own concept/);
  }
  reject([row({ id: 'a', prerequisites: '["tail"]' }),
    row({ id: 'b', concept: 'tail', prerequisites: '["root"]' })], /must not form a cycle/);
});

test('a later duplicate ID or invalid required field prevents a complete result', () => {
  reject([row(), row()], /CSV record 3.*duplicates another question ID/);
  for (const field of ['id', 'concept', 'prompt', 'explanation', 'transfer']) {
    reject([row({ id: 'first' }), row({ id: 'second', [field]: '' })], /nonempty/);
  }
});

test('native metadata and field bounds are not relaxed by CSV conversion', () => {
  for (const meta of [
    { ...metadata, title: '' }, { ...metadata, title: 'x'.repeat(161) },
    { ...metadata, attribution: '' }, { ...metadata, license: '' }, {}
  ]) assert.throws(() => convert([row()], columns, meta), /nonempty text/);
  for (const [field, length] of [['id', 81], ['concept', 81], ['prompt', 2001],
    ['option_1', 1001], ['explanation', 4001], ['transfer', 2001]]) {
    reject([row({ [field]: 'x'.repeat(length) })], /at most/);
  }
});

test('the native 100-question and 32-concept boundary is retained without reordering', () => {
  const rows = Array.from({ length: 100 }, (_, index) => row({ id: 'q-' + index, concept: 'c-' + (index % 32) }));
  const result = convert(rows);
  assert.equal(result.deck.items.length, 100);
  assert.equal(result.deck.concepts.length, 32);
  assert.deepEqual(result.deck.items.map(item => item.id), rows.map(record => record.id));
  reject([...rows, row({ id: 'overflow' })], /at most 100 question/);
  reject(Array.from({ length: 33 }, (_, index) => row({ id: 'q-' + index, concept: 'c-' + index })), /concepts must contain 1–32/);
});

test('input admission counts UTF-8 bytes and rejects non-text inputs', () => {
  assert.equal(MAX_COURSE_CSV_BYTES, 262144);
  for (const value of [null, {}, 1, 'é'.repeat(MAX_COURSE_CSV_BYTES / 2 + 1)]) {
    assert.throws(() => convertCourseCsv(value, metadata), /UTF-8 CSV no larger than 256 KiB/);
  }
});
test('JSON escaping expansion is checked at the exact downloadable output', () => {
  const rows = Array.from({ length: 100 }, (_, index) => row({
    id: 'q-' + index, option_1: '\\'.repeat(950), option_2: '\\'.repeat(949) + 'X'
  }));
  const text = csv(rows);
  assert.ok(new TextEncoder().encode(text).length < MAX_COURSE_CSV_BYTES);
  assert.throws(() => convertCourseCsv(text, metadata), /JSON deck no larger than 256 KiB/);
});

test('seeded varied literal fields round-trip through the actual converter and native parser', () => {
  let state = 17021;
  const characters = ['x', ',', '"', '\n', '\r\n', '\t', 'é', '界', '😀', ' ', '<b>', '\\'];
  const text = seed => {
    let value = 'literal-' + seed + ':';
    for (let count = 0; count < 18; count++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      value += characters[state % characters.length];
    }
    return value;
  };
  for (let seed = 0; seed < 32; seed++) {
    const count = seed % 5 + 2;
    const record = row({ id: 'seed-' + seed, prompt: text(seed), correct_option: String(count),
      explanation: text(seed + 100), transfer: text(seed + 200) });
    for (let number = 1; number <= 6; number++) record['option_' + number] = number <= count ? text(seed + 1000 * number) : '';
    const result = convert([record], seed % 2 ? [...columns].reverse() : columns);
    const item = parseDeck(result.json).items[0];
    for (const name of ['id', 'prompt', 'explanation', 'transfer']) assert.equal(item[name], record[name]);
    assert.deepEqual(item.options, Array.from({ length: count }, (_, number) => record['option_' + (number + 1)]));
    assert.equal(item.answer, count - 1);
  }
});

test('checked-in standalone page and downloadable CSV exactly match the scoped builder', () => {
  const built = buildCourseCsv();
  assert.equal(readFileSync(new URL('../csv-course.html', import.meta.url), 'utf8'), built.page);
  assert.equal(readFileSync(new URL('../examples/course-question-bank.csv', import.meta.url), 'utf8'), built.template);
  assert.doesNotMatch(built.page, /\/\* COURSE_CSV_(?:DECK_SOURCE|SOURCE|UI_SOURCE) \*\//);
});
