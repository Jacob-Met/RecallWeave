import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { MAX_DECK_BYTES, parseDeck, serializeDeck } from '../src/deck.mjs';
import { draftFromDeck, moveOption, moveQuestion, checkDraft } from '../src/deck-author.mjs';
import { createHandout, createHandoutDocument, handoutFilename } from '../src/course-handout.mjs';

function lesson() {
  return {
    title: '  Café <lesson> 名称\nA → B  ',
    attribution: 'Test author & co.\r\n<script>literal credit</script>',
    license: 'Original synthetic fixture.\nKeep this exact permission.',
    concepts: ['First “idea”', 'Next <idea>'],
    items: [
      { id: 'z-last-name', concept: 'First “idea”', prerequisites: [],
        prompt: 'First prompt: </script><img src=x onerror="globalThis.leaked=1"> 😀\r\nNew line & <literal>',
        options: ['First <option>', 'Second\noption “é”'], answer: 1,
        explanation: 'PRIVATE_EXPLANATION_ONE \u2028\u2029 </script><script>globalThis.leaked=2</script>',
        transfer: 'Apply <this> idea.\nExplain your choice.' },
      { id: 'a-first-name', concept: 'Next <idea>', prerequisites: ['First “idea”'],
        prompt: 'Second prompt with four choices.',
        options: ['Correct A', 'B', 'C', 'D'], answer: 0,
        explanation: 'PRIVATE_EXPLANATION_TWO', transfer: 'Write a new example.' },
      { id: 'middle', concept: 'Next <idea>', prerequisites: [],
        prompt: 'Third prompt with six choices.',
        options: ['A', 'B', 'C', 'D', 'E', 'Correct F'], answer: 5,
        explanation: 'PRIVATE_EXPLANATION_THREE', transfer: 'Apply the third example.' },
    ],
  };
}

function payload(html) {
  const match = html.match(/<script id="handout-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'standalone output must contain its explicit document projection');
  return JSON.parse(match[1]);
}

test('worksheet projection contains only original public question fields in canonical order', () => {
  const source = lesson();
  source.extra = { answer: 0, explanation: 'UNRELATED_PRIVATE_FIELD' };
  source.items[0].internal = { answer: 1 };
  const handout = createHandout(source);
  assert.deepEqual(Object.keys(handout), ['kind', 'title', 'attribution', 'license', 'concepts', 'questions']);
  assert.equal(handout.kind, 'worksheet');
  for (const field of ['title', 'attribution', 'license', 'concepts']) assert.deepEqual(handout[field], source[field]);
  assert.deepEqual(handout.questions.map(question => question.id), ['z-last-name', 'a-first-name', 'middle']);
  assert.deepEqual(handout.questions.map(question => question.number), [1, 2, 3]);
  handout.questions.forEach((question, index) => {
    assert.deepEqual(Object.keys(question), ['id', 'number', 'prompt', 'options', 'transfer']);
    for (const field of ['prompt', 'options', 'transfer']) assert.deepEqual(question[field], source.items[index][field]);
  });
  assert.doesNotMatch(JSON.stringify(handout), /PRIVATE_EXPLANATION|UNRELATED_PRIVATE_FIELD|"answer":|"explanation":/);
});

test('separate answer key maps B, A and F to the original two, four and six option arrays', () => {
  const source = lesson();
  const key = createHandout(source, 'answer-key');
  assert.equal(key.kind, 'answer-key');
  assert.deepEqual(key.questions.map(question => question.answer), [1, 0, 5]);
  assert.deepEqual(key.questions.map(question => String.fromCharCode(65 + question.answer)), ['B', 'A', 'F']);
  assert.deepEqual(key.questions.map(question => question.options[question.answer]), ['Second\noption “é”', 'Correct A', 'Correct F']);
  key.questions.forEach((question, index) => {
    assert.equal(question.explanation, source.items[index].explanation);
    assert.equal(question.transfer, source.items[index].transfer);
  });
});

test('projection is a frozen snapshot and cannot mutate or alias the selected deck', () => {
  const source = lesson();
  const before = JSON.stringify(source);
  const worksheet = createHandout(source);
  const key = createHandout(source, 'answer-key');
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(worksheet.questions[0].options, source.items[0].options);
  assert.throws(() => worksheet.questions[0].options.push('extra'), TypeError);
  assert.throws(() => { key.questions[0].answer = 0; }, TypeError);
  assert.throws(() => { worksheet.title = 'Changed'; }, TypeError);
  source.items[0].options[1] = 'Changed after selection';
  source.items[0].explanation = 'Changed explanation';
  source.concepts[0] = 'Changed concept';
  assert.equal(worksheet.questions[0].options[1], 'Second\noption “é”');
  assert.equal(key.questions[0].explanation, lesson().items[0].explanation);
  assert.deepEqual(worksheet.concepts, lesson().concepts);
});

test('downloaded worksheet JSON and HTML omit authored answers and explanations', () => {
  const html = createHandoutDocument(lesson(), 'worksheet');
  const result = payload(html);
  assert.deepEqual(result, JSON.parse(JSON.stringify(createHandout(lesson()))));
  assert.doesNotMatch(html, /PRIVATE_EXPLANATION_ONE|PRIVATE_EXPLANATION_TWO|PRIVATE_EXPLANATION_THREE/);
  assert.equal(result.questions.some(question => Object.hasOwn(question, 'answer') || Object.hasOwn(question, 'explanation')), false);
  assert.match(html, /id="print-handout" type="button">Print worksheet<\/button>/);
  assert.doesNotMatch(html, /type="module"|<script[^>]+src=|<link[^>]+stylesheet|<iframe\b/i);
});

test('downloaded answer key carries exact authored answers, explanations and credit', () => {
  const result = payload(createHandoutDocument(lesson(), 'answer-key'));
  assert.deepEqual(result, JSON.parse(JSON.stringify(createHandout(lesson(), 'answer-key'))));
  assert.equal(result.attribution, lesson().attribution);
  assert.equal(result.license, lesson().license);
  assert.deepEqual(result.questions.map(question => question.answer), [1, 0, 5]);
  assert.deepEqual(result.questions.map(question => question.explanation), lesson().items.map(item => item.explanation));
});

test('literal Unicode, markup, line endings and script delimiters survive JSON without becoming executable markup', () => {
  const source = lesson();
  source.items[0].prompt += '\u0000\u2028\u2029\ud800';
  for (const kind of ['worksheet', 'answer-key']) {
    const html = createHandoutDocument(source, kind);
    const result = payload(html);
    assert.equal(result.questions[0].prompt, source.items[0].prompt);
    assert.equal(result.title, source.title);
    assert.equal(result.attribution, source.attribution);
    assert.equal(html.match(/<script\b/g)?.length, 2, 'only the data script and renderer script may exist');
    assert.equal(html.match(/<\/script>/g)?.length, 2);
    assert.doesNotMatch(html, /<img src=x|<script>globalThis\.leaked/);
    const dataText = html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1];
    assert.doesNotMatch(dataText, /[<>&\u2028\u2029]/);
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Script(match[1]));
  }
});

