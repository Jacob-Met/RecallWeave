#!/usr/bin/env node
'use strict';

// Independent receiving of the root's UI/app/builder composition.
// The author of this driver also authored the codec: this is not independent codec acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

const args = process.argv.slice(2);
function argument(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error('Required argument: ' + name);
  return args[index + 1];
}
const source = path.resolve(argument('--source'));
const pinsFile = path.resolve(argument('--pins'));
const output = path.resolve(argument('--out'));
const chromiumPath = process.env.RECALLWEAVE_REVIEW_CHROMIUM
  || '/workspace/scratch/ae0a1ea0b247/browser-tools/runtime/chromium';
const report = {
  result: 'RUNNING',
  role: 'Independent receiving of the root-authored UI/app/builder hooks; not independent acceptance of the reviewer-authored codec.',
  method: 'Real Chromium, native downloads saved to disk, real selected files, fresh browser contexts, DOM observations and actual completed-trace JSON.',
  controlled_delay: 'Two cases call native File.text() on real selected files and hold delivery of its completed text at an explicitly instrumented promise boundary. No app state is accessed or replaced.',
  source, started_at: new Date().toISOString(), cases: [], downloads: [], browser_errors: [],
  source_pins: {}, screenshots: [], chooser_cancellation_observations: []
};
let server, browser, currentContext, baseUrl, deck, plan, core;
let serial = 0;

