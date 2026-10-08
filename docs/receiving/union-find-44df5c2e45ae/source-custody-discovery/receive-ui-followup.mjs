import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const directory = path.dirname(new URL(import.meta.url).pathname);
const producer = '/home/jacob/recallweave-union-find-44df5c2e45ae';
const before = '2b8aafb30d6d7cd9fc7b1f7f9d6434c5abed17ab';
const after = 'df386b650c481b33bf8a960b50a704e4d75d5934';
const git = (...args) => execFileSync('git', ['-C', producer, ...args], {encoding: 'utf8'});
const source = file => execFileSync('git', ['-C', producer, 'show', after + ':' + file]);
const pin = bytes => ({bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')});
const result = {
  format: 'recallweave-ui-followup-source-scope/1',
  owner: 'estate-44df5c2e45ae/source_integration',
  started_at: new Date().toISOString(),
  before, after, tree: git('rev-parse', after + '^{tree}').trim(),
  scope: 'Committed delta only. Root owns the changed UI geometry and generated-page browser receiving. Original source-custody receipt remains unchanged.'
};
try {
  const custodyBytes = fs.readFileSync(path.join(directory, 'SOURCE-CUSTODY-AND-DISCOVERY.json'));
  assert.equal(pin(custodyBytes).sha256, 'd191e13fd095922074f9e16bfa8e27c8cecb2388eea193fcc1bde349e608740e');
  const custody = JSON.parse(custodyBytes);
  assert.equal(custody.source_custody_passed, true);
  git('merge-base', '--is-ancestor', before, after);
  const allChanges = git('diff', '--name-only', before, after).trim().split('\n').filter(Boolean);
  const changedProduct = allChanges.filter(file => !file.startsWith('docs/receiving/union-find-44df5c2e45ae/'));
  assert.deepEqual(changedProduct.sort(), ['courses/union-find-explorer.html', 'src/union-find-ui.mjs']);
  const protectedPaths = [
    ...custody.imported_files.map(item => item.path),
    ...custody.imported_artifacts.map(item => item.path),
    ...custody.protected_source.map(item => item.path).filter(file => !changedProduct.includes(file)),
    'README.md', 'catalog.html', 'catalog/courses.json'
  ];
  git('diff', '--exit-code', before, after, '--', ...protectedPaths);
  result.changed_paths = allChanges;
  result.changed_product = changedProduct.map(file => ({path: file, blob: git('rev-parse', after + ':' + file).trim(), ...pin(source(file))}));
  result.unchanged_protected_paths = [...new Set(protectedPaths)];
  result.original_custody_receipt = pin(custodyBytes);
  result.original_custody_boundary = before;
  result.core_course_guide_readme_and_imported_evidence_unchanged = true;
  result.changed_ui_accepted_by_this_receiver = false;
  result.changed_ui_receiver = '/root';
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  result.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(directory, 'UI-FOLLOWUP-SCOPE.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({...result, receipt_pin: pin(fs.readFileSync(path.join(directory, 'UI-FOLLOWUP-SCOPE.json')))}, null, 2));
}
