import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const root = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const modulePath = resolve(root, 'src/deck-author-draft.mjs');
const { DRAFT_FORMAT, MAX_DRAFT_BYTES, parseAuthorDraft, serializeAuthorDraft } = await import(pathToFileURL(modulePath));
const bytes = text => new TextEncoder().encode(text).length;
const sha = data => createHash('sha256').update(data).digest('hex');
const draft = { nextKey: 601, title: '', attribution: '', license: '', concepts: [{ key: 'concept-1', name: '' }], questions: [] };
const fields = [];
for (let index = 0; index < 100; index++) {
  const options = Array.from({ length: 6 }, (_, option) => ({ key: `option-${index * 6 + option + 1}`, text: '' }));
  const question = { key: `question-${index + 1}`, id: `item-${index + 1}`, conceptKey: 'concept-1', prerequisiteKeys: [],
    prompt: '', options, answerKey: options[0].key, explanation: '', transfer: '' };
  draft.questions.push(question);
  fields.push([question, 'prompt', 2000], [question, 'explanation', 4000], [question, 'transfer', 2000], ...options.map(option => [option, 'text', 1000]));
}
const compact = value => JSON.stringify({ format: DRAFT_FORMAT, draft: value });
let remaining = MAX_DRAFT_BYTES - bytes(compact(draft));
for (const [object, name, limit] of fields) {
  const count = Math.min(limit, Math.floor(remaining / 2));
  object[name] = 'é'.repeat(count); remaining -= 2 * count;
  if (remaining === 1 && count < limit) { object[name] += 'a'; remaining--; }
}
assert.equal(remaining, 0);
const source = compact(draft);
assert.equal(bytes(source), MAX_DRAFT_BYTES);
const sourceHash = sha(source);
const report = { module_sha256: sha(await readFile(modulePath)), source_bytes: bytes(source), source_sha256: sourceHash,
  source_uses_100_questions_six_options: true, source_is_compact: true, admitted: false };
try {
  const admitted = parseAuthorDraft(source);
  report.admitted = true;
  report.canonical_compact_bytes = bytes(compact(admitted));
  report.canonical_compact_over_limit_by = report.canonical_compact_bytes - MAX_DRAFT_BYTES;
  try { const saved = serializeAuthorDraft(admitted); report.resave_bytes = bytes(saved); report.resave_succeeds = true; }
  catch (error) { report.resave_succeeds = false; report.resave_error = error.message; }
} catch (error) { report.admission_error = error.message; }
assert.equal(sha(source), sourceHash);
report.source_unchanged = true;
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
