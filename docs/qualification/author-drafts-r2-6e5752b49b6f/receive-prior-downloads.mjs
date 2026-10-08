import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2]), original = resolve(process.argv[3]), output = resolve(process.argv[4]);
const hash = value => createHash('sha256').update(value).digest('hex');
const format = await import(pathToFileURL(resolve(root, 'src/deck-author-draft.mjs')));
const core = await import(pathToFileURL(resolve(root, 'src/deck-author.mjs')));
const { parseDeck } = await import(pathToFileURL(resolve(root, 'src/deck.mjs')));
const receipt = JSON.parse(await readFile(resolve(original, 'receiving.json'), 'utf8'));
const files = [];
for (const entry of receipt.downloads) {
  const raw = await readFile(resolve(original, entry.path));
  assert.equal(hash(raw), entry.sha256);
  const text = raw.toString('utf8');
  if (entry.kind === 'draft') {
    assert.equal(format.serializeAuthorDraft(format.parseAuthorDraft(text)), text);
    files.push({ path: entry.path, sha256: entry.sha256, draft_bytes_unchanged: true });
  } else {
    const editable = core.draftFromDeck(parseDeck(text));
    const saved = format.serializeAuthorDraft(editable);
    const checked = core.checkDraft(format.parseAuthorDraft(saved));
    assert.equal(checked.ok, true); assert.equal(checked.json, text);
    files.push({ path: entry.path, sha256: entry.sha256, checked_bytes_unchanged_through_draft: true });
  }
}
const result = { module_sha256: hash(await readFile(resolve(root, 'src/deck-author-draft.mjs'))),
  original_browser_source: receipt.source_commit, original_receipt_sha256: hash(await readFile(resolve(original, 'receiving.json'))),
  all_previous_actual_downloads_compatible: true, files };
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, actual_files: files.length, module_sha256: result.module_sha256 }));
