import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

// Independent static receiving. Git itself constructs the tree objects; the
// author's constructor is read and hashed but is never executed here.
const source = '/workspace/scratch/acd057031fb2/agents/production/recall-boolean-publication';
const target = path.dirname(new URL(import.meta.url).pathname);
const pin = '86ed410b4a6005608c1c2b53804d887dc28ec64e';
const run = (cwd, args, input) => execFileSync('git', ['-C', cwd, ...args], {input, maxBuffer: 8 * 1024 * 1024});
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(source, file));
const json = file => JSON.parse(read(file));
assert.equal(run(source, ['rev-parse', 'HEAD']).toString().trim(), pin);
assert.equal(run(source, ['status', '--porcelain=v1']).toString(), '');
const baseBytes = read('custody/base-tree-67b5.json');
const base = JSON.parse(baseBytes);
const inventoryBytes = read('custody/publication-inventory.json');
const inventory = JSON.parse(inventoryBytes);
assert.equal(base.truncated, false);
assert.equal(base.sha, inventory.acceptedBaseTree);
assert.equal(base.sha, 'd2c128b2433847a6d064597fb19630f343cffc49');
assert.equal(sha(baseBytes), inventory.acceptedTreeMetadataSha256);
const entries = new Map();
for (const entry of base.tree) {
  assert(!entries.has(entry.path));
  assert(entry.path.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes('\0')));
  assert.match(entry.sha, /^[0-9a-f]{40}$/);
  assert(['tree', 'blob', 'commit'].includes(entry.type));
  entries.set(entry.path, {...entry});
}

function construct(allEntries, expected) {
  const children = new Map([['', []]]);
  for (const entry of allEntries.values()) if (entry.type === 'tree') children.set(entry.path, []);
  for (const entry of allEntries.values()) {
    let parent = path.posix.dirname(entry.path);
    if (parent === '.') parent = '';
    assert(children.has(parent), `Missing parent: ${entry.path}`);
    children.get(parent).push(entry);
  }
  const hashes = new Map();
  for (const directory of [...children.keys()].sort((a,b) => b.split('/').length - a.split('/').length || b.localeCompare(a))) {
    const lines = children.get(directory).map(entry => {
      const object = entry.type === 'tree' ? hashes.get(entry.path) : entry.sha;
      assert(object);
      return Buffer.from(`${entry.mode} ${entry.type} ${object}\t${path.posix.basename(entry.path)}\0`);
    });
    const hash = run(target, ['mktree', '--missing', '-z'], Buffer.concat(lines)).toString().trim();
    if (expected) assert.equal(hash, directory ? allEntries.get(directory).sha : expected, `Accepted tree ${directory || '/'}`);
    hashes.set(directory, hash);
  }
  return {tree: hashes.get(''), treeObjects: hashes.size};
}

