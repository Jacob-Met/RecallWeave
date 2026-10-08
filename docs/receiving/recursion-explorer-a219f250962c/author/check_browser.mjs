#!/usr/bin/env node
/** Optional actual-browser receiving. Uses an existing Playwright/Chromium installation only. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, mkdtemp, rm, readdir, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const flags = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i]?.startsWith('--') || !process.argv[i + 1]) throw new Error('Use --source DIR --output NEW_DIR --playwright MODULE --browser EXECUTABLE.');
  flags.set(process.argv[i].slice(2), process.argv[i + 1]);
}
for (const key of ['source', 'output', 'playwright', 'browser']) if (!flags.has(key)) throw new Error('Missing --' + key);
const source = path.resolve(flags.get('source')), output = path.resolve(flags.get('output'));
await mkdir(output);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = [
  'courses/recursion-call-stack-core.mjs', 'courses/recursion-call-stack-ui.mjs',
  'courses/recursion-call-stack-explorer.template.html', 'courses/recursion-call-stack-explorer.html',
  'courses/recursion-call-stack.json', 'tools/build_recursion_call_stack.mjs'
];
const sourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, hash(await readFile(path.join(source, file)))])));
const profile = await mkdtemp(path.join(output, 'profile-'));
const receipt = {source, sourceHashes, cases: [], requests: [], pageErrors: [], downloads: [], screenshotHashes: {}, startedAt: new Date().toISOString()};
let context;
const failures = [];
async function download(page, button, filename) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', {name: button, exact: true}).click();
  const saved = await pending;
  const destination = path.join(output, filename);
  await saved.saveAs(destination);
  const bytes = await readFile(destination);
  receipt.downloads.push({filename, suggestedFilename: saved.suggestedFilename(), bytes: bytes.length, sha256: hash(bytes)});
  return JSON.parse(bytes.toString('utf8'));
}
async function visible(page) {
  return page.evaluate(() => ({
    label: document.getElementById('run-label').textContent,
    step: document.getElementById('step-position').textContent,
    event: document.getElementById('event-message').textContent,
    result: document.getElementById('result').textContent,
    counters: Object.fromEntries(['calls', 'computedCalls', 'cacheHits', 'returnedCalls', 'activeDepth', 'maxDepth'].map(key => [key, document.getElementById('count-' + key).textContent])),
    frames: [...document.querySelectorAll('#stack .frame')].map(node => node.textContent),
    cache: document.getElementById('cache-values').textContent,
    returns: [...document.querySelectorAll('#returned-values button')].map(node => node.textContent)
  }));
}
async function setup(page, algorithm, input) {
  await page.getByLabel('Algorithm', {exact: true}).selectOption(algorithm);
  await page.getByLabel('Input n', {exact: true}).fill(String(input));
  assert.equal(await page.getByRole('button', {name: 'Download this trace (.json)', exact: true}).isDisabled(), true);
  await page.getByRole('button', {name: 'Run trace', exact: true}).click();
}
async function screenshot(page, filename) {
  await page.screenshot({path: path.join(output, filename), fullPage: true});
  receipt.screenshotHashes[filename] = hash(await readFile(path.join(output, filename)));
}
async function group(name, fn) {
  try {
    const data = await fn();
    receipt.cases.push({name, status: 'pass', data});
  } catch (error) {
    failures.push(error);
    receipt.cases.push({name, status: 'fail', error: String(error.stack ?? error)});
  }
}
try {
  const {chromium} = await import(pathToFileURL(path.resolve(flags.get('playwright'))).href);
  context = await chromium.launchPersistentContext(profile, {
    executablePath: path.resolve(flags.get('browser')), headless: true,
    viewport: {width: 1280, height: 960}, acceptDownloads: true,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run']
  });
  await context.route(/^https?:/, route => {
    receipt.requests.push({url: route.request().url(), action: 'aborted before network'});
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => receipt.pageErrors.push(String(error)));
  const url = pathToFileURL(path.join(source, 'courses/recursion-call-stack-explorer.html')).href;
  const open = async () => { await page.goto(url); await page.getByText('Factorial · n = 4', {exact: true}).waitFor(); };
  await group('desktop direct-file factorial: suspended work, keyboard step, reversal and actual trace download', async () => {
    await open();
    const initial = await visible(page);
    assert.equal(initial.counters.calls, '0');
    assert.equal(initial.result, 'pending');
    await page.getByRole('button', {name: 'Next', exact: true}).focus();
    await page.keyboard.press('Space');
    assert.equal((await visible(page)).counters.calls, '1');
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    const suspended = await visible(page);
    assert.ok(suspended.frames[0].includes('4 × factorial(3)'));
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    const enteredChild = await visible(page);
    assert.equal(enteredChild.counters.activeDepth, '2');
    await page.getByRole('button', {name: 'Previous', exact: true}).click();
    assert.deepEqual(await visible(page), suspended);
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    assert.deepEqual(await visible(page), enteredChild);
    await screenshot(page, 'desktop-stack.png');
    await page.getByRole('button', {name: 'Run to end', exact: true}).click();
    const end = await visible(page);
    assert.equal(end.result, '24');
    assert.deepEqual(end.counters, {calls: '5', computedCalls: '5', cacheHits: '0', returnedCalls: '5', activeDepth: '0', maxDepth: '5'});
    assert.deepEqual(end.returns.map(text => text.match(/factorial\((\d+)\)/)[1]), ['0', '1', '2', '3', '4']);
    const saved = await download(page, 'Download this trace (.json)', 'factorial4-complete.json');
    assert.equal(saved.format, 'recallweave-recursion-trace/1');
    assert.equal(saved.selectedState.result, end.result);
    assert.equal(saved.selectedStep, saved.steps.length - 1);
    assert.deepEqual(saved.selectedState, saved.steps[saved.selectedStep]);
    return {initial, suspended, enteredChild, completed: end, exportedSelectedStep: saved.selectedStep};
  });
  await group('memoized Fibonacci: exact completed comparison, cache-hit frame, backward identity and fresh run', async () => {
    await open();
    await setup(page, 'memo-fibonacci', 5);
    assert.equal((await visible(page)).cache, 'Empty. Completed values will be saved here, including base cases.');
    await page.getByRole('button', {name: 'Run to end', exact: true}).click();
    const end = await visible(page);
    assert.equal(end.result, '5');
    assert.deepEqual(end.counters, {calls: '9', computedCalls: '6', cacheHits: '3', returnedCalls: '9', activeDepth: '0', maxDepth: '5'});
    const comparison = await page.locator('#comparison-rows tr').allTextContents();
    const values = await page.locator('#comparison-rows tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('td')].map(node => node.textContent)));
    assert.deepEqual(values, [['15', '15', '0', '5', '5'], ['9', '6', '3', '5', '5']]);
    const saved = await download(page, 'Download this trace (.json)', 'memo5-complete.json');
    const hit = saved.steps.find(step => step.event.kind === 'cache-hit');
    await page.getByLabel('Jump to event', {exact: true}).selectOption(String(hit.index));
    const displayedHit = await visible(page);
    assert.ok(displayedHit.frames[0].includes('return cached 1'));
    assert.equal(displayedHit.counters.cacheHits, '1');
    const partial = await download(page, 'Download this trace (.json)', 'memo5-cache-hit.json');
    assert.equal(partial.selectedStep, hit.index);
    assert.deepEqual(partial.selectedState, hit);
    await page.getByRole('button', {name: 'Previous', exact: true}).click();
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    assert.deepEqual(await visible(page), displayedHit);
    await page.getByRole('button', {name: 'Run trace', exact: true}).click();
    const fresh = await visible(page);
    assert.equal(fresh.counters.calls, '0');
    assert.equal(fresh.result, 'pending');
    assert.ok(fresh.cache.startsWith('Empty.'));
    const freshSaved = await download(page, 'Download this trace (.json)', 'memo5-fresh-cursor.json');
    assert.equal(freshSaved.selectedStep, 0);
    assert.deepEqual(freshSaved.selectedState.cache, []);
    assert.equal(freshSaved.selectedState.result, null);
    return {completed: end, comparison, selectedCacheHit: displayedHit, fresh};
  });
  await group('invalid setup clears prior trace; both base conventions and maximum input work in actual UI', async () => {
    await open();
    const invalid = ['', '11', '-1', '1.5', '1e1', '01', '1x'];
    for (const input of invalid) {
      await page.getByLabel('Input n', {exact: true}).fill(input);
      await page.getByRole('button', {name: 'Run trace', exact: true}).click();
      assert.match(await page.getByRole('alert').textContent(), /whole number from 0 to 10/);
      assert.equal(await page.getByRole('button', {name: 'Download this trace (.json)', exact: true}).isDisabled(), true);
      assert.equal(await page.getByRole('button', {name: 'Next', exact: true}).isDisabled(), true);
      assert.equal((await visible(page)).result, 'pending');
      assert.equal((await visible(page)).frames.length, 0);
    }
    const cases = [];
    for (const [algorithm, n, result, calls, maxDepth] of [
      ['factorial', 0, '1', '1', '1'], ['fibonacci', 0, '0', '1', '1'],
      ['memo-fibonacci', 1, '1', '1', '1'], ['fibonacci', 10, '55', '177', '10']
    ]) {
      await setup(page, algorithm, n);
      await page.getByRole('button', {name: 'Run to end', exact: true}).click();
      const state = await visible(page);
      assert.equal(state.result, result);
      assert.equal(state.counters.calls, calls);
      assert.equal(state.counters.maxDepth, maxDepth);
      cases.push(state);
    }
    const largest = await download(page, 'Download this trace (.json)', 'fibonacci10-complete.json');
    assert.equal(largest.steps.length, 708);
    assert.equal(largest.selectedState.counters.calls, 177);
    return {invalid, cases, largestSnapshots: largest.steps.length};
  });
  await group('390px file layout, exact course download and no persistent run after reload', async () => {
    await page.setViewportSize({width: 390, height: 844});
    await open();
    await setup(page, 'memo-fibonacci', 5);
    for (let i = 0; i < 7; i++) await page.getByRole('button', {name: 'Next', exact: true}).click();
    const phone = await visible(page);
    const dimensions = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
    assert.ok(dimensions.scrollWidth <= dimensions.width);
    await screenshot(page, 'phone-stack.png');
    const course = await download(page, 'Download course (.json)', 'recursion-course.json');
    const actualBytes = await readFile(path.join(output, 'recursion-course.json'), 'utf8');
    assert.equal(actualBytes, await readFile(path.join(source, 'courses/recursion-call-stack.json'), 'utf8'));
    assert.equal(course.format, 'recallweave-deck/1');
    assert.equal(course.items.length, 12);
    await page.reload();
    await page.getByText('Factorial · n = 4', {exact: true}).waitFor();
    const reloaded = await visible(page);
    assert.equal(reloaded.counters.calls, '0');
    assert.equal(reloaded.result, 'pending');
    return {phone, dimensions, courseTitle: course.title, questionCount: course.items.length, reload: reloaded};
  });
  assert.deepEqual(receipt.pageErrors, []);
  assert.deepEqual(receipt.requests, []);
} catch (error) {
  failures.push(error);
  receipt.fatal = String(error.stack ?? error);
} finally {
  if (context) await context.close();
  await rm(profile, {recursive: true, force: true});
  receipt.profileRemoved = true;
  receipt.completedAt = new Date().toISOString();
  receipt.sourceAfter = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, hash(await readFile(path.join(source, file)))])));
  assert.deepEqual(receipt.sourceAfter, sourceHashes);
  receipt.passed = failures.length === 0;
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
}
console.log(JSON.stringify({passed: receipt.passed, cases: receipt.cases.map(({name, status}) => ({name, status})), pageErrors: receipt.pageErrors, requests: receipt.requests, sourceUnchanged: true, output}, null, 2));
if (failures.length) process.exitCode = 1;
