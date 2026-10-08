#!/usr/bin/env node
/**
 * Receive the canonical offline ZIP with Node 22+ and installed Chrome.
 * Independent stored-ZIP admission, actual browser download, retained extraction,
 * and direct-file learner handoff. No application dependency or browser install.
 * CDP startup/observation/shutdown derives from qualified catalog receiver de6f0d22.
 * Claim: https://github.com/Jacob-Met/RecallWeave/issues/109 .
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, statfs, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { tmpdir, freemem } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const COURSE_FILES = [
  'binary-search.json', 'dependency-graphs.json',
  'measurement-uncertainty.json', 'sql-query-foundations.json',
  'enzymes-energy-and-control.json',
  'numerical-precision.json',
  'reading-data-and-evidence.json',
  'sampling-aliasing.json',
  'shortest-paths.json',
  'stoichiometry-foundations.json',
  'vector-geometry.json',
];
const START_HERE = "RecallWeave offline course pack\n\n1. Extract the entire ZIP. Keep the RecallWeave folder together.\n2. Open catalog.html in a web browser with JavaScript enabled.\n3. Choose Open learner to open the sibling demo.html.\n4. Under Bring your own lesson, choose a JSON file from the courses folder\n   (or a course file downloaded from the catalog).\n5. Inspect the preview, then select Start this deck.\n\nOpening and previewing a file leaves the current lesson in place. Start this deck\nbegins a fresh session. The catalog and learner need no server, account or network.\nOptional links to other tools or the public download page may need a connection\nor a separate download.\n\nCourse files keep their original source and permission statements. Learning-model\nestimates are illustrative, not grades or evidence of learning efficacy.\nUse the learner's explicit download controls to keep a study record; reloading\nclears the tab's in-memory session.\n\nSHA256SUMS.json lists the byte length and SHA-256 hash of every other file in this\npack. It describes file integrity, not authorship or an authenticated signature.\n";
const MIN_DISK_BYTES = 1024n ** 3n;
const MIN_MEMORY_BYTES = 512 * 1024 * 1024;
const PACKET_LIMIT = 2 * 1024 * 1024;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(done => setTimeout(done, ms));

function options(args) {
  const result = {
    root: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    browser: 'google-chrome',
    output: join(tmpdir(), 'recallweave-offline-pack-receiving-' + process.pid),
    emitBundle: false, selfTest: false,
  };
  const seen = new Set();
  while (args.length) {
    const flag = args.shift();
    if (seen.has(flag)) throw new Error('Repeated option: ' + flag);
    seen.add(flag);
    if (flag === '--emit-bundle') { result.emitBundle = true; continue; }
    if (flag === '--self-test') { result.selfTest = true; continue; }
    const key = {'--root': 'root', '--browser': 'browser', '--output': 'output'}[flag];
    if (!key || !args[0]) throw new Error('Usage: check_offline_pack_browser.mjs [--root DIR] [--browser FILE] [--output NEW_DIR] [--emit-bundle] [--self-test]');
    result[key] = args.shift();
  }
  result.root = resolve(result.root);
  result.output = resolve(result.output);
  return result;
}

async function waitFor(check, label, milliseconds = 15000) {
  const deadline = Date.now() + milliseconds;
  let last;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; }
    catch (error) { last = error; }
    await sleep(75);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}

const OBSERVER = `(() => {
  const observed = window.__catalogReceiving = {
    storageCalls: [], blockedApis: [], setupErrors: [],
    objectUrlAttempts: 0, objectUrlsCreated: 0, failNextObjectUrl: false,
    createdObjectUrls: [], revokedObjectUrls: [],
  };
  const originalUrl = URL.createObjectURL;
  URL.createObjectURL = function(...args) {
    observed.objectUrlAttempts++;
    if (observed.failNextObjectUrl) {
      observed.failNextObjectUrl = false;
      throw new Error('Injected synchronous object-URL preparation failure');
    }
    const url = originalUrl.apply(this, args);
    observed.objectUrlsCreated++;
    observed.createdObjectUrls.push(url);
    return url;
  };
  const originalRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = function(...args) {
    const result = originalRevoke.apply(this, args);
    observed.revokedObjectUrls.push(args[0]);
    return result;
  };
  function observe(object, name, label) {
    if (!object || typeof object[name] !== 'function') return;
    const original = object[name];
    object[name] = function(...args) {
      observed.storageCalls.push(label);
      return original.apply(this, args);
    };
  }
  try {
    for (const name of ['localStorage', 'sessionStorage']) {
      let owner = window;
      while (owner && !Object.getOwnPropertyDescriptor(owner, name)) owner = Object.getPrototypeOf(owner);
      const descriptor = owner && Object.getOwnPropertyDescriptor(owner, name);
      if (!descriptor?.get) throw new Error('Missing observable storage getter: ' + name);
      Object.defineProperty(window, name, {
        configurable: true,
        get() { observed.storageCalls.push(name + '.access'); return descriptor.get.call(window); },
      });
    }
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key'])
      observe(Storage.prototype, method, 'Storage.' + method);
    for (const method of ['open', 'deleteDatabase'])
      observe(globalThis.IDBFactory?.prototype, method, 'indexedDB.' + method);
    for (const method of ['open', 'delete', 'match', 'has', 'keys'])
      observe(globalThis.CacheStorage?.prototype, method, 'caches.' + method);
    observe(globalThis.ServiceWorkerContainer?.prototype, 'register', 'serviceWorker.register');
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    if (cookie?.get && cookie?.set) Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get() { observed.storageCalls.push('cookie.read'); return cookie.get.call(this); },
      set(value) { observed.storageCalls.push('cookie.write'); cookie.set.call(this, value); },
    });
    for (const name of ['WebSocket', 'EventSource', 'Worker', 'SharedWorker']) {
      if (typeof window[name] === 'function') window[name] = new Proxy(window[name], {
        construct() {
          observed.blockedApis.push(name);
          throw new Error('Offline catalog receiving refuses ' + name);
        },
      });
    }
    if (typeof navigator.sendBeacon === 'function') navigator.sendBeacon = () => {
      observed.blockedApis.push('sendBeacon');
      return false;
    };
  } catch (error) { observed.setupErrors.push(String(error)); }
})();`;


const ZIP_LIMIT = 2 * 1024 * 1024;
const MEMBER_LIMIT = 1024 * 1024;
const TOTAL_MEMBER_LIMIT = 4 * 1024 * 1024;
const ENTRY_LIMIT = 64;
const PACK_PREFIX = 'RecallWeave/';
// Independent classic ZIP reader for the declared stored-only pack format.
// Format reference: PKWARE APPNOTE 6.3.10, sections 4.3.7, 4.3.12, 4.3.16.
const CRC_TABLE = Uint32Array.from({length: 256}, (_, byte) => {
  let value = byte;
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function inspectArchive(bytes, expectedFiles) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 22 && bytes.length <= ZIP_LIMIT,
    'ZIP byte size outside receiver limit');
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50, 'ZIP must have one final uncommented end record');
  assert.equal(bytes.readUInt16LE(end + 4), 0, 'ZIP must be single-volume');
  assert.equal(bytes.readUInt16LE(end + 6), 0, 'ZIP central directory must be on the only volume');
  const count = bytes.readUInt16LE(end + 10);
  assert.ok(count > 0 && count <= ENTRY_LIMIT, 'ZIP entry count outside receiver limit');
  assert.equal(bytes.readUInt16LE(end + 8), count, 'ZIP entry counts must agree');
  assert.equal(bytes.readUInt16LE(end + 20), 0, 'ZIP comments are outside the pack format');
  const centralSize = bytes.readUInt32LE(end + 12);
  const centralStart = bytes.readUInt32LE(end + 16);
  assert.equal(centralStart + centralSize, end, 'ZIP central directory must end at the final record');
  assert.ok(centralStart <= end && centralSize >= count * 46, 'ZIP central directory bounds');
  const seen = new Set();
  const records = [];
  let position = centralStart, localEnd = 0, total = 0;
  for (let index = 0; index < count; index++) {
    assert.ok(position + 46 <= end, 'Complete central header required');
    assert.equal(bytes.readUInt32LE(position), 0x02014b50, 'Central header signature');
    const madeBy = bytes.readUInt16LE(position + 4);
    const needed = bytes.readUInt16LE(position + 6);
    const flags = bytes.readUInt16LE(position + 8);
    const method = bytes.readUInt16LE(position + 10);
    const time = bytes.readUInt16LE(position + 12);
    const date = bytes.readUInt16LE(position + 14);
    const crc = bytes.readUInt32LE(position + 16);
    const compressed = bytes.readUInt32LE(position + 20);
    const size = bytes.readUInt32LE(position + 24);
    const nameSize = bytes.readUInt16LE(position + 28);
    const extraSize = bytes.readUInt16LE(position + 30);
    const commentSize = bytes.readUInt16LE(position + 32);
    const disk = bytes.readUInt16LE(position + 34);
    const internal = bytes.readUInt16LE(position + 36);
    const external = bytes.readUInt32LE(position + 38);
    const local = bytes.readUInt32LE(position + 42);
    assert.ok(position + 46 + nameSize <= end, 'Central member name bounds');
    assert.ok(nameSize > 0 && nameSize <= 240, 'Canonical member name length');
    const rawName = bytes.subarray(position + 46, position + 46 + nameSize);
    assert.ok(rawName.every(value => value >= 33 && value <= 126), 'Member names must be visible ASCII');
    const name = rawName.toString('ascii');
    assert.match(name, /^RecallWeave\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/,
      'Member path must remain in the one canonical folder');
    assert.ok(!name.split('/').some(part => part === '.' || part === '..'), 'No traversal components');
    assert.ok(!seen.has(name), 'Duplicate member path');
    seen.add(name);
    assert.ok(expectedFiles.has(name), 'Unexpected archive member: ' + name);
    assert.equal(madeBy, 0x0314, 'Canonical Unix creator and version 20 metadata');
    assert.equal(needed, 20, 'Canonical extraction version 20');
    assert.equal(flags, 0, 'No encryption, descriptors, or filename flags');
    assert.equal(method, 0, 'Only ZIP_STORED members are admitted');
    assert.equal(time, 0, 'Canonical DOS midnight');
    assert.equal(date, 33, 'Canonical DOS 1980-01-01');
    assert.equal(extraSize, 0, 'No central extra fields');
    assert.equal(commentSize, 0, 'No member comments');
    assert.equal(disk, 0, 'Member must be on the only volume');
    assert.equal(internal, 0, 'Canonical internal attributes');
    assert.equal(external, (0o100644 << 16) >>> 0, 'Only regular 0644 file members are admitted');
    assert.ok(size <= MEMBER_LIMIT, 'Declared member size exceeds receiver limit');
    total += size;
    assert.ok(total <= TOTAL_MEMBER_LIMIT, 'Declared aggregate size exceeds receiver limit');
    assert.equal(compressed, size, 'Stored compressed and uncompressed lengths must agree');
    assert.equal(local, localEnd, 'Local members must be contiguous without aliases or hidden data');
    assert.ok(local + 30 + nameSize <= centralStart, 'Local member header bounds');
    assert.equal(bytes.readUInt32LE(local), 0x04034b50, 'Local header signature');
    assert.equal(bytes.readUInt16LE(local + 4), needed, 'Local extraction version agrees');
    assert.equal(bytes.readUInt16LE(local + 6), flags, 'Local flags agree');
    assert.equal(bytes.readUInt16LE(local + 8), method, 'Local method agrees');
    assert.equal(bytes.readUInt16LE(local + 10), time, 'Local time agrees');
    assert.equal(bytes.readUInt16LE(local + 12), date, 'Local date agrees');
    assert.equal(bytes.readUInt32LE(local + 14), crc, 'Local CRC agrees');
    assert.equal(bytes.readUInt32LE(local + 18), compressed, 'Local compressed length agrees');
    assert.equal(bytes.readUInt32LE(local + 22), size, 'Local uncompressed length agrees');
    assert.equal(bytes.readUInt16LE(local + 26), nameSize, 'Local name length agrees');
    assert.equal(bytes.readUInt16LE(local + 28), 0, 'No local extra fields');
    assert.deepEqual(bytes.subarray(local + 30, local + 30 + nameSize), rawName, 'Local member name agrees');
    const dataStart = local + 30 + nameSize;
    localEnd = dataStart + size;
    assert.ok(localEnd <= centralStart, 'Member payload must precede the central directory');
    const data = bytes.subarray(dataStart, localEnd);
    assert.equal(crc32(data), crc, 'Member CRC32 mismatch');
    assert.deepEqual(data, expectedFiles.get(name), 'Archived source differs from the independent expected bytes: ' + name);
    records.push({path: name, bytes: size, sha256: sha256(data), crc32: crc.toString(16).padStart(8, '0'),
      mode: '100644', localOffset: local, centralOffset: position, dataStart, data});
    position += 46 + nameSize;
  }
  assert.equal(position, end, 'No extra central records or trailing data');
  assert.equal(localEnd, centralStart, 'No unmatched local data');
  assert.deepEqual(records.map(record => record.path), [...expectedFiles.keys()].sort(),
    'Exact sorted member inventory required');
  return records;
}
async function extractArchive(bytes, expectedFiles, destination) {
  // Every record and byte is admitted before even creating the destination.
  const records = inspectArchive(bytes, expectedFiles);
  await mkdir(destination, {mode: 0o700});
  for (const record of records) {
    const target = join(destination, ...record.path.split('/'));
    await mkdir(dirname(target), {recursive: true, mode: 0o700});
    await writeFile(target, record.data, {flag: 'wx', mode: 0o644});
  }
  return records;
}
async function extractionSnapshot(root) {
  const result = [];
  async function visit(path) {
    const info = await lstat(path, {bigint: true});
    assert.ok(info.isDirectory() || info.isFile(), 'Extracted tree must not contain a link or special entry');
    const row = {path: relative(root, path).split(sep).join('/') || '.', mode: info.mode.toString(),
      inode: info.ino.toString(), device: info.dev.toString(),
      mtimeNs: info.mtimeNs.toString(), ctimeNs: info.ctimeNs.toString()};
    if (info.isFile()) {
      assert.ok(info.size <= BigInt(MEMBER_LIMIT), 'Extracted file size remains bounded');
      const bytes = await readFile(path);
      row.bytes = bytes.length;
      row.sha256 = sha256(bytes);
    }
    result.push(row);
    if (info.isDirectory()) for (const name of (await readdir(path)).sort()) await visit(join(path, name));
  }
  await visit(root);
  return result;
}

async function archiveAdmission(output) {
  // Frozen independently with Python 3.12.14 zipfile + BytesIO before the pack producer.
  // This two-file positive fixture is 275 bytes; payload "123456789" has standard CRC32 cbf43926.
  const valid = Buffer.from('UEsDBBQAAAAAAAAAIQAmOfTLCQAAAAkAAAATAAAAUmVjYWxsV2VhdmUvb25lLnR4dDEyMzQ1Njc4OVBLAwQUAAAAAAAAACEAxO8VdxAAAAAQAAAAEwAAAFJlY2FsbFdlYXZlL3R3by50eHRhcmNoaXZlIGZpeHR1cmUKUEsBAhQDFAAAAAAAAAAhACY59MsJAAAACQAAABMAAAAAAAAAAAAAAKSBAAAAAFJlY2FsbFdlYXZlL29uZS50eHRQSwECFAMUAAAAAAAAACEAxO8VdxAAAAAQAAAAEwAAAAAAAAAAAAAApIE6AAAAUmVjYWxsV2VhdmUvdHdvLnR4dFBLBQYAAAAAAgACAIIAAAB7AAAAAAA=', 'base64');
  assert.equal(sha256(valid), '8e659bbc2dd6ab514c62727c8132dea7586a665297649c80099ac52cc0c6deb9', 'Frozen archive fixture identity');
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926, 'Standard CRC32 vector');
  const expected = new Map([
    ['RecallWeave/one.txt', Buffer.from('123456789')],
    ['RecallWeave/two.txt', Buffer.from('archive fixture\n')],
  ]);
  const records = inspectArchive(valid, expected);
  const parent = join(output, 'archive-admission');
  await mkdir(parent, {mode: 0o700});
  const positive = join(parent, 'accepted fixture');
  await extractArchive(valid, expected, positive);
  for (const [name, bytes] of expected)
    assert.deepEqual(await readFile(join(positive, ...name.split('/'))), bytes, 'Positive fixture extracts exact bytes');
  const stable = await extractionSnapshot(parent);
  const renameMember = (index, name) => {
    const changed = Buffer.from(valid), record = records[index];
    const original = Buffer.from(record.path);
    assert.equal(Buffer.byteLength(name), original.length, 'Fixture name substitution retains header layout');
    changed.write(name, record.localOffset + 30, original.length, 'ascii');
    changed.write(name, record.centralOffset + 46, original.length, 'ascii');
    return changed;
  };
  const fieldMutation = change => {
    const bytes = Buffer.from(valid);
    change(bytes, records);
    return bytes;
  };
  const cases = [
    {name: 'truncated-end', bytes: valid.subarray(0, -1), failure: /final uncommented end record/},
    {name: 'trailing-data', bytes: Buffer.concat([valid, Buffer.from([0])]), failure: /final uncommented end record/},
    {name: 'corrupt-member-crc', bytes: fieldMutation((bytes, rows) => { bytes[rows[0].dataStart] ^= 1; }), failure: /CRC32 mismatch/},
    {name: 'path-traversal', bytes: renameMember(0, '../outside-data.txt'), failure: /canonical folder/},
    {name: 'absolute-path', bytes: renameMember(0, '/outside-root.txtxx'), failure: /canonical folder/},
    {name: 'backslash-path', bytes: renameMember(0, 'RecallWeave\\one.txt'), failure: /canonical folder/},
    {name: 'symlink-member', bytes: fieldMutation((bytes, rows) => bytes.writeUInt32LE((0o120777 << 16) >>> 0, rows[0].centralOffset + 38)), failure: /regular 0644/},
    {name: 'declared-member-limit', bytes: fieldMutation((bytes, rows) => {
      bytes.writeUInt32LE(MEMBER_LIMIT + 1, rows[0].centralOffset + 24);
      bytes.writeUInt32LE(MEMBER_LIMIT + 1, rows[0].localOffset + 22);
    }), failure: /member size exceeds/},
    {name: 'unexpected-member', bytes: renameMember(0, 'RecallWeave/new.txt'), failure: /Unexpected archive member/},
    {name: 'duplicate-member', bytes: renameMember(1, 'RecallWeave/one.txt'), failure: /Duplicate member path/},
    {name: 'missing-expected-member', bytes: valid,
      expected: new Map([...expected, ['RecallWeave/new.txt', Buffer.from('absent')]]), failure: /Exact sorted member inventory/},
    {name: 'encrypted-flags', bytes: fieldMutation((bytes, rows) => {
      bytes.writeUInt16LE(1, rows[0].centralOffset + 8);
      bytes.writeUInt16LE(1, rows[0].localOffset + 6);
    }), failure: /No encryption/},
    {name: 'disagreeing-local-header', bytes: fieldMutation((bytes, rows) => {
      bytes.writeUInt32LE(0, rows[0].localOffset + 14);
    }), failure: /Local CRC agrees/},
    {name: 'entry-count-limit', bytes: fieldMutation(bytes => {
      bytes.writeUInt16LE(ENTRY_LIMIT + 1, bytes.length - 14);
      bytes.writeUInt16LE(ENTRY_LIMIT + 1, bytes.length - 12);
    }), failure: /entry count outside/},
    {name: 'archive-byte-limit', bytes: Buffer.alloc(ZIP_LIMIT + 1), failure: /ZIP byte size outside/},
    {name: 'wrong-independent-source', bytes: valid,
      expected: new Map([['RecallWeave/one.txt', Buffer.from('different')], ['RecallWeave/two.txt', Buffer.from('archive fixture\n')]]),
      failure: /Archived source differs/},
  ];
  const results = [{name: 'canonical-positive', bytes: valid.length, sha256: sha256(valid), passed: true,
    extractedFiles: [...expected.keys()], standardCrc32VectorPassed: true}];
  for (const test of cases) {
    const destination = join(parent, test.name);
    let refusal;
    try { await extractArchive(test.bytes, test.expected ?? expected, destination); }
    catch (error) { refusal = error; }
    assert.ok(refusal, 'Archive fixture must be rejected: ' + test.name);
    assert.match(String(refusal), test.failure, 'Refusal must reach the declared admission boundary: ' + test.name);
    await assert.rejects(lstat(destination), {code: 'ENOENT'});
    assert.deepEqual(await extractionSnapshot(parent), stable, 'Refusal must not create or change any fixture entry');
    results.push({name: test.name, bytes: test.bytes.length, sha256: sha256(test.bytes),
      passed: true, failure: String(refusal), extractionDestinationAbsent: true, fixtureTreeUnchanged: true});
  }
  return results;
}

async function emitBundle(output) {
  const paths = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        assert.ok(entry.isFile(), 'Evidence packet contains a non-file: ' + path);
        paths.push(path);
      }
    }
  }
  await visit(output);
  const files = [];
  let total = 0;
  for (const path of paths.sort()) {
    const info = await lstat(path);
    total += info.size;
    assert.ok(total <= PACKET_LIMIT, 'Evidence packet exceeds 2 MiB; refusing incomplete export');
    const bytes = await readFile(path);
    files.push({path: relative(output, path).split(sep).join('/'), bytes: bytes.length,
      sha256: sha256(bytes), base64: bytes.toString('base64')});
  }
  const payload = Buffer.from(JSON.stringify({version: 1, files}));
  assert.ok(payload.length <= PACKET_LIMIT, 'Decoded evidence packet exceeds 2 MiB; refusing incomplete export');
  const encoded = payload.toString('base64');
  const chunks = Math.ceil(encoded.length / 4096);
  console.log('RECALLWEAVE_OFFLINE_PACK_BUNDLE_BEGIN ' + JSON.stringify({
    bytes: payload.length, sha256: sha256(payload), chunks, fileBytes: total,
  }));
  for (let index = 0; index < chunks; index++)
    console.log('RECALLWEAVE_OFFLINE_PACK_BUNDLE_CHUNK ' + index + ' ' + encoded.slice(index * 4096, (index + 1) * 4096));
  console.log('RECALLWEAVE_OFFLINE_PACK_BUNDLE_END');
}

async function main(settings) {
  const {root, output, browser: executable} = settings;
  try {
    const info = await lstat(output);
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Evidence destination must be a real directory');
    assert.deepEqual(await readdir(output), [], 'Use a new or empty evidence directory');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(output, {recursive: true});
  const report = {
    version: 1, schema: 'recallweave-offline-pack-receiving-v1',
    mode: settings.selfTest ? 'archive-admission-only' : 'browser-and-archive',
    status: 'running', root, executable, node: process.version,
    platform: process.platform, architecture: process.arch, checks: [], downloads: [],
    screenshots: [], sourceSha256: {}, pageErrors: [], unexpectedRequests: [],
    networkRequests: [], documentAudits: [], objectUrlCleanup: [], harnessErrors: [],
  };
  let server, browser, socket, profile;
  let browserDidClose = true;
  let browserClosed = Promise.resolve();
  let browserLog = '';
  const pending = new Map();
  const pages = new Map();
  const downloads = new Map();
  let sequence = 0;
  let base = '';
  let lastPage;
  let closing = false;
  let offlineOnly = false;
  const artifactPaths = new Set();
  const sourceBytes = new Map();
  const courseBytes = new Map();
  const decks = new Map();

  function command(method, params = {}, sessionId) {
    const id = ++sequence;
    return new Promise((done, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) { reject(new Error('CDP connection unavailable: ' + method)); return; }
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, 10000);
      pending.set(id, {done, reject, timer});
      socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
    });
  }
  const onPage = (page, method, params = {}) => command(method, params, page.sessionId);
  async function evaluate(page, expression) {
    const response = await onPage(page, 'Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (response.exceptionDetails)
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  }
  const inPage = (page, fn, ...args) => evaluate(page,
    '(' + fn.toString() + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')');
  const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
  async function artifact(path, bytes) {
    assert.ok(!artifactPaths.has(path), 'Duplicate evidence path: ' + path);
    await mkdir(dirname(join(output, path)), {recursive: true});
    await writeFile(join(output, path), bytes, {flag: 'wx'});
    artifactPaths.add(path);
  }
  async function screenshot(page, name, selector) {
    if (selector) await inPage(page, value => document.querySelector(value)?.scrollIntoView({block: 'start'}), selector);
    const image = await onPage(page, 'Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    await artifact(name, Buffer.from(image.data, 'base64'));
    report.screenshots.push(name);
  }
  async function key(page, name) {
    const virtual = {Tab: 9, Enter: 13}[name];
    for (const type of ['keyDown', 'keyUp']) await onPage(page, 'Input.dispatchKeyEvent', {
      type, key: name, code: name, windowsVirtualKeyCode: virtual, nativeVirtualKeyCode: virtual,
      ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {}),
    });
  }
  async function click(page, selector) {
    const point = await inPage(page, value => {
      const element = document.querySelector(value);
      if (!element || element.disabled) throw new Error('Unavailable control: ' + value);
      element.scrollIntoView({block: 'center'});
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) throw new Error('Hidden control: ' + value);
      return {x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2};
    }, selector);
    await onPage(page, 'Input.dispatchMouseEvent', {type: 'mouseMoved', ...point});
    await onPage(page, 'Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
    await onPage(page, 'Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
  }
  async function configure(page) {
    // Queue setup on the paused target before resume, then await all replies.
    // A noopener popup can withhold Page.enable's reply until it is resumed.
    // Interception and the init script still precede resume on this session.
    const setup = [
      onPage(page, 'Page.enable'),
      onPage(page, 'Runtime.enable'),
      onPage(page, 'Network.enable'),
      onPage(page, 'Network.setCacheDisabled', {cacheDisabled: true}),
      onPage(page, 'Network.setBypassServiceWorker', {bypass: true}),
      onPage(page, 'Network.setBlockedURLs', {urls: ['ws://*', 'wss://*']}),
      onPage(page, 'Fetch.enable', {patterns: [
        {urlPattern: 'http://*', requestStage: 'Request'},
        {urlPattern: 'https://*', requestStage: 'Request'},
      ]}),
      onPage(page, 'Page.addScriptToEvaluateOnNewDocument', {source: OBSERVER}),
    ];
    setup.push(onPage(page, 'Network.emulateNetworkConditions', {
      offline: offlineOnly, latency: 0, downloadThroughput: offlineOnly ? 0 : -1, uploadThroughput: offlineOnly ? 0 : -1,
    }));
    setup.push(onPage(page, 'Runtime.runIfWaitingForDebugger'));
    await Promise.all(setup);
  }
  async function readyPage(targetId) {
    const page = await waitFor(() => pages.get(targetId), 'CDP page attachment');
    await page.ready;
    lastPage = page;
    return page;
  }
  async function newPage() {
    const {targetId} = await command('Target.createTarget', {url: 'about:blank'});
    return readyPage(targetId);
  }
  async function navigate(page, url, width = 1360, height = 1000, offline = false, selector = '#catalog-results') {
    await onPage(page, 'Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    await onPage(page, 'Network.emulateNetworkConditions', {
      offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1,
    });
    const navigation = await onPage(page, 'Page.navigate', {url});
    assert.ok(!navigation.errorText, navigation.errorText);
    assert.ok(navigation.loaderId, 'Navigation must create a new document');
    await waitFor(async () => {
      const frame = await onPage(page, 'Page.getFrameTree');
      if (frame.frameTree.frame.loaderId !== navigation.loaderId) return false;
      return inPage(page, (expected, readySelector) => location.href === expected && document.readyState === 'complete' &&
        !!document.querySelector(readySelector), url, selector);
    }, 'newly loaded document: ' + selector);
  }
  async function audit(page, name, isCatalog = true) {
    const snapshot = await inPage(page, () => ({
      url: location.href, observed: window.__catalogReceiving,
      courseData: document.querySelector('#course-data')?.textContent ?? null,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.ok(snapshot.observed, 'Document observer must precede application startup');
    assert.deepEqual(snapshot.observed.setupErrors, [], 'Browser observer must install completely');
    assert.deepEqual(snapshot.observed.storageCalls, [], 'Page must not access persistent browser storage');
    assert.deepEqual(snapshot.observed.blockedApis, [], 'Page must not start remote transports or workers');
    if (isCatalog) {
      assert.ok(snapshot.courseData, 'Catalog embeds its own source entries');
      JSON.parse(snapshot.courseData);
    }
    report.documentAudits.push({name, url: snapshot.url, observed: snapshot.observed,
      courseDataSha256: snapshot.courseData === null ? null : sha256(Buffer.from(snapshot.courseData)), overflow: snapshot.overflow});
    return snapshot;
  }
  async function releasedObjectUrls(page, name) {
    const result = await waitFor(async () => {
      const urls = await inPage(page, () => ({
        created: window.__catalogReceiving.createdObjectUrls,
        revoked: window.__catalogReceiving.revokedObjectUrls,
      }));
      assert.equal(new Set(urls.created).size, urls.created.length, 'Created object URLs must be distinct');
      if (urls.revoked.length < urls.created.length) return null;
      assert.deepEqual([...urls.revoked].sort(), [...urls.created].sort(),
        'Each created object URL must be passed once to the native revoke API');
      return urls;
    }, 'delayed object-URL cleanup: ' + name, 5000);
    report.objectUrlCleanup.push({name, ...result});
  }
  async function cards(page) {
    return inPage(page, () => [...document.querySelectorAll('#catalog-results .course-card')]
      .filter(card => !card.hidden && card.getClientRects().length > 0).map(card => ({
      filename: card.dataset.course,
      title: card.querySelector('.course-title')?.textContent,
      count: card.querySelector('.course-count')?.textContent,
      concepts: [...card.querySelectorAll('.course-concepts li')].map(element => element.textContent),
      preview: [...card.querySelectorAll('.course-preview li')].map(element => element.textContent),
      attribution: card.querySelector('.course-attribution')?.textContent,
      license: card.querySelector('.course-license')?.textContent,
      download: card.querySelector('button[data-download]')?.dataset.download,
      activeMarkup: card.querySelectorAll('.course-title img,.course-title script,.course-concepts img,.course-concepts script,.course-attribution img,.course-attribution script,.course-license img,.course-license script').length,
    })));
  }
  async function metadata(page) {
    const found = await cards(page);
    assert.deepEqual(found.map(row => row.filename).sort(), [...COURSE_FILES].sort());
    for (const row of found) {
      const deck = decks.get(row.filename);
      assert.equal(row.title, deck.title, 'Literal course title: ' + row.filename);
      assert.equal(row.attribution, deck.attribution, 'Literal source attribution: ' + row.filename);
      assert.equal(row.license, deck.license, 'Literal source license: ' + row.filename);
      assert.deepEqual(row.concepts, deck.concepts, 'Every original concept, in source order');
      assert.deepEqual(row.preview, deck.items.slice(0, 3).map(item => item.prompt), 'The first three original prompts');
      assert.equal(row.count, deck.items.length + ' questions · ' + deck.concepts.length + ' concepts');
      assert.equal(row.download, row.filename);
      assert.equal(row.activeMarkup, 0, 'Metadata remains text');
    }
    return found;
  }
  async function discloseSource(page, filename) {
    const opened = await inPage(page, name => {
      const card = [...document.querySelectorAll('.course-card')].find(value => value.dataset.course === name);
      const details = card.querySelector('.course-attribution').closest('details');
      if (!details) throw new Error('Missing source disclosure');
      if (!details.open) details.querySelector('summary').focus();
      return details.open;
    }, filename);
    if (!opened) await key(page, 'Enter');
    assert.ok(await inPage(page, name => {
      const card = [...document.querySelectorAll('.course-card')].find(value => value.dataset.course === name);
      return card.querySelector('.course-attribution').closest('details').open &&
        card.querySelector('.course-attribution').getClientRects().length > 0 &&
        card.querySelector('.course-license').getClientRects().length > 0;
    }, filename), 'Source and permissions disclosure must be readable');
  }
  async function download(page, filename, label, activate) {
    const before = await audit(page, label + '-before');
    const known = new Set(downloads.keys());
    await activate();
    const received = await waitFor(() => {
      const fresh = [...downloads.values()].filter(value => !known.has(value.guid));
      assert.ok(fresh.length <= 1, 'One explicit download action must create one file');
      if (fresh[0]?.state === 'canceled') throw new Error('Browser canceled download: ' + label);
      return fresh[0]?.state === 'completed' ? fresh[0] : null;
    }, 'completed course download: ' + label);
    assert.equal(received.suggestedFilename, filename);
    const temporary = join(output, 'downloads', received.guid);
    const bytes = await readFile(temporary);
    assert.deepEqual(bytes, courseBytes.get(filename), 'Downloaded bytes match unchanged source: ' + filename);
    const path = join(label, filename);
    await mkdir(join(output, label), {recursive: true});
    await rename(temporary, join(output, path));
    artifactPaths.add(path);
    const after = await audit(page, label + '-after');
    assert.equal(after.courseData, before.courseData, 'Download must preserve embedded source bytes');
    assert.equal(after.observed.objectUrlAttempts, before.observed.objectUrlAttempts + 1);
    assert.equal(after.observed.objectUrlsCreated, before.observed.objectUrlsCreated + 1);
    const control = await inPage(page, name => {
      const card = [...document.querySelectorAll('.course-card')].find(value => value.dataset.course === name);
      return {disabled: card.querySelector('button[data-download]').disabled,
        status: card.querySelector('[data-download-status]').textContent,
        leftoverAnchors: document.querySelectorAll('a[download]').length};
    }, filename);
    assert.equal(control.disabled, false, 'Successful download action leaves its button ready');
    assert.equal(control.status, 'Download requested: ' + filename + '. Choose it in the learner.');
    assert.equal(control.leftoverAnchors, 0, 'Temporary download anchor is removed');
    report.downloads.push({label, filename, path, bytes: bytes.length, sha256: sha256(bytes),
      exactSourceBytes: true, browserGuid: received.guid});
    return join(output, path);
  }

  try {
    assert.ok(Number(process.versions.node.split('.')[0]) >= 22, 'Use Node 22 or newer');
    const disk = [];
    report.headroom = {disk, minimumMemoryBytes: MIN_MEMORY_BYTES};
    for (const directory of [output, tmpdir()]) {
      const info = await statfs(directory, {bigint: true});
      const available = info.bavail * info.bsize;
      disk.push({directory, freeBytes: available.toString(), minimumBytes: MIN_DISK_BYTES.toString()});
      assert.ok(available >= MIN_DISK_BYTES, 'Browser hold: less than 1 GiB free at ' + directory);
    }
    let memory = freemem();
    if (process.platform === 'linux') {
      const match = (await readFile('/proc/meminfo', 'utf8')).match(/^MemAvailable:\s+(\d+)\s+kB$/m);
      assert.ok(match, 'MemAvailable must be observable before starting Chrome');
      memory = Number(match[1]) * 1024;
    }
    report.headroom = {disk, availableMemoryBytes: memory, minimumMemoryBytes: MIN_MEMORY_BYTES};
    assert.ok(memory >= MIN_MEMORY_BYTES, 'Browser hold: less than 512 MiB available memory');
    console.log('HEADROOM ' + JSON.stringify(report.headroom));
    report.receiverSha256 = sha256(await readFile(fileURLToPath(import.meta.url)));
    report.archiveAdmission = await archiveAdmission(output);
    passed('Canonical ZIP fixture extracts exactly; all 16 refusal fixtures leave destinations absent and prior entries unchanged');
    if (settings.selfTest) { report.status = 'passed'; return; }
    try { report.checkout = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); }
    catch { report.checkout = null; }
    const sources = [
      'catalog.html', 'catalog/courses.json', 'catalog/template.html', 'catalog/catalog.css',
      'src/course-catalog.mjs', 'src/course-catalog-ui.mjs', 'tools/build-course-catalog.mjs',
      'tools/build-offline-pack.py', 'tools/check_offline_pack_browser.mjs',
      '.github/workflows/offline-pack-browser.yml', 'demo.html', 'src/deck.mjs',
      'offline/index.html', 'offline/recallweave-offline.zip',
      ...COURSE_FILES.map(name => 'courses/' + name),
    ];
    report.sourceGitBlobs = {};
    for (const path of sources) {
      const bytes = await readFile(join(root, path));
      sourceBytes.set(path, bytes);
      report.sourceSha256[path] = sha256(bytes);
      report.sourceGitBlobs[path] = createHash('sha1')
        .update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    }
    assert.deepEqual(JSON.parse(sourceBytes.get('catalog/courses.json').toString('utf8')),
      COURSE_FILES.map(name => 'courses/' + name), 'Receiver freezes the eleven registered course paths and order');
    for (const filename of COURSE_FILES) {
      const bytes = sourceBytes.get('courses/' + filename);
      courseBytes.set(filename, bytes);
      decks.set(filename, JSON.parse(bytes.toString('utf8')));
    }
    // Build the inventory from original bytes and an agreed literal; do not load
    // the producer module or derive expected content from the archive itself.
    const relativeMembers = new Map([
      ['catalog.html', sourceBytes.get('catalog.html')],
      ['demo.html', sourceBytes.get('demo.html')],
      ...COURSE_FILES.map(name => ['courses/' + name, courseBytes.get(name)]),
      ['START-HERE.txt', Buffer.from(START_HERE)],
    ]);
    const expectedManifest = {format: 'recallweave-offline-pack-v1',
      files: [...relativeMembers.keys()].sort().map(path => ({
        path, bytes: relativeMembers.get(path).length, sha256: sha256(relativeMembers.get(path)),
      }))};
    relativeMembers.set('SHA256SUMS.json', Buffer.from(JSON.stringify(expectedManifest, null, 2) + '\n'));
    const expectedFiles = new Map([...relativeMembers].map(([path, bytes]) => [PACK_PREFIX + path, bytes]));
    const sourceZip = sourceBytes.get('offline/recallweave-offline.zip');
    assert.ok(sourceZip.length <= ZIP_LIMIT, 'Committed archive stays within the frozen receiver size cap');
    // A package-managed browser must see the same owned profile path as Node.
    profile = await mkdtemp(join(dirname(output), 'recallweave-offline-pack-chrome-'));
    await mkdir(join(output, 'downloads'));
    const allowed = new Map([
      ['/offline/index.html', sourceBytes.get('offline/index.html')],
      ['/offline/recallweave-offline.zip', sourceZip],
    ]);
    server = createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
      if (request.method !== 'GET' || !allowed.has(url.pathname) || url.search) { response.writeHead(404).end(); return; }
      response.writeHead(200, {'Content-Type': url.pathname.endsWith('.zip') ? 'application/zip' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      response.end(allowed.get(url.pathname));
    });
    await new Promise((done, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', done);
    });
    base = 'http://127.0.0.1:' + server.address().port;
    browser = spawn(executable, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
      '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
      '--disk-cache-size=8388608', '--media-cache-size=8388608',
      '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      '--user-data-dir=' + profile, 'about:blank',
    ], {stdio: ['ignore', 'ignore', 'pipe']});
    // Observe close from launch: exit alone can precede shared stdio shutdown.
    browserDidClose = false;
    browserClosed = new Promise(done => browser.once('close', (code, signal) => {
      browserDidClose = true;
      report.browserExit = {code, signal};
      done();
    }));
    browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-8000); });
    let launchError;
    browser.on('error', error => { launchError = error; });
    const endpoint = await waitFor(async () => {
      if (launchError) throw launchError;
      if (browser.exitCode !== null) throw new Error('Chrome exited before startup: ' + browserLog);
      const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
      return port && path ? 'ws://127.0.0.1:' + port + path : null;
    }, 'Chrome startup', 20000);
    socket = new WebSocket(endpoint);
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id);
        clearTimeout(item.timer);
        if (message.error) item.reject(new Error(message.error.message));
        else item.done(message.result);
        return;
      }
      const {method, params, sessionId} = message;
      if (method === 'Target.attachedToTarget') {
        const page = {targetId: params.targetInfo.targetId, sessionId: params.sessionId};
        pages.set(page.targetId, page);
        page.ready = configure(page);
        page.ready.catch(error => { if (!closing) report.harnessErrors.push('Page setup: ' + error.message); });
      } else if (method === 'Browser.downloadWillBegin' || method === 'Browser.downloadProgress') {
        downloads.set(params.guid, {...downloads.get(params.guid), ...params});
      } else if (method === 'Runtime.exceptionThrown') {
        report.pageErrors.push({sessionId, error: params.exceptionDetails.exception?.description ?? params.exceptionDetails.text});
      } else if (method === 'Network.requestWillBeSent') {
        report.networkRequests.push({sessionId, url: params.request.url, method: params.request.method});
      } else if (method === 'Fetch.requestPaused') {
        const url = new URL(params.request.url);
        const allowed = !offlineOnly && params.request.method === 'GET' && url.origin === base &&
          ['/offline/index.html', '/offline/recallweave-offline.zip', '/favicon.ico'].includes(url.pathname) && !url.search;
        if (!allowed) report.unexpectedRequests.push({url: params.request.url, method: params.request.method});
        command(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest',
          {requestId: params.requestId, ...(!allowed ? {errorReason: 'BlockedByClient'} : {})}, sessionId)
          .catch(error => { if (!closing) report.harnessErrors.push('Network interception: ' + error.message); });
      }
    });
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP socket startup timeout')), 10000);
      socket.addEventListener('open', () => { clearTimeout(timer); done(); }, {once: true});
      socket.addEventListener('error', error => { clearTimeout(timer); reject(error); }, {once: true});
    });
    report.browser = await command('Browser.getVersion');
    await command('Browser.setDownloadBehavior', {behavior: 'allowAndName',
      downloadPath: join(output, 'downloads'), eventsEnabled: true});
    // Pause new pages so popup startup also receives network/storage observation.
    await command('Target.setAutoAttach', {autoAttach: true, waitForDebuggerOnStart: true, flatten: true,
      filter: [{type: 'page'}, {exclude: true}]});
    const page = await newPage();
    await navigate(page, base + '/offline/index.html', 1280, 960, false, '#download-offline-pack');
    const initial = await audit(page, 'download-page-desktop', false);
    assert.equal(initial.overflow, false, 'Download page fits a desktop viewport');
    assert.equal(initial.observed.objectUrlAttempts, 0, 'Opening the download page has no download side effect');
    assert.equal(downloads.size, 0);
    const packLink = await inPage(page, () => {
      const element = document.querySelector('#download-offline-pack');
      return {tag: element.tagName, href: element.href, download: element.download,
        text: element.textContent.trim(), target: element.target};
    });
    assert.equal(packLink.tag, 'A');
    assert.equal(packLink.href, base + '/offline/recallweave-offline.zip');
    assert.equal(packLink.download, 'recallweave-offline.zip');
    assert.equal(packLink.target, '');
    assert.match(packLink.text, /download.*offline.*pack/i);
    await screenshot(page, 'download-page-desktop.png');
    await onPage(page, 'Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: false,
    });
    await waitFor(() => inPage(page, () => innerWidth === 390), '390px download page viewport');
    assert.equal((await audit(page, 'download-page-phone', false)).overflow, false,
      'Download page fits a 390px viewport');
    const beforeDownloadHtml = await inPage(page, () => document.body.innerHTML);
    const knownDownloads = new Set(downloads.keys());
    await click(page, '#download-offline-pack');
    const archiveDownload = await waitFor(() => {
      const fresh = [...downloads.values()].filter(value => !knownDownloads.has(value.guid));
      assert.ok(fresh.length <= 1, 'One explicit pack action must create one browser download');
      if (fresh[0]?.state === 'canceled') throw new Error('Browser canceled the offline archive download');
      return fresh[0]?.state === 'completed' ? fresh[0] : null;
    }, 'completed offline ZIP download');
    assert.equal(archiveDownload.suggestedFilename, 'recallweave-offline.zip');
    const zipTemporary = join(output, 'downloads', archiveDownload.guid);
    const savedZip = await readFile(zipTemporary);
    assert.deepEqual(savedZip, sourceZip, 'Actual downloaded ZIP matches every committed source byte');
    const archivePath = 'downloaded-archive/recallweave-offline.zip';
    await mkdir(join(output, 'downloaded-archive'));
    await rename(zipTemporary, join(output, archivePath));
    artifactPaths.add(archivePath);
    report.downloads.push({label: 'offline-pack-anchor', filename: 'recallweave-offline.zip',
      path: archivePath, bytes: savedZip.length, sha256: sha256(savedZip),
      exactSourceBytes: true, browserGuid: archiveDownload.guid});
    assert.equal(await inPage(page, () => document.body.innerHTML), beforeDownloadHtml,
      'Normal anchor download leaves the download page unchanged');
    const afterDownload = await audit(page, 'download-page-after-anchor', false);
    assert.equal(afterDownload.url, initial.url);
    assert.equal(afterDownload.observed.objectUrlAttempts, 0, 'Static ZIP anchor needs no object URL');
    passed('Real download-page anchor saves the exact ZIP and filename; desktop and 390px layouts fit');

    const extractedRoot = join(output, 'extracted offline pack é');
    const records = await extractArchive(savedZip, expectedFiles, extractedRoot);
    report.archive = {path: archivePath, bytes: savedZip.length, sha256: sha256(savedZip),
      extractionRoot: relative(output, extractedRoot).split(sep).join('/'),
      limits: {zipBytes: ZIP_LIMIT, entries: ENTRY_LIMIT, memberBytes: MEMBER_LIMIT, aggregateBytes: TOTAL_MEMBER_LIMIT},
      metadata: {method: 'ZIP_STORED', madeBy: 0x0314, needed: 20, flags: 0,
        dosDate: 33, dosTime: 0, regularMode: '100644'},
      inventory: records.map(({data, ...record}) => record), manifest: expectedManifest};
    for (const [path, expected] of expectedFiles)
      assert.deepEqual(await readFile(join(extractedRoot, ...path.split('/'))), expected,
        'Extracted original bytes: ' + path);
    const extractionBefore = await extractionSnapshot(extractedRoot);
    report.extractionBefore = extractionBefore;
    passed('The saved ZIP has only the exact safe stored-file inventory, original bytes and independent SHA256 manifest');

    await command('Target.closeTarget', {targetId: page.targetId});
    offlineOnly = true;
    const requestStart = report.networkRequests.length;
    const catalog = await newPage();
    const catalogPath = join(extractedRoot, 'RecallWeave', 'catalog.html');
    const learnerPath = join(extractedRoot, 'RecallWeave', 'demo.html');
    const learnerFile = join(extractedRoot, 'RecallWeave', 'courses', COURSE_FILES[0]);
    await navigate(catalog, pathToFileURL(catalogPath).href, 390, 844, true);
    await metadata(catalog);
    const offlineInitial = await audit(catalog, 'extracted-file-catalog-initial');
    assert.equal(offlineInitial.overflow, false);
    assert.equal(offlineInitial.observed.objectUrlAttempts, 0);
    assert.equal(downloads.size, 1, 'Opening the extracted catalog must not request a download');
    assert.deepEqual(JSON.parse(offlineInitial.courseData), COURSE_FILES.map(name => ({
      path: 'courses/' + name, text: courseBytes.get(name).toString('utf8'),
    })), 'Every embedded catalog entry keeps the original course bytes');
    await discloseSource(catalog, COURSE_FILES[0]);
    const courseDownloadPath = await download(catalog, COURSE_FILES[0], 'extracted-catalog-download',
      () => click(catalog, 'button[data-download="' + COURSE_FILES[0] + '"]'));
    assert.deepEqual(await readFile(courseDownloadPath), await readFile(learnerFile),
      'The extracted catalog download and included JSON file are the same original bytes');
    await releasedObjectUrls(catalog, 'extracted-catalog-after-download');
    assert.equal((await audit(catalog, 'extracted-file-catalog-after-download')).overflow, false);
    passed('Offline extracted catalog renders all eleven original courses and downloads the included JSON exactly');

    const link = await inPage(catalog, () => {
      const element = document.querySelector('#open-learner');
      return {tag: element.tagName, href: element.href, target: element.target};
    });
    assert.equal(link.tag, 'A');
    assert.equal(link.href, pathToFileURL(learnerPath).href);
    assert.equal(link.target, '_blank');
    const knownPages = new Set(pages.keys());
    await click(catalog, '#open-learner');
    const learner = await waitFor(async () => {
      for (const page of pages.values()) {
        if (knownPages.has(page.targetId)) continue;
        await page.ready;
        if (await inPage(page, expected => location.href === expected && document.readyState === 'complete' &&
          !!document.querySelector('#deck-file'), link.href)) return page;
      }
      return null;
    }, 'actual learner link opens a separate initialized page');
    lastPage = learner;
    assert.notEqual(learner.targetId, catalog.targetId);
    await onPage(learner, 'Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 960, deviceScaleFactor: 1, mobile: false,
    });
    await audit(learner, 'extracted-learner-before-preview', false);
    const beforePreview = await inPage(learner, () => ({
      session: document.querySelector('#session-content').innerHTML,
      progress: document.querySelector('#step-count').textContent,
      description: document.querySelector('#lesson-description').textContent,
    }));
    const document = await onPage(learner, 'DOM.getDocument');
    const {nodeId} = await onPage(learner, 'DOM.querySelector', {nodeId: document.root.nodeId, selector: '#deck-file'});
    assert.ok(nodeId);
    await onPage(learner, 'DOM.setFileInputFiles', {nodeId, files: [learnerFile]});
    await waitFor(() => inPage(learner, title =>
      document.querySelector('#deck-preview-title')?.textContent === title &&
      !!document.querySelector('#start-deck'), decks.get(COURSE_FILES[0]).title), 'included course preview');
    assert.deepEqual(await inPage(learner, () => ({
      session: document.querySelector('#session-content').innerHTML,
      progress: document.querySelector('#step-count').textContent,
      description: document.querySelector('#lesson-description').textContent,
    })), beforePreview, 'File preview must not replace the current learner session');
    await audit(learner, 'extracted-learner-after-preview', false);
    assert.match(await inPage(learner, () => document.querySelector('#start-deck').textContent), /Start this deck/);
    await click(learner, '#start-deck');
    await waitFor(() => inPage(learner, title =>
      document.querySelector('#lesson-description').textContent === title &&
      !document.querySelector('#start-deck'), decks.get(COURSE_FILES[0]).title), 'explicit imported-deck start');
    const imported = await inPage(learner, () => ({
      title: document.querySelector('#lesson-description').textContent,
      progress: document.querySelector('#step-count').textContent,
      prompt: document.querySelector('.question-card h2')?.textContent ?? null,
      status: document.querySelector('#deck-status').textContent,
    }));
    assert.equal(imported.progress, '0 / ' + decks.get(COURSE_FILES[0]).items.length);
    assert.ok(decks.get(COURSE_FILES[0]).items.some(item => item.prompt === imported.prompt),
      'Explicit start reaches an actual question from the included original course');
    assert.ok(imported.status.includes(decks.get(COURSE_FILES[0]).title));
    report.learnerHandoff = {includedCourse: relative(output, learnerFile).split(sep).join('/'),
      catalog: relative(output, catalogPath).split(sep).join('/'),
      learner: relative(output, learnerPath).split(sep).join('/'),
      catalogDownload: relative(output, courseDownloadPath).split(sep).join('/'), siblingLink: link,
      previewPreservedSession: true, startedExplicitly: true, ...imported};
    assert.equal((await audit(learner, 'extracted-learner-after-explicit-start', false)).overflow, false);
    await screenshot(learner, 'extracted-learner-started.png', '#session-content');
    passed('Actual extracted sibling learner previews the included course without mutation, then explicitly starts its question');

    await audit(catalog, 'extracted-catalog-final');
    const directSessions = new Set([catalog.sessionId, learner.sessionId]);
    const directRequests = report.networkRequests.slice(requestStart).filter(request => directSessions.has(request.sessionId));
    assert.ok(directRequests.every(request => request.url.startsWith('file:') ||
      request.url.startsWith('blob:') || request.url.startsWith('data:')),
      'Extracted offline catalog and learner must not request a hosted resource');
    report.offlineRequests = directRequests;
    report.extractionAfter = await extractionSnapshot(extractedRoot);
    assert.deepEqual(report.extractionAfter, extractionBefore,
      'Opening, downloading and previewing must not alter any extracted file or directory');
    for (const [path, bytes] of sourceBytes)
      assert.deepEqual(await readFile(join(root, path)), bytes, 'Receiving must not modify source: ' + path);
    assert.equal(downloads.size, 2, 'The explicit ZIP and one offline JSON are the only browser downloads');
    assert.equal(downloads.size, report.downloads.length, 'Every browser download must be retained and checked');
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.unexpectedRequests, []);
    assert.deepEqual(report.harnessErrors, []);
    passed('Offline pages have no storage, remote transport, JavaScript error, source change or extracted-tree mutation');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack ?? String(error);
    report.browserLog = browserLog;
    process.exitCode = 1;
    if (lastPage) {
      try {
        report.lastPage = await inPage(lastPage, () => ({
          url: location.href, ready: document.readyState, text: document.body.innerText.slice(0, 6000),
        }));
        await screenshot(lastPage, 'failure.png');
      } catch (failure) { report.captureFailure = String(failure); }
    }
    console.error(report.error);
  } finally {
    closing = true;
    if (socket?.readyState === WebSocket.OPEN) {
      try { await command('Browser.close'); } catch { /* Keep the original failure. */ }
    }
    socket?.close();
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('Browser receiver closed')); }
    pending.clear();
    try {
      if (server?.listening) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
      if (browser && !browserDidClose) {
        await Promise.race([browserClosed, sleep(3000)]);
        for (const signal of ['SIGTERM', 'SIGKILL']) {
          if (browserDidClose) break;
          (report.browserShutdownSignals ??= []).push(signal);
          browser.kill(signal);
          await Promise.race([browserClosed, sleep(2000)]);
        }
        assert.ok(browserDidClose, 'Chrome process and its stdio did not close before profile cleanup');
      }
      // Retry only transient filesystem refusal within this receiver's own profile.
      if (profile) await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
    } catch (error) {
      report.cleanupError = String(error);
      report.status = 'failed';
      process.exitCode = 1;
    }
    await artifact('offline-pack-receiving.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
    console.log('RESULT ' + JSON.stringify({status: report.status, checks: report.checks.length,
      downloads: report.downloads.length, sourceSha256: report.sourceSha256}));
    if (settings.emitBundle) await emitBundle(output);
  }
}

try { await main(options(process.argv.slice(2))); }
catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