async function hash(file) {
  const bytes = await fs.readFile(file);
  return {
    bytes: bytes.length,
    git_blob: crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
}
async function verifyPins(manifest) {
  const required = ['src/app.mjs', 'src/lesson-archive-ui.mjs', 'src/lesson-archive.mjs',
    'tools/make_demo.py', 'demo.html', 'index.html', 'styles.css', 'src/knowledge.mjs', 'data/deck.json'];
  for (const name of required) assert.ok(manifest.files[name], 'Missing expected frozen pin: ' + name);
  const result = {};
  for (const [name, expected] of Object.entries(manifest.files)) {
    const actual = await hash(path.join(source, name));
    assert.equal(actual.git_blob, typeof expected === 'string' ? expected : expected.git_blob, name + ' frozen source mismatch');
    result[name] = actual;
  }
  return result;
}
function nativePlan() {
  const answers = [], steps = [], asked = new Set(), mastery = core.initialMastery(deck.concepts);
  while (answers.length < deck.items.length) {
    const item = core.selectNextItem(deck.items, asked, mastery);
    const choice = answers.length % 2 === 0 ? item.answer : (item.answer + 1) % item.options.length;
    const correct = choice === item.answer;
    const before = {...mastery};
    mastery[item.concept] = core.updateMastery(mastery[item.concept], correct);
    asked.add(item.id);
    const answer = {item: item.id, concept: item.concept, choice, correct};
    answers.push(answer);
    steps.push({item, answer, before, after: {...mastery}});
  }
  return {answers, steps, mastery: {...mastery}};
}
function expectedPrefix(count) {
  return {
    firstAnswers: plan.answers.slice(0, count).map(({item, choice}) => ({item, choice})),
    mastery: count ? plan.steps[count - 1].after : core.initialMastery(deck.concepts)
  };
}
async function check(name, run) {
  const started = Date.now();
  try {
    const evidence = await run();
    report.cases.push({name, result: 'PASS', duration_ms: Date.now() - started, ...evidence});
  } catch (error) {
    report.cases.push({name, result: 'FAIL', duration_ms: Date.now() - started,
      error: error.message, stack: error.stack});
    throw error;
  }
}
async function newPage(mode, phone = false, delay = false) {
  if (currentContext) await currentContext.close();
  currentContext = await browser.newContext({
    acceptDownloads: true, viewport: phone ? {width: 390, height: 844} : {width: 1280, height: 900},
    isMobile: phone, hasTouch: phone, deviceScaleFactor: 1
  });
  await currentContext.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(baseUrl + '/')) return route.abort('blockedbyclient');
    return route.continue();
  });
  if (delay) await currentContext.addInitScript(() => {
    const nativeText = File.prototype.text;
    window.__lessonReviewReadGates = [];
    Object.defineProperty(File.prototype, 'text', {configurable: true, writable: true,
      value: function (...args) {
        const nativeRead = nativeText.apply(this, args);
        if (!this.name.startsWith('held-')) return nativeRead;
        return nativeRead.then(text => new Promise(resolve => {
          window.__lessonReviewReadGates.push({
            name: this.name, nativeReadCompleted: true, released: false,
            release() { this.released = true; resolve(text); }
          });
        }));
      }
    });
  });
  const page = await currentContext.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => report.browser_errors.push({mode, message: error.message}));
  page.on('console', message => {
    if (message.type() === 'error') report.browser_errors.push({mode, message: message.text()});
  });
  await page.goto(mode === 'standalone' ? pathToFileURL(path.join(source, 'demo.html')).href : baseUrl + '/index.html');
  await page.locator('#lesson-archive-panel').waitFor();
  assert.equal(await page.locator('#save-lesson-button').isDisabled(), true, 'Save must be disabled on welcome');
  return page;
}
async function openPanel(page, id) {
  const panel = page.locator('#' + id);
  if (!await panel.evaluate(element => element.open)) await panel.locator('summary').click();
}
async function snapshot(page) {
  return {
    session_html: await page.locator('#session-content').innerHTML(),
    step_count: await page.locator('#step-count').textContent(),
    progress: await page.locator('[role="progressbar"]').getAttribute('aria-valuenow')
  };
}
async function currentQuestion(page, step, orders, feedback = false) {
  const item = plan.steps[step].item;
  assert.equal((await page.locator('#session-content h2').textContent()).trim(), item.prompt);
  const observed = await page.locator('#session-content [data-choice]').evaluateAll(elements =>
    elements.map(element => ({choice: Number(element.dataset.choice), disabled: element.disabled})));
  assert.equal(observed.length, item.options.length);
  assert.ok(observed.every(option => option.disabled === feedback));
  if (orders) assert.deepEqual(observed.map(option => option.choice), orders[item.id], 'Saved display order for ' + item.id);
  if (feedback) assert.equal(await page.locator('#next-button').isEnabled(), true);
  else assert.equal(await page.locator('#next-button').count(), 0);
  return observed.map(option => option.choice);
}
async function answerStep(page, step, orders) {
  await currentQuestion(page, step, orders);
  await page.locator('#session-content [data-choice="' + plan.steps[step].answer.choice + '"]').click();
  await currentQuestion(page, step, orders, true);
  assert.equal((await page.locator('#step-count').textContent()).trim(), (step + 1) + ' / ' + deck.items.length);
}
async function beginPrefix(page, count, phase) {
  await page.locator('#start-button').click();
  for (let step = 0; step < count; step++) {
    await answerStep(page, step);
    if (step < count - 1 || phase === 'question') await page.locator('#next-button').click();
  }
}
async function download(page, type, label) {
  await openPanel(page, type === 'lesson' ? 'lesson-archive-panel' : 'trace-archive-panel');
  const button = type === 'lesson' ? '#save-lesson-button' : '#save-trace-button';
  assert.equal(await page.locator(button).isEnabled(), true);
  const nextDownload = page.waitForEvent('download');
  await page.locator(button).click();
  const file = await nextDownload;
  const filePath = path.join(output, 'downloads', String(++serial).padStart(2, '0') + '-' + label + '.json');
  await file.saveAs(filePath);
  assert.equal(await file.failure(), null);
  assert.match(file.suggestedFilename(), type === 'lesson'
    ? /^recallweave-unfinished-lesson-\d{4}-\d{2}-\d{2}\.json$/
    : /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
  const pin = await hash(filePath);
  const document = JSON.parse(await fs.readFile(filePath, 'utf8'));
  report.downloads.push({label, path: path.relative(output, filePath),
    suggested_filename: file.suggestedFilename(), ...pin});
  return {path: filePath, document, pin};
}
function assertLesson(file, count, phase) {
  assert.equal(file.document.format, 'recallweave.unfinished-lesson');
  assert.equal(file.document.version, 1);
  assert.deepEqual(file.document.deck, deck);
  assert.deepEqual(file.document.model.parameters, core.DEFAULT_BKT);
  const expected = expectedPrefix(count);
  assert.deepEqual(file.document.firstAnswers, expected.firstAnswers);
  assert.deepEqual(file.document.mastery, expected.mastery);
  assert.equal(file.document.presentation.phase, phase);
  assert.equal(file.document.presentation.itemId, plan.steps[phase === 'feedback' ? count - 1 : count].item.id);
}
async function preview(page, file) {
  await openPanel(page, 'lesson-archive-panel');
  const before = await snapshot(page);
  await page.locator('#lesson-file').setInputFiles(file.path);
  await page.locator('#lesson-preview').waitFor({state: 'visible'});
  assert.deepEqual(await snapshot(page), before, 'Preview must not mutate the active session');
  const summary = await page.locator('#lesson-preview-summary').textContent();
  assert.ok(summary.includes(file.document.firstAnswers.length + ' of ' + deck.items.length + ' questions answered'));
  return before;
}
async function complete(page, start, orders) {
  for (let step = start; step < plan.steps.length; step++) {
    await answerStep(page, step, orders);
    await page.locator('#next-button').click();
  }
  await page.locator('.result-card').waitFor();
  assert.equal(await page.locator('#save-lesson-button').isDisabled(), true);
  const file = await download(page, 'trace', 'completed-' + serial);
  assert.equal(file.document.format, 'recallweave.learning-trace');
  assert.deepEqual(file.document.firstAnswers, expectedPrefix(deck.items.length).firstAnswers);
  assert.deepEqual(file.document.mastery, plan.mastery, 'Completed native archive must preserve exact uninterrupted model values');
  assert.equal(file.document.practice, null);
  return file;
}
async function phoneEvidence(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    controls: ['save-lesson-button', 'resume-lesson-confirm', 'resume-lesson-cancel', 'lesson-file'].map(id => {
      const element = document.getElementById(id), rect = element.getBoundingClientRect();
      return {id, hidden: !rect.width || !rect.height, left: rect.left, right: rect.right};
    })
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, 'Phone page must not overflow horizontally');
  for (const control of dimensions.controls.filter(control => !control.hidden)) {
    assert.ok(control.left >= -1 && control.right <= dimensions.viewport + 1, control.id + ' must fit the phone width');
  }
  const filename = label + '.png';
  await page.screenshot({path: path.join(output, filename), fullPage: true});
  report.screenshots.push({path: filename, ...await hash(path.join(output, filename))});
  return dimensions;
}
async function releaseRead(page, index) {
  await page.evaluate(async position => {
    const gate = window.__lessonReviewReadGates[position];
    if (!gate?.nativeReadCompleted) throw new Error('The real file has not finished reading');
    gate.release();
    await new Promise(resolve => requestAnimationFrame(resolve));
  }, index);
}
async function waitStatus(page, pattern) {
  await page.waitForFunction(expression => new RegExp(expression, 'i')
    .test(document.querySelector('#lesson-restore-status').textContent), pattern);
}

