import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const reviewRoot = dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(await readFile(join(reviewRoot, 'final-composition-receipt.json'), 'utf8'));
const repo = process.argv[2];
const head = process.argv[3];
assert.ok(repo);
assert.match(head ?? '', /^[a-f0-9]{40}$/);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 16 * 1024 * 1024 });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
git('merge-base', '--is-ancestor', source.head, head);
const delta = git('diff', '--name-status', source.head, head).toString('utf8').trim().split('\n').filter(Boolean);
assert.ok(delta.length > 0);
assert.ok(delta.every(line => /^[AM]\tdocs\/qualification\/deck-author-6e5752b49b6f\//.test(line)), 'The successor only adds or updates qualification evidence.');
for (const [path, identity] of Object.entries(source.programFiles)) {
  assert.equal(sha256(git('show', `${head}:${path}`)), identity.sha256, `${path} remains accepted`);
}
const evidenceRoot = 'docs/qualification/deck-author-6e5752b49b6f/';
const browserBytes = git('show', `${head}:${evidenceRoot}download-status/receiving.json`);
const browser = JSON.parse(browserBytes);
assert.equal(browser.passed, true);
assert.deepEqual(browser.page_errors, []);
assert.deepEqual(browser.external_requests, []);
assert.equal(browser.status_text, source.finalInstructions.successStatus);
assert.equal(browser.download.bytes, 1642);
assert.equal(browser.download.sha256, '6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9');
for (const [path, expected] of Object.entries(browser.source_sha256)) assert.equal(source.programFiles[path]?.sha256, expected, `${path}: focused browser evidence is for the accepted bytes`);
const actual = git('show', `${head}:${evidenceRoot}download-status/actual-download.json`);
assert.equal(actual.length, browser.download.bytes);
assert.equal(sha256(actual), browser.download.sha256);
const loader = git('show', `${head}:${evidenceRoot}loader-receiving.tar.gz`);
assert.equal(sha256(loader), '0b4aca067f262e3a455f83714d42031c424bfdbea5f74cc2f590c84c8cc8e5e6');
const report = { status: 'accepted', sourceHead: source.head, sourceTree: source.tree, head,
  tree: git('rev-parse', `${head}^{tree}`).toString('utf8').trim(),
  independentlyFetchedMain: source.independentlyFetchedMain,
  evidenceOnlyDelta: delta, unchangedAcceptedSourceFiles: Object.keys(source.programFiles),
  focusedDownloadReceipt: { sha256: sha256(browserBytes), producer: 'Authoring owner; independently checked against the final commit and actual downloaded file', statusText: browser.status_text, fileSha256: sha256(actual), bytes: actual.length },
  loaderArchiveSha256: sha256(loader), repeatedBrowserSuites: 0, openFindings: [] };
await writeFile(join(reviewRoot, 'evidence-successor-receipt.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, head: report.head, tree: report.tree, evidencePaths: delta.length, unchangedProgramFiles: report.unchangedAcceptedSourceFiles.length, openFindings: 0 }));
