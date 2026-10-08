// Minimal deterministic generator; writes no large fixture.
// All content is synthetic. Pass the reviewed modules; no implementation is modified.
export function makeBoundaryDraft(core, module, margin = 128) {
  const draft = core.createDraft();
  draft.title = 'Near-limit editable text';
  draft.attribution = 'Synthetic independent receiver';
  draft.license = 'Test';
  draft.concepts[0].name = 'Concept';
  while (draft.questions.length < 100) core.addQuestion(draft);
  for (const q of draft.questions) while (q.options.length < 6) core.addOption(draft, q.key);
  // Start with canonical private keys so raw and canonical compact sizes are equal.
  const value = structuredClone(module.parseAuthorDraft(module.serializeAuthorDraft(draft)));
  for (const q of value.questions) {
    q.prompt = 'p'.repeat(2000);
    q.explanation = 'e'.repeat(4000);
    q.transfer = 't'.repeat(2000);
    q.options.forEach((o, i) => { o.text = String(i).repeat(1000); });
    q.answerKey = q.options[0].key;
  }
  const envelope = () => JSON.stringify({ format: module.DRAFT_FORMAT, draft: value });
  const target = module.MAX_DRAFT_BYTES - margin;
  let remaining = target - Buffer.byteLength(envelope(), 'utf8');
  if (remaining < 0) throw new Error('Fixture baseline unexpectedly exceeds target');
  for (const q of value.questions) {
    for (const [object, key] of [[q, 'prompt'], [q, 'explanation'], [q, 'transfer'], ...q.options.map(o => [o, 'text'])]) {
      const count = Math.min(remaining, object[key].length);
      object[key] = 'é'.repeat(count) + object[key].slice(count);
      remaining -= count;
    }
  }
  if (remaining !== 0 || Buffer.byteLength(envelope(), 'utf8') !== target) throw new Error('Fixture cannot reach target');
  return { draft: value, source: envelope() };
}
