#!/usr/bin/env node
/**
 * Native browser receiving for the standalone phasor lab and existing learner.
 * Uses installed Puppeteer/Chrome, a new profile, real file inputs/downloads,
 * and an independent direct-cosine oracle. No product module is imported.
 *
 * node tools/verify-phasor-interference-browser.mjs --source-root <repo> \
 *   --out <new-directory> --puppeteer <installed-package-or-module> \
 *   --executable <installed-chrome> --source-commit <label> \
 *   --expected-lab-sha256 <sha256>
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (!key.startsWith('--') || process.argv[i + 1] === undefined) {
    throw new Error('Use --name value arguments');
  }
  options[key.slice(2)] = process.argv[i + 1];
}
for (const key of ['out', 'puppeteer', 'executable', 'expected-lab-sha256']) {
  if (!options[key]) throw new Error('Missing --' + key);
}
const source = path.resolve(options['source-root'] || fileURLToPath(new URL('../', import.meta.url)));
const out = path.resolve(options.out);
fs.mkdirSync(out); // A receipt is never silently replaced.
for (const name of ['downloads', 'screenshots']) fs.mkdirSync(path.join(out, name));
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const gitBlob = data => crypto.createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
const recordFile = filename => {
  const bytes = fs.readFileSync(filename);
  return { path: path.relative(out, filename), bytes: bytes.length, sha256: sha256(bytes), git_blob: gitBlob(bytes) };
};
const report = {
  format: 'recallweave-phasor-browser-receiving/1',
  started: new Date().toISOString(),
  sourceCommitLabel: options['source-commit'] || null,
  runtime: { node: process.version, platform: process.platform, release: os.release(), arch: process.arch, executable: options.executable },
  receiver: { ...recordFile(fileURLToPath(import.meta.url)), path: 'tools/verify-phasor-interference-browser.mjs' },
  source: [], cases: [], downloads: [], screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  oracle: {
    description: 'Independent real-signal evaluation A*cos(2*pi*cycle+common)+B*cos(2*pi*cycle+common+relative), and complex sum for peak/phase.',
    cases: ['3+4 quadrature', '2+2 constructive', '3-1 opposed', '2-2 cancellation with common rotation37.5', '2-(2-1e-8) residual', 'A1.25/B2.75/relative-63/common22/f2.5'],
    zero: 'Exactly opposed equal amplitudes have zero sum and no phase. Tiny nonzero residuals are checked with a separate subtraction identity.',
    limitations: 'Synthetic mathematical inputs and programmatic native browser actions; no human learning, physical measurements or browser-install portability claim.'
  }
};
let browser;
let page;
let cdp;
let initialJson;
let initialCourseDownload;
const defaultParameters = { amplitudeA: 3, amplitudeB: 4, phaseDifferenceDegrees: 90, commonPhaseDegrees: 0, frequencyHz: 1, cursorCycle: 0 };
const arbitrary = { amplitudeA: 1.25, amplitudeB: 2.75, phaseDifferenceDegrees: -63, commonPhaseDegrees: 22, frequencyHz: 2.5, cursorCycle: 0 };
const ids = {
  amplitudeA: '#pi-amplitude-a', amplitudeB: '#pi-amplitude-b',
  phaseDifferenceDegrees: '#pi-relative-phase', commonPhaseDegrees: '#pi-common-phase',
  frequencyHz: '#pi-frequency', cursorCycle: '#pi-cursor'
};

function close(actual, expected, label, tolerance = 1e-11) {
  assert.ok(Number.isFinite(actual), label + ': nonfinite ' + actual);
  assert.ok(Math.abs(actual - expected) <= tolerance, label + ': ' + actual + ' != ' + expected);
}
function phaseClose(actual, expected) {
  close(((actual - expected + 540) % 360) - 180, 0, 'phase', 1e-10);
}
function validateSnapshot(s, p, special = {}) {
  assert.deepEqual(s.parameters, p);
  assert.equal(s.samples.length, 129);
  assert.equal(s.traceIntervals, 128);
  assert.equal(s.traceCycles, 2);
  const common = p.commonPhaseDegrees * Math.PI / 180;
  const relative = p.phaseDifferenceDegrees * Math.PI / 180;
  const real = p.amplitudeA * Math.cos(common) + p.amplitudeB * Math.cos(common + relative);
  const imaginary = p.amplitudeA * Math.sin(common) + p.amplitudeB * Math.sin(common + relative);
  const expectedAmplitude = special.exactZero ? 0 : special.residual !== undefined ? Math.abs(special.residual) : Math.hypot(real, imaginary);
  const small = special.residual !== undefined;
  close(s.amplitude, expectedAmplitude, 'peak', small ? 1e-20 : 1e-11);
  close(s.meanSquare, expectedAmplitude ** 2 / 2, 'mean square', small ? 1e-30 : 1e-11);
  close(s.rms, expectedAmplitude / Math.sqrt(2), 'RMS', small ? 1e-20 : 1e-11);
  close(s.periodSeconds, 1 / p.frequencyHz, 'period');
  close(s.separateMeanSquares, (p.amplitudeA ** 2 + p.amplitudeB ** 2) / 2, 'separate mean squares');
  close(s.interferenceMeanSquare, p.amplitudeA * p.amplitudeB * Math.cos(relative), 'cross term');
  if (special.exactZero) {
    assert.equal(s.amplitude, 0); assert.equal(s.phaseDegrees, null);
    assert.equal(s.phasors.sum.re, 0); assert.equal(s.phasors.sum.im, 0);
  } else {
    assert.ok(s.amplitude > 0);
    const phase = small ? p.commonPhaseDegrees + (special.residual < 0 ? 180 : 0) : Math.atan2(imaginary, real) * 180 / Math.PI;
    phaseClose(s.phaseDegrees, phase);
  }
  close(s.phasors.sum.re, real, 'sum real');
  close(s.phasors.sum.im, imaginary, 'sum imaginary');
  let maxSampleError = 0;
  for (let i = 0; i < 129; i++) {
    const row = s.samples[i];
    const cycle = i / 64;
    const angle = 2 * Math.PI * cycle + common;
    const a = p.amplitudeA * Math.cos(angle);
    const b = p.amplitudeB * Math.cos(angle + relative);
    const expectedSum = special.exactZero ? 0 : small ? special.residual * Math.cos(angle) : a + b;
    assert.equal(row.index, i); assert.equal(row.cycle, cycle);
    close(row.timeSeconds, cycle / p.frequencyHz, 'sample time');
    close(row.waveA, a, 'wave A'); close(row.waveB, b, 'wave B');
    close(row.sum, expectedSum, 'sum sample', small ? 1e-20 : 1e-11);
    if (special.exactZero) assert.equal(row.sum, 0);
    maxSampleError = Math.max(maxSampleError, Math.abs(row.sum - expectedSum));
  }
  close(s.cursor.cycle, p.cursorCycle, 'cursor cycle');
  close(s.cursor.timeSeconds, p.cursorCycle / p.frequencyHz, 'cursor time');
  const cursorAngle = 2 * Math.PI * p.cursorCycle + common;
  const cursorExpected = special.exactZero ? 0 : small ? special.residual * Math.cos(cursorAngle)
    : p.amplitudeA * Math.cos(cursorAngle) + p.amplitudeB * Math.cos(cursorAngle + relative);
  close(s.cursor.sum, cursorExpected, 'cursor sum', small ? 1e-20 : 1e-11);
  assert.ok(Array.isArray(s.assumptions) && s.assumptions.length >= 4);
  return { amplitude: s.amplitude, phaseDegrees: s.phaseDegrees, meanSquare: s.meanSquare, rms: s.rms, samples: s.samples.length, maxSampleError };
}
async function test(name, action) {
  const began = Date.now();
  try {
    const details = await action();
    report.cases.push({ name, ok: true, milliseconds: Date.now() - began, details });
    console.log('PASS ' + name);
  } catch (error) {
    report.cases.push({ name, ok: false, milliseconds: Date.now() - began, error: error.stack || String(error) });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}
async function replaceNumber(selector, value) {
  await page.click(selector);
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.down(modifier);
  await page.keyboard.press('a', { commands: ['selectAll'] });
  await page.keyboard.up(modifier);
  await page.keyboard.press('Backspace');
  assert.equal(await page.$eval(selector, input => input.value), '', 'Native select-all cleared the field');
  if (String(value).length) await page.keyboard.type(String(value));
  await page.keyboard.press('Tab');
  assert.equal(await page.$eval(selector, input => input.value), String(value), 'Native typing entered the requested value');
}
async function setParameters(p) {
  for (const key of Object.keys(p)) {
    if (key !== 'cursorCycle') await replaceNumber(ids[key], p[key]);
  }
}
async function domState() {
  return page.evaluate(() => ({
    title: document.title,
    resultsHidden: document.querySelector('#pi-results').hidden,
    amplitude: document.querySelector('#pi-amplitude').textContent,
    phase: document.querySelector('#pi-phase').textContent,
    meanSquare: document.querySelector('#pi-mean-square').textContent,
    rms: document.querySelector('#pi-rms').textContent,
    rows: document.querySelectorAll('#pi-sample-rows tr').length,
    drawingChildren: [...document.querySelectorAll('#pi-phasor-drawing,#pi-trace-drawing')].map(x => x.children.length),
    jsonDisabled: document.querySelector('#pi-download-json').disabled,
    csvDisabled: document.querySelector('#pi-download-csv').disabled,
    courseDisabled: document.querySelector('#pi-download-course').disabled,
    errorHidden: document.querySelector('#pi-error').hidden,
    error: document.querySelector('#pi-error').textContent,
    cursor: document.querySelector('#pi-cursor').value,
    cursorText: document.querySelector('#pi-cursor-value').textContent,
    backDisabled: document.querySelector('#pi-step-back').disabled,
    forwardDisabled: document.querySelector('#pi-step-forward').disabled,
    invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map(x => x.id),
    viewport: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth }
  }));
}
async function download(selector, tag) {
  assert.equal(await page.$eval(selector, button => button.disabled), false, 'Download action is enabled: ' + tag);
  const dir = path.join(out, 'downloads', tag);
  fs.mkdirSync(dir);
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true });
  let begin;
  let cleanup;
  const completion = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Download did not complete: ' + tag)); }, 15000);
    const onBegin = event => { begin = event; };
    const onProgress = event => {
      if (!begin || event.guid !== begin.guid) return;
      if (event.state === 'completed') { cleanup(); resolve(event); }
      else if (event.state === 'canceled') { cleanup(); reject(new Error('Download canceled: ' + tag)); }
    };
    cleanup = () => { clearTimeout(timeout); cdp.off('Browser.downloadWillBegin', onBegin); cdp.off('Browser.downloadProgress', onProgress); };
    cdp.on('Browser.downloadWillBegin', onBegin);
    cdp.on('Browser.downloadProgress', onProgress);
  });
  try {
    await page.click(selector);
    const progress = await completion;
    const filename = path.join(dir, path.basename(begin.suggestedFilename));
    const bytes = fs.readFileSync(filename);
    const receipt = { tag, suggestedFilename: begin.suggestedFilename, completedBytes: progress.receivedBytes, ...recordFile(filename) };
    assert.equal(bytes.length, progress.receivedBytes);
    report.downloads.push(receipt);
    return { path: filename, bytes, text: bytes.toString('utf8'), receipt };
  } finally { cleanup(); }
}
async function screenshot(name, fullPage = false) {
  const filename = path.join(out, 'screenshots', name + '.png');
  await page.screenshot({ path: filename, fullPage });
  const bytes = fs.readFileSync(filename);
  const receipt = { ...recordFile(filename), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  report.screenshots.push(receipt);
  return receipt;
}

try {
  for (const filename of ['courses/phasor-interference-lab.html', 'courses/phasor-interference.json', 'demo.html']) {
    const bytes = fs.readFileSync(path.join(source, filename));
    report.source.push({ path: filename, bytes: bytes.length, sha256: sha256(bytes), git_blob: gitBlob(bytes) });
  }
  assert.equal(report.source[0].sha256, options['expected-lab-sha256']);
  const courseBytes = fs.readFileSync(path.join(source, 'courses/phasor-interference.json'));
  const course = JSON.parse(courseBytes);
  const require = createRequire(import.meta.url);
  const puppeteer = require(options.puppeteer);
  let moduleDirectory = path.dirname(require.resolve(options.puppeteer));
  for (let level = 0; level < 7; level++) {
    const packagePath = path.join(moduleDirectory, 'package.json');
    if (fs.existsSync(packagePath)) {
      const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (['puppeteer', 'puppeteer-core'].includes(metadata.name)) {
        report.runtime.automation = { name: metadata.name, version: metadata.version };
        break;
      }
    }
    moduleDirectory = path.dirname(moduleDirectory);
  }
  const profile = fs.mkdtempSync(path.join(out, 'profile-'));
  report.runtime.profile = path.basename(profile);
  browser = await puppeteer.launch({
    headless: true, executablePath: options.executable, userDataDir: profile,
    args: ['--no-first-run', '--disable-sync'], timeout: 20000
  });
  report.runtime.browser = await browser.version();
  cdp = await browser.target().createCDPSession();
  page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (/^(file:|data:|blob:|about:)/.test(request.url())) request.continue().catch(() => {});
    else { report.externalRequests.push(request.url()); request.abort().catch(() => {}); }
  });
  const labUrl = pathToFileURL(path.join(source, 'courses/phasor-interference-lab.html')).href;
  await page.goto(labUrl, { waitUntil: 'load', timeout: 15000 });

  await test('initial-render-and-desktop', async () => {
    const state = await domState();
    assert.equal(state.resultsHidden, false); assert.equal(state.rows, 129);
    close(Number(state.amplitude), 5, 'display peak');
    close(Number(state.phase.replace('°', '')), Math.atan2(4, 3) * 180 / Math.PI, 'display phase', 5.1e-7);
    close(Number(state.meanSquare), 12.5, 'display mean square');
    close(Number(state.rms), 5 / Math.sqrt(2), 'display RMS', 5.1e-7);
    assert.ok(state.viewport.scrollWidth <= state.viewport.width + 1);
    const plot = await page.evaluate(() => {
      const vectors = Object.fromEntries([...document.querySelectorAll('[data-vector]')].map(el => [el.dataset.vector, ['x1','y1','x2','y2'].map(key => Number(el.getAttribute(key)))]));
      const traces = [...document.querySelectorAll('[data-trace]')].map(el => ({ name: el.dataset.trace, path: el.getAttribute('d') }));
      return { vectors, traces };
    });
    for (const axis of [0, 1]) close(plot.vectors.sum[axis + 2] - plot.vectors.sum[axis],
      plot.vectors.a[axis + 2] - plot.vectors.a[axis] + plot.vectors.b[axis + 2] - plot.vectors.b[axis], 'rendered vector sum');
    assert.equal(plot.traces.length, 3);
    for (const trace of plot.traces) { assert.equal((trace.path.match(/L/g) || []).length, 128); assert.ok(!/NaN|Infinity/.test(trace.path)); }
    await screenshot('lab-desktop', true);
    return state;
  });

  await test('initial-json-all-129-independent-samples', async () => {
    initialJson = await download('#pi-download-json', 'initial-json');
    const snapshot = JSON.parse(initialJson.text);
    const numeric = validateSnapshot(snapshot, defaultParameters);
    const displayed = await page.$$eval('#pi-sample-rows tr', rows => rows.map(row => [...row.cells].map(cell => Number(cell.textContent))));
    for (let i = 0; i < 129; i++) {
      const row = snapshot.samples[i];
      for (const [j, key] of ['index', 'cycle', 'timeSeconds', 'waveA', 'waveB', 'sum'].entries()) close(displayed[i][j], row[key], 'table ' + key, 5.1e-7);
    }
    return numeric;
  });

  await test('initial-csv-actual-bytes-and-settings', async () => {
    const file = await download('#pi-download-csv', 'initial-csv');
    const lines = file.text.trimEnd().split(/\r?\n/);
    assert.equal(lines.shift(), 'index,cycle,time_seconds,wave_a,wave_b,sum,amplitude_a,amplitude_b,relative_phase_degrees,common_phase_degrees,frequency_hz,cursor_cycle');
    assert.equal(lines.length, 129);
    const snapshot = JSON.parse(initialJson.text);
    lines.forEach((line, i) => {
      const cells = line.split(',').map(Number);
      assert.equal(cells.length, 12);
      const row = snapshot.samples[i];
      assert.deepEqual(cells, [row.index,row.cycle,row.timeSeconds,row.waveA,row.waveB,row.sum,3,4,90,0,1,0]);
    });
    return { rows: lines.length, columns: 12, bytes: file.bytes.length };
  });

  await test('mobile-layout-and-controls', async () => {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const layout = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('#pi-controls input')].map(x => ({ id: x.id, left: x.getBoundingClientRect().left, right: x.getBoundingClientRect().right, width: x.getBoundingClientRect().width }))
    }));
    assert.ok(layout.scrollWidth <= layout.width + 1);
    for (const control of layout.controls) { assert.ok(control.width > 40); assert.ok(control.left >= 0 && control.right <= layout.width + 1); }
    await page.click('#pi-step-forward');
    assert.equal((await domState()).cursor, '0.0625');
    await page.click('#pi-step-back');
    assert.equal((await domState()).cursor, '0');
    await page.evaluate(() => scrollTo(0, 0));
    await screenshot('lab-mobile', true);
    await page.setViewport({ width: 1365, height: 1000, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    return layout;
  });

  await test('arbitrary-typed-parameters-and-direct-cosine-oracle', async () => {
    await setParameters(arbitrary);
    const file = await download('#pi-download-json', 'arbitrary-json');
    return validateSnapshot(JSON.parse(file.text), arbitrary);
  });

  await test('cursor-native-keyboard-step-and-boundaries', async () => {
    await page.focus('#pi-cursor');
    await page.keyboard.press('ArrowRight');
    assert.equal((await domState()).cursor, '0.015625');
    await page.click('#pi-step-forward');
    assert.equal((await domState()).cursor, '0.078125');
    await page.click('#pi-step-back');
    assert.equal((await domState()).cursor, '0.015625');
    const file = await download('#pi-download-json', 'cursor-json');
    const numeric = validateSnapshot(JSON.parse(file.text), { ...arbitrary, cursorCycle: 0.015625 });
    await page.focus('#pi-cursor'); await page.keyboard.press('End');
    let state = await domState(); assert.equal(state.cursor, '2'); assert.equal(state.forwardDisabled, true);
    await page.keyboard.press('Home');
    state = await domState(); assert.equal(state.cursor, '0'); assert.equal(state.backDisabled, true);
    return numeric;
  });

  for (const [name, p, special] of [
    ['constructive', { ...defaultParameters, amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees: 0 }, {}],
    ['unequal', { ...defaultParameters, amplitudeA: 3, amplitudeB: 1, phaseDifferenceDegrees: 180 }, {}],
    ['cancel', { ...defaultParameters, amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees: 180 }, { exactZero: true }]
  ]) {
    await test('preset-' + name, async () => {
      await page.click('[data-pi-preset="' + name + '"]');
      const file = await download('#pi-download-json', name + '-json');
      const numeric = validateSnapshot(JSON.parse(file.text), p, special);
      if (special.exactZero) {
        const state = await domState(); assert.equal(state.amplitude, '0'); assert.equal(state.phase, 'Undefined');
        assert.equal(await page.$$eval('[data-zero-resultant]', nodes => nodes.length), 1);
      }
      return numeric;
    });
  }

  await test('exact-cancellation-after-common-rotation37.5', async () => {
    await page.click('[data-pi-preset="cancel"]');
    await replaceNumber('#pi-common-phase', 37.5);
    const file = await download('#pi-download-json', 'rotated-cancel-json');
    const numeric = validateSnapshot(JSON.parse(file.text), { ...defaultParameters, amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees: 180, commonPhaseDegrees: 37.5 }, { exactZero: true });
    assert.equal((await domState()).phase, 'Undefined');
    return numeric;
  });

  await test('nonzero-near-cancellation-is-retained', async () => {
    await page.click('[data-pi-preset="cancel"]');
    const b = 2 - 1e-8;
    await replaceNumber('#pi-amplitude-b', String(b));
    const file = await download('#pi-download-json', 'near-cancel-json');
    const numeric = validateSnapshot(JSON.parse(file.text), { ...defaultParameters, amplitudeA: 2, amplitudeB: b, phaseDifferenceDegrees: 180 }, { residual: 2 - b });
    const state = await domState();
    assert.ok(/e-/.test(state.amplitude)); assert.ok(Number(state.amplitude) > 0); assert.notEqual(state.phase, 'Undefined');
    return { ...numeric, display: state.amplitude };
  });

  for (const [name, selector, value] of [
    ['blank-amplitude', '#pi-amplitude-a', ''],
    ['negative-amplitude', '#pi-amplitude-a', '-0.1'],
    ['amplitude-too-large', '#pi-amplitude-b', '5.01'],
    ['zero-frequency', '#pi-frequency', '0'],
    ['frequency-too-large', '#pi-frequency', '10.01'],
    ['relative-phase-too-large', '#pi-relative-phase', '181'],
    ['common-phase-too-small', '#pi-common-phase', '-181']
  ]) {
    await test('invalid-' + name, async () => {
      await page.click('[data-pi-preset="quadrature"]');
      await replaceNumber(selector, value);
      const state = await domState();
      assert.equal(state.resultsHidden, true); assert.equal(state.rows, 0);
      assert.deepEqual(state.drawingChildren, [0, 0]);
      assert.equal(state.jsonDisabled, true); assert.equal(state.csvDisabled, true);
      assert.equal(state.courseDisabled, false); assert.equal(state.errorHidden, false);
      assert.ok(state.invalid.includes(selector.slice(1)));
      assert.equal(state.backDisabled, true); assert.equal(state.forwardDisabled, true);
      if (name === 'blank-amplitude') {
        initialCourseDownload = await download('#pi-download-course', 'course-from-invalid-state');
        assert.ok(initialCourseDownload.bytes.equals(courseBytes));
      }
      await page.click('[data-pi-preset="quadrature"]');
      const recovered = await domState();
      assert.equal(recovered.resultsHidden, false); assert.equal(recovered.rows, 129);
      assert.equal(recovered.amplitude, '5'); assert.equal(recovered.jsonDisabled, false);
      return state;
    });
  }

  await test('refresh-restores-starting-example', async () => {
    await setParameters(arbitrary);
    await page.reload({ waitUntil: 'load' });
    const state = await domState();
    assert.equal(state.amplitude, '5'); assert.equal(state.rows, 129);
    const values = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#pi-controls input')].map(x => [x.name, Number(x.value)])));
    assert.deepEqual(values, defaultParameters);
    return values;
  });

  await test('course-download-exact-original-bytes', async () => {
    const file = await download('#pi-download-course', 'course');
    assert.ok(file.bytes.equals(courseBytes));
    assert.equal(course.items.length, 16); assert.equal(course.concepts.length, 4);
    initialCourseDownload = file;
    return { bytes: file.bytes.length, sha256: sha256(file.bytes), questions: course.items.length, concepts: course.concepts.length };
  });

  let missedItem;
  let learnerOrder = [];
  await test('native-relative-link-import-preview-start', async () => {
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('nav a[href="../demo.html"]')]);
    assert.equal(fileURLToPath(page.url()), path.join(source, 'demo.html'));
    const before = await page.$eval('#step-count', el => el.textContent);
    const input = await page.$('#deck-file');
    await input.uploadFile(initialCourseDownload.path);
    await page.waitForSelector('#start-deck', { visible: true });
    assert.equal(await page.$eval('#deck-preview-title', el => el.textContent), course.title);
    const count = await page.$eval('.deck-preview-count', el => el.textContent);
    assert.ok(count.includes('16 questions') && count.includes('4 concepts'));
    assert.equal(await page.$$eval('#deck-preview ol li', nodes => nodes.length), 16);
    assert.equal(await page.$eval('#step-count', el => el.textContent), before);
    await screenshot('learner-preview', false);
    await page.click('#start-deck');
    await page.waitForSelector('.question-card .choice');
    return { title: course.title, previewCount: count, originalProgressUntilStart: before, learnerUrl: 'file://<received-source>/demo.html' };
  });

  await test('native-sixteen-answers-review-and-canonical-option-identity', async () => {
    const seen = new Set();
    for (let i = 0; i < 16; i++) {
      const prompt = await page.$eval('.question-card h2', el => el.textContent);
      const item = course.items.find(x => x.prompt === prompt);
      assert.ok(item, 'Native prompt belongs to imported course'); assert.ok(!seen.has(item.id));
      seen.add(item.id);
      const shown = await page.$$eval('.choice', buttons => buttons.map(button => ({
        canonical: Number(button.dataset.choice),
        text: [...button.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('')
      })));
      assert.equal(shown.length, item.options.length);
      assert.deepEqual([...shown.map(x => x.canonical)].sort((a,b) => a-b), item.options.map((_,i) => i));
      for (const option of shown) assert.equal(option.text, item.options[option.canonical]);
      const choice = i === 0 ? (item.answer + 1) % item.options.length : item.answer;
      if (i === 0) missedItem = item;
      learnerOrder.push({ id: item.id, displayedCanonicalOrder: shown.map(x => x.canonical), chosenCanonical: choice, correctCanonical: item.answer });
      await page.click('[data-choice="' + choice + '"]');
      const feedback = await page.$eval('#feedback-slot .feedback', el => el.textContent);
      assert.ok(feedback.includes(item.explanation));
      assert.ok(feedback.includes(i === 0 ? 'correction' : 'That connection holds.'));
      await page.click('#next-button');
    }
    await page.waitForSelector('#review-title');
    assert.equal(await page.$$eval('.review-item', nodes => nodes.length), 16);
    const summary = await page.$eval('#first-try-summary', el => el.textContent);
    assert.ok(summary.includes('15 of 16'));
    for (const item of course.items) {
      const has = await page.$$eval('.review-item', (nodes, wanted) => nodes.some(node =>
        node.querySelector('.review-prompt').textContent === wanted.prompt &&
        node.textContent.includes(wanted.explanation) &&
        node.textContent.includes(wanted.options[wanted.answer])), item);
      assert.ok(has, 'Review preserves source prompt, explanation, correct answer: ' + item.id);
    }
    return { summary, items: learnerOrder, observedNonidentityDisplay: learnerOrder.some(row => row.displayedCanonicalOrder.some((value,index) => value !== index)) };
  });

  await test('native-missed-practice-and-notes-download', async () => {
    const summary = await page.$eval('#first-try-summary', el => el.textContent);
    await page.click('#practice-button');
    assert.equal(await page.$eval('.practice-card h2', el => el.textContent), missedItem.prompt);
    await page.click('[data-practice-choice="' + missedItem.answer + '"]');
    await page.click('#practice-next');
    await page.waitForSelector('#review-title');
    assert.equal(await page.$eval('#first-try-summary', el => el.textContent), summary);
    assert.ok((await page.$eval('#practice-status', el => el.textContent)).includes('1 of 1 correctly'));
    await page.click('.review-item summary');
    const note = 'Receiver note: relative phase changes the vector sum while common phase rotates both waves.';
    await page.type('.review-item textarea', note);
    const application = 'Receiver application: compare equal-amplitude opposition with the retained nonzero residual before interpreting phase.';
    await page.type('#application-reflection', application);
    const file = await download('#save-notes-button', 'study-notes');
    assert.ok(file.text.includes(course.title));
    assert.ok(file.text.includes(note)); assert.ok(file.text.includes(application));
    for (const item of course.items) {
      assert.ok(file.text.includes(item.prompt), 'Notes contain prompt: ' + item.id);
      assert.ok(file.text.includes(item.explanation), 'Notes contain explanation: ' + item.id);
    }
    assert.ok(file.text.includes(missedItem.options[missedItem.answer]));
    await page.evaluate(() => document.querySelector('#review-title').scrollIntoView());
    await screenshot('learner-review', false);
    return { bytes: file.bytes.length, sha256: sha256(file.bytes), firstTrySummary: summary, retainedReflection: note, retainedApplication: application };
  });

  await test('no-page-errors-or-external-page-requests', async () => {
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.externalRequests, []);
    return { pageErrors: 0, consoleErrors: 0, externalRequests: 0 };
  });
} catch (error) {
  report.fatal = error.stack || String(error);
  console.error(report.fatal);
} finally {
  if (browser) await browser.close();
  report.finished = new Date().toISOString();
  report.ok = !report.fatal && report.cases.length > 0 && report.cases.every(item => item.ok);
  report.passed = report.cases.filter(item => item.ok).length;
  report.failed = report.cases.filter(item => !item.ok).length;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, out, source: report.source }));
  process.exitCode = report.ok ? 0 : 1;
}