test('real Deck studio checked downloads retain reordered questions and answer identity', () => {
  const draft = draftFromDeck(lesson());
  const first = draft.questions[0];
  moveOption(draft, first.key, first.options[1].key, -1);
  moveQuestion(draft, draft.questions[2].key, -1);
  const checked = checkDraft(draft);
  assert.equal(checked.ok, true);
  const downloaded = parseDeck(checked.json);
  const worksheet = createHandout(downloaded);
  const key = createHandout(downloaded, 'answer-key');
  assert.deepEqual(worksheet.questions.map(question => question.id), ['z-last-name', 'middle', 'a-first-name']);
  assert.deepEqual(worksheet.questions[0].options, ['Second\noption “é”', 'First <option>']);
  assert.deepEqual(key.questions.map(question => question.answer), [0, 5, 0]);
  assert.equal(key.questions[0].options[key.questions[0].answer], 'Second\noption “é”');
});

test('real parser rejects malformed, unsupported and oversized local deck input', () => {
  assert.throws(() => parseDeck('{ "title":'), /not valid JSON/);
  const wrongVersion = lesson();
  wrongVersion.format = 'recallweave-deck/999';
  assert.throws(() => parseDeck(JSON.stringify(wrongVersion)), /format/);
  const bytes = JSON.stringify(lesson()) + ' '.repeat(MAX_DECK_BYTES);
  assert.throws(() => parseDeck(bytes), /256 KiB/);
  assert.equal(createHandout(parseDeck(serializeDeck(lesson()))).questions.length, 3);
});

test('handout creation refuses invalid deck answers instead of producing an untrustworthy key', () => {
  for (const answer of [-1, 2, 1.5, '1', null]) {
    const source = lesson();
    source.items[0].answer = answer;
    assert.throws(() => createHandout(source), /answer/);
    assert.throws(() => createHandoutDocument(source, 'answer-key'), /answer/);
  }
});

test('document modes are explicit and invalid choices never silently produce an answer key', () => {
  for (const kind of ['answers', '', null, 0, true]) {
    assert.throws(() => createHandout(lesson(), kind), /worksheet or answer-key/);
    assert.throws(() => createHandoutDocument(lesson(), kind), /worksheet or answer-key/);
    assert.throws(() => handoutFilename('Lesson', kind), /worksheet or answer-key/);
  }
  assert.equal(payload(createHandoutDocument(lesson())).kind, 'worksheet');
});

test('worksheet and key filenames are distinct bounded local names', () => {
  assert.equal(handoutFilename('Café / lesson'), 'Cafe-lesson.worksheet.html');
  assert.equal(handoutFilename('Café / lesson', 'answer-key'), 'Cafe-lesson.answer-key.html');
  assert.equal(handoutFilename('../../'), 'course.worksheet.html');
  assert.equal(handoutFilename('名称', 'answer-key'), 'course.answer-key.html');
  assert.ok(handoutFilename('x'.repeat(160)).length <= 75);
});

test('repeat exports are deterministic and leave the original selected JSON unchanged', () => {
  const source = lesson();
  const before = JSON.stringify(source);
  const worksheet = createHandoutDocument(source);
  const key = createHandoutDocument(source, 'answer-key');
  assert.equal(createHandoutDocument(source), worksheet);
  assert.equal(createHandoutDocument(source, 'answer-key'), key);
  assert.equal(JSON.stringify(source), before);
});