const reconstructedBase = construct(entries, base.sha);
assert.equal(reconstructedBase.treeObjects, inventory.acceptedTreeObjectsIndependentlyReconstructed);
const committedOverlay = new Map(run(source, ['ls-tree', '-r', '-z', pin, '--', 'overlay']).toString().split('\0').filter(Boolean).map(line => {
  const match = /^(\d+) (\w+) ([0-9a-f]{40})\t(.*)$/s.exec(line);
  assert(match);
  return [match[4].slice('overlay/'.length), {mode: match[1], type: match[2], sha: match[3]}];
}));
assert.equal(committedOverlay.size, inventory.files.length);
const leafBefore = new Map([...entries].filter(([,entry]) => entry.type !== 'tree'));
const blobs = new Map();
const fileReceipts = [];
const inventoryPaths = new Set();
for (const entry of inventory.files) {
  assert(!inventoryPaths.has(entry.path)); inventoryPaths.add(entry.path);
  const location = path.join(source, 'overlay', entry.path);
  assert(fs.lstatSync(location).isFile(), `Regular file: ${entry.path}`);
  const bytes = fs.readFileSync(location);
  assert.equal(bytes.length, entry.bytes);
  assert.equal(sha(bytes), entry.sha256);
  const object = run(target, ['hash-object', '--stdin'], bytes).toString().trim();
  assert.equal(object, entry.blob);
  assert.deepEqual(committedOverlay.get(entry.path), {mode: entry.mode, type: 'blob', sha: object});
  assert.equal(fs.statSync(location).mode & 0o111 ? '100755' : '100644', entry.mode);
  const validUtf8 = bytes.equals(Buffer.from(bytes.toString('utf8'), 'utf8')) && !bytes.includes(0);
  assert.equal(entry.encoding, validUtf8 ? 'utf-8' : 'binary');
  const old = leafBefore.get(entry.path);
  assert.equal(entry.status, old ? 'modified' : 'added');
  if (old) { assert.equal(entry.path, 'README.md'); assert.equal(entry.baseBlob, old.sha); assert.equal(entry.mode, old.mode); }
  for (let parent = path.posix.dirname(entry.path); parent !== '.'; parent = path.posix.dirname(parent)) {
    if (!entries.has(parent)) entries.set(parent, {path: parent, mode: '040000', type: 'tree'});
    assert.equal(entries.get(parent).type, 'tree');
  }
  assert.notEqual(entries.get(entry.path)?.type, 'tree');
  entries.set(entry.path, {path: entry.path, mode: entry.mode, type: 'blob', sha: object});
  const group = blobs.get(object) ?? {blob: object, bytes: entry.bytes, encoding: entry.encoding, paths: []};
  assert.equal(group.bytes, entry.bytes); assert.equal(group.encoding, entry.encoding);
  group.paths.push(entry.path); blobs.set(object, group);
  fileReceipts.push({path: entry.path, mode: entry.mode, blob: object, sha256: entry.sha256, bytes: entry.bytes});
}
assert.deepEqual([...blobs.values()], inventory.uniqueBlobs);
const baseReadme = read('custody/README.base-67b5.md');
assert.equal(run(target, ['hash-object', '--stdin'], baseReadme).toString().trim(), leafBefore.get('README.md').sha);
const nextReadme = read('overlay/README.md');
let prefix = 0, suffix = 0;
while (prefix < baseReadme.length && baseReadme[prefix] === nextReadme[prefix]) prefix++;
while (suffix < baseReadme.length - prefix && baseReadme[baseReadme.length - suffix - 1] === nextReadme[nextReadme.length - suffix - 1]) suffix++;
assert.equal(baseReadme.length - prefix - suffix, 0, 'README is one insertion with no accepted byte removed');
const readmeInsertion = nextReadme.subarray(prefix, nextReadme.length - suffix);
const candidate = construct(entries);
assert.equal(candidate.tree, inventory.prospectiveTree);
const changed = [...leafBefore].filter(([p,e]) => entries.get(p)?.sha !== e.sha || entries.get(p)?.mode !== e.mode || entries.get(p)?.type !== e.type);
assert.deepEqual(changed.map(([p]) => p), ['README.md']);
const totals = {paths: inventory.files.length, bytes: inventory.files.reduce((n,e) => n + e.bytes, 0), added: inventory.files.filter(e => e.status === 'added').length, modified: 1, uniqueBlobs: blobs.size, binaryPaths: inventory.files.filter(e => e.encoding === 'binary').length, uniqueBinaryBlobs: [...blobs.values()].filter(e => e.encoding === 'binary').length};
assert.deepEqual(totals, inventory.totals);
assert.equal(run(source, ['status', '--porcelain=v1']).toString(), '');
const receipt = {
  schema: 'recall-boolean-publication-static-review.v1', verdict: 'ACCEPT', reviewedAt: new Date().toISOString(),
  scope: 'Static constructor, concrete inventory, exact Git object modes and accepted-source retention only. The author constructor was not executed. No product, parser, build or browser test was repeated; no GitHub or native device mutation was performed.',
  source: {path: source, custodyCommit: pin, constructorSha256: sha(read('custody/compose-publication-tree.mjs')), inventorySha256: sha(inventoryBytes), baseMetadataSha256: sha(baseBytes)},
  accepted: {commit: inventory.acceptedBase, ...reconstructedBase, leaves: leafBefore.size},
  prospective: {...candidate, leaves: [...entries.values()].filter(e => e.type !== 'tree').length, totals},
  preservation: {acceptedLeavesExact: leafBefore.size - 1, changedExisting: ['README.md'], removedLeaves: 0, readmeRemovedBytes: 0, readmeInsertedBytes: readmeInsertion.length, readmeInsertion: readmeInsertion.toString('utf8')},
  method: 'Each full tree and subtree was independently constructed by git mktree --missing -z in the reviewer-owned repository. Every overlay body was checked with git hash-object and SHA256, and all inventory modes were compared with the immutable custody commit and actual regular files.',
  claims: ['All 223 accepted tree objects independently agree with Git.', 'The concrete README is purely additive and preserves all accepted text.', 'All 69 overlay paths agree with immutable committed modes and blob IDs; binary dedup and UTF-8 classification are exact.', 'Publication scope honestly distinguishes the prospective overlay tree from previously executed product sources.'],
  currency: 'This receipt binds the frozen 67b5 base inventory. The owner separately handles later accepted-main bridges; it does not assert the live branch is unchanged.', files: fileReceipts
};
fs.writeFileSync(path.join(target, 'review.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({...receipt, files: undefined, preservation: {...receipt.preservation, readmeInsertion: undefined}}, null, 2));
