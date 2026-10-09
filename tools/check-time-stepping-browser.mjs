import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, mkdtemp, readdir, stat, statfs} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import os from 'node:os';

// A private native browser recipient. No installs, shared profiles or cleanup.
// Usage: node tools/check-time-stepping-browser.mjs NEW_OUTPUT_DIRECTORY [CHROME]
const source = fileURLToPath(new URL('../', import.meta.url));
if (process.argv.length < 3 || process.argv.length > 4) {
  throw new Error('Provide a new output directory and optionally the existing Chrome executable.');
}
const output = resolve(process.argv[2]);
const executable = process.argv[3] ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pause = ms => new Promise(done => setTimeout(done, ms));
const free = async path => { const s = await statfs(path); return s.bavail * s.bsize; };
async function sourceMap() {
  const result = {};
  async function walk(dir, relative = '') {
    for (const name of (await readdir(dir)).sort()) {
      if (name === '.git') continue;
      const path = join(dir, name), key = relative ? relative + '/' + name : name;
      const s = await stat(path, {bigint: true});
      if (s.isDirectory()) await walk(path, key);
      else if (s.isFile()) result[key] = {bytes: Number(s.size), sha256: hash(await readFile(path)), mtime_ns: String(s.mtimeNs)};
    }
  }
  await walk(source); return result;
}
const capacity = {home_available: await free(source), output_available: await free(dirname(output)),
  tmp_available: await free('/tmp'), memory_available: os.freemem(), load: os.loadavg(), cpus: os.cpus().length};
await mkdir(output);
const report = {schema: 'recallweave.time-stepping-browser-receiving/1', started: new Date().toISOString(),
  source, executable, node: process.version, capacity, checks: [], downloads: [], pageRequests: [], pageErrors: [],
  browser_started: false, status: 'preflight',
  limits: ['One native direct-file Chrome recipient, not a browser matrix.',
    'Page request events do not establish browser-wide zero network.',
    'Screenshots receive selected viewports, not full accessibility or print behavior.',
    'Teaching-model and learner behavior do not establish physical fit or learning efficacy.']};