(async () => {
  await fs.mkdir(path.join(output, 'downloads'), {recursive: true});
  const manifest = JSON.parse(await fs.readFile(pinsFile, 'utf8'));
  report.source_manifest = manifest;
  report.driver = await hash(__filename);
  report.source_pins = await verifyPins(manifest);
  deck = JSON.parse(await fs.readFile(path.join(source, 'data/deck.json'), 'utf8'));
  assert.ok(deck.items.length >= 4, 'The authored receiving scenario needs at least four native questions');
  core = await import(pathToFileURL(path.join(source, 'src/knowledge.mjs')).href);
  plan = nativePlan();
  report.native_expected = {answers: plan.answers, mastery: plan.mastery};
  const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
    '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml'};
  server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
      const file = path.resolve(source, '.' + pathname);
      if (!file.startsWith(source + path.sep)) throw new Error('Outside source');
      const data = await fs.readFile(file);
      response.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store'});
      response.end(data);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless: true, executablePath: chromiumPath});
  report.chromium = browser.version();
  let questionFile, feedbackFile, emptyFile;

  await check('modular_question_real_download_fresh_preview_explicit_resume_and_completed_trace', async () => {
    let page = await newPage('modular');
    await beginPrefix(page, 2, 'question');
    const original = await snapshot(page);
    const originalOrder = await currentQuestion(page, 2);
    questionFile = await download(page, 'lesson', 'modular-question');
    assertLesson(questionFile, 2, 'question');
    assert.deepEqual(questionFile.document.presentation.optionOrders[plan.steps[2].item.id], originalOrder);
    page = await newPage('modular');
    await preview(page, questionFile);
    await page.locator('#resume-lesson-confirm').click();
    assert.deepEqual(await snapshot(page), original);
    await currentQuestion(page, 2, questionFile.document.presentation.optionOrders);
    const completed = await complete(page, 2, questionFile.document.presentation.optionOrders);
    return {answered_before_save: 2, pending_item: plan.steps[2].item.id,
      saved_mastery: questionFile.document.mastery, completed_archive_sha256: completed.pin.sha256};
  });

  await check('standalone_phone_feedback_real_download_fresh_resume_without_double_update', async () => {
    let page = await newPage('standalone', true);
    await beginPrefix(page, 2, 'feedback');
    const original = await snapshot(page);
    const originalOrder = await currentQuestion(page, 1, undefined, true);
    feedbackFile = await download(page, 'lesson', 'standalone-feedback');
    assertLesson(feedbackFile, 2, 'feedback');
    assert.deepEqual(feedbackFile.document.presentation.optionOrders[plan.steps[1].item.id], originalOrder);
    page = await newPage('standalone', true);
    await preview(page, feedbackFile);
    const dimensions = await phoneEvidence(page, 'standalone-phone-preview');
    await page.locator('#resume-lesson-confirm').click();
    assert.deepEqual(await snapshot(page), original);
    await currentQuestion(page, 1, feedbackFile.document.presentation.optionOrders, true);
    await page.locator('#next-button').click();
    await currentQuestion(page, 2, feedbackFile.document.presentation.optionOrders);
    const completed = await complete(page, 2, feedbackFile.document.presentation.optionOrders);
    return {feedback_item: plan.steps[1].item.id, next_unanswered_item: plan.steps[2].item.id,
      completed_archive_sha256: completed.pin.sha256, phone_dimensions: dimensions};
  });

  await check('started_empty_real_file_crosses_standalone_to_modular_without_skipping_first_question', async () => {
    let page = await newPage('standalone', true);
    await beginPrefix(page, 0, 'question');
    emptyFile = await download(page, 'lesson', 'started-empty');
    assertLesson(emptyFile, 0, 'question');
    page = await newPage('modular');
    await preview(page, emptyFile);
    await page.locator('#resume-lesson-confirm').click();
    await currentQuestion(page, 0, emptyFile.document.presentation.optionOrders);
    assert.equal((await page.locator('#step-count').textContent()).trim(), '0 / ' + deck.items.length);
    await answerStep(page, 0, emptyFile.document.presentation.optionOrders);
    const after = await download(page, 'lesson', 'empty-resumed-first-answer');
    assertLesson(after, 1, 'feedback');
    assert.deepEqual(after.document.presentation.optionOrders, emptyFile.document.presentation.optionOrders);
    return {first_item: plan.steps[0].item.id, initial_mastery: emptyFile.document.mastery,
      exactly_one_answer_after_resume: after.document.firstAnswers};
  });

  const page = await newPage('modular', false, true);
  await beginPrefix(page, 1, 'question');
  const originalCurrent = await download(page, 'lesson', 'current-before-refusals');
  assertLesson(originalCurrent, 1, 'question');
  const preserved = await snapshot(page);

  await check('explicit_cancel_and_altered_source_refusal_preserve_current_lesson', async () => {
    await preview(page, questionFile);
    await page.locator('#resume-lesson-cancel').click();
    await page.locator('#lesson-preview').waitFor({state: 'hidden'});
    assert.deepEqual(await snapshot(page), preserved);
    const altered = structuredClone(questionFile.document);
    altered.deck.items[0].prompt += ' [synthetic changed course source]';
    const alteredPath = path.join(output, 'downloads', 'altered-source.json');
    await fs.writeFile(alteredPath, JSON.stringify(altered) + '\n');
    await page.locator('#lesson-file').setInputFiles(alteredPath);
    await waitStatus(page, 'different course or course version');
    assert.equal(await page.locator('#lesson-preview').isVisible(), false);
    assert.deepEqual(await snapshot(page), preserved);
    return {refusal_status: await page.locator('#lesson-restore-status').textContent(),
      current_answer_count: 1, current_item: plan.steps[1].item.id};
  });

  await check('controlled_older_native_file_read_cannot_replace_newer_preview', async () => {
    const held = path.join(output, 'downloads', 'held-empty-lesson.json');
    await fs.copyFile(emptyFile.path, held);
    await page.locator('#lesson-file').setInputFiles(held);
    await page.waitForFunction(() => window.__lessonReviewReadGates.length === 1);
    await preview(page, questionFile);
    const newerSummary = await page.locator('#lesson-preview-summary').textContent();
    await releaseRead(page, 0);
    assert.equal(await page.locator('#lesson-preview').isVisible(), true);
    assert.equal(await page.locator('#lesson-preview-summary').textContent(), newerSummary);
    assert.deepEqual(await snapshot(page), preserved);
    await page.locator('#resume-lesson-cancel').click();
    return {controlled_delay: true, native_file_read_completed_before_hold: true,
      older_answer_count: 0, retained_newer_answer_count: 2, newer_summary: newerSummary};
  });

  await check('controlled_native_file_read_loses_authority_after_real_learner_answer', async () => {
    const held = path.join(output, 'downloads', 'held-question-lesson.json');
    await fs.copyFile(questionFile.path, held);
    await page.locator('#lesson-file').setInputFiles(held);
    await page.waitForFunction(() => window.__lessonReviewReadGates.length === 2);
    await answerStep(page, 1, originalCurrent.document.presentation.optionOrders);
    const answered = await snapshot(page);
    await releaseRead(page, 1);
    assert.equal(await page.locator('#lesson-preview').isVisible(), false);
    assert.deepEqual(await snapshot(page), answered);
    await waitStatus(page, 'lesson changed');
    const actual = await download(page, 'lesson', 'after-stale-read');
    assertLesson(actual, 2, 'feedback');
    assert.deepEqual(actual.document.presentation.optionOrders, originalCurrent.document.presentation.optionOrders);
    return {controlled_delay: true, current_answer_count: 2,
      preserved_feedback_item: plan.steps[1].item.id, actual_mastery: actual.document.mastery};
  });

  await check('real_next_action_invalidates_preview_and_preserves_own_option_orders', async () => {
    await preview(page, questionFile);
    await page.locator('#next-button').click();
    assert.equal(await page.locator('#lesson-preview').isVisible(), false);
    await currentQuestion(page, 2, originalCurrent.document.presentation.optionOrders);
    await waitStatus(page, 'lesson changed');
    const actual = await download(page, 'lesson', 'after-preview-invalidated');
    assertLesson(actual, 2, 'question');
    assert.deepEqual(actual.document.presentation.optionOrders, originalCurrent.document.presentation.optionOrders);
    return {current_item: plan.steps[2].item.id, actual_first_answers: actual.document.firstAnswers,
      original_option_orders_preserved: true};
  });

  await check('native_trusted_chooser_cancel_invalidates_staged_preview_and_held_file_read', async () => {
    const protocol = await currentContext.newCDPSession(page);
    await page.evaluate(() => {
      window.__lessonReviewChooserCancels = [];
      document.querySelector('#lesson-file').addEventListener('cancel', event => {
        window.__lessonReviewChooserCancels.push({isTrusted: event.isTrusted,
          type: event.type, selectedFiles: [...event.target.files].map(file => file.name)});
      });
    });
    async function cancelChooser(label) {
      const count = await page.evaluate(() => window.__lessonReviewChooserCancels.length);
      const before = {lesson: await snapshot(page), preview_visible: await page.locator('#lesson-preview').isVisible()};
      // The installed native CDP protocol documents cancel:true as emitting the browser's
      // cancellation events while suppressing the external picker. No DOM event is dispatched here.
      await protocol.send('Page.setInterceptFileChooserDialog', {enabled: true, cancel: true});
      await page.locator('#lesson-file').click();
      await page.waitForFunction(previous => window.__lessonReviewChooserCancels.length > previous, count);
      await protocol.send('Page.setInterceptFileChooserDialog', {enabled: false});
      const event = await page.evaluate(index => window.__lessonReviewChooserCancels[index], count);
      const after = {lesson: await snapshot(page), preview_visible: await page.locator('#lesson-preview').isVisible(),
        status: await page.locator('#lesson-restore-status').textContent()};
      report.chooser_cancellation_observations.push({label,
        method: 'Real input click; CDP cancels the native chooser request; browser-originated cancel event required.',
        event, before, after});
      assert.equal(event.isTrusted, true, 'Chooser cancellation must originate in the browser');
      assert.deepEqual(after.lesson, before.lesson, 'Canceling the chooser must preserve the active lesson');
      assert.equal(after.preview_visible, false, 'Canceling the chooser must invalidate a staged preview');
      return event;
    }
    await preview(page, questionFile);
    await cancelChooser('staged-preview');
    const held = path.join(output, 'downloads', 'held-question-lesson.json');
    await page.locator('#lesson-file').setInputFiles(held);
    await page.waitForFunction(() => window.__lessonReviewReadGates.length === 3);
    await cancelChooser('native-read-pending');
    const afterCancel = await snapshot(page);
    await releaseRead(page, 2);
    assert.equal(await page.locator('#lesson-preview').isVisible(), false,
      'Canceled chooser lifetime must reject the older completed read');
    assert.deepEqual(await snapshot(page), afterCancel);
    const actual = await download(page, 'lesson', 'after-native-chooser-cancel');
    assertLesson(actual, 2, 'question');
    assert.deepEqual(actual.document.presentation.optionOrders, originalCurrent.document.presentation.optionOrders);
    await protocol.detach();
    return {native_cancel_events: 2, both_trusted: true, controlled_pending_read_completion: true,
      canceled_read_did_not_stage_preview: true};
  });

  assert.deepEqual(report.browser_errors, [], 'No browser runtime or console errors');
  report.source_after = await verifyPins(manifest);
  assert.deepEqual(report.source_after, report.source_pins);
  report.result = 'PASS';
})().catch(error => {
  report.result = 'FAIL';
  report.error = {message: error.message, stack: error.stack};
  process.exitCode = 1;
}).finally(async () => {
  if (currentContext) await currentContext.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  report.finished_at = new Date().toISOString();
  await fs.mkdir(output, {recursive: true});
  await fs.writeFile(path.join(output, 'independent-ui-receipt.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({result: report.result, cases: report.cases.map(({name, result}) => ({name, result})),
    chromium: report.chromium, downloads: report.downloads.length, errors: report.error,
    receipt: path.join(output, 'independent-ui-receipt.json')}, null, 2));
});
