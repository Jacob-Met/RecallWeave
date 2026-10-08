#!/usr/bin/env node
/** Optional real offline receiving: Node, installed Playwright and Chromium. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const output = resolve(option('--output', join(root, 'selection-lab-browser')));
const require = createRequire(import.meta.url);
const { chromium } = require(option('--playwright', 'playwright'));
const native = await import(pathToFileURL(join(root, 'src/knowledge.mjs')));
const { parseDeck, validateDeck } = await import(pathToFileURL(join(root, 'src/deck.mjs')));
const bundled = parseDeck(await readFile(join(root, 'data/deck.json'), 'utf8'));
const sourcePaths = [
  'src/knowledge.mjs', 'src/deck.mjs', 'data/deck.json', 'src/selection-lab.mjs',
  'src/selection-lab-ui.mjs', 'selection-lab.template.html', 'selection-lab.html',
  'tools/build-selection-lab.mjs', 'tools/check_selection_lab_browser.mjs'
];
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'recall-selection-browser-'));
const hash = value => createHash('sha256').update(value).digest('hex');
async function sourceHashes() {
  return Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, hash(await readFile(join(root, path)))])));
}
const receipt = { status: 'running', root, runtime: process.version, sourceBefore: await sourceHashes(), checks: [], downloads: [], pageErrors: [], pageRequests: [] };
let browser;
const mark = name => { receipt.checks.push(name); console.log('PASS ' + name); };
function expected(deck, starting, responses) {
  let mastery = { ...starting };
  const asked = new Set();
  const steps = [];
  for (const [index, syntheticCorrect] of responses.entries()) {
    const question = native.selectNextItem(deck.items, asked, mastery);
    const prior = mastery[question.concept];
    const after = native.updateMastery(prior, syntheticCorrect);
    mastery = { ...mastery, [question.concept]: after };
    asked.add(question.id);
    steps.push({ number: index + 1, questionId: question.id, concept: question.concept, syntheticCorrect, prior, after, nextQuestionId: native.selectNextItem(deck.items, asked, mastery)?.id ?? null });
  }
  return { mastery, asked: [...asked], steps, selected: native.selectNextItem(deck.items, asked, mastery)?.id ?? null };
}

try {
  browser = await chromium.launch({
    executablePath: option('--browser', 'chromium'), headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking'],
    env: { ...process.env, TMPDIR: temporary }, downloadsPath: join(temporary, 'downloads')
  });
  receipt.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => receipt.pageErrors.push(error.message));
  page.on('request', request => receipt.pageRequests.push(request.url()));
  await page.goto(pathToFileURL(join(root, 'selection-lab.html')).href);
  await page.locator('#selected-id').waitFor();
  const initial = native.initialMastery(bundled.concepts);
  async function assertSelection(deck, starting, responses) {
    const wanted = expected(deck, starting, responses);
    assert.equal(await page.locator('#selected-id').innerText(), wanted.selected ?? 'Complete');
    const exact = JSON.parse(await page.locator('#full-precision').textContent());
    assert.deepEqual(exact.current, wanted.mastery);
    assert.deepEqual(exact.steps, wanted.steps);
    return wanted;
  }
  async function download(name, deck, starting, responses) {
    const [item] = await Promise.all([page.waitForEvent('download'), page.locator('#download-experiment').click()]);
    assert.equal(item.suggestedFilename(), 'recallweave-selection-experiment.json');
    const path = join(output, name);
    await item.saveAs(path);
    const raw = await readFile(path);
    const actual = JSON.parse(raw);
    const wanted = expected(deck, starting, responses);
    assert.equal(actual.format, 'recallweave-selection-experiment/1');
    assert.equal(actual.kind, 'synthetic');
    assert.deepEqual(actual.deck, deck);
    assert.deepEqual(actual.model.parameters, native.DEFAULT_BKT);
    assert.deepEqual(actual.starting, starting);
    assert.deepEqual(actual.syntheticResponses, responses);
    assert.deepEqual(actual.steps, wanted.steps);
    assert.deepEqual(actual.current.mastery, wanted.mastery);
    assert.deepEqual(actual.current.asked, wanted.asked);
    assert.equal(actual.current.selectedQuestionId, wanted.selected);
    receipt.downloads.push({ name, bytes: raw.length, sha256: hash(raw), steps: actual.steps.length, title: actual.deck.title });
    return actual;
  }
  await assertSelection(bundled, initial, []);
  await download('initial.json', bundled, initial, []);
  mark('direct-file initial selection and downloaded report match the original native model');

  await page.locator('#simulate-correct').focus();
  await page.keyboard.press('Enter');
  await assertSelection(bundled, initial, [true]);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'selected-heading');
  await page.locator('#undo-step').click();
  await assertSelection(bundled, initial, []);
  await page.locator('#simulate-incorrect').focus();
  await page.keyboard.press('Enter');
  await assertSelection(bundled, initial, [false]);
  await download('alternate-response.json', bundled, initial, [false]);
  mark('keyboard evidence, undo and alternative response retain exact native question and state identity');

  const probability = page.locator('[data-start-concept="photosynthesis"]');
  await probability.fill('-0.3');
  assert.equal(await page.locator('#experiment-content').isVisible(), false);
  assert.equal(await page.locator('#download-experiment').isEnabled(), false);
  await page.locator('#apply-start').click();
  assert.match(await page.locator('#starting-error').innerText(), /finite number/);
  await page.locator('#discard-start').click();
  await assertSelection(bundled, initial, [false]);
  await probability.fill('0.95');
  await page.locator('#apply-start').click();
  const overrides = { ...initial, photosynthesis: 0.95 };
  await assertSelection(bundled, overrides, []);
  await download('changed-starting-assumptions.json', bundled, overrides, []);
  mark('invalid starting edits suspend stale output; discard and explicit apply preserve the declared reset policy');

  const fixture = validateDeck({
    format: 'recallweave-deck/1', title: 'Literal </script><script>globalThis.selectionInjected=true</script> & Ω',
    attribution: 'Original browser fixture <b>literal</b>', license: 'Synthetic fixture only.',
    concepts: ['signals'],
    items: ['first', 'second', 'third'].map(id => ({
      id, concept: 'signals', prerequisites: [], prompt: 'Inspect ' + id,
      options: ['Source option', 'Other option'], answer: 1,
      explanation: 'An authored synthetic explanation.', transfer: 'No learner result is asserted.'
    }))
  });
  const payload = { name: 'literal-author-course.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) };
  await page.locator('#deck-file').setInputFiles(payload);
  await page.locator('#file-preview').waitFor();
  assert.equal(await page.locator('#preview-title').textContent(), fixture.title);
  assert.equal(await page.locator('#active-title').textContent(), bundled.title);
  await download('pending-preview-current-report.json', bundled, overrides, []);
  await page.locator('#cancel-deck').click();
  await assertSelection(bundled, overrides, []);
  await page.locator('#deck-file').setInputFiles(payload);
  await page.locator('#file-preview').waitFor();
  await page.locator('#use-deck').click();
  const fixtureInitial = native.initialMastery(fixture.concepts);
  await assertSelection(fixture, fixtureInitial, []);
  assert.equal(await page.locator('#active-title').textContent(), fixture.title);
  assert.equal(await page.evaluate(() => globalThis.selectionInjected), undefined);
  await download('selected-course-report.json', fixture, fixtureInitial, []);
  mark('real local-file preview, cancel and replacement keep report/course identity and literal embedded text');

  await page.locator('#deck-file').setInputFiles({ name: 'malformed.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('not valid JSON'));
  assert.equal(await page.locator('#file-preview').isVisible(), false);
  await assertSelection(fixture, fixtureInitial, []);
  assert.equal(await page.locator('#download-experiment').isEnabled(), true);
  mark('invalid local course input leaves the active native experiment usable');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#selected-heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(output, 'selection-lab-narrow.png') });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.locator('#selected-heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(output, 'selection-lab-desktop.png') });
  mark('390px and desktop layouts remain usable without document overflow');

  assert.deepEqual(receipt.pageErrors, []);
  assert.ok(receipt.pageRequests.every(url => url.startsWith('file:') || url.startsWith('blob:')));
  receipt.sourceAfter = await sourceHashes();
  assert.deepEqual(receipt.sourceAfter, receipt.sourceBefore);
  mark('all observed page requests are local; source/build bytes and JavaScript exception controls stay clean');
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.error = error.stack ?? String(error);
  console.error(receipt.error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
  await writeFile(join(output, 'browser-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(receipt.status.toUpperCase() + ': ' + receipt.checks.length + ' browser groups; receipt ' + join(output, 'browser-receipt.json'));
}