await writeFile(join(output, 'intent.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
const admitted = capacity.home_available >= 128 * 1024**2 && capacity.output_available >= 128 * 1024**2 &&
  capacity.tmp_available >= 128 * 1024**2 && capacity.memory_available >= 1024**3 &&
  capacity.load[0] <= Math.max(8, capacity.cpus * 1.5);
if (!admitted) {
  report.status = 'held_before_browser_launch';
  report.reason = '128MiB source/output/TMP, 1GiB available memory and bounded load admission not met.';
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({status: report.status, browser_started: false, checks: 0,
    report: join(output, 'report.json'), sha256: hash(await readFile(join(output, 'report.json')))}));
  process.exitCode = 2;
} else {
  const rawCourse = await readFile(join(source, 'courses/time-stepping.json'));
  const rawGuide = await readFile(join(source, 'courses/time-stepping.md'));
  const deck = JSON.parse(rawCourse), byPrompt = new Map(deck.items.map(item => [item.prompt, item]));
  // Root's pre-candidate closed-form Fraction powers, not the candidate model.
  const oracle = JSON.parse(await readFile(join(source, 'docs/receiving/time-stepping-713adaab/root/time-expectations.json')));
  const cases = oracle.cases, refinements = oracle.refinements;
  const before = await sourceMap(); report.before = before;
  const invalid = join(output, 'invalid-deck.json');
  await writeFile(invalid, '{"format":', {flag: 'wx'});
  const downloadPath = join(output, 'downloads'); await mkdir(downloadPath);
  const temp = await mkdtemp('/tmp/time-step-'), profile = join(temp, 'profile');
  report.private_profile = profile;
  let browser, sessionId, sequence = 0, buffer = Buffer.alloc(0), stderr = '', deadline, closed;
  const pending = new Map(), downloads = new Map();
  function command(method, params = {}, scoped = true) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
      pending.set(id, {resolve, reject, timer});
      browser.stdio[3].write(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}) + '\0');
    });
  }
  function receive(chunk) {
    buffer = Buffer.concat([buffer, chunk]); let end;
    while ((end = buffer.indexOf(0)) >= 0) {
      const body = buffer.subarray(0, end); buffer = buffer.subarray(end + 1); if (!body.length) continue;
      const message = JSON.parse(body.toString());
      if (message.id && pending.has(message.id)) {
        const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
        message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result);
      } else if (message.method === 'Network.requestWillBeSent') {
        report.pageRequests.push({url: message.params.request.url, type: message.params.type});
      } else if (message.method === 'Runtime.exceptionThrown') {
        report.pageErrors.push(message.params.exceptionDetails.text);
      } else if (message.method === 'Browser.downloadWillBegin') {
        downloads.set(message.params.guid, {guid: message.params.guid, name: message.params.suggestedFilename});
      } else if (message.method === 'Browser.downloadProgress' && message.params.state === 'completed') {
        const item = downloads.get(message.params.guid); if (item) item.complete = true;
      }
    }
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function wait(check, label) {
    for (let i = 0; i < 100; i++) { if (await check()) return; await pause(100); }
    throw new Error('Timed out: ' + label);
  }
  async function activate(selector) {
    assert.ok(await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), selector);
    await evaluate('document.querySelector(' + JSON.stringify(selector) + ').focus()');
    await command('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r'});
    await command('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
  }
  async function chooseFile(path) {
    const {root} = await command('DOM.getDocument');
    const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector: '#deck-file'});
    await command('DOM.setFileInputFiles', {nodeId, files: [path]});
  }
  async function screenshot(name, width, height) {
    await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
    assert.equal(overflow, false, name + ' document overflow');
    const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    const bytes = Buffer.from(data, 'base64'); await writeFile(join(output, name), bytes, {flag: 'wx'});
    report.checks.push({check: 'viewport', name, width, height, overflow, bytes: bytes.length, sha256: hash(bytes)});
  }
  async function download(selector, label) {
    const previous = new Set(downloads.keys()); await activate(selector);
    await wait(() => Promise.resolve([...downloads.values()].some(item => !previous.has(item.guid) && item.complete)), 'actual ' + label + ' download');
    const item = [...downloads.values()].find(item => !previous.has(item.guid) && item.complete);
    const bytes = await readFile(join(downloadPath, item.guid));
    report.downloads.push({...item, label, bytes: bytes.length, sha256: hash(bytes)});
    return bytes;
  }
  function near(actual, expected, label) {
    assert.ok(Number.isFinite(actual));
    assert.ok(Math.abs(actual - expected) <= Math.max(1e-12, Math.abs(expected) * 2e-12), label);
    if (expected !== 0) { assert.notEqual(actual, 0, label + ' not clipped'); assert.equal(Math.sign(actual), Math.sign(expected)); }
  }
  function compareRows(actual, expected) {
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
      for (const key of ['index', 'time']) assert.equal(actual[i][key], expected[i][key]);
      for (const key of ['exact', 'forward', 'backward', 'forwardError', 'backwardError', 'forwardAbsError', 'backwardAbsError']) {
        near(actual[i][key], expected[i][key], i + ':' + key);
      }
    }
  }
  async function setSettings(settings) {
    await evaluate('(' + function(settings) {
      for (const [key, value] of Object.entries(settings)) {
        const field = document.getElementById(key); field.value = value;
        field.dispatchEvent(new Event('input', {bubbles: true}));
      }
    }.toString() + ')(' + JSON.stringify(settings) + ')');
    assert.deepEqual(await evaluate('({hidden:document.querySelector("#results").hidden,disabled:document.querySelector("#download-observation").disabled})'), {hidden: true, disabled: true});
    await activate('#settings .primary');
    assert.equal(await evaluate('document.querySelector("#results").hidden'), false);
  }
  async function inspect(expected) {
    const actual = await evaluate('({index:Number(document.querySelector("#inspector").dataset.index),values:Object.fromEntries([...document.querySelectorAll("#inspector [data-value]")].map(x=>[x.id.slice(6),Number(x.dataset.value)])),markers:document.querySelectorAll("[data-marker]").length,paths:[...document.querySelectorAll("[data-series]")].map(x=>x.getAttribute("d"))})');
    assert.equal(actual.index, expected.index); assert.equal(actual.markers, 3);
    for (const [key, value] of Object.entries(actual.values)) near(value, expected[key], key);
    assert.ok(actual.paths.every(path => path && !/NaN|Infinity/.test(path)));
  }
  const learnerState = () => evaluate('({score:document.querySelector("#first-try-summary")?.textContent??null,review:[...document.querySelectorAll(".review-item")].map(x=>x.textContent),reflection:document.querySelector("#application-reflection")?.value??null,progress:document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")})');
  function checkNotes(bytes) {
    const text = bytes.toString('utf8');
    for (const item of deck.items) for (const content of [item.prompt, item.options[item.answer], item.explanation, item.transfer]) assert.ok(text.includes(content), item.id);
    assert.ok(text.includes(deck.attribution)); return text;
  }
  try {
    const flags = ['--headless', '--disable-gpu', '--remote-debugging-pipe', '--user-data-dir=' + profile,
      '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
      '--disable-sync', '--disable-extensions', '--disable-default-apps', '--disable-domain-reliability',
      '--host-resolver-rules=MAP * ~NOTFOUND', '--disable-dev-shm-usage', 'about:blank'];
    report.flags = flags; report.status = 'running'; report.browser_started = true;
    browser = spawn(executable, flags, {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], detached: true, env: {...process.env, TMPDIR: temp}});
    closed = new Promise(done => { browser.once('close', done); browser.once('error', error => { report.spawn_error = String(error); done(); }); });
    report.browser_pid = browser.pid; browser.stdio[4].on('data', receive);
    browser.stderr.on('data', bytes => { if (stderr.length < 262144) stderr += bytes.toString(); });
    deadline = setTimeout(() => { report.deadline_reached = true; try { process.kill(-browser.pid, 'SIGTERM'); } catch {} }, 120000);
    report.version = await command('Browser.getVersion', {}, false);
    await command('Browser.setDownloadBehavior', {behavior: 'allowAndName', downloadPath, eventsEnabled: true}, false);
    const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
    ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
    await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
    await command('Network.setBlockedURLs', {urls: ['http://*', 'https://*']});
    await command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 980, deviceScaleFactor: 1, mobile: false});
    await command('Page.navigate', {url: pathToFileURL(join(source, 'courses/time-stepping-lab.html')).href});
    await wait(() => evaluate('!!document.querySelector("#value-forward")?.dataset.value'), 'applied lab ready');
    const small = cases.find(item => item.settings.lambda === 1 && item.settings.step === 0.5 && item.settings.initial === 1);
    await inspect(small.expected_rows[0]);
    for (let index = 1; index <= 4; index++) { await activate('#next'); await inspect(small.expected_rows[index]); }
    assert.equal(await evaluate('document.querySelector("#next").disabled'), true);
    await activate('#previous'); await inspect(small.expected_rows[3]);
    await evaluate('document.querySelector("#selected-step").value=2;document.querySelector("#selected-step").dispatchEvent(new Event("input",{bubbles:true}))');
    await inspect(small.expected_rows[2]);
    const observation = JSON.parse(await download('#download-observation', 'small-step selected row 2'));
    assert.equal(observation.schema, 'recallweave.time-stepping-observation.v1');
    assert.deepEqual(observation.settings, small.settings); assert.equal(observation.selectedIndex, 2);
    assert.deepEqual(observation.selected, observation.rows[2]); compareRows(observation.rows, small.expected_rows);
    const courseDownload = await download('#download-course', 'fixed original course');
    const guideDownload = await download('#download-guide', 'fixed original guide');
    assert.deepEqual(courseDownload, rawCourse); assert.deepEqual(guideDownload, rawGuide);
    report.checks.push({check: 'initial shared rows, next/previous/slider and three real exact-content downloads', passed: true});
    await screenshot('lab-desktop.png', 1280, 980); await screenshot('lab-mobile.png', 390, 844);
    const presets = {small: [1, 0.5, 4, 1, 'monotone_decay'], alternating: [1, 1.5, 8, 1, 'alternating_decay'],
      boundary: [1, 2, 8, 1, 'alternating_boundary'], growing: [1.25, 2, 8, 1, 'alternating_growth'],
      negative: [2, 0.25, 8, -2, 'monotone_decay'], zero: [4, 2, 8, 0, 'alternating_growth']};
    for (const [name, expected] of Object.entries(presets)) {
      await activate('[data-preset="' + name + '"]');
      const draft = await evaluate('({values:["lambda","step","steps","initial"].map(id=>Number(document.getElementById(id).value)),hidden:document.querySelector("#results").hidden,disabled:document.querySelector("#download-observation").disabled})');
      assert.deepEqual(draft, {values: expected.slice(0, 4), hidden: true, disabled: true});
      await activate('#settings .primary');
      assert.equal(await evaluate('document.querySelector("#behavior").dataset.behavior'), expected[4]);
      assert.equal(await evaluate('document.querySelector("#zero-note").hidden'), name !== 'zero');
    }
    await evaluate('document.querySelector("#initial").value="";document.querySelector("#initial").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.deepEqual(await evaluate('({valid:document.querySelector("#settings").checkValidity(),hidden:document.querySelector("#results").hidden,disabled:document.querySelector("#download-observation").disabled})'), {valid: false, hidden: true, disabled: true});
    report.checks.push({check: 'six draft presets require apply; zero classification and blank refusal retire observations', passed: true});
    for (const example of [...cases.filter(item => item.settings.step === 2), ...refinements]) {
      await setSettings(example.settings); await activate('#final'); await inspect(example.expected_rows.at(-1));
      assert.equal(await evaluate('document.querySelector("#behavior").dataset.behavior'), example.forwardBehavior);
    }
    const largest = cases.find(item => item.settings.lambda === 4 && item.settings.step === 2 && item.settings.initial === 2);
    await setSettings(largest.settings); await activate('#final');
    const full = JSON.parse(await download('#download-observation', 'maximum growth full trace'));
    compareRows(full.rows, largest.expected_rows); assert.equal(full.selectedIndex, 64);
    assert.deepEqual(full.selected, full.rows[64]);
    report.checks.push({check: 'independent rational boundaries, growth, zero and fixed-endpoint refinements; complete maximum trace', passed: true});
    // Consume the actual downloaded deck through the unchanged learner page.
    const downloadedDeck = report.downloads.find(item => item.label === 'fixed original course');
    await command('Page.navigate', {url: pathToFileURL(join(source, 'demo.html')).href});
    await wait(() => evaluate('!!document.querySelector("#start-button")'), 'original learner ready');
    const initial = await learnerState();
    await chooseFile(join(downloadPath, downloadedDeck.guid));
    await wait(() => evaluate('!!document.querySelector("#start-deck")'), 'course preview');
    assert.equal(await evaluate('document.querySelector("#deck-preview-title").textContent'), deck.title);
    assert.equal(await evaluate('document.querySelectorAll("#deck-preview ol li").length'), 16);
    assert.deepEqual(await learnerState(), initial); await activate('#cancel-deck'); assert.deepEqual(await learnerState(), initial);
    await chooseFile(join(downloadPath, downloadedDeck.guid)); await wait(() => evaluate('!!document.querySelector("#start-deck")'), 'second preview');
    await activate('#start-deck'); await wait(() => evaluate('!!document.querySelector(".question-card h2")'), 'explicit learner start');
    await screenshot('learner-question.png', 1200, 900);
    const seen = [];
    for (let i = 0; i < 16; i++) {
      const prompt = await evaluate('document.querySelector(".question-card h2").textContent'), item = byPrompt.get(prompt);
      assert.ok(item && !seen.includes(item.id)); seen.push(item.id);
      await activate('[data-choice="' + (item.id === 'step-boundary' ? 1 : item.answer) + '"]');
      assert.ok((await evaluate('document.querySelector("#feedback-slot").textContent')).includes(item.explanation));
      await activate('#next-button');
    }
    await wait(() => evaluate('!!document.querySelector("#first-try-summary")'), 'first pass completed');
    assert.match((await learnerState()).score, /15 of 16/);
    const reflection = 'A decaying multiplier does not determine accuracy; hold the physical endpoint fixed.';
    await evaluate('document.querySelector("#application-reflection").value=' + JSON.stringify(reflection) + ';document.querySelector("#application-reflection").dispatchEvent(new Event("input",{bubbles:true}))');
    const first = checkNotes(await download('#save-notes-button', 'first-session notes'));
    assert.match(first, /15 of 16 connections correct on the first try/); assert.match(first, /Not started. 1 missed connection/);
    const preserved = await learnerState(); await chooseFile(invalid);
    await wait(() => evaluate('document.querySelector("#deck-status").classList.contains("deck-error")'), 'invalid import refused');
    assert.deepEqual(await learnerState(), preserved);
    await activate('#practice-button');
    assert.equal(await evaluate('document.querySelector(".practice-card h2").textContent'), deck.items.find(item => item.id === 'step-boundary').prompt);
    await activate('[data-practice-choice="2"]'); await activate('#practice-next');
    const final = checkNotes(await download('#save-notes-button', 'separate retry notes'));
    assert.match(final, /15 of 16 connections correct on the first try/);
    assert.match(final, /1 of 1 practice answers recorded; 1 correct on retry/);
    assert.ok(final.includes(reflection)); assert.equal((await learnerState()).review.length, 16);
    await screenshot('learner-review-mobile.png', 390, 844);
    report.checks.push({check: 'actual downloaded deck preview/cancel, all16 questions,15/16 first pass,invalid import preservation,1/1 retry and two note downloads', passed: true, seen});
    assert.equal(report.pageErrors.length, 0);
    assert.equal(report.pageRequests.filter(item => /^https?:/.test(item.url)).length, 0);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.error = String(error.stack ?? error); process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
    if (browser) {
      try { await command('Browser.close', {}, false); } catch {}
      await Promise.race([closed, pause(1000)]);
      if (browser.exitCode === null && browser.signalCode === null) { try { process.kill(-browser.pid, 'SIGTERM'); } catch {} await Promise.race([closed, pause(1000)]); }
      if (browser.exitCode === null && browser.signalCode === null) { try { process.kill(-browser.pid, 'SIGKILL'); } catch {} await Promise.race([closed, pause(1000)]); }
      report.browser_exit_code = browser.exitCode; report.browser_signal = browser.signalCode;
      report.browser_closed = browser.exitCode !== null || browser.signalCode !== null || !!report.spawn_error;
      if (!report.browser_closed) { report.status = 'failed'; process.exitCode = 1; }
    }
    for (const pendingCommand of pending.values()) clearTimeout(pendingCommand.timer);
    report.after = await sourceMap(); report.source_bytes_and_mtimes_unchanged = JSON.stringify(before) === JSON.stringify(report.after);
    if (!report.source_bytes_and_mtimes_unchanged) { report.status = 'failed'; process.exitCode = 1; }
    report.finished = new Date().toISOString();
    await writeFile(join(output, 'browser-stderr-private.txt'), stderr, {flag: 'wx'});
    report.private_browser_stderr = {bytes: Buffer.byteLength(stderr), sha256: hash(stderr), publish: false};
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    console.log(JSON.stringify({status: report.status, report: join(output, 'report.json'),
      sha256: hash(await readFile(join(output, 'report.json'))), checks: report.checks.length,
      downloads: report.downloads.length, browser_closed: report.browser_closed,
      source_unchanged: report.source_bytes_and_mtimes_unchanged}));
  }
}
