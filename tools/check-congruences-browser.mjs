#!/usr/bin/env node
/** Actual offline congruence and learner receiving using installed Chrome.
 * Transport/custody helpers adapted from this repository's check_answer_feedback_browser.mjs.
 * No browser, package, provider or application dependency is installed by this receiver.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, statfs, rename, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve, relative, sep } from 'node:path';
import { tmpdir, freemem } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCE_PATHS = [
  "src/congruences.mjs",
  "src/congruences-ui.mjs",
  "templates/congruences-explorer.html",
  "courses/congruences-explorer.html",
  "courses/congruences.json",
  "courses/congruences.md",
  "tools/build-congruences.mjs",
  "tools/check-congruences-browser.mjs",
  "tests/congruences.test.mjs",
  "tests/congruences-course.test.mjs",
  "src/deck.mjs",
  "src/knowledge.mjs",
  "src/review.mjs",
  "src/reflections.mjs",
  "src/app.mjs",
  "src/answer-order.mjs",
  "src/session-export.mjs",
  "src/trace-archive.mjs",
  "src/trace-archive-ui.mjs",
  "src/lesson-archive.mjs",
  "src/lesson-archive-ui.mjs",
  "src/deck-picker.mjs",
  "data/deck.json",
  "index.html",
  "styles.css",
  "demo.html",
  "tools/make_demo.py"
];
const MIN_DISK = 1024n ** 3n;
const MIN_MEMORY = 512 * 1024 * 1024;
const MAX_PACKET = 5 * 1024 * 1024;
const BUNDLE_LIMIT = 2 * 1024 * 1024;
const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function options(args) {
  const result = {root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), browser: 'google-chrome'};
  const used = new Set();
  while (args.length) {
    const flag = args.shift();
    if (flag === '--emit-bundle' && !used.has(flag)) { used.add(flag); result.emitBundle = true; continue; }
    const field = {'--root':'root', '--browser':'browser', '--output':'output'}[flag];
    if (!field || used.has(flag) || !args[0]) throw new Error('Use --root DIR --browser FILE --output NEW_DIR [--emit-bundle]');
    used.add(flag);
    result[field] = args.shift();
  }
  if (!result.output) throw new Error('An explicit new evidence directory is required');
  result.root = resolve(result.root);
  result.output = resolve(result.output);
  return result;
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
    assert.ok(total <= BUNDLE_LIMIT, 'Evidence packet exceeds 2 MiB; refusing incomplete export');
    const bytes = await readFile(path);
    files.push({path: relative(output, path).split(sep).join('/'), bytes: bytes.length,
      sha256: hash(bytes), base64: bytes.toString('base64')});
  }
  const payload = Buffer.from(JSON.stringify({version: 1, files}));
  assert.ok(payload.length <= BUNDLE_LIMIT, 'Decoded evidence packet exceeds 2 MiB; refusing incomplete export');
  const encoded = payload.toString('base64');
  const chunks = Math.ceil(encoded.length / 4096);
  console.log('RECALLWEAVE_CONGRUENCES_BUNDLE_BEGIN ' + JSON.stringify({
    bytes: payload.length, sha256: hash(payload), chunks, fileBytes: total,
  }));
  for (let index = 0; index < chunks; index++)
    console.log('RECALLWEAVE_CONGRUENCES_BUNDLE_CHUNK ' + index + ' ' + encoded.slice(index * 4096, (index + 1) * 4096));
  console.log('RECALLWEAVE_CONGRUENCES_BUNDLE_END');
}

async function main(settings) {
  const {root, output, browser: executable} = settings;
  try {
    await lstat(output);
    throw new Error('Evidence directory already exists: ' + output);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = {version: 1, status: 'running', root, executable, node: process.version,
    platform: process.platform, checks: [], downloads: [], sourceSha256: {}, screenshots: [],
    requests: [], unexpectedRequests: [], pageErrors: [], harnessErrors: [], headroom: [],
    qualification: 'Actual standalone-file DOM, keyboard controls, exact downloads, phone layout and existing learner interoperability; not a learning-effectiveness or screen-reader certification'};
  let server, browser, socket, sessionId, profile, base = '';
  let browserDidClose = true, browserClosed = Promise.resolve();
  let browserLog = '', closing = false, sequence = 0, emitted = 0, seedScript;
  const pending = new Map(), downloads = new Map(), sources = new Map();

  async function headroom(label) {
    const disk = [];
    for (const path of [root, dirname(output), tmpdir()]) {
      const info = await statfs(path, {bigint: true});
      const free = info.bavail * info.bsize;
      disk.push({path, freeBytes: String(free)});
      assert.ok(free >= MIN_DISK, 'Browser hold: less than 1 GiB free at ' + path);
    }
    let memory = freemem();
    if (process.platform === 'linux') {
      const match = (await readFile('/proc/meminfo', 'utf8')).match(/^MemAvailable:\s+(\d+)\s+kB$/m);
      assert.ok(match, 'Linux MemAvailable must be observable');
      memory = Number(match[1]) * 1024;
    }
    report.headroom.push({label, disk, availableMemoryBytes: memory});
    assert.ok(memory >= MIN_MEMORY, 'Browser hold: less than 512 MiB available memory');
  }
  async function artifact(name, bytes) {
    emitted += bytes.length;
    assert.ok(emitted <= MAX_PACKET, 'Receiving output exceeds 5 MiB');
    const path = join(output, name);
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, bytes, {flag: 'wx'});
  }
  async function waitFor(check, label, duration = 10000) {
    const deadline = Date.now() + duration;
    let last;
    while (Date.now() < deadline) {
      try { const value = await check(); if (value) return value; }
      catch (error) { last = error; }
      await sleep(60);
    }
    throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
  }
  function command(method, params = {}, scoped = true) {
    const id = ++sequence;
    return new Promise((done, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) { reject(new Error('CDP unavailable: ' + method)); return; }
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
      pending.set(id, {done, reject, timer});
      socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  const inPage = (fn, ...args) => evaluate('(' + fn.toString() + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')');
  async function key(name) {
    const virtual = {Tab: 9, Enter: 13}[name];
    for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
      type, key: name, code: name, windowsVirtualKeyCode: virtual, nativeVirtualKeyCode: virtual,
      ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {}),
    });
  }
  async function tabTo(selector) {
    for (let count = 0; count < 100; count++) {
      if (await inPage(value => document.activeElement?.matches(value), selector)) return count;
      await key('Tab');
    }
    throw new Error('Control is not reachable by Tab: ' + selector);
  }
  async function activate(selector) {
    await tabTo(selector);
    await key('Enter');
  }
  function check(name, fn) {
    try { fn(); report.checks.push({name, status: 'passed'}); console.log('PASS ' + name); }
    catch (error) { report.checks.push({name, status: 'failed', error: error.stack ?? String(error)}); console.log('FAIL ' + name + ': ' + error.message); }
  }
  async function screenshot(name, selector) {
    await inPage(selector => document.querySelector(selector).scrollIntoView({block: 'start'}), selector);
    const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    await artifact(name, Buffer.from(data, 'base64'));
    report.screenshots.push(name);
  }
  async function newDocument(url, width) {
    await headroom('before ' + url);
    await command('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
    const navigation = await command('Page.navigate', {url});
    assert.ok(!navigation.errorText, navigation.errorText);
    assert.ok(navigation.loaderId, 'Fresh document is required');
    await waitFor(async () => {
      const frame = await command('Page.getFrameTree');
      if (frame.frameTree.frame.loaderId !== navigation.loaderId) return false;
      return inPage(expected => location.href === expected && document.readyState === 'complete' &&
        !!document.querySelector('#compute, #start-button'), url);
    }, 'fresh standalone document');
  }
  async function chooseFile(selector, path) {
    const {root: document} = await command('DOM.getDocument');
    const {nodeId} = await command('DOM.querySelector', {nodeId: document.nodeId, selector});
    assert.ok(nodeId, 'Actual file input exists: ' + selector);
    await command('DOM.setFileInputFiles', {nodeId, files: [path]});
  }
  async function importFixture(fixture, fixturePath) {
    const before = await inPage(() => document.querySelector('#session-content').innerHTML);
    await chooseFile('#deck-file', fixturePath);
    await waitFor(() => inPage(title => document.querySelector('#deck-preview-title')?.textContent === title, fixture.title), 'literal course preview');
    assert.equal(await inPage(() => document.querySelector('#session-content').innerHTML), before, 'Preview preserves current lesson');
    await activate('#start-deck');
    await waitFor(() => inPage(() => !!document.querySelector('.question-card h2')), 'explicit imported lesson start');
    assert.equal(await inPage(() => document.querySelector('#step-count').textContent), '0 / ' + fixture.items.length);
  }
  async function question(deck) {
    const value = await inPage(() => ({
      prompt: document.querySelector('.question-card h2')?.textContent,
      order: [...document.querySelectorAll('[data-choice]')].map(node => Number(node.dataset.choice)),
      texts: [...document.querySelectorAll('[data-choice]')].map(node =>
        node.textContent.slice(node.querySelector('.choice-key').textContent.length)),
      focus: document.activeElement?.dataset.choice,
    }));
    const item = deck.items.find(item => item.prompt === value.prompt);
    assert.ok(item, 'Displayed question belongs to exact deck');
    assert.deepEqual([...value.order].sort((a,b) => a-b), item.options.map((_, index) => index));
    assert.deepEqual(value.texts, value.order.map(index => item.options[index]));
    assert.equal(value.focus, String(value.order[0]), 'First displayed choice keeps keyboard focus');
    return {item, ...value};
  }
  async function choose(value, canonical) {
    for (let step = 0; step < value.order.indexOf(canonical); step++) await key('Tab');
    assert.equal(await inPage(() => document.activeElement?.dataset.choice), String(canonical));
    await key('Enter');
    await waitFor(() => inPage(() => !!document.querySelector('#next-button')), 'first-pass feedback');
    assert.equal(await inPage(() => document.activeElement.id), 'next-button', 'Existing next-step focus stays intact');
  }

  try {
    await headroom('before output and Chrome');
    await mkdir(output);
    await mkdir(join(output, 'downloads'));
    for (const path of SOURCE_PATHS) {
      const bytes = await readFile(join(root, path));
      sources.set('/' + path, bytes);
      report.sourceSha256[path] = hash(bytes);
    }
    server = createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
      if (request.method !== 'GET' || url.search || !sources.has(url.pathname)) { response.writeHead(404).end(); return; }
      const mime = {'.html':'text/html', '.mjs':'text/javascript', '.json':'application/json', '.css':'text/css'}[extname(url.pathname)] ?? 'text/plain';
      response.writeHead(200, {'Content-Type': mime + '; charset=utf-8', 'Cache-Control':'no-store'});
      response.end(sources.get(url.pathname));
    });
    await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
    base = 'http://127.0.0.1:' + server.address().port;
    // Keep the owned profile beside the explicit output, visible to sandboxed browser packages too.
    profile = await mkdtemp(join(dirname(output), 'recallweave-congruences-chrome-'));
    browser = spawn(executable, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
      '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
      '--disk-cache-size=8388608', '--media-cache-size=8388608',
      '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      '--user-data-dir=' + profile, 'about:blank',
    ], {stdio: ['ignore', 'ignore', 'pipe']});
    browserDidClose = false;
    browserClosed = new Promise(done => browser.once('close', (code, signal) => {
      browserDidClose = true; report.browserExit = {code, signal}; done();
    }));
    browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-8000); });
    let launchError;
    browser.on('error', error => { launchError = error; });
    const endpoint = await waitFor(async () => {
      if (launchError) throw launchError;
      if (browserDidClose) throw new Error('Chrome closed before startup: ' + browserLog);
      const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
      return port && path ? 'ws://127.0.0.1:' + port + path : null;
    }, 'Chrome startup', 20000);
    socket = new WebSocket(endpoint);
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id); clearTimeout(item.timer);
        if (message.error) item.reject(new Error(message.error.message)); else item.done(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        report.pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
      } else if (message.method === 'Network.requestWillBeSent') {
        report.requests.push(message.params.request.url);
      } else if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress') {
        downloads.set(message.params.guid, {...downloads.get(message.params.guid), ...message.params});
      } else if (message.method === 'Fetch.requestPaused') {
        const url = new URL(message.params.request.url);
        const allowed = message.params.request.method === 'GET' && url.origin === base && !url.search &&
          (sources.has(url.pathname) || url.pathname === '/favicon.ico');
        if (!allowed) report.unexpectedRequests.push(message.params.request.url);
        command(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
          requestId: message.params.requestId, ...(!allowed ? {errorReason:'BlockedByClient'} : {}),
        }).catch(error => { if (!closing) report.harnessErrors.push(String(error)); });
      }
    });
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP socket startup timeout')), 10000);
      socket.addEventListener('open', () => { clearTimeout(timer); done(); }, {once:true});
      socket.addEventListener('error', error => { clearTimeout(timer); reject(error); }, {once:true});
    });
    report.browser = await command('Browser.getVersion', {}, false);
    await command('Browser.setDownloadBehavior', {behavior:'allowAndName', downloadPath:join(output, 'downloads'), eventsEnabled:true}, false);
    const {targetId} = await command('Target.createTarget', {url:'about:blank'}, false);
    ({sessionId} = await command('Target.attachToTarget', {targetId, flatten:true}, false));
    for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Accessibility.enable']) await command(method);
    await command('Network.setCacheDisabled', {cacheDisabled:true});
    await command('Fetch.enable', {patterns:[{urlPattern:'http://*', requestStage:'Request'}, {urlPattern:'https://*', requestStage:'Request'}]});


    const course = JSON.parse(sources.get('/courses/congruences.json'));
    const guide = sources.get('/courses/congruences.md');
    async function setInput(selector, value) {
      await inPage((selector, value) => {
        const element = document.querySelector(selector);
        element.value = value;
        element.dispatchEvent(new Event('input', {bubbles: true}));
      }, selector, value);
    }
    async function saveDownload(selector, label) {
      const known = new Set(downloads.keys());
      await activate(selector);
      const file = await waitFor(() => {
        const fresh = [...downloads.values()].filter(row => !known.has(row.guid));
        assert.ok(fresh.length <= 1, 'One activation must create one file');
        if (fresh[0]?.state === 'canceled') throw new Error('Download canceled');
        return fresh[0]?.state === 'completed' ? fresh[0] : null;
      }, label + ' saved download');
      const bytes = await readFile(join(output, 'downloads', file.guid));
      const name = label + extname(file.suggestedFilename);
      await rename(join(output, 'downloads', file.guid), join(output, name));
      report.downloads.push({guid: file.guid, filename: file.suggestedFilename, path: name,
        bytes: bytes.length, sha256: hash(bytes)});
      return {bytes, path: join(output, name)};
    }
    async function pair(values) {
      for (let index = 0; index < 4; index++) await setInput('#' + ['a','m','b','n'][index], values[index]);
      await activate('#compute');
    }
    async function snapshot(label) {
      const data = await inPage(() => ({
        outcome: document.querySelector('#outcome').textContent,
        proof: document.querySelector('#proof').innerText,
        selected: document.querySelector('#selected-integer').textContent,
        selectedResult: document.querySelector('#selected-result').textContent,
        rows: [...document.querySelectorAll('#window-body tr')].map(row =>
          [...row.children].map(cell => cell.textContent)),
        compatible: document.querySelector('#result').dataset.compatible,
        error: document.querySelector('#error').textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      await artifact(label + '.json', Buffer.from(JSON.stringify(data, null, 2) + '\n'));
      return data;
    }

    await newDocument(pathToFileURL(join(root, 'courses/congruences-explorer.html')).href, 1280);
    assert.equal(await inPage(() => document.querySelector('#result').hidden), true);
    assert.equal(await inPage(() => document.querySelector('#download-observation').disabled), true);
    await activate('#compute');
    let data = await snapshot('coprime-desktop');
    assert.equal(data.outcome, 'x ≡ 7 (mod 20)');
    assert.equal(data.rows.length, 24);
    assert.equal(data.rows[0][1], '7');
    assert.equal(data.rows[0][6], 'Both match');
    assert.equal(data.overflow, false);
    await screenshot('coprime-desktop.png', '#result');
    check('direct-open page computes exact coprime construction through keyboard controls', () => {});

    await setInput('#probe', '-13');
    assert.equal(await inPage(() => document.querySelector('#inspection').hidden), true);
    assert.equal(await inPage(() => document.querySelector('#download-observation').disabled), true);
    await activate('#inspect-button');
    data = await snapshot('negative-inspection');
    assert.equal(data.selected, '-13');
    assert.equal(data.rows[0][6], 'Both match');
    assert.equal(data.rows[23][1], '10');
    const observation = await saveDownload('#download-observation', 'negative-observation');
    const saved = JSON.parse(observation.bytes);
    assert.equal(saved.result.solution.first, '7');
    assert.equal(saved.inspection.rows[0].x, '-13');
    assert.equal(saved.inspection.rows.length, 24);
    check('negative integer and complete consecutive window survive an actual observation download', () => {});

    await activate('[data-example="shared"]');
    assert.equal(await inPage(() => document.querySelector('#result').hidden), true);
    await activate('#compute');
    data = await snapshot('shared-factors');
    assert.equal(data.outcome, 'x ≡ 14 (mod 18)');
    assert.match(data.proof, /2k ≡ 1 \(mod 3\)/);
    assert.equal(data.rows[18][6], 'Both match');
    await activate('[data-example="contradiction"]');
    await activate('#compute');
    data = await snapshot('contradiction');
    assert.equal(data.compatible, 'false');
    assert.match(data.proof, /does not divide the difference 1/);
    assert.ok(data.rows.every(row => row[6] === 'Not both'));
    assert.equal(await inPage(() => document.querySelector('#use-solution').disabled), true);
    check('shared factors produce a full class or an exact contradiction without inferred solutions', () => {});

    await pair(['6', '7', '-1', '7']);
    assert.equal((await snapshot('same-class')).outcome, 'x ≡ 6 (mod 7)');
    await activate('[data-example="redundant"]');
    await activate('#compute');
    data = await snapshot('redundant-modulus');
    assert.equal(data.outcome, 'x ≡ 5 (mod 12)');
    assert.match(data.proof, /no inverse is needed/);
    await activate('[data-example="negative"]');
    await activate('#compute');
    assert.equal((await snapshot('normalized-negative')).outcome, 'x ≡ 6 (mod 35)');
    await pair(['4', '1', '3', '8']);
    assert.equal((await snapshot('modulus-one')).outcome, 'x ≡ 3 (mod 8)');
    check('repeated, dividing, negative and modulus-one inputs remain distinct explicit cases', () => {});

    await pair(['40', '101', '0', '1']);
    await setInput('#probe', '0'); await activate('#inspect-button');
    data = await snapshot('bounded-empty-window');
    assert.equal(data.compatible, 'true');
    assert.equal(data.outcome, 'x ≡ 40 (mod 101)');
    assert.ok(data.rows.every(row => row[6] === 'Not both'));
    await activate('#use-solution');
    assert.equal((await snapshot('bounded-window-solution')).rows[0][6], 'Both match');
    check('an empty displayed window never changes compatible result into impossibility', () => {});

    await newDocument(pathToFileURL(join(root, 'courses/congruences-explorer.html')).href, 390);
    await activate('[data-example="large"]'); await activate('#compute');
    data = await snapshot('large-phone');
    assert.equal(data.outcome, 'x ≡ 9007199254740993 (mod 999999999999999999)');
    assert.equal(data.rows[1][1], '9007199254740994');
    assert.equal(data.overflow, false);
    await screenshot('large-phone.png', '#result');
    const maximum = '999999999999999999', neighbor = '999999999999999998';
    await pair(['-2', maximum, '-2', neighbor]);
    const period = BigInt(maximum) * BigInt(neighbor);
    data = await snapshot('maximum-period-phone');
    assert.equal(data.outcome, 'x ≡ ' + (period - 2n) + ' (mod ' + period + ')');
    await setInput('#probe', '9'.repeat(72)); await activate('#inspect-button');
    data = await snapshot('72-digit-inspection');
    assert.equal(data.rows[1][1], '1' + '0'.repeat(72));
    assert.equal(data.overflow, false);
    check('phone view preserves beyond-safe-integer values, 36-digit period and 72-digit carry', () => {});

    await setInput('#m', '0');
    assert.equal(await inPage(() => document.querySelector('#result').hidden), true);
    await activate('#compute');
    assert.match(await inPage(() => document.querySelector('#error').textContent), /positive/);
    assert.equal(await inPage(() => document.querySelector('#download-observation').disabled), true);
    await pair(['1e3', '4', '2', '5']);
    assert.match(await inPage(() => document.querySelector('#error').textContent), /whole decimal integer/);
    await pair(['1'.repeat(19), '4', '2', '5']);
    assert.match(await inPage(() => document.querySelector('#error').textContent), /18 digits/);
    await pair(['3', '4', '2', '5']);
    await setInput('#probe', '1'.repeat(73)); await activate('#inspect-button');
    assert.equal(await inPage(() => document.querySelector('#inspection').hidden), true);
    assert.match(await inPage(() => document.querySelector('#error').textContent), /72 digits/);
    assert.equal(await inPage(() => document.querySelector('#download-observation').disabled), true);
    check('changed and refused inputs retire stale proof or inspection and disable stale download', () => {});

    const courseDownload = await saveDownload('#download-course', 'course');
    const guideDownload = await saveDownload('#download-guide', 'guide');
    assert.deepEqual(courseDownload.bytes, sources.get('/courses/congruences.json'));
    assert.deepEqual(guideDownload.bytes, guide);
    check('actual course and guide downloads match exact source bytes', () => {});

    await newDocument(pathToFileURL(join(root, 'demo.html')).href, 390);
    await importFixture(course, courseDownload.path);
    const seen = [];
    for (let index = 0; index < course.items.length; index++) {
      const current = await question(course);
      const choice = index === 0 ? (current.item.answer + 1) % 4 : current.item.answer;
      await choose(current, choice);
      assert.ok(await inPage(expected => document.querySelector('#feedback-slot').textContent.includes(expected), current.item.explanation));
      seen.push({item: current.item, choice});
      await key('Enter');
    }
    assert.equal(new Set(seen.map(row => row.item.id)).size, 14);
    const firstSummary = await inPage(() => document.querySelector('#first-try-summary').textContent);
    assert.match(firstSummary, /13 of 14 connections/);
    const firstMastery = await inPage(() => [...document.querySelectorAll('.mastery-box output')].map(node => node.textContent));
    const reviews = await inPage(() => [...document.querySelectorAll('.review-item')].map(row => ({
      prompt: row.querySelector('.review-prompt').textContent,
      answers: [...row.querySelectorAll('.review-answers dd')].map(node => node.textContent),
    })));
    for (const row of seen) assert.deepEqual(reviews.find(review => review.prompt === row.item.prompt).answers,
      [row.item.options[row.choice], row.item.options[row.item.answer]]);
    await activate('#practice-button');
    await activate('[data-practice-choice="' + seen[0].item.answer + '"]');
    await activate('#practice-next');
    assert.equal(await inPage(() => document.querySelector('#first-try-summary').textContent), firstSummary);
    assert.deepEqual(await inPage(() => [...document.querySelectorAll('.mastery-box output')].map(node => node.textContent)), firstMastery);
    assert.match(await inPage(() => document.querySelector('#practice-status').textContent), /1 of 1 correctly/);
    const notes = await saveDownload('#save-notes-button', 'study-notes');
    assert.ok(notes.bytes.toString('utf8').includes(course.title));
    assert.ok(notes.bytes.toString('utf8').includes(course.attribution));
    assert.ok(notes.bytes.toString('utf8').includes('Practice'));
    await artifact('learner-review.json', Buffer.from(JSON.stringify({seen, reviews, firstSummary, firstMastery}, null, 2) + '\n'));
    await screenshot('learner-review-phone.png', '#session-content');
    check('downloaded original course completes native learner review, separate practice and saved notes', () => {});

    for (const [path, bytes] of sources) assert.deepEqual(await readFile(join(root, path.slice(1))), bytes, 'Source unchanged: ' + path);
    check('all source bytes remain unchanged and no page exception or external request occurs', () => {
      assert.deepEqual(report.pageErrors, []);
      assert.deepEqual(report.unexpectedRequests, []);
      assert.deepEqual(report.harnessErrors, []);
      assert.equal(downloads.size, report.downloads.length);
    });
    report.status = report.checks.every(row => row.status === 'passed') ? 'passed' : 'failed';
    if (report.status === 'failed') process.exitCode = 1;
  } catch (error) {
    report.status = 'failed'; report.error = error.stack ?? String(error); report.browserLog = browserLog;
    process.exitCode = 1;
    console.error(report.error);
    if (sessionId) {
      try { report.lastPage = await inPage(() => ({url:location.href, focus:document.activeElement.outerHTML, text:document.body.innerText.slice(0,7000)})); }
      catch (failure) { report.captureError = String(failure); }
    }
  } finally {
    closing = true;
    if (socket?.readyState === WebSocket.OPEN) {
      try { await command('Browser.close', {}, false); } catch { /* Preserve the original result. */ }
    }
    socket?.close();
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('Receiver closed')); }
    pending.clear();
    try {
      if (server?.listening) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
      if (browser && !browserDidClose) {
        await Promise.race([browserClosed, sleep(3000)]);
        for (const signal of ['SIGTERM','SIGKILL']) {
          if (browserDidClose) break;
          (report.browserShutdownSignals ??= []).push(signal);
          browser.kill(signal);
          await Promise.race([browserClosed, sleep(2000)]);
        }
        assert.ok(browserDidClose, 'Chrome and stdio must close before own-profile removal');
      }
      if (profile) await rm(profile, {recursive:true, force:true, maxRetries:5, retryDelay:100});
    } catch (error) { report.cleanupError = String(error); report.status = 'failed'; process.exitCode = 1; }
    // A preflight refusal may precede creation of this new output directory.
    await mkdir(output, {recursive:true});
    await artifact('browser-receiving.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
    console.log('RESULT ' + JSON.stringify({status:report.status, passed:report.checks.filter(row=>row.status==='passed').length,
      failed:report.checks.filter(row=>row.status==='failed').length, downloads:report.downloads.length, output}));
    if (settings.emitBundle) await emitBundle(output);
  }
}

try { await main(options(process.argv.slice(2))); }
catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
