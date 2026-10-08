import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { makeBoundaryDraft } from './make-boundary-draft.mjs';
const sourceRoot = path.resolve(process.argv[2]);
const output = process.argv[3];
const module = await import(pathToFileURL(path.join(sourceRoot, 'src/deck-author-draft.mjs')));
const core = await import(pathToFileURL(path.join(sourceRoot, 'src/deck-author.mjs')));
const hash = text => createHash('sha256').update(text).digest('hex');
const files = ['src/deck-author-draft.mjs', 'src/deck-author.mjs', 'src/deck.mjs'];
const admission = () => files.map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(sourceRoot, file))) }));
const before = admission();
const results = [];
const observations = {};
function receive(name, action) {
  try { action(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message, stack: error.stack }); }
}
// The expected values below are authored independently of editor private keys.
function semantic(draft) {
  const conceptPosition = new Map(draft.concepts.map((c, i) => [c.key, i]));
  return {
    title: draft.title, attribution: draft.attribution, license: draft.license,
    concepts: draft.concepts.map(c => c.name),
    questions: draft.questions.map(q => ({
      id: q.id, concept: q.conceptKey === null ? null : conceptPosition.get(q.conceptKey),
      prerequisites: q.prerequisiteKeys.map(key => conceptPosition.get(key)),
      prompt: q.prompt, options: q.options.map(o => o.text),
      answer: q.answerKey === null ? null : q.options.findIndex(o => o.key === q.answerKey),
      explanation: q.explanation, transfer: q.transfer,
    })),
  };
}
function sourceFromMeaning(meaning, base, reverse = false) {
  const count = meaning.concepts.length + meaning.questions.reduce((n, q) => n + 1 + q.options.length, 0);
  let index = 0;
  const key = prefix => prefix + '-' + (base + (reverse ? count - index++ : ++index));
  const concepts = meaning.concepts.map(name => ({ key: key('concept'), name }));
  const questions = meaning.questions.map(q => {
    const privateKey = key('question');
    const options = q.options.map(text => ({ key: key('option'), text }));
    return {
      key: privateKey, id: q.id, conceptKey: q.concept === null ? null : concepts[q.concept].key,
      prerequisiteKeys: q.prerequisites.map(i => concepts[i].key),
      prompt: q.prompt, options, answerKey: q.answer === null ? null : options[q.answer].key,
      explanation: q.explanation, transfer: q.transfer,
    };
  });
  return { nextKey: base + count + 1, title: meaning.title, attribution: meaning.attribution,
    license: meaning.license, concepts, questions };
}
function meaning(seed, concepts = 1 + seed % 7, questions = 2 + seed % 17) {
  const control = '\u0000\t\r\n\u2028\u2029\ud800🧭界';
  return {
    title: ' ' + control + ' Title ' + seed + ' ',
    attribution: 'Literal <script> “quoted” & ' + control,
    license: seed % 2 ? '  ' : '',
    concepts: Array.from({ length: concepts }, (_, i) => i % 2 ? 'duplicate' : ' ' + control),
    questions: Array.from({ length: questions }, (_, i) => {
      const optionCount = 2 + (seed + i) % 5;
      return {
        id: i === 0 ? '__proto__' : i === 1 ? 'constructor' : 'public/' + seed + '/question/' + i,
        concept: i % 5 === 0 ? null : (seed + i) % concepts,
        prerequisites: Array.from({ length: concepts }, (_, j) => (seed + j) % concepts).reverse(),
        prompt: 'Prompt ' + i + '\n' + control,
        options: Array.from({ length: optionCount }, (_, j) => j % 2 ? 'duplicate' : control + ' '),
        answer: i % 4 === 0 ? null : (seed + i) % optionCount,
        explanation: control + ' explanation ' + i,
        transfer: i % 2 ? '' : control,
      };
    }).reverse(),
  };
}
function assertFrozen(value) {
  if (value && typeof value === 'object') {
    assert.equal(Object.isFrozen(value), true);
    Object.values(value).forEach(assertFrozen);
  }
}
receive('128 alpha-renamings preserve ordered text, ambiguous labels and all graph/answer identities', () => {
  let cases = 0;
  for (let seed = 0; seed < 128; seed++) {
    const expected = meaning(seed);
    const original = sourceFromMeaning(expected, Number.MAX_SAFE_INTEGER - 4000);
    const renamed = sourceFromMeaning(expected, 12000 + seed * 1000, true);
    const untouched = structuredClone(original);
    const saved = module.serializeAuthorDraft(original);
    assert.equal(module.serializeAuthorDraft(renamed), saved);
    const admitted = module.parseAuthorDraft(saved);
    assert.deepEqual(semantic(admitted), expected);
    assert.deepEqual(original, untouched);
    assert.equal(module.serializeAuthorDraft(admitted), saved);
    assertFrozen(admitted);
    const editable = structuredClone(admitted);
    editable.questions[0].options[0].text = 'Edit only replacement clone';
    assert.notEqual(editable.questions[0].options[0].text, admitted.questions[0].options[0].text);
    const count = expected.concepts.length + expected.questions.reduce((n, q) => n + 1 + q.options.length, 0);
    assert.equal(admitted.nextKey, count + 1);
    cases++;
  }
  observations.alphaCases = cases;
});
receive('dense public ID occupation cannot reuse IDs after counter normalization at the question cap', () => {
  const expected = meaning(99, 32, 99);
  expected.questions.forEach(q => { q.options = ['First', 'Second']; q.answer = 1; });
  const next = 32 + 99 * 3 + 1;
  expected.questions.forEach((q, i) => { q.id = 'question-' + (next + i); });
  const original = sourceFromMeaning(expected, Number.MAX_SAFE_INTEGER - 4000, true);
  const admitted = module.parseAuthorDraft(JSON.stringify({ format: module.DRAFT_FORMAT, draft: original }));
  const editable = structuredClone(admitted);
  const added = core.addQuestion(editable);
  assert.equal(added.id, 'question-' + (next + 99));
  assert.deepEqual(semantic({ ...editable, questions: editable.questions.slice(0, -1) }), expected);
  assert.equal(new Set(editable.questions.map(q => q.id)).size, 100);
  while (added.options.length < 6) core.addOption(editable, added.key);
  const held = structuredClone(editable);
  assert.throws(() => core.addQuestion(editable), /100/);
  assert.throws(() => core.addOption(editable, added.key), /six/);
  assert.throws(() => core.addConcept(editable), /32/);
  assert.deepEqual(editable, held);
  const reopened = module.parseAuthorDraft(module.serializeAuthorDraft(editable));
  assert.deepEqual(semantic(reopened), semantic(editable));
  observations.collisionCase = { occupiedPublicIds: 99, newPublicId: added.id, safeNextKey: editable.nextKey };
});
receive('cross-question aliases and wrong-role references are rejected before admission', () => {
  const original = sourceFromMeaning(meaning(1, 3, 3), 100);
  const edits = [
    d => { d.questions[1].key = d.questions[0].key; },
    d => { d.questions[1].options[0].key = d.questions[0].options[1].key; },
    d => { d.questions[0].answerKey = d.questions[1].options[0].key; },
    d => { d.questions[0].conceptKey = d.questions[0].key; },
    d => { d.questions[0].prerequisiteKeys = [d.questions[0].options[0].key]; },
    d => { d.questions[0].options[0].key = 'option-9007199254740992'; },
    d => { d.questions[0].key = 'question-00012'; },
    d => { d.questions[0].key = 'question-1e3'; },
    d => { d.questions[0].key = 'option-1234'; },
    d => { d.questions[1].id = d.questions[0].id; },
    d => { d.questions[0].answerKey = { value: d.questions[0].options[0].key }; },
    d => { d.questions[0].prerequisiteKeys[0] = null; },
    d => { d.questions[0].options[0].text = ['text']; },
    d => { d.nextKey = String(d.nextKey); },
    d => { d.nextKey = 0; },
    d => { d.concepts[0] = null; },
    d => { delete d.license; },
    d => { d.questions[0].transfer = null; },
  ];
  edits.forEach(edit => {
    const value = structuredClone(original);
    edit(value);
    const untouched = structuredClone(value);
    assert.throws(() => module.parseAuthorDraft(JSON.stringify({ format: module.DRAFT_FORMAT, draft: value })));
    assert.throws(() => module.serializeAuthorDraft(value));
    assert.deepEqual(value, untouched);
  });
  observations.refusedShapes = edits.length;
});
receive('actual well-formed UTF-8 envelopes admit at 2 MiB and refuse the first extra byte', () => {
  const value = sourceFromMeaning(meaning(5, 1, 2), 100);
  const envelope = { format: module.DRAFT_FORMAT, draft: value, ignored: '' };
  const initial = Buffer.byteLength(JSON.stringify(envelope));
  const padding = module.MAX_DRAFT_BYTES - initial;
  envelope.ignored = 'é'.repeat(Math.floor(padding / 2)) + (padding % 2 ? 'x' : '');
  const exact = JSON.stringify(envelope);
  assert.equal(Buffer.byteLength(exact), module.MAX_DRAFT_BYTES);
  assert.ok(exact.length < module.MAX_DRAFT_BYTES);
  assert.deepEqual(semantic(module.parseAuthorDraft(exact)), semantic(value));
  envelope.ignored += 'x';
  assert.throws(() => module.parseAuthorDraft(JSON.stringify(envelope)), /2 MiB/);
  observations.exactEnvelopeBytes = Buffer.byteLength(exact);
});
for (const margin of [128, 0]) {
  receive('canonical near-limit content remains resaveable unchanged: margin ' + margin, () => {
    const { draft, source } = makeBoundaryDraft(core, module, margin);
    const inputMeaning = semantic(draft);
    const before = hash(JSON.stringify(draft));
    const admitted = module.parseAuthorDraft(source);
    const state = { margin, rawBytes: Buffer.byteLength(source), canonicalCompactBytes: Buffer.byteLength(JSON.stringify({ format: module.DRAFT_FORMAT, draft: admitted })),
      canonicalPrettyBytes: Buffer.byteLength(JSON.stringify({ format: module.DRAFT_FORMAT, draft: admitted }, null, 2) + '\n'), admitted: true };
    observations['boundary' + margin] = state;
    assert.deepEqual(semantic(admitted), inputMeaning);
    let saved;
    try { saved = module.serializeAuthorDraft(admitted); }
    catch (error) { state.saveError = error.message; throw error; }
    state.savedBytes = Buffer.byteLength(saved);
    assert.equal(saved, source);
    assert.equal(hash(JSON.stringify(draft)), before);
    assert.deepEqual(semantic(module.parseAuthorDraft(saved)), inputMeaning);
    assert.equal(core.checkDraft(admitted).ok, false);
    const repair = structuredClone(admitted);
    repair.questions.forEach((q, i) => {
      q.prompt = 'Repaired question ' + i;
      q.explanation = 'This follows the local example.';
      q.transfer = 'Explain the next example.';
      q.options.forEach((o, j) => { o.text = 'Choice ' + j; });
    });
    assert.equal(core.checkDraft(repair).ok, true);
    state.repairedLesson = true;
  });
}
assert.deepEqual(admission(), before);
const receipt = { accepted: results.every(r => r.passed), source: before, sourceUnchanged: true, node: process.version,
  receiverSha256: hash(fs.readFileSync(new URL(import.meta.url))), fixtureSha256: hash(fs.readFileSync(new URL('./make-boundary-draft.mjs', import.meta.url))),
  results, observations };
if (output) fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
process.exitCode = receipt.accepted ? 0 : 1;
