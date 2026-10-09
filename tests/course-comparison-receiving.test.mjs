import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  REQUIRED_SOURCES, MIN_FREE_MEMORY, MIN_FREE_DISK, parsePinnedManifest, admitSources,
  admitRuntime, hashFile, assertResources, assertBrowserVersion, awaitWebSocketOpen,
  observeChild, finishBrowser, removeOwnedProfile
} from '../tools/course-comparison-receiving.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
async function temp(t) { const root = await mkdtemp(join(tmpdir(), 'recall180-admission-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }

test('complete consumer closure and exact real-file Git binding are required before import', async t => {
  const root = await temp(t), sources = {};
  // These are inert byte fixtures. No synthetic comparator is imported or used to qualify the product.
  const fixture = Buffer.from('INERT RECEIVER ADMISSION BYTE FIXTURE\n');
  const validator = await readFile(new URL('../src/deck.mjs', import.meta.url));
  for (const name of REQUIRED_SOURCES) {
    const file = join(root, name); await mkdir(dirname(file), { recursive: true });
    const bytes = name === 'src/deck.mjs' ? validator : fixture;
    await writeFile(file, bytes); sources[name] = sha(bytes);
  }
  const expected = { owner177: { gitBlob: git(fixture) }, sources };
  const admitted = await admitSources(root, expected, git(fixture));
  assert.deepEqual(Object.keys(admitted).sort(), REQUIRED_SOURCES.toSorted());
  for (const name of REQUIRED_SOURCES) {
    const malformed = copy(expected); delete malformed.sources[name];
    await assert.rejects(admitSources(root, malformed, git(fixture)), /Required source/);
  }
  for (const malformed of [
    { owner177: { gitBlob: 'not-a-git-blob' }, sources: {} },
    { ...expected, sources: [] },
    { ...expected, sources: { ...sources, '../outside': sha(fixture) } },
    { ...expected, sources: { ...sources, 'src/../src/deck.mjs': sha(validator) } },
    { ...expected, sources: { ...sources, 'src\\deck.mjs': sha(validator) } },
    { ...expected, owner177: { gitBlob: '0'.repeat(40) } }
  ]) await assert.rejects(admitSources(root, malformed, git(fixture)));
  await assert.rejects(admitSources(root, expected, '0'.repeat(40)), /offer binding/i);
  const extra = copy(expected);
  await writeFile(join(root, '__proto__'), fixture);
  Object.defineProperty(extra.sources, '__proto__', { value: sha(fixture), enumerable: true, writable: true });
  const extraAdmitted = await admitSources(root, extra, git(fixture));
  assert.ok(Object.hasOwn(extraAdmitted, '__proto__'));
  assert.equal(extraAdmitted.__proto__, sha(fixture));
  extra.sources.__proto__ = '0'.repeat(64);
  await assert.rejects(admitSources(root, extra, git(fixture)), /Exact source: __proto__/);
  await writeFile(join(root, 'src/course-comparison.mjs'), 'changed bytes');
  await assert.rejects(admitSources(root, expected, git(fixture)), /Exact source/);
  const changed = copy(expected); changed.sources['src/course-comparison.mjs'] = sha(Buffer.from('changed bytes'));
  await assert.rejects(admitSources(root, changed, git(fixture)), /Actual owner file Git blob/);
});

test('manifest bytes must match a separately supplied frozen digest', () => {
  const bytes = Buffer.from('{"sources":{},"owner177":{}}\n');
  assert.deepEqual(parsePinnedManifest(bytes, sha(bytes)), { sources: {}, owner177: {} });
  assert.throws(() => parsePinnedManifest(bytes, 'not-a-sha'));
  assert.throws(() => parsePinnedManifest(Buffer.concat([bytes, Buffer.from(' ')]), sha(bytes)), /Exact frozen/);
  assert.throws(() => parsePinnedManifest(Buffer.from('[]'), sha(Buffer.from('[]'))), /Manifest must/);
});

test('runtime admission binds executing Node and selected browser paths, sizes and hashes', async t => {
  const root = await temp(t), browser = join(root, 'chrome.exe'), dll = join(root, '154.0.8037.98', 'chrome.dll');
  await mkdir(dirname(dll)); await writeFile(browser, 'INERT BROWSER PATH FIXTURE'); await writeFile(dll, 'INERT DLL PATH FIXTURE');
  const record = async path => ({ path, bytes: (await stat(path)).size, sha256: await hashFile(path) });
  const runtime = { node: await record(process.execPath), chrome: await record(browser), ...(process.platform === 'win32' ? { chromeDll: await record(dll) } : {}) };
  const admitted = await admitRuntime(browser, runtime);
  assert.equal(admitted.node.sha256, runtime.node.sha256);
  assertBrowserVersion('Chrome/154.0.8037.98', admitted);
  if (process.platform === 'win32') assert.throws(() => assertBrowserVersion('Chrome/155.0.0.0', admitted), /Actual CDP product/);
  await assert.rejects(admitRuntime(browser, {}), /Required runtime/);
  await assert.rejects(admitRuntime(browser, { ...runtime, node: runtime.chrome }), /Duplicate runtime|Actual executing Node/);
  const other = join(root, 'other.exe'); await writeFile(other, 'OTHER');
  await assert.rejects(admitRuntime(other, runtime), /Actual launched browser/);
  await assert.rejects(admitRuntime(browser, { ...runtime, chrome: { ...runtime.chrome, bytes: 1 } }), /Runtime size/);
  const extra = copy(runtime);
  Object.defineProperty(extra, '__proto__', { value: await record(other), enumerable: true });
  const extraAdmitted = await admitRuntime(browser, extra);
  assert.ok(Object.hasOwn(extraAdmitted, '__proto__'));
  assert.deepEqual(extraAdmitted.__proto__, extra.__proto__);
  extra.__proto__.bytes = 99999;
  extra.__proto__.sha256 = '0'.repeat(64);
  await assert.rejects(admitRuntime(browser, extra), /Runtime size: __proto__/);
  await writeFile(browser, 'CHANGED BROWSER CONTENT');
  await assert.rejects(admitRuntime(browser, runtime), /Runtime size|Runtime hash/);
});

test('resource admission retains exact 2 GiB RAM and 1 GiB disk floors', () => {
  assertResources({ freeMemory: MIN_FREE_MEMORY, freeDisk: MIN_FREE_DISK });
  for (const freeMemory of [MIN_FREE_MEMORY - 1, 0, -1, NaN, Infinity, 3.1]) {
    assert.throws(() => assertResources({ freeMemory, freeDisk: MIN_FREE_DISK }), /2 GiB/);
  }
  for (const freeDisk of [MIN_FREE_DISK - 1, 0, -1, NaN, Infinity]) {
    assert.throws(() => assertResources({ freeMemory: MIN_FREE_MEMORY, freeDisk }), /1 GiB/);
  }
});

test('WebSocket opening is finite on silence and rejects error or early close', async () => {
  const socket = () => Object.assign(new EventTarget(), { readyState: 0 });
  await assert.rejects(awaitWebSocketOpen(socket(), 15), /timed out/);
  const good = socket(), opened = awaitWebSocketOpen(good, 200);
  good.readyState = 1; good.dispatchEvent(new Event('open')); await opened;
  for (const name of ['error', 'close']) {
    const item = socket(), promise = awaitWebSocketOpen(item, 200);
    item.dispatchEvent(new Event(name)); await assert.rejects(promise);
  }
  await assert.rejects(awaitWebSocketOpen(Object.assign(socket(), { readyState: 3 }), 15), /already closed/);
});

test('actual bounded Node child cleanup requires requested zero close, rejects nonzero and forced termination', async () => {
  async function child(code) {
    const process_ = spawn(process.execPath, ['--max-old-space-size=32', '-e', code], { stdio: ['pipe', 'pipe', 'pipe'] });
    const observer = observeChild(process_);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Child readiness timeout')), 3000);
      process_.stdout.once('data', () => { clearTimeout(timer); resolve(); });
      process_.once('error', error => { clearTimeout(timer); reject(error); });
    });
    return { process_, observer };
  }
  for (const exit of [0, 7]) {
    const { process_, observer } = await child('process.stdin.resume();process.stdin.once("data",()=>process.exit(' + exit + '));console.log("ready");');
    const result = await finishBrowser(process_, observer, () => { process_.stdin.write('close\n'); }, 500);
    assert.equal(result.closed, true); assert.equal(result.code, exit); assert.equal(result.signal, null);
    assert.equal(result.forced, false); assert.equal(result.ok, exit === 0);
  }
  const { process_, observer } = await child('setInterval(()=>{},1000);console.log("ready");');
  const forced = await finishBrowser(process_, observer, () => {}, 30);
  assert.equal(forced.forced, true); assert.equal(forced.closed, true); assert.equal(forced.ok, false);
  const exited = Object.assign(new EventEmitter(), { exitCode: 0, signalCode: null, kill() { throw new Error('Must not kill an already exited PID'); } });
  const unconfirmed = await finishBrowser(exited, observeChild(exited), () => {}, 15);
  assert.equal(unconfirmed.closed, false); assert.equal(unconfirmed.ok, false); assert.equal(unconfirmed.forced, false);
  const early = Object.assign(new EventEmitter(), { exitCode: 0, signalCode: null });
  const earlyObserver = observeChild(early); early.emit('close', 0, null);
  assert.equal((await finishBrowser(early, earlyObserver, () => {}, 15)).ok, false, 'Unexpected prior exit is not an requested clean shutdown');
});

test('an explicit failed close request cannot be rescued by an unrelated successful close', async () => {
  function fake() {
    return Object.assign(new EventEmitter(), { exitCode: null, signalCode: null, kill() { throw new Error('Already closed fake child must not be killed'); } });
  }
  for (const throws of [false, true]) {
    const child = fake(), observer = observeChild(child);
    const result = await finishBrowser(child, observer, () => {
      setTimeout(() => { child.exitCode = 0; child.emit('close', 0, null); }, 5);
      if (throws) throw new Error('No open control socket');
    }, 100);
    assert.equal(result.closed, true);
    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
    assert.equal(result.forced, false);
    assert.equal(result.ok, !throws);
    assert.equal(result.requestError === null, !throws);
  }
});

test('profile cleanup is confined to the own run and confirms actual absence', async t => {
  const root = await temp(t), profile = await mkdtemp(join(root, 'profile-'));
  await writeFile(join(profile, 'owned'), 'test');
  assert.equal(await removeOwnedProfile(profile, root), true);
  await assert.rejects(lstat(profile), { code: 'ENOENT' });
  const other = join(root, 'keep'); await mkdir(other);
  await assert.rejects(removeOwnedProfile(other, root), /prefix/);
  assert.equal((await stat(other)).isDirectory(), true);
  await assert.rejects(removeOwnedProfile(root, root), /only this run/);
});
