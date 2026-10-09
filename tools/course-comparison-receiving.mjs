import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat, statfs, rm, lstat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, basename, join } from 'node:path';
import { freemem } from 'node:os';

export const REQUIRED_SOURCES = Object.freeze([
  'src/deck.mjs', 'src/course-comparison.mjs', 'src/course-comparison-page.mjs',
  'src/course-comparison-ui.mjs', 'course-compare/index.html', 'course-compare/styles.css',
  'course-compare.html', 'tools/build-course-compare.mjs',
  'tools/check-course-comparison-page.mjs', 'tests/course-comparison-page.test.mjs',
  'docs/course-comparison-page.md', 'tools/course-comparison-receiving.mjs',
  'tests/course-comparison-receiving.test.mjs'
]);
export const MIN_FREE_MEMORY = 2 * 1024 ** 3;
export const MIN_FREE_DISK = 1024 ** 3;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const digest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const gitId = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const inside = (root, file) => { const rel = relative(root, file); return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel); };
export async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest('hex');
}
export function parsePinnedManifest(bytes, expectedSHA256) {
  assert.ok(digest(expectedSHA256), 'Provide the independently frozen manifest SHA-256');
  assert.equal(sha256(bytes), expectedSHA256, 'Exact frozen source/runtime manifest');
  const value = JSON.parse(bytes);
  assert.ok(record(value), 'Manifest must be an object');
  return value;
}
export async function admitSources(project, expected, offeredOwnerGitBlob) {
  assert.ok(record(expected.sources), 'Source hashes are required');
  assert.ok(record(expected.owner177) && gitId(expected.owner177.gitBlob), 'Real owner177 Git blob required');
  assert.ok(gitId(offeredOwnerGitBlob), 'Separate qualified owner Git blob required');
  assert.equal(expected.owner177.gitBlob, offeredOwnerGitBlob, 'Frozen offer binding');
  for (const name of REQUIRED_SOURCES) assert.ok(Object.hasOwn(expected.sources, name), 'Required source: ' + name);
  const root = await realpath(project), result = Object.create(null), actualPaths = new Set();
  for (const name of Object.keys(expected.sources).sort()) {
    assert.ok(name && !name.includes('\\') && !isAbsolute(name) && name.split('/').every(x => x && x !== '.' && x !== '..'), 'Literal project-relative source path');
    assert.ok(digest(expected.sources[name]), 'Source SHA-256: ' + name);
    const actual = await realpath(resolve(root, name));
    assert.ok(inside(root, actual), 'Source stays in project: ' + name);
    assert.ok(!actualPaths.has(actual), 'Duplicate or aliased source path');
    actualPaths.add(actual);
    assert.ok((await stat(actual)).isFile(), 'Regular source file');
    const bytes = await readFile(actual);
    result[name] = sha256(bytes);
    assert.equal(result[name], expected.sources[name], 'Exact source: ' + name);
    if (name === 'src/course-comparison.mjs') assert.equal(gitBlob(bytes), offeredOwnerGitBlob, 'Actual owner file Git blob');
    if (name === 'src/deck.mjs') {
      assert.equal(bytes.length, 4894);
      assert.equal(result[name], '621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b', 'Unchanged shared validator');
      assert.equal(gitBlob(bytes), 'f0f8a4b234489c2388f427633f548d56c6ed4c03');
    }
  }
  return result;
}
export async function admitRuntime(executable, runtime) {
  assert.ok(record(runtime), 'Runtime records required');
  for (const name of ['node', 'chrome', ...(process.platform === 'win32' ? ['chromeDll'] : [])]) {
    assert.ok(Object.hasOwn(runtime, name), 'Required runtime: ' + name);
  }
  const actualPaths = Object.create(null), seen = new Set();
  for (const name of Object.keys(runtime).sort()) {
    const row = runtime[name];
    assert.ok(record(row) && typeof row.path === 'string' && isAbsolute(row.path) && digest(row.sha256), 'Exact runtime path and SHA-256: ' + name);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0, 'Runtime byte size: ' + name);
    const actual = await realpath(row.path);
    assert.ok(!seen.has(actual), 'Duplicate runtime path');
    seen.add(actual); actualPaths[name] = actual;
    assert.ok((await stat(actual)).isFile(), 'Regular runtime file');
  }
  assert.equal(actualPaths.node, await realpath(process.execPath), 'Actual executing Node');
  assert.equal(actualPaths.chrome, await realpath(executable), 'Actual launched browser');
  if (process.platform === 'win32') {
    assert.equal(basename(actualPaths.chromeDll).toLowerCase(), 'chrome.dll');
    assert.equal(dirname(dirname(actualPaths.chromeDll)), dirname(actualPaths.chrome), 'Browser DLL belongs to selected installation');
    assert.match(basename(dirname(actualPaths.chromeDll)), /^\d+\.\d+\.\d+\.\d+$/, 'Versioned browser DLL');
  }
  const result = Object.create(null);
  for (const name of Object.keys(actualPaths).sort()) {
    const actual = actualPaths[name], bytes = (await stat(actual)).size, hash = await hashFile(actual);
    assert.equal(bytes, runtime[name].bytes, 'Runtime size: ' + name);
    assert.equal(hash, runtime[name].sha256, 'Runtime hash: ' + name);
    result[name] = { path: actual, bytes, sha256: hash };
  }
  return result;
}
export function assertBrowserVersion(product, admittedRuntime) {
  assert.equal(typeof product, 'string');
  assert.match(product, /^(?:HeadlessChrome|Chrome)\/\d+\.\d+\.\d+\.\d+$/);
  if (process.platform === 'win32') assert.equal(product.split('/')[1], basename(dirname(admittedRuntime.chromeDll.path)), 'Actual CDP product matches admitted DLL');
}
export async function resourceSnapshot(directory) {
  const disk = await statfs(directory);
  return { at: new Date().toISOString(), freeMemory: freemem(), freeDisk: Number(disk.bavail) * Number(disk.bsize), minimumFreeMemory: MIN_FREE_MEMORY, minimumFreeDisk: MIN_FREE_DISK };
}
export function assertResources(snapshot) {
  assert.ok(Number.isSafeInteger(snapshot.freeMemory) && snapshot.freeMemory >= MIN_FREE_MEMORY, 'At least 2 GiB free RAM required before browser launch');
  assert.ok(Number.isSafeInteger(snapshot.freeDisk) && snapshot.freeDisk >= MIN_FREE_DISK, 'At least 1 GiB available disk required before browser launch');
}
export function awaitWebSocketOpen(socket, timeoutMs = 10000) {
  return new Promise((resolve_, reject) => {
    let timer;
    const done = error => { clearTimeout(timer); socket.removeEventListener('open', opened); socket.removeEventListener('error', failed); socket.removeEventListener('close', closed); error ? reject(error) : resolve_(); };
    const opened = () => done(), failed = () => done(new Error('Browser WebSocket error before opening')), closed = () => done(new Error('Browser WebSocket closed before opening'));
    if (socket.readyState === 1) { resolve_(); return; }
    if (socket.readyState > 1) { reject(new Error('Browser WebSocket is already closed')); return; }
    socket.addEventListener('open', opened, { once: true });
    socket.addEventListener('error', failed, { once: true });
    socket.addEventListener('close', closed, { once: true });
    timer = setTimeout(() => done(new Error('Browser WebSocket opening timed out')), timeoutMs);
  });
}
export function observeChild(child) {
  let result = null, spawnError = null;
  const promise = new Promise(resolve_ => {
    child.once('error', error => { spawnError = String(error); });
    child.once('close', (code, signal) => { result = { code, signal, spawnError }; resolve_(result); });
  });
  return Object.freeze({ promise, current: () => result });
}
async function waitClosed(observer, milliseconds) {
  if (observer.current()) return observer.current();
  let timer;
  try { return await Promise.race([observer.promise, new Promise(resolve_ => { timer = setTimeout(() => resolve_(null), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
export async function finishBrowser(child, observer, requestClose, graceMs = 3000) {
  if (!child) return { launched: false, closed: false, ok: false, code: null, signal: null, forced: false };
  let requestError = null, requestTimedOut = false, requested = false, forced = false;
  if (!observer.current()) {
    requested = true;
    const marker = {};
    let timer;
    try {
      const response = await Promise.race([Promise.resolve().then(requestClose).catch(error => { requestError = String(error); }), observer.promise, new Promise(resolve_ => { timer = setTimeout(() => resolve_(marker), graceMs); })]);
      requestTimedOut = response === marker;
    } finally { clearTimeout(timer); }
  }
  let result = await waitClosed(observer, graceMs);
  if (!result && child.exitCode === null && child.signalCode === null) { forced = true; child.kill('SIGTERM'); result = await waitClosed(observer, graceMs); }
  if (!result && child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); result = await waitClosed(observer, graceMs); }
  return { launched: true, requested, requestError, requestTimedOut, forced, closed: Boolean(result), code: result?.code ?? null, signal: result?.signal ?? null, spawnError: result?.spawnError ?? null, ok: Boolean(result && result.code === 0 && result.signal === null && !result.spawnError && requested && requestError === null && !forced && !requestTimedOut) };
}
export async function removeOwnedProfile(profile, output) {
  assert.equal(dirname(resolve(profile)), resolve(output), 'Remove only this run profile');
  assert.ok(basename(profile).startsWith('profile-'), 'Owned temporary profile prefix');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  try { await lstat(profile); return false; } catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}
