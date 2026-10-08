#!/usr/bin/env node
/**
 * Independent receiving driver adapted from the pinned catalog and shortest-paths donors.
 * Runs only when explicitly invoked on the named immutable Mac receiving source.
 * No browser download, build, source edit, account, or existing browser profile is used.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

const DRIVER = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const options = {};
assert.equal(args.length % 2, 0, 'Use --runtime <reviewed manifest> --out <fresh absolute directory> [--pins <manifest>].');
for (let index = 0; index < args.length; index += 2) {
  const key = args[index];
  assert.ok(['--out', '--pins', '--runtime'].includes(key) && !Object.hasOwn(options, key), 'Unknown or duplicate option: ' + key);
  assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), 'Missing option value.');
  options[key] = args[index + 1];
}
assert.ok(options['--out'] && path.isAbsolute(options['--out']), 'An absolute fresh output path is required.');
assert.ok(options['--runtime'] && path.isAbsolute(options['--runtime']), 'An absolute reviewed runtime manifest is required.');
const OUT = path.resolve(options['--out']);
const PINS = path.resolve(options['--pins'] ?? path.join(path.dirname(DRIVER), 'pins.json'));
const RUNTIME = path.resolve(options['--runtime']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const describe = error => ({name: error?.name ?? 'Error', message: error?.message ?? String(error), stack: error?.stack});
const started = new Date().toISOString();
const driverBytes = await fs.readFile(DRIVER);
const pinBytes = await fs.readFile(PINS);
const pins = JSON.parse(pinBytes.toString('utf8'));
const runtimeBytes = await fs.readFile(RUNTIME);
const runtime = JSON.parse(runtimeBytes.toString('utf8'));
assert.equal(pins.format, 'hamon.floating-point-browser-receiving-pins/2');
assert.equal(runtime.format, 'hamon.floating-point-browser-runtime/1');
assert.equal(runtime.state, 'reviewed');
assert.ok(pins.reviewedRuntimes.some(item => item.id === runtime.id && item.sha256 === digest(runtimeBytes)), 'The exact runtime manifest must be approved in the reviewed pins.');
assert.equal(runtime.platform, process.platform, 'The reviewed runtime must match this native platform.');
assert.ok(['darwin', 'win32'].includes(runtime.platform));
const ROOT = runtime.root, OUTPUT_PARENT = runtime.outputParent;
const PLAYWRIGHT = runtime.playwrightModule, EXECUTABLE = runtime.browserExecutable;
for (const value of [ROOT, OUTPUT_PARENT, PLAYWRIGHT, EXECUTABLE, runtime.nodeExecutable]) assert.ok(typeof value === 'string' && path.isAbsolute(value), 'Every runtime path must be explicit and absolute.');
assert.ok(pins.sourceRoots.includes(ROOT), 'The receiving source must be one of the reviewed exact destinations.');
const comparablePath = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
assert.equal(comparablePath(path.dirname(ROOT)), comparablePath(OUTPUT_PARENT));
assert.equal(comparablePath(path.dirname(OUT)), comparablePath(OUTPUT_PARENT), 'Output must be an owned sibling of the receiving source.');
assert.ok(path.basename(OUT).startsWith('browser-receiving-'), 'Use a browser-receiving- output name.');
assert.equal(comparablePath(await fs.realpath(process.execPath)), comparablePath(await fs.realpath(runtime.nodeExecutable)), 'Use the exact reviewed Node executable.');
assert.equal(process.version, runtime.nodeVersion, 'The Node version must match the reviewed runtime.');
assert.equal(pins.driver.sha256, digest(driverBytes), 'Driver must match its reviewed manifest.');
assert.equal(comparablePath(await fs.realpath(ROOT)), comparablePath(ROOT), 'The immutable receiving path must not redirect.');
assert.equal(comparablePath(await fs.realpath(OUTPUT_PARENT)), comparablePath(OUTPUT_PARENT), 'The owned output parent must not redirect.');
await fs.mkdir(OUT, {recursive: false, mode: 0o700});
const DOWNLOADS = path.join(OUT, 'downloads');
const TMP = path.join(OUT, 'tmp');
await fs.mkdir(DOWNLOADS, {mode: 0o700});
await fs.mkdir(TMP, {mode: 0o700});
await fs.mkdir(path.join(TMP, 'browser-downloads'), {mode: 0o700});
const profile = await fs.mkdtemp(path.join(OUT, 'profile-'));
const report = {
  format: 'hamon.floating-point-browser-receiving/2',
  status: 'running', started, root: ROOT, output: OUT, node: process.version,
  playwrightPath: PLAYWRIGHT, executablePath: EXECUTABLE,
  driver: {path: DRIVER, bytes: driverBytes.length, sha256: digest(driverBytes)},
  pinManifest: {path: PINS, bytes: pinBytes.length, sha256: digest(pinBytes)},
  runtimeManifest: {path: RUNTIME, bytes: runtimeBytes.length, sha256: digest(runtimeBytes), id: runtime.id, platform: runtime.platform},
  sourceBase: pins.sourceBase, learnerSnapshot: pins.learnerSnapshot, learnerTree: pins.learnerTree,
  donors: pins.donors, nativeIntake: pins.nativeIntake, sourceIntegration: pins.sourceIntegration,
  groups: [], downloads: [], captures: [], lifecycleErrors: [], cleanup: {},
  boundary: 'Actual direct-file lab with the root visual successor and exact current 81363271 learner. All fourteen first answers are entered through real choice buttons; one is deliberately wrong. Two explicit reflections are typed into the actual current learner and checked through practice and the physical notes export. No synthetic archive fills the session. Model/codec calls check parity, not educational efficacy or independent model correctness. The original v2/9b69 run remains separate.',
  limits: {overallMs: 180000, actionMs: 5000, navigationMs: 10000, launchMs: 20000, sourceFiles: 128, sourceBytes: 8388608, recordsPerPage: 500}
};
let context, deadline, sourceBefore, actualCourseDownload;
let course, courseBytes, serializeDeck, serializeTriangleReport;
let initialMastery, selectNextItem, updateMastery, createReview, beginPractice, answerPractice;
let createTraceArchive, readTraceArchive, createStudyNotes, createReflections, updateReflection, updateApplicationReflection;
const groupStates = new Map();

async function inventory(directory) {
  const rows = [];
  let total = 0;
  async function walk(current) {
    const entries = (await fs.readdir(current, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const filename = path.join(current, entry.name);
      assert.ok(entry.isDirectory() || entry.isFile(), 'Only ordinary source files/directories are admitted.');
      if (entry.isDirectory()) { await walk(filename); continue; }
      const stat = await fs.stat(filename);
      assert.ok(stat.size <= 2097152 && rows.length < report.limits.sourceFiles, 'Source inventory bound exceeded.');
      total += stat.size;
      assert.ok(total <= report.limits.sourceBytes, 'Source byte bound exceeded.');
      const bytes = await fs.readFile(filename);
      rows.push({path: path.relative(directory, filename).split(path.sep).join('/'), bytes: bytes.length, sha256: digest(bytes)});
    }
  }
  await walk(directory);
  return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function pass(record, name, detail) {
  record.checks.push({name, ...(detail === undefined ? {} : {detail})});
  console.log(JSON.stringify({group: record.name, check: name, status: 'passed'}));
}
const text = async (page, selector) => (await page.locator(selector).textContent())?.trim();
async function activate(page, selector) {
  const control = page.locator(selector);
  assert.equal(await control.count(), 1, 'Expected one control: ' + selector);
  await control.focus();
  await control.press('Enter');
}
async function screenshot(page, record, name, selector) {
  if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
  const bytes = await page.screenshot({path: path.join(OUT, name), fullPage: false, timeout: 5000});
  assert.ok(bytes.length < 8388608, 'Screenshot exceeds the bounded evidence size.');
  report.captures.push({group: record.name, path: name, bytes: bytes.length, sha256: digest(bytes), viewport: page.viewportSize()});
}
async function saveDownload(page, record, selector, name, suggested, expected) {
  const waiting = page.waitForEvent('download', {timeout: 5000});
  const [download] = await Promise.all([waiting, activate(page, selector)]);
  if (typeof suggested === 'string') assert.equal(download.suggestedFilename(), suggested);
  else assert.match(download.suggestedFilename(), suggested);
  const filename = path.join(DOWNLOADS, name);
  await download.saveAs(filename);
  assert.equal(await download.failure(), null);
  const stat = await fs.stat(filename);
  assert.ok(stat.size <= 2097152, 'Download exceeds the bounded fixture size.');
  const bytes = await fs.readFile(filename);
  report.downloads.push({group: record.name, path: path.relative(OUT, filename), suggestedFilename: download.suggestedFilename(), bytes: bytes.length, sha256: digest(bytes)});
  if (expected !== undefined) assert.deepEqual(bytes, Buffer.from(expected), 'Downloaded bytes differ: ' + name);
  return {filename, bytes};
}
async function geometryRows(page) {
  return page.locator('#coordinate-rows tr').evaluateAll(rows => rows.map(row => [...row.children].map(cell => cell.textContent.trim())));
}
async function geometry(page, orientation, area, rows) {
  assert.equal(await page.locator('#geometry-output').isVisible(), true);
  assert.equal(await page.locator('#orientation-status').getAttribute('data-state'), orientation);
  assert.equal(await text(page, '#stored-area'), area);
  if (rows) assert.deepEqual(await geometryRows(page), rows);
  assert.equal(await page.locator('#download-report').isEnabled(), true);
  await plotLabelSeparation(page);
}

async function plotLabelSeparation(page) {
  const observation = await page.locator('#plot-layer').evaluate(layer => ({
    origin: document.querySelector('#origin-input').value,
    unitExponent: document.querySelector('#unit-exponent').value,
    labels: [...layer.querySelectorAll('text')].map(node => {
      const box = node.getBBox();
      return {text: node.textContent, role: node.getAttribute('data-vertex-label'), x: box.x, y: box.y, width: box.width, height: box.height};
    })
  }));
  const vertexLabels = observation.labels.filter(label => label.role);
  assert.ok(vertexLabels.length >= 3 && vertexLabels.length <= 4, 'Each source/stored vertex label group must be present.');
  assert.ok(observation.labels.every(box => [box.x, box.y, box.width, box.height].every(Number.isFinite)
    && box.width > 0 && box.height > 0 && box.x >= -1 && box.y >= -1
    && box.x + box.width <= 451 && box.y + box.height <= 411), 'Every visible plot label must have a finite contained measured box.');
  const collisions = [];
  for (let i = 0; i < observation.labels.length; i += 1) {
    for (let j = i + 1; j < observation.labels.length; j += 1) {
      const a = observation.labels[i], b = observation.labels[j];
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (width > 0.25 && height > 0.25) collisions.push({a: a.text, b: b.text, width, height});
    }
  }
  const record = groupStates.get(page);
  record.plotLabelChecks ??= [];
  assert.ok(record.plotLabelChecks.length < 64, 'Plot-label observation bound exceeded.');
  record.plotLabelChecks.push({...observation, collisions});
  assert.deepEqual(collisions, [], 'Actual SVG text boxes must not overlap, including source b and stored b-prime.');
}
async function number(page, preset, stored, classification, hex) {
  if (preset !== null) await page.locator('#number-preset').selectOption(preset);
  assert.equal(await page.locator('#number-output').isVisible(), true);
  assert.equal(await text(page, '#stored-value'), stored);
  assert.equal(await text(page, '#number-classification'), classification);
  assert.equal(await text(page, '#number-hex'), hex);
}
async function compactLayout(page, record, includePlot) {
  const observed = await page.evaluate(includePlot => {
    const svg = document.querySelector('#triangle-plot');
    return {
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('button,select,input,textarea')].filter(element => element.getClientRects().length)
        .map(element => ({id: element.id, tag: element.tagName, x: element.getBoundingClientRect().x, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height})),
      plotLabels: includePlot ? [...svg.querySelectorAll('text')].map(element => {
        const box = element.getBBox();
        return {text: element.textContent, x: box.x, y: box.y, width: box.width, height: box.height};
      }) : []
    };
  }, includePlot);
  assert.equal(observed.width, 390);
  assert.ok(observed.documentWidth <= observed.width, '390px document must not overflow horizontally.');
  assert.ok(observed.controls.every(control => control.width > 0 && control.height > 0 && control.x >= -1 && control.x + control.width <= 391), 'Visible controls must fit the compact width.');
  if (includePlot) assert.ok(observed.plotLabels.every(box => box.x >= -1 && box.y >= -1 && box.x + box.width <= 451 && box.y + box.height <= 411), 'Plot labels must remain inside the SVG viewBox.');
  record.layouts ??= [];
  record.layouts.push(observed);
}
async function snapshotLearner(page) {
  return page.evaluate(() => ({
    session: document.querySelector('#session-content').innerHTML,
    progress: document.querySelector('#step-count').textContent,
    title: document.title, description: document.querySelector('#lesson-description').textContent
  }));
}
async function group(name, viewport, documentPath, action) {
  const record = {name, started: new Date().toISOString(), checks: [], pageErrors: [], consoleErrors: [], requests: [], requestFailures: [], blockedRequests: [], status: 'running'};
  report.groups.push(record);
  const page = await context.newPage();
  groupStates.set(page, record);
  const collect = (key, value) => {
    if (record[key].length < report.limits.recordsPerPage) record[key].push(value);
    else record.eventOverflow = true;
  };
  page.on('pageerror', error => collect('pageErrors', error.message));
  page.on('console', message => { if (message.type() === 'error') collect('consoleErrors', message.text()); });
  page.on('request', request => collect('requests', {url: request.url(), method: request.method(), resourceType: request.resourceType()}));
  page.on('requestfailed', request => collect('requestFailures', {url: request.url(), error: request.failure()?.errorText}));
  page.setDefaultTimeout(report.limits.actionMs);
  page.setDefaultNavigationTimeout(report.limits.navigationMs);
  try {
    await page.setViewportSize(viewport);
    await page.goto(pathToFileURL(path.join(ROOT, documentPath)).href, {waitUntil: 'load'});
    await action(page, record);
    assert.deepEqual(record.pageErrors, [], 'No uncaught page errors.');
    assert.deepEqual(record.consoleErrors, [], 'No browser-console errors.');
    assert.deepEqual(record.requestFailures, [], 'No failed page requests.');
    assert.deepEqual(record.blockedRequests, [], 'No external request attempted.');
    assert.deepEqual(record.requests.filter(request => /^https?:/i.test(request.url)), [], 'Direct-file receiving must make no HTTP request.');
    assert.equal(Boolean(record.eventOverflow), false, 'Event-record bound must hold.');
    record.storageWrites = await page.evaluate(() => window.receivingStorageWrites);
    assert.deepEqual(record.storageWrites, [], 'The lesson must not automatically persist a browser session.');
    record.status = 'passed';
  } catch (error) {
    record.status = 'failed';
    record.error = describe(error);
    record.visibleState = await page.evaluate(() => ({url: location.href, text: document.body?.innerText.slice(0, 24000)})).catch(() => null);
    await screenshot(page, record, name + '-failure.png').catch(captureError => { record.captureError = describe(captureError); });
  } finally {
    record.finished = new Date().toISOString();
    await page.close().catch(error => { record.closeError = describe(error); record.status = 'failed'; });
    groupStates.delete(page);
    console.log(JSON.stringify({group: name, status: record.status, checks: record.checks.length, error: record.error?.message}));
  }
}

try {
  sourceBefore = await inventory(ROOT);
  const expectedSource = pins.files.map(({path: relative, bytes, sha256}) => ({path: relative, bytes, sha256})).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  assert.deepEqual(sourceBefore, expectedSource, 'Every immutable current receiving file must match the complete reviewed source composition.');
  report.sourceBefore = sourceBefore;
  await fs.access(PLAYWRIGHT);
  await fs.access(EXECUTABLE);
  const fromRoot = relative => import(pathToFileURL(path.join(ROOT, relative)).href);
  const deckModule = await fromRoot('src/deck.mjs');
  serializeDeck = deckModule.serializeDeck;
  courseBytes = await fs.readFile(path.join(ROOT, 'courses/floating-point.json'));
  course = deckModule.parseDeck(courseBytes.toString('utf8'));
  assert.equal(course.items.length, 14);
  assert.equal(course.concepts.length, 7);
  assert.equal(serializeDeck(course), courseBytes.toString('utf8'));
  ({serializeTriangleReport} = await fromRoot('src/floating-point.mjs'));
  ({initialMastery, selectNextItem, updateMastery} = await fromRoot('src/knowledge.mjs'));
  ({createReview, beginPractice, answerPractice} = await fromRoot('src/review.mjs'));
  ({createTraceArchive, readTraceArchive} = await fromRoot('src/trace-archive.mjs'));
  ({createStudyNotes} = await fromRoot('src/session-export.mjs'));
  ({createReflections, updateReflection, updateApplicationReflection} = await fromRoot('src/reflections.mjs'));
  for (const oracle of pins.reportDownloads) {
    assert.equal(digest(serializeTriangleReport(oracle.parameters)), oracle.sha256, 'Pinned report oracle must remain exact.');
  }
  const {chromium} = await import(pathToFileURL(PLAYWRIGHT).href);
  context = await chromium.launchPersistentContext(profile, {
    executablePath: EXECUTABLE, headless: true, acceptDownloads: true,
    downloadsPath: path.join(TMP, 'browser-downloads'), timeout: report.limits.launchMs,
    viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce',
    env: {...process.env, TMPDIR: TMP, TMP, TEMP: TMP},
    args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check']
  });
  report.browserVersion = context.browser()?.version() ?? null;
  await context.route(/^https?:\/\//i, async route => {
    const page = route.request().frame().page();
    const record = groupStates.get(page);
    if (record && record.blockedRequests.length < report.limits.recordsPerPage) record.blockedRequests.push(route.request().url());
    await route.abort('blockedbyclient').catch(error => report.lifecycleErrors.push(describe(error)));
  });
  await context.addInitScript(() => {
    window.receivingStorageWrites = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (window.receivingStorageWrites.length < 501) window.receivingStorageWrites.push(String(key));
      return original.call(this, key, value);
    };
  });
  deadline = setTimeout(() => {
    report.deadlineExceeded = true;
    context.close({reason: 'Independent receiving deadline exceeded'}).catch(error => report.lifecycleErrors.push(describe(error)));
  }, report.limits.overallMs);

  const originalRows = [['a', '10000000', '10000000', '(0, 0)'], ['b', '10000001', '10000002', '(1, 2)'], ['c', '10000003', '10000003', '(3, 3)']];
  await group('lab-wide', {width: 1280, height: 1000}, 'courses/floating-point-lab.html', async (page, record) => {
    await number(page, null, '0.10000000149011612', 'normal', '0x3dcccccd');
    assert.equal(await page.locator('#number-preset').inputValue(), 'tenth');
    assert.equal(await text(page, '#input-fraction'), '3602879701896397/36028797018963968');
    assert.equal(await text(page, '#stored-fraction'), '13421773/134217728');
    assert.equal(await text(page, '#number-error-fraction'), '53687091/36028797018963968');
    await geometry(page, 'reversed', '-3', originalRows);
    assert.equal(await text(page, '#source-area'), '2516583/4194304');
    assert.equal(await text(page, '#intended-area'), '3/5');
    assert.equal(await text(page, '#left-result'), '1');
    assert.equal(await text(page, '#right-result'), '0');
    assert.equal(await text(page, '#addition-exact'), '1');
    pass(record, 'default input, exact fractions, addition, and original reversed triangle');
    await screenshot(page, record, '01-lab-default-wide.png', '#geometry-output');
    const received = await saveDownload(page, record, '.hero [data-download-lesson]', 'floating-point-from-lab.json', 'floating-point.json', courseBytes);
    actualCourseDownload = received.filename;
    pass(record, 'actual lesson download is byte-identical to the pinned admitted course');

    await number(page, 'tie-lower', '16777216', 'normal', '0x4b800000');
    assert.equal(await text(page, '#neighbor-previous'), '16777215');
    assert.equal(await text(page, '#neighbor-next'), '16777218');
    await number(page, 'tie-upper', '16777220', 'normal', '0x4b800002');
    assert.equal(await text(page, '#neighbor-previous'), '16777218');
    assert.equal(await text(page, '#neighbor-next'), '16777222');
    pass(record, 'both halfway directions and unequal boundary neighbors are displayed');
    await number(page, 'smallest', String(2 ** -149), 'subnormal', '0x00000001');
    assert.equal(await text(page, '#stored-fraction'), '1/' + (1n << 149n));
    await number(page, 'half-smallest', '0', 'zero', '0x00000000');
    await page.locator('#number-input').fill(String(-(2 ** -150)));
    await number(page, null, '−0', 'negative zero', '0x80000000');
    await number(page, 'overflow', '+Infinity', 'infinity', '0x7f800000');
    assert.equal(await text(page, '#neighbor-next'), 'No further value');
    assert.equal(await text(page, '#stored-fraction'), 'Not a finite value: this conversion overflowed.');
    assert.equal(await text(page, '#number-error-fraction'), 'No finite error fraction for an infinite output.');
    pass(record, 'subnormal, zero, signed zero and infinite output remain distinct');
    for (const invalid of ['', '0x10', '1e309']) {
      await page.locator('#number-input').fill(invalid);
      assert.equal(await page.locator('#number-output').isVisible(), false);
      assert.equal(await page.locator('#number-input').getAttribute('aria-invalid'), 'true');
      assert.ok((await text(page, '#number-error')).length > 0);
    }
    await number(page, 'eighth', '0.125', 'normal', '0x3e000000');
    assert.equal(await page.locator('#number-input').getAttribute('aria-invalid'), null);
    assert.equal(await text(page, '#number-error'), '');
    pass(record, 'invalid number text hides stale output and a valid preset recovers');
    await page.locator('#addition-preset').selectOption('exact-control');
    assert.equal(await text(page, '#left-result'), '1');
    assert.equal(await text(page, '#right-result'), '1');
    await page.locator('#addition-preset').selectOption('integer-gap');
    assert.equal(await text(page, '#left-result'), '0');
    assert.equal(await text(page, '#right-result'), '1');
    pass(record, 'addition controls change the actual displayed paths');

    await page.locator('#origin-preset').selectOption('0');
    await geometry(page, 'preserved', '2516583/4194304');
    assert.equal(await text(page, '#stored-area'), await text(page, '#source-area'));
    await page.locator('#origin-input').fill('1e7');
    await geometry(page, 'reversed', '-3', originalRows);
    assert.equal(await page.locator('#origin-preset').inputValue(), 'custom');
    await page.locator('#origin-preset').selectOption('16777216');
    await geometry(page, 'preserved', '4', [['a', '16777216', '16777216', '(0, 0)'], ['b', '16777218', '16777218', '(2, 2)'], ['c', '16777218', '16777220', '(2, 4)']]);
    await page.locator('#origin-preset').selectOption('67108864');
    await geometry(page, 'collapsed', '0', ['a', 'b', 'c'].map(label => [label, '67108864', '67108864', '(0, 0)']));
    pass(record, 'zero, scientific-notation original, deformed and collapsed origin controls');
    await page.locator('#origin-input').fill('');
    assert.equal(await page.locator('#geometry-output').isVisible(), false);
    assert.equal(await page.locator('#download-report').isEnabled(), false);
    assert.equal(await page.locator('#origin-input').getAttribute('aria-invalid'), 'true');
    assert.match(await text(page, '#geometry-error'), /empty field/);
    await activate(page, '#reset-geometry');
    await geometry(page, 'reversed', '-3', originalRows);
    assert.equal(await page.locator('#origin-input').inputValue(), '10000000');
    assert.equal(await page.locator('#unit-exponent').inputValue(), '0');
    assert.equal(await text(page, '#geometry-error'), '');
    pass(record, 'empty origin hides stale geometry, disables report, and resets cleanly');
    await page.locator('#unit-exponent').selectOption('2');
    await geometry(page, 'reversed', '-48');
    assert.equal(await text(page, '#origin-gap'), '4');
    await page.locator('#unit-exponent').selectOption('-2');
    await geometry(page, 'reversed', '-3/16');
    const scaled = await saveDownload(page, record, '#download-report', 'experiment-unit-minus-two.json', 'floating-point-experiment.json', serializeTriangleReport({translation: 10000000, unitExponent: -2}));
    assert.equal(digest(scaled.bytes), pins.reportDownloads.find(item => item.parameters.unitExponent === -2).sha256);
    await activate(page, '#reset-geometry');
    await geometry(page, 'reversed', '-3', originalRows);
    const reset = await saveDownload(page, record, '#download-report', 'experiment-reset.json', 'floating-point-experiment.json', serializeTriangleReport({translation: 10000000, unitExponent: 0}));
    assert.equal(digest(reset.bytes), pins.reportDownloads.find(item => item.parameters.unitExponent === 0).sha256);
    pass(record, 'unit changes and reset produce exact current-state report downloads');
  });

  await group('lab-compact', {width: 390, height: 844}, 'courses/floating-point-lab.html', async (page, record) => {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'experiments');
    await geometry(page, 'reversed', '-3', originalRows);
    await compactLayout(page, record, true);
    await screenshot(page, record, '02-lab-compact-original.png', '#geometry-output');
    await page.locator('#origin-preset').selectOption('67108864');
    await geometry(page, 'collapsed', '0');
    await compactLayout(page, record, true);
    assert.ok((await page.locator('#plot-layer text').allTextContents()).includes('b′, c′'));
    await screenshot(page, record, '03-lab-compact-collapsed.png', '#geometry-output');
    const received = await saveDownload(page, record, 'section[aria-labelledby="practice-heading"] [data-download-lesson]', 'floating-point-from-compact-lab.json', 'floating-point.json', courseBytes);
    actualCourseDownload ??= received.filename;
    pass(record, '390px layout, actual keyboard skip, collapsed labels and second lesson action');
  });

  await group('actual-learner-session', {width: 1280, height: 1000}, 'demo.html', async (page, record) => {
    assert.ok(actualCourseDownload, 'A verified real lab download is required; do not substitute a source file.');
    const importedBytes = await fs.readFile(actualCourseDownload);
    assert.deepEqual(importedBytes, courseBytes, 'The learner must receive the exact actual course download.');
    record.importedFile = {path: path.relative(OUT, actualCourseDownload), bytes: importedBytes.length, sha256: digest(importedBytes)};
    // This dynamically mounted control confirms the current learner has finished initialization.
    await page.locator('#trace-file').waitFor({state: 'attached'});
    const beforePreview = await snapshotLearner(page);
    await page.locator('#deck-file').setInputFiles(actualCourseDownload);
    await page.locator('#deck-preview:not([hidden])').waitFor();
    assert.equal(await text(page, '#deck-preview-title'), course.title);
    assert.match(await text(page, '.deck-preview-count'), /14 questions.*7 concepts/);
    assert.equal(await text(page, '.deck-preview-attribution'), 'Attribution supplied in the deck: ' + course.attribution);
    assert.equal(await text(page, '.deck-preview-license'), 'License supplied in the deck: ' + course.license);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'deck-preview-title');
    assert.deepEqual(await snapshotLearner(page), beforePreview, 'Import preview does not start or replace the lesson.');
    await activate(page, '#start-deck');
    await page.locator('.question-card').waitFor();
    assert.equal(await page.title(), course.title + ' — RecallWeave');
    assert.equal(await text(page, '#step-count'), '0 / 14');
    assert.equal(await page.locator('#deck-preview').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement.matches('[data-choice]')), true);
    pass(record, 'actual downloaded course enters the unchanged importer and waits for explicit Start');
    const answers = [], asked = new Set(), mastery = initialMastery(course.concepts);
    for (let index = 0; index < course.items.length; index += 1) {
      const expectedItem = selectNextItem(course.items, asked, mastery);
      assert.ok(expectedItem, 'The native selector must still have an unseen item.');
      const prompt = await text(page, '#session-content h2');
      assert.equal(prompt, expectedItem.prompt);
      const choices = await page.locator('[data-choice]').evaluateAll(buttons => buttons.map(button => {
        const copy = button.cloneNode(true);
        copy.querySelector('.choice-key')?.remove();
        return {index: Number(button.dataset.choice), text: copy.textContent};
      }));
      assert.deepEqual([...choices].sort((a, b) => a.index - b.index), expectedItem.options.map((value, position) => ({index: position, text: value})), 'Canonical answer values must match displayed option text despite shuffling.');
      const choice = index === 0 ? (expectedItem.answer + 1) % expectedItem.options.length : expectedItem.answer;
      await activate(page, '[data-choice="' + choice + '"]');
      assert.equal(await text(page, '#step-count'), String(index + 1) + ' / 14');
      assert.ok((await text(page, '#feedback-slot')).includes(expectedItem.explanation));
      assert.ok((await text(page, '#feedback-slot')).includes(expectedItem.transfer));
      assert.equal(await page.locator('[data-choice]:not([disabled])').count(), 0);
      assert.equal(await page.locator('[data-choice].incorrect').count(), index === 0 ? 1 : 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'next-button');
      const correct = choice === expectedItem.answer;
      answers.push({item: expectedItem.id, concept: expectedItem.concept, choice, correct});
      asked.add(expectedItem.id);
      mastery[expectedItem.concept] = updateMastery(mastery[expectedItem.concept], correct);
      await activate(page, '#next-button');
    }
    await page.locator('.result-card').waitFor();
    assert.equal(answers.length, 14);
    assert.equal(asked.size, 14);
    assert.equal(await page.locator('.review-item').count(), 14);
    assert.equal(await page.locator('.review-status.needs-review').count(), 1);
    assert.match(await text(page, '#first-try-summary'), /13 of 14/);
    assert.ok((await text(page, '.source-note')).includes(course.attribution));
    assert.ok((await text(page, '.source-note')).includes(course.license));
    const firstSummary = await text(page, '#first-try-summary');
    const originalMasteryMarkup = await page.locator('.mastery-box').innerHTML();
    const missed = course.items.find(item => item.id === answers[0].item);
    const missedReview = page.locator('.review-item').filter({hasText: missed.prompt});
    assert.equal(await missedReview.count(), 1);
    await missedReview.locator('summary').focus();
    await missedReview.locator('summary').press('Enter');
    assert.deepEqual(await missedReview.locator('.review-answers dd').allTextContents(), [missed.options[answers[0].choice], missed.options[missed.answer]]);
    assert.ok((await missedReview.textContent()).includes(missed.transfer));
    assert.equal(await page.locator('[data-reflection-item]').count(), 14);
    assert.deepEqual(await page.locator('[data-reflection-item]').evaluateAll(fields => fields.map(field => field.value)), Array(14).fill(''));
    assert.equal(await page.locator('#application-reflection').inputValue(), '');
    const questionReflection = 'The stored coordinates must be checked after quantization, even when the source triangle has positive area.';
    const applicationReflection = 'I can retain local coordinates and a separate origin instead of first storing both together at binary32 precision.';
    const applicationPrompt = await text(page, '#application-prompt');
    assert.equal(applicationPrompt, 'Choose one connection from this deck and explain how it relates to another idea in your own words.');
    await missedReview.locator('[data-reflection-item]').fill(questionReflection);
    await page.locator('#application-reflection').fill(applicationReflection);
    let reflections = createReflections(course.items);
    reflections = updateReflection(reflections, missed.id, questionReflection);
    reflections = updateApplicationReflection(reflections, applicationReflection);
    record.reflections = {question: {item: missed.id, text: questionReflection}, application: applicationReflection, applicationPrompt};
    await screenshot(page, record, '04-learner-first-review.png', '#first-try-summary');
    await activate(page, '#trace-archive-panel > summary');
    const firstTrace = await saveDownload(page, record, '#save-trace-button', 'learner-first-trace.json', /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
    const firstDocument = JSON.parse(firstTrace.bytes.toString('utf8'));
    assert.deepEqual(firstTrace.bytes, Buffer.from(createTraceArchive({deck: course, answers, mastery, savedAt: firstDocument.savedAt}).text));
    assert.deepEqual(firstDocument.firstAnswers, answers.map(({item, choice}) => ({item, choice})));
    assert.equal(firstDocument.practice, null);
    assert.equal(readTraceArchive(firstTrace.bytes.toString('utf8'), course).summary.correctFirst, 13);
    record.firstAnswers = answers;
    record.firstMastery = mastery;
    pass(record, 'fourteen actual first answers, one correction, review and exact pre-practice trace');
    await activate(page, '#practice-button');
    assert.equal(await text(page, '#session-content h2'), missed.prompt);
    assert.equal(await text(page, '#step-count'), '0 / 1');
    await activate(page, '[data-practice-choice="' + missed.answer + '"]');
    assert.equal(await text(page, '#step-count'), '1 / 1');
    assert.ok((await text(page, '#practice-feedback')).includes(missed.explanation));
    await activate(page, '#practice-next');
    await page.locator('.result-card').waitFor();
    assert.equal(await text(page, '#first-try-summary'), firstSummary);
    assert.equal(await page.locator('.mastery-box').innerHTML(), originalMasteryMarkup);
    assert.equal(await page.locator('.review-status.needs-review').count(), 1);
    assert.match(await text(page, '#practice-status'), /1 of 1 correctly on retry/);
    assert.equal(await page.locator('#practice-button').count(), 0);
    assert.equal(await missedReview.locator('[data-reflection-item]').inputValue(), questionReflection);
    assert.equal(await page.locator('#application-reflection').inputValue(), applicationReflection);
    assert.equal(await text(page, '#application-prompt'), applicationPrompt);
    const review = createReview(course.items, answers);
    const practice = answerPractice(beginPractice(review), missed.id, missed.answer);
    const finalTrace = await saveDownload(page, record, '#save-trace-button', 'learner-practiced-trace.json', /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
    const finalDocument = JSON.parse(finalTrace.bytes.toString('utf8'));
    assert.deepEqual(finalTrace.bytes, Buffer.from(createTraceArchive({deck: course, answers, mastery, practice, savedAt: finalDocument.savedAt}).text));
    assert.deepEqual(finalDocument.firstAnswers, firstDocument.firstAnswers);
    assert.deepEqual(finalDocument.mastery, firstDocument.mastery);
    assert.deepEqual(finalDocument.practice, {answers: [{item: missed.id, choice: missed.answer}]});
    const notes = await saveDownload(page, record, '#save-notes-button', 'learner-study-notes.txt', /^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
    const notesText = notes.bytes.toString('utf8');
    const noteStamp = notesText.match(/^Saved: (.+)$/m)?.[1];
    assert.ok(noteStamp);
    assert.deepEqual(notes.bytes, Buffer.from(createStudyNotes({deck: course, review, mastery, practice, reflections, applicationPrompt, exportedAt: noteStamp}).text));
    assert.ok(notesText.includes('13 of 14 connections correct on the first try.'));
    assert.ok(notesText.includes('Complete: 1 of 1 practice answers recorded; 1 correct on retry.'));
    assert.ok(notesText.includes('Your explanation — reflection, not scored:\n  > ' + questionReflection));
    assert.ok(notesText.includes('YOUR APPLICATION REFLECTION — NOT SCORED\nPrompt: ' + applicationPrompt + '\n  > ' + applicationReflection));
    record.practice = finalDocument.practice;
    pass(record, 'practice preserves first answers/model state and actual reflections; notes and trace exports match the current native codecs');
    await page.setViewportSize({width: 390, height: 844});
    await compactLayout(page, record, false);
    await screenshot(page, record, '05-learner-practiced-compact.png', '#first-try-summary');
    pass(record, 'the real completed lesson remains usable at 390px');
  });
  report.status = report.groups.every(record => record.status === 'passed') ? 'passed' : 'failed';
} catch (error) {
  report.status = 'failed';
  report.error = describe(error);
  for (const record of report.groups.filter(item => item.status === 'running')) {
    record.status = 'failed';
    record.error = describe(error);
    record.finished = new Date().toISOString();
  }
} finally {
  clearTimeout(deadline);
  if (context) {
    try { await context.close(); report.cleanup.browserClosed = true; }
    catch (error) { report.cleanup.browserCloseError = describe(error); report.status = 'failed'; }
  } else report.cleanup.browserStarted = false;
  try {
    report.sourceAfter = await inventory(ROOT);
    report.sourceUnchanged = sourceBefore !== undefined && JSON.stringify(report.sourceAfter) === JSON.stringify(sourceBefore);
    assert.equal(report.sourceUnchanged, true, 'All receiving source bytes must remain unchanged.');
    assert.equal(digest(await fs.readFile(DRIVER)), digest(driverBytes), 'Driver must remain frozen.');
    assert.equal(digest(await fs.readFile(PINS)), digest(pinBytes), 'Pin manifest must remain frozen.');
    assert.equal(digest(await fs.readFile(RUNTIME)), digest(runtimeBytes), 'Reviewed runtime manifest must remain frozen.');
  } catch (error) { report.integrityError = describe(error); report.status = 'failed'; }
  for (const owned of [profile, TMP]) {
    try {
      assert.equal(path.dirname(owned), OUT);
      await fs.rm(owned, {recursive: true, force: true});
      report.cleanup[path.basename(owned)] = 'removed';
    } catch (error) { report.cleanup[path.basename(owned)] = describe(error); report.status = 'failed'; }
  }
  if (report.deadlineExceeded || report.lifecycleErrors.length) report.status = 'failed';
  report.finished = new Date().toISOString();
  report.passedGroups = report.groups.filter(record => record.status === 'passed').length;
  report.failedGroups = report.groups.filter(record => record.status === 'failed').length;
  report.passedChecks = report.groups.reduce((count, record) => count + record.checks.length, 0);
  await fs.writeFile(path.join(OUT, 'receiving.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({status: report.status, passedGroups: report.passedGroups, failedGroups: report.failedGroups, checks: report.passedChecks, sourceUnchanged: report.sourceUnchanged, receipt: path.join(OUT, 'receiving.json')}));
  if (report.status !== 'passed') process.exitCode = 1;
}
