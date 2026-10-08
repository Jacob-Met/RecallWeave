#!/usr/bin/env node
/**
 * Receive the standalone course catalog with Node 22+ and installed Chrome.
 * Uses the same dependency-free CDP approach as the repository's browser tools.
 * Run only on a complete candidate; no application dependency or browser install.
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
const MIN_DISK_BYTES = 1024n ** 3n;
const MIN_MEMORY_BYTES = 512 * 1024 * 1024;
const PACKET_LIMIT = 2 * 1024 * 1024;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(done => setTimeout(done, ms));

function options(args) {
  const result = {
    root: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    browser: 'google-chrome',
    output: join(tmpdir(), 'recallweave-catalog-receiving-' + process.pid),
    emitBundle: false,
  };
  const seen = new Set();
  while (args.length) {
    const flag = args.shift();
    if (seen.has(flag)) throw new Error('Repeated option: ' + flag);
    seen.add(flag);
    if (flag === '--emit-bundle') { result.emitBundle = true; continue; }
    const key = {'--root': 'root', '--browser': 'browser', '--output': 'output'}[flag];
    if (!key || !args[0]) throw new Error('Usage: check_course_catalog_browser.mjs [--root DIR] [--browser FILE] [--output NEW_DIR] [--emit-bundle]');
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
  console.log('RECALLWEAVE_CATALOG_BUNDLE_BEGIN ' + JSON.stringify({
    bytes: payload.length, sha256: sha256(payload), chunks, fileBytes: total,
  }));
  for (let index = 0; index < chunks; index++)
    console.log('RECALLWEAVE_CATALOG_BUNDLE_CHUNK ' + index + ' ' + encoded.slice(index * 4096, (index + 1) * 4096));
  console.log('RECALLWEAVE_CATALOG_BUNDLE_END');
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
    version: 1, status: 'running', root, executable, node: process.version,
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
  async function navigate(page, url, width = 1360, height = 1000, offline = false) {
    await onPage(page, 'Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    await onPage(page, 'Network.emulateNetworkConditions', {
      offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1,
    });
    const navigation = await onPage(page, 'Page.navigate', {url});
    assert.ok(!navigation.errorText, navigation.errorText);
    assert.ok(navigation.loaderId, 'Catalog navigation must create a new document');
    await waitFor(async () => {
      const frame = await onPage(page, 'Page.getFrameTree');
      if (frame.frameTree.frame.loaderId !== navigation.loaderId) return false;
      return inPage(page, expected => location.href === expected && document.readyState === 'complete' &&
        !!document.querySelector('#catalog-results'), url);
    }, 'newly loaded catalog document');
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
    try { report.checkout = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); }
    catch { report.checkout = null; }
    const sources = [
      'catalog.html', 'catalog/courses.json', 'catalog/template.html', 'catalog/catalog.css',
      'src/course-catalog.mjs', 'src/course-catalog-ui.mjs', 'tools/build-course-catalog.mjs',
      'tools/check_course_catalog_browser.mjs', '.github/workflows/catalog-browser.yml',
      '.github/workflows/test.yml', 'demo.html', 'src/deck.mjs', 'src/deck-picker.mjs',
      ...COURSE_FILES.map(name => 'courses/' + name),
    ];
    for (const path of sources) {
      const bytes = await readFile(join(root, path));
      sourceBytes.set(path, bytes);
      report.sourceSha256[path] = sha256(bytes);
    }
    for (const filename of COURSE_FILES) {
      const bytes = sourceBytes.get('courses/' + filename);
      courseBytes.set(filename, bytes);
      decks.set(filename, JSON.parse(bytes.toString('utf8')));
    }
    profile = await mkdtemp(join(tmpdir(), 'recallweave-catalog-chrome-'));
    await mkdir(join(output, 'downloads'));
    const allowed = new Map([
      ['/catalog.html', sourceBytes.get('catalog.html')],
      ['/demo.html', sourceBytes.get('demo.html')],
    ]);
    server = createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
      if (request.method !== 'GET' || !allowed.has(url.pathname) || url.search) { response.writeHead(404).end(); return; }
      response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
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
        const allowed = params.request.method === 'GET' && url.origin === base &&
          ['/catalog.html', '/demo.html', '/favicon.ico'].includes(url.pathname) && !url.search;
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
    const catalog = await newPage();
    await navigate(catalog, base + '/catalog.html');
    await metadata(catalog);
    const firstAudit = await audit(catalog, 'http-initial');
    assert.equal(firstAudit.overflow, false);
    assert.equal(firstAudit.observed.objectUrlAttempts, 0, 'Opening the catalog must not download anything');
    passed('HTTP catalog renders all ' + COURSE_FILES.length + ' original course metadata records');
    await discloseSource(catalog, COURSE_FILES[0]);
    passed('Source and permissions disclosure opens with Enter and exposes original statements');
    await screenshot(catalog, 'catalog-desktop.png');

    for (const filename of COURSE_FILES)
      await download(catalog, filename, 'http-' + filename.slice(0, -5),
        () => click(catalog, 'button[data-download="' + filename + '"]'));
    passed('All ' + COURSE_FILES.length + ' HTTP downloads preserve exact source bytes and requested filenames');
    const learnerFile = await download(catalog, COURSE_FILES[0], 'http-repeat',
      () => click(catalog, 'button[data-download="' + COURSE_FILES[0] + '"]'));
    passed('Repeated explicit download retains the same original bytes');

    const beforeSearchDownloads = downloads.size;
    for (const query of ['BINARY', '  Shared calibration  ', 'no-course-matches-706421', '']) {
      await inPage(catalog, value => {
        const input = document.querySelector('#catalog-search');
        input.value = value;
        input.dispatchEvent(new Event('input', {bubbles: true}));
      }, query);
      const wanted = [...decks].filter(([, deck]) =>
        [deck.title, ...deck.concepts].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))).map(([filename]) => filename).sort();
      await waitFor(async () => JSON.stringify((await cards(catalog)).map(row => row.filename).sort()) === JSON.stringify(wanted),
        'title/concept filter: ' + query);
      const message = await inPage(catalog, () => document.querySelector('#catalog-message').textContent);
      assert.ok(message.trim(), 'Search result status must be visible');
      if (wanted.length === 0) assert.match(message, /no|0/i);
    }
    assert.equal(downloads.size, beforeSearchDownloads, 'Search must not download a deck');
    assert.equal((await audit(catalog, 'http-search')).courseData, firstAudit.courseData);
    passed('Case-insensitive title/concept filtering, trimmed query, no-match and clear search');

    const failureName = COURSE_FILES[1];
    const failureSelector = '.course-card[data-course="' + failureName + '"]';
    const beforeFailure = await audit(catalog, 'url-failure-before');
    const beforeFailureDownloads = downloads.size;
    await inPage(catalog, () => { window.__catalogReceiving.failNextObjectUrl = true; });
    await click(catalog, failureSelector + ' button[data-download]');
    await waitFor(() => inPage(catalog, selector =>
      /could not|failed|retry|try again|unable/i.test(document.querySelector(selector + ' [data-download-status]').textContent), failureSelector),
      'synchronous download failure status');
    const afterFailure = await audit(catalog, 'url-failure-after');
    assert.equal(downloads.size, beforeFailureDownloads);
    assert.equal(afterFailure.observed.objectUrlAttempts, beforeFailure.observed.objectUrlAttempts + 1);
    assert.equal(afterFailure.observed.objectUrlsCreated, beforeFailure.observed.objectUrlsCreated);
    assert.equal(afterFailure.courseData, beforeFailure.courseData);
    await download(catalog, failureName, 'http-explicit-retry', () => click(catalog, failureSelector + ' button[data-download]'));
    passed('Synchronous object-URL failure preserves source and explicit retry downloads exact bytes');

    await releasedObjectUrls(catalog, 'http-before-reload');
    await audit(catalog, 'before-keyboard-reload');
    await navigate(catalog, base + '/catalog.html');
    const tabPath = [];
    for (let step = 0; step < 64; step++) {
      await key(catalog, 'Tab');
      const focus = await inPage(catalog, () => ({
        tag: document.activeElement.tagName, id: document.activeElement.id,
        download: document.activeElement.dataset.download ?? null,
      }));
      tabPath.push(focus);
      if (focus.download === COURSE_FILES[0]) break;
    }
    assert.equal(tabPath.at(-1).download, COURSE_FILES[0], 'Download must be reachable by actual Tab keys from a fresh document');
    report.keyboardTabPath = tabPath;
    await download(catalog, COURSE_FILES[0], 'http-tab-enter', () => key(catalog, 'Enter'));
    passed('Genuine Tab navigation and Enter activation download the selected course');

    const link = await inPage(catalog, () => {
      const element = document.querySelector('#open-learner');
      return {tag: element.tagName, href: element.href, target: element.target};
    });
    assert.equal(link.tag, 'A');
    assert.equal(link.href, base + '/demo.html');
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
      !!document.querySelector('#start-deck'), decks.get(COURSE_FILES[0]).title), 'downloaded deck preview');
    assert.deepEqual(await inPage(learner, () => ({
      session: document.querySelector('#session-content').innerHTML,
      progress: document.querySelector('#step-count').textContent,
      description: document.querySelector('#lesson-description').textContent,
    })), beforePreview, 'File preview must not replace the current learner session');
    await screenshot(learner, 'learner-preview.png', '#deck-preview');
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
      'Explicit start reaches an actual question from the downloaded course');
    assert.ok(imported.status.includes(decks.get(COURSE_FILES[0]).title));
    report.learnerHandoff = {download: relative(output, learnerFile).split(sep).join('/'),
      previewPreservedSession: true, startedExplicitly: true, ...imported};
    await audit(learner, 'learner-after-explicit-start', false);
    await screenshot(learner, 'learner-started.png', '#session-content');
    passed('Actual downloaded file previews unchanged session, then starts through the existing learner picker');

    const offline = await newPage();
    const offlineUrl = pathToFileURL(join(root, 'catalog.html')).href;
    const requestStart = report.networkRequests.length;
    await navigate(offline, offlineUrl, 390, 844, true);
    await metadata(offline);
    for (const filename of COURSE_FILES) await discloseSource(offline, filename);
    assert.equal((await audit(offline, 'direct-file-phone')).overflow, false);
    const fileLink = await inPage(offline, () => ({href: document.querySelector('#open-learner').href,
      target: document.querySelector('#open-learner').target}));
    assert.equal(fileLink.href, pathToFileURL(join(root, 'demo.html')).href);
    assert.equal(fileLink.target, '_blank');
    for (const filename of COURSE_FILES)
      await download(offline, filename, 'file-' + filename.slice(0, -5),
        () => click(offline, 'button[data-download="' + filename + '"]'));
    assert.equal((await audit(offline, 'direct-file-complete')).overflow, false);
    await screenshot(offline, 'catalog-phone.png', '.course-card');
    const directRequests = report.networkRequests.slice(requestStart).filter(request => request.sessionId === offline.sessionId);
    assert.ok(directRequests.every(request => request.url.startsWith('file:') || request.url.startsWith('blob:') || request.url.startsWith('data:')),
      'Offline direct-file catalog must not request any hosted resource');
    passed('Direct-file catalog works with network offline, all ' + COURSE_FILES.length + ' exact downloads and 390px layout');
    await releasedObjectUrls(catalog, 'http-keyboard-before-close');
    await releasedObjectUrls(offline, 'direct-file-before-close');
    passed('Every created catalog object URL is released once after download, before reload or close');

    for (const [path, bytes] of sourceBytes)
      assert.deepEqual(await readFile(join(root, path)), bytes, 'Receiving must not modify source: ' + path);
    assert.equal(downloads.size, report.downloads.length, 'Every requested browser download must be received and checked');
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.unexpectedRequests, []);
    assert.deepEqual(report.harnessErrors, []);
    passed('Catalog and learner handoff have no JavaScript errors, external requests or source changes');
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
    await artifact('browser-receiving.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
    console.log('RESULT ' + JSON.stringify({status: report.status, checks: report.checks.length,
      downloads: report.downloads.length, sourceSha256: report.sourceSha256}));
    if (settings.emitBundle) await emitBundle(output);
  }
}

try { await main(options(process.argv.slice(2))); }
catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
