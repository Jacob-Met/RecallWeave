#!/usr/bin/env node
/**
 * Focused receiving for visible first-pass answer identities.
 * Node 22+ and an installed Chrome; no application dependency.
 * Uses the repository's existing CDP/real-key/download approach.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, statfs, rename, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve, relative } from 'node:path';
import { tmpdir, freemem } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCE_PATHS = [
  'index.html', 'styles.css', 'src/knowledge.mjs', 'src/review.mjs',
  'src/reflections.mjs', 'src/deck.mjs', 'src/deck-picker.mjs',
  'src/session-export.mjs', 'src/trace-archive.mjs', 'src/trace-archive-ui.mjs',
  'src/lesson-archive.mjs', 'src/lesson-archive-ui.mjs', 'src/answer-order.mjs',
  'src/app.mjs', 'data/deck.json', 'demo.html', 'tools/make_demo.py',
  'tools/check_answer_feedback_browser.mjs',
  'docs/receiving/answer-feedback-ab529ac65023/literal-deck.json',
];
const MIN_DISK = 1024n ** 3n;
const MIN_MEMORY = 512 * 1024 * 1024;
const MAX_PACKET = 5 * 1024 * 1024;
const sleep = ms => new Promise(done => setTimeout(done, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function options(args) {
  const result = {root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), browser: 'google-chrome'};
  const used = new Set();
  while (args.length) {
    const flag = args.shift();
    const field = {'--root':'root', '--browser':'browser', '--output':'output'}[flag];
    if (!field || used.has(flag) || !args[0]) throw new Error('Use --root DIR --browser FILE --output NEW_DIR');
    used.add(flag);
    result[field] = args.shift();
  }
  if (!result.output) throw new Error('An explicit new evidence directory is required');
  result.root = resolve(result.root);
  result.output = resolve(result.output);
  return result;
}

async function main({root, output, browser: executable}) {
  try {
    await lstat(output);
    throw new Error('Evidence directory already exists: ' + output);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = {
    version: 1, status: 'running', root, executable, node: process.version,
    platform: process.platform, checks: [], feedback: [], downloads: [],
    sourceSha256: {}, screenshots: [], requests: [], unexpectedRequests: [],
    pageErrors: [], harnessErrors: [], headroom: [],
    qualification: 'Actual DOM, accessibility-tree text, keyboard and saved-file controls; not a screen-reader or whole-app certification',
  };
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
  async function screenshot(name) {
    await inPage(() => document.querySelector('#session-content').scrollIntoView({block: 'start'}));
    const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    await artifact(name, Buffer.from(data, 'base64'));
    report.screenshots.push(name);
  }
  async function newDocument(url, width, randomValue) {
    await headroom('before ' + url);
    if (seedScript) await command('Page.removeScriptToEvaluateOnNewDocument', {identifier: seedScript});
    ({identifier: seedScript} = await command('Page.addScriptToEvaluateOnNewDocument', {
      source: 'Math.random = () => ' + randomValue + '; globalThis.__feedbackMarkupExecuted = false;',
    }));
    await command('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
    await command('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
    const navigation = await command('Page.navigate', {url});
    assert.ok(!navigation.errorText, navigation.errorText);
    assert.ok(navigation.loaderId, 'A fresh document is required');
    await waitFor(async () => {
      const frame = await command('Page.getFrameTree');
      if (frame.frameTree.frame.loaderId !== navigation.loaderId) return false;
      return inPage(expected => location.href === expected && document.readyState === 'complete' &&
        !!document.querySelector('#start-button'), url);
    }, 'fresh learner document');
    assert.ok(await inPage(() => matchMedia('(forced-colors: active)').matches), 'Forced-color mode must be active');
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
    assert.equal(await inPage(() => document.querySelector('#step-count').textContent), '0 / 3');
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
  async function inspectFeedback(label, item, choice, answered, total) {
    const value = await inPage(() => {
      const feedback = document.querySelector('#feedback-slot .feedback');
      return {
        text: feedback.innerText,
        paragraphs: [...feedback.querySelectorAll('p')].map(node => ({
          text: node.textContent, visible: node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden',
        })),
        markup: feedback.querySelectorAll('img,script,em,b,[onerror]').length,
        executed: globalThis.__feedbackMarkupExecuted,
        disabled: [...document.querySelectorAll('[data-choice]')].every(node => node.disabled),
        progress: document.querySelector('#step-count').textContent,
        live: document.querySelector('#session-content').getAttribute('aria-live'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const {nodes} = await command('Accessibility.getFullAXTree');
    const staticText = nodes.filter(node => !node.ignored && node.role?.value === 'StaticText').map(node => node.name?.value ?? '');
    report.feedback.push({label, item: item.id, choice, correctAnswer: item.answer, ...value, accessibilityStaticText: staticText});
    check(label + ': canonical labels remain visible and exposed as text', () => {
      for (const text of ['Your answer: ' + item.options[choice], 'Correct answer: ' + item.options[item.answer]])
        assert.ok(value.paragraphs.some(row => row.visible && row.text === text), 'Missing exact visible feedback: ' + text);
      assert.ok(staticText.some(text => text.includes('Your answer:')), 'Your answer label is missing from accessibility tree');
      assert.ok(staticText.some(text => text.includes('Correct answer:')), 'Correct answer label is missing from accessibility tree');
    });
    check(label + ': safe literal text and existing answer state', () => {
      assert.equal(value.markup, 0);
      assert.equal(value.executed, false);
      assert.equal(value.disabled, true);
      assert.equal(value.progress, answered + ' / ' + total);
      assert.equal(value.live, 'polite');
      assert.equal(value.overflow, false);
    });
  }
  async function saveLesson(label) {
    if (!(await inPage(() => document.querySelector('#lesson-archive-panel').open)))
      await activate('#lesson-archive-panel > summary');
    const known = new Set(downloads.keys());
    await activate('#save-lesson-button');
    const file = await waitFor(() => {
      const fresh = [...downloads.values()].filter(row => !known.has(row.guid));
      assert.ok(fresh.length <= 1, 'One keyboard Save creates one download');
      if (fresh[0]?.state === 'canceled') throw new Error('Lesson download canceled');
      return fresh[0]?.state === 'completed' ? fresh[0] : null;
    }, 'actual lesson download');
    const bytes = await readFile(join(output, 'downloads', file.guid));
    const name = label + '.json';
    emitted += bytes.length;
    assert.ok(emitted <= MAX_PACKET, 'Receiving output exceeds 5 MiB');
    await rename(join(output, 'downloads', file.guid), join(output, name));
    report.downloads.push({label, guid: file.guid, filename: file.suggestedFilename, path: name, bytes: bytes.length, sha256: hash(bytes)});
    return {path: join(output, name), text: bytes.toString('utf8')};
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
    const fixturePath = join(root, SOURCE_PATHS.at(-1));
    const fixture = JSON.parse(sources.get('/' + SOURCE_PATHS.at(-1)).toString('utf8'));
    const bundled = JSON.parse(sources.get('/data/deck.json').toString('utf8'));
    const {readLessonArchive} = await import(pathToFileURL(join(root, 'src/lesson-archive.mjs')));
    const {initialMastery, updateMastery} = await import(pathToFileURL(join(root, 'src/knowledge.mjs')));
    const {validateDeck} = await import(pathToFileURL(join(root, 'src/deck.mjs')));
    validateDeck(fixture);
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
    profile = await mkdtemp(join(tmpdir(), 'recallweave-answer-feedback-chrome-'));
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

    await newDocument(base + '/index.html', 1280, 0);
    await activate('#start-button');
    const bundledQuestion = await question(bundled);
    assert.notDeepEqual(bundledQuestion.order, bundledQuestion.item.options.map((_, i) => i), 'Receiving must exercise reordered buttons');
    const bundledChoice = (bundledQuestion.item.answer + 1) % bundledQuestion.item.options.length;
    await choose(bundledQuestion, bundledChoice);
    await inspectFeedback('bundled-modular-wrong', bundledQuestion.item, bundledChoice, 1, bundled.items.length);
    await screenshot('bundled-forced-colors.png');

    await newDocument(pathToFileURL(join(root, 'demo.html')).href, 390, 0);
    await importFixture(fixture, fixturePath);
    const seen = [], estimates = initialMastery(fixture.concepts);
    for (let index = 0; index < fixture.items.length; index++) {
      const current = await question(fixture);
      assert.notDeepEqual(current.order, current.item.options.map((_, i) => i), 'Literal receiving must use a nonidentity display order');
      const choice = index === 1 ? current.item.answer : (current.item.answer + 1) % current.item.options.length;
      await choose(current, choice);
      seen.push({item: current.item, choice, order: current.order});
      estimates[current.item.concept] = updateMastery(estimates[current.item.concept], choice === current.item.answer);
      await inspectFeedback('literal-standalone-' + index, current.item, choice, index + 1, fixture.items.length);
      if (index === 1) await screenshot('literal-forced-colors-phone.png');
      await key('Enter');
    }
    assert.equal(new Set(seen.map(row => row.item.id)).size, fixture.items.length);
    const review = await inPage(() => ({
      score: document.querySelector('#first-try-summary').textContent,
      entries: [...document.querySelectorAll('.review-item')].map(row => ({
        prompt: row.querySelector('.review-prompt').textContent,
        answers: [...row.querySelectorAll('.review-answers dd')].map(node => node.textContent),
      })),
      estimates: [...document.querySelectorAll('.mastery-box output')].map(node => node.textContent),
      progress: document.querySelector('#step-count').textContent,
    }));
    check('complete literal first session preserves canonical review and model state', () => {
      assert.match(review.score, /1 of 3 connections/);
      assert.equal(review.progress, '3 / 3');
      assert.deepEqual(review.estimates, fixture.concepts.map(concept => Math.round(estimates[concept] * 100) + '%'));
      assert.equal(review.entries.length, seen.length);
      for (const record of seen) {
        const row = review.entries.find(row => row.prompt === record.item.prompt);
        assert.deepEqual(row.answers, [record.item.options[record.choice], record.item.options[record.item.answer]]);
      }
    });
    report.literalReview = review;

    await newDocument(pathToFileURL(join(root, 'demo.html')).href, 390, 0);
    await importFixture(fixture, fixturePath);
    const savedQuestion = await question(fixture);
    const savedChoice = (savedQuestion.item.answer + 1) % savedQuestion.item.options.length;
    await choose(savedQuestion, savedChoice);
    const originalFeedback = await inPage(() => document.querySelector('#feedback-slot').innerHTML);
    const firstSave = await saveLesson('original-feedback-lesson');
    const originalState = readLessonArchive(firstSave.text, fixture);
    assert.equal(originalState.presentation.phase, 'feedback');
    assert.equal(originalState.answers[0].choice, savedChoice);
    assert.equal(originalState.answers[0].correct, false);

    await newDocument(pathToFileURL(join(root, 'demo.html')).href, 390, 0.75);
    await importFixture(fixture, fixturePath);
    const freshQuestion = await question(fixture);
    assert.notDeepEqual(freshQuestion.order, savedQuestion.order, 'Fresh document must have a different display order before restore');
    await activate('#lesson-archive-panel > summary');
    const beforePreview = await inPage(() => document.querySelector('#session-content').innerHTML);
    await chooseFile('#lesson-file', firstSave.path);
    await waitFor(() => inPage(() => !document.querySelector('#lesson-preview').hidden), 'actual saved-feedback preview');
    assert.equal(await inPage(() => document.querySelector('#session-content').innerHTML), beforePreview, 'Saved-file preview preserves fresh question');
    await activate('#resume-lesson-confirm');
    await waitFor(() => inPage(() => !!document.querySelector('#next-button')), 'explicit saved-feedback resume');
    assert.deepEqual(await inPage(() => [...document.querySelectorAll('[data-choice]')].map(node => Number(node.dataset.choice))), savedQuestion.order);
    assert.equal(await inPage(() => document.querySelector('#feedback-slot').innerHTML), originalFeedback, 'Resume renders the same first feedback');
    assert.equal(await inPage(() => document.activeElement.id), 'next-button');
    await inspectFeedback('restored-literal-feedback', savedQuestion.item, savedChoice, 1, 3);
    const secondSave = await saveLesson('restored-feedback-lesson');
    const restoredState = readLessonArchive(secondSave.text, fixture);
    check('actual saved/resumed feedback preserves canonical answer, mastery and presentation', () => {
      for (const key of ['answers', 'mastery', 'presentation']) assert.deepEqual(restoredState[key], originalState[key]);
    });
    report.savedFeedback = {original: originalState, restored: restoredState};

    for (const [path, bytes] of sources) assert.deepEqual(await readFile(join(root, path.slice(1))), bytes, 'Source unchanged: ' + path);
    check('all exercised pages preserve source and refuse active markup or external requests', () => {
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
  }
}

try { await main(options(process.argv.slice(2))); }
catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
