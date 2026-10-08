// SPDX-License-Identifier: MIT
// Independent consumer acceptance for the frozen membrane course on merged RecallWeave.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { chromium } from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const [sourceRoot, deckPath, out, baseUrl, runtimeRoot] = process.argv.slice(2);
const deckBytes = await fs.readFile(deckPath);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(deckBytes), 'b9f0c657dee8d5bd2dd10cfed8d8205b464473a6b46f707c1336363dc170f800');
const deck = JSON.parse(deckBytes);
const byPrompt = new Map(deck.items.map(item => [item.prompt, item]));
const canonicalAnswers = {'ms-1':2,'ms-2':0,'ms-3':3,'pt-1':1,'pt-2':2,'pt-3':1,'os-1':3,'os-2':0,'os-3':2,'at-1':3,'at-2':1,'at-3':0};
assert.equal(byPrompt.size, 12);
for (const item of deck.items) assert.equal(item.answer, canonicalAnswers[item.id]);
const receipt = {
  schema: 'recallweave-membrane-browser-receiving/1',
  started_at: new Date().toISOString(),
  source_commit: 'd8a9ff81e8e5290e8daad5b4af957d4eddc0ee74',
  source_tree: '2d6b3849fe9efe0d38f8c3cd62588fb9477d328d',
  input_sha256: sha(deckBytes),
  driver_sha256: sha(await fs.readFile(new URL(import.meta.url))),
  groups: [],
};
await fs.mkdir(out, {recursive: true});
const browser = await chromium.launch({
  executablePath: '/workspace/scratch/3e50c5ad22c5/production/browser/chromium',
  headless: true,
  downloadsPath: path.join(runtimeRoot, 'downloads'),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
receipt.browser_version = browser.version();

function currentFocus(page) {
  return page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id || '',
    text: (document.activeElement?.textContent || '').trim().slice(0, 120),
  }));
}
async function keyboardReach(page, locator, group, label, limit = 48) {
  const steps = [];
  for (let step = 0; step < limit; step++) {
    if (await locator.evaluate(node => node === document.activeElement)) {
      group.keyboard.push({label, tabs: steps.length, final: await currentFocus(page)});
      return;
    }
    steps.push(await currentFocus(page));
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard did not reach ' + label + ': ' + JSON.stringify(steps));
}
async function activate(page, locator, keyboard, group, label) {
  if (keyboard) {
    await keyboardReach(page, locator, group, label);
    await page.keyboard.press('Enter');
  } else {
    await locator.click();
  }
}
async function checkWidth(page, group, stage) {
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  group.width_checks.push({stage, ...size});
  assert.ok(Math.max(size.document, size.body) <= size.viewport + 1, stage + ' horizontal overflow: ' + JSON.stringify(size));
}
async function displayedOptions(page) {
  return page.locator('.choices .choice').evaluateAll(nodes => nodes.map(node => {
    const clone = node.cloneNode(true);
    clone.querySelector('.choice-key')?.remove();
    return clone.textContent.trim();
  }));
}
async function answerVisible(page, item, choice, keyboard, group, stage) {
  const options = await displayedOptions(page);
  assert.equal(options.length, 4);
  assert.deepEqual([...options].sort(), [...item.options].sort());
  const displayed = options.indexOf(item.options[choice]);
  assert.ok(displayed >= 0);
  const order = options.map(option => item.options.indexOf(option));
  group.option_orders.push({stage, id: item.id, canonical_choice: choice, displayed_choice: displayed, order});
  await activate(page, page.locator('.choices .choice').nth(displayed), keyboard, group, stage + ' answer ' + item.id);
}
async function reviewSnapshot(page) {
  return page.evaluate(() => ({
    summary: document.querySelector('#first-try-summary')?.textContent,
    mastery: [...document.querySelectorAll('.mastery-row')].map(row => ({
      concept: row.firstElementChild.textContent,
      percent: row.querySelector('output').textContent,
      width: row.querySelector('.mastery-meter span').style.width,
    })),
    rows: [...document.querySelectorAll('.review-item')].map(row => ({
      prompt: row.querySelector('.review-prompt').textContent,
      first: row.querySelector('.review-answers > div:first-child dd').textContent,
      correct: row.querySelector('.review-answers > div:last-child dd').textContent,
      status: row.querySelector('.review-status').textContent,
      explanation: row.querySelector('.review-body > p').textContent,
      transfer: row.querySelector('.review-transfer').textContent,
    })),
  }));
}
function assertReview(snapshot, misses, chosen) {
  assert.equal(snapshot.rows.length, 12);
  assert.ok(snapshot.summary.includes((12 - misses.size) + ' of 12'));
  assert.deepEqual(snapshot.mastery.map(row => row.concept), deck.concepts);
  const observed = new Set();
  for (const row of snapshot.rows) {
    const item = byPrompt.get(row.prompt);
    assert.ok(item, 'Unknown review prompt');
    assert.ok(!observed.has(item.id), 'Duplicate review prompt');
    observed.add(item.id);
    assert.equal(row.first, item.options[chosen[item.id]]);
    assert.equal(row.correct, item.options[canonicalAnswers[item.id]]);
    assert.equal(row.explanation, item.explanation);
    assert.equal(row.transfer, 'Apply the idea: ' + item.transfer);
    assert.equal(row.status, (misses.has(item.id) ? 'Needs review' : 'Correct') + ' · first try');
  }
  assert.equal(observed.size, 12);
}
function assertNotes(text, misses, chosen, practiced, status) {
  assert.ok(text.startsWith('RecallWeave — study notes\n' + deck.title + '\n'));
  assert.ok(text.includes((12 - misses.size) + ' of 12 connections correct on the first try.'));
  assert.ok(text.includes(deck.attribution));
  assert.ok(text.includes(deck.license));
  assert.ok(text.includes('Practice does not change the first-session estimates.'));
  assert.equal((text.match(/Your first answer: /g) || []).length, 12);
  assert.equal((text.match(/Practice result: correct on retry/g) || []).length, practiced.size);
  for (const item of deck.items) {
    const start = text.indexOf(item.prompt);
    assert.ok(start >= 0);
    const next = text.indexOf('\n\n', start);
    const block = text.slice(start, next < 0 ? text.length : next);
    assert.ok(block.includes('Your first answer: ' + item.options[chosen[item.id]]), 'First answer ' + item.id);
    assert.ok(block.includes('First try: ' + (misses.has(item.id) ? 'needs review' : 'correct')), 'First result ' + item.id);
    assert.ok(block.includes('Correct answer: ' + item.options[canonicalAnswers[item.id]]), 'Correct answer ' + item.id);
    assert.ok(block.includes('Explanation: ' + item.explanation), 'Explanation ' + item.id);
    assert.ok(block.includes('Apply the idea: ' + item.transfer), 'Transfer ' + item.id);
    if (practiced.has(item.id)) {
      assert.ok(block.includes('Practice answer: ' + item.options[canonicalAnswers[item.id]]), 'Practice answer ' + item.id);
      assert.ok(block.includes('Practice result: correct on retry'), 'Practice outcome ' + item.id);
    } else if (misses.has(item.id)) {
      assert.ok(block.includes('Practice answer: not recorded.'), 'Pending practice ' + item.id);
    } else {
      assert.ok(!block.includes('Practice answer:'), 'Unexpected practice ' + item.id);
    }
  }
  if (status === 'complete') assert.ok(text.includes('Complete: ' + misses.size + ' of ' + misses.size + ' practice answers recorded; ' + misses.size + ' correct on retry.'));
  else assert.ok(text.includes('Not started. ' + misses.size + ' missed connections are available for practice.'));
  return text.split('ESTIMATED MASTERY — MODEL STATE, NOT A GRADE\n')[1].split('\n\nPRACTICE')[0];
}
async function downloadNotes(page, group, keyboard, misses, chosen, practiced, status) {
  const pending = page.waitForEvent('download');
  await activate(page, page.locator('#save-notes-button'), keyboard, group, 'download ' + status + ' notes');
  const download = await pending;
  assert.equal(await download.failure(), null);
  const name = group.id + '-' + status + '-study-notes.txt';
  const destination = path.join(out, name);
  await download.saveAs(destination);
  const bytes = await fs.readFile(destination);
  const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const mastery = assertNotes(text, misses, chosen, practiced, status);
  group.downloads.push({
    status, path: name, suggested_filename: download.suggestedFilename(),
    bytes: bytes.length, sha256: sha(bytes),
    unicode_characters: [...new Set([...text].filter(char => char.codePointAt(0) > 127))].sort(),
  });
  return mastery;
}

try {
  const cases = [
    {id: 'modular-desktop', url: baseUrl + '/index.html', viewport: {width:1280,height:900}, keyboard:false, misses:['ms-1','pt-2','os-2','at-3']},
    {id: 'standalone-mobile-keyboard', url: pathToFileURL(path.join(sourceRoot, 'demo.html')).href, viewport: {width:390,height:844}, keyboard:true, misses:['ms-3','os-3','at-2']},
  ];
  for (const fixture of cases) {
    const group = {
      id: fixture.id, viewport: fixture.viewport, keyboard_only: fixture.keyboard,
      deliberate_misses: fixture.misses, first_order: [], practice_order: [],
      option_orders: [], keyboard: [], width_checks: [], downloads: [],
      requests: [], page_errors: [], console_errors: [], passed: false,
    };
    receipt.groups.push(group);
    const context = await browser.newContext({viewport: fixture.viewport, acceptDownloads: true});
    if (fixture.keyboard) await context.setOffline(true);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('request', request => group.requests.push({url:request.url(), method:request.method()}));
    page.on('pageerror', error => group.page_errors.push(String(error)));
    page.on('console', event => { if (event.type() === 'error') group.console_errors.push(event.text()); });
    const misses = new Set(fixture.misses);
    const chosen = Object.fromEntries(deck.items.map(item => [item.id, misses.has(item.id) ? (canonicalAnswers[item.id] + 1) % 4 : canonicalAnswers[item.id]]));
    await page.goto(fixture.url);
    await page.locator('#trace-archive button').first().waitFor({state:'attached'});
    const initialWelcome = await page.locator('#session-content').innerHTML();
    const initialDescription = await page.locator('#lesson-description').textContent();
    if (fixture.keyboard) {
      await keyboardReach(page, page.locator('#deck-file'), group, 'local deck file input');
      const selected = page.waitForEvent('filechooser');
      await page.keyboard.press('Enter');
      await (await selected).setFiles(deckPath);
    } else {
      await page.locator('#deck-file').setInputFiles(deckPath);
    }
    await page.locator('#deck-preview-title').waitFor({state:'visible'});
    assert.equal(await page.locator('#deck-preview-title').textContent(), deck.title);
    assert.ok((await page.locator('.deck-preview-count').textContent()).includes('12 questions · 4 concepts'));
    assert.equal(await page.locator('.deck-preview-attribution').textContent(), 'Attribution supplied in the deck: ' + deck.attribution);
    assert.equal(await page.locator('.deck-preview-license').textContent(), 'License supplied in the deck: ' + deck.license);
    assert.equal(await page.locator('#deck-preview li').count(), 12);
    assert.equal(await page.locator('#session-content').innerHTML(), initialWelcome);
    assert.equal(await page.locator('#lesson-description').textContent(), initialDescription);
    group.preview_preserved_session = true;
    await checkWidth(page, group, 'preview');
    await page.locator('#deck-preview-title').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out, group.id + '-preview.png')});
    await activate(page, page.locator('#start-deck'), fixture.keyboard, group, 'explicit start selected course');
    await page.locator('#deck-preview').waitFor({state:'hidden'});
    assert.equal(await page.locator('#lesson-description').textContent(), deck.title);
    assert.equal(await page.locator('#lesson-size').textContent(), '12 challenges');
    assert.equal(await page.title(), deck.title + ' — RecallWeave');
    assert.deepEqual(await page.locator('#lesson-map .deck-concept').allTextContents(), deck.concepts);
    await activate(page, page.locator('#start-button'), fixture.keyboard, group, 'start lesson');
    for (let i = 0; i < 12; i++) {
      const prompt = await page.locator('.question-card h2').textContent();
      const item = byPrompt.get(prompt);
      assert.ok(item, 'Unexpected question: ' + prompt);
      assert.ok(!group.first_order.includes(item.id), 'Repeated first item ' + item.id);
      group.first_order.push(item.id);
      await answerVisible(page, item, chosen[item.id], fixture.keyboard, group, 'first');
      const feedback = await page.locator('#feedback-slot').textContent();
      assert.ok(feedback.includes(item.explanation));
      assert.ok(feedback.includes(item.transfer));
      if (i === 0 || i === 11) await checkWidth(page, group, 'first-' + item.id);
      await activate(page, page.locator('#next-button'), fixture.keyboard, group, 'next first question');
    }
    await page.locator('#first-try-summary').waitFor({state:'visible'});
    const originalReview = await reviewSnapshot(page);
    assertReview(originalReview, misses, chosen);
    group.first_snapshot = originalReview;
    await checkWidth(page, group, 'first review');
    const noPracticeMastery = await downloadNotes(page, group, fixture.keyboard, misses, chosen, new Set(), 'not-started');
    await activate(page, page.locator('#practice-button'), fixture.keyboard, group, 'begin practice');
    const practiced = new Set();
    while (practiced.size < misses.size) {
      const prompt = await page.locator('.practice-card h2').textContent();
      const item = byPrompt.get(prompt);
      assert.ok(item && misses.has(item.id));
      assert.ok(!practiced.has(item.id), 'Repeated practice item ' + item.id);
      await answerVisible(page, item, canonicalAnswers[item.id], fixture.keyboard, group, 'practice');
      const feedback = await page.locator('#practice-feedback').textContent();
      assert.ok(feedback.includes(item.options[canonicalAnswers[item.id]]));
      assert.ok(feedback.includes(item.explanation));
      assert.ok(feedback.includes(item.transfer));
      practiced.add(item.id);
      group.practice_order.push(item.id);
      if (practiced.size === 1) {
        await activate(page, page.locator('#back-to-review'), fixture.keyboard, group, 'pause to learning trace');
        assert.deepEqual(await reviewSnapshot(page), originalReview);
        assert.ok((await page.locator('#practice-status').textContent()).includes('Practice paused: 1 of ' + misses.size));
        group.paused_preserved_first_answers_and_visible_estimates = true;
        await activate(page, page.locator('#practice-button'), fixture.keyboard, group, 'resume practice');
      } else {
        await activate(page, page.locator('#practice-next'), fixture.keyboard, group, 'advance practice');
      }
    }
    await page.locator('#first-try-summary').waitFor({state:'visible'});
    assert.deepEqual(await reviewSnapshot(page), originalReview);
    assert.equal(await page.locator('.review-practice-answer').count(), misses.size);
    assert.ok((await page.locator('#practice-status').textContent()).includes('You answered ' + misses.size + ' of ' + misses.size + ' correctly on retry.'));
    assert.equal(await page.locator('#practice-button').count(), 0);
    const completedMastery = await downloadNotes(page, group, fixture.keyboard, misses, chosen, practiced, 'complete');
    assert.equal(completedMastery, noPracticeMastery);
    group.practice_preserved_first_answers_and_visible_estimates = true;
    group.notes_preserved_first_estimates_exact_text = true;
    await checkWidth(page, group, 'completed review');
    await page.locator('.result-card h2').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out, group.id + '-completed.png')});
    group.permuted_first_items = group.option_orders.filter(row => row.stage === 'first' && row.order.some((x,i) => x !== i)).length;
    assert.deepEqual(group.page_errors, []);
    assert.ok(group.requests.every(request => fixture.keyboard ? request.url.startsWith('file:') : request.url.startsWith(baseUrl + '/')), 'Unexpected external request');
    group.passed = true;
    console.log(JSON.stringify({group:group.id,passed:true,first:group.first_order.length,practice:group.practice_order.length,downloads:group.downloads.length,permuted:group.permuted_first_items}));
    await context.close();
  }
  receipt.passed = true;
} catch (error) {
  receipt.passed = false;
  receipt.error = {name:error.name, message:error.message, stack:error.stack};
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  receipt.finished_at = new Date().toISOString();
  await fs.writeFile(path.join(out, 'browser-receipt.json'), JSON.stringify(receipt,null,2) + '\n');
  await browser.close();
}
