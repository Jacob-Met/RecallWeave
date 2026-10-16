#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index], value = process.argv[index + 1];
  if (!['--repo', '--control-dir', '--output', '--puppeteer', '--chrome', '--mode'].includes(key) || !value || options.has(key)) {
    throw Error('Use --output DIR [--repo DIR] [--control-dir DIR] [--puppeteer MODULE] --chrome PATH [--mode full|encoding-only].');
  }
  options.set(key, value);
}
if (!options.has('--output') || !options.has('--chrome')) throw Error('--output and --chrome are required.');
const mode = options.get('--mode') || 'full';
if (!['full', 'encoding-only'].includes(mode)) throw Error('--mode must be full or encoding-only.');
const encodingGroup = 'zero and one UTF-8 BOM preserve exact JSON; two initial BOMs refuse the complete bank';
const repo = fs.realpathSync(options.get('--repo') || path.join(__dirname, '..'));
const control = fs.realpathSync(options.get('--control-dir') || repo);
const out = path.resolve(options.get('--output'));
if (fs.existsSync(out)) throw Error('Output already exists; preserve the prior run and choose a fresh directory.');
const free = fs.statfsSync(path.dirname(out));
if (free.bavail * free.bsize < 67108864) throw Error('Less than 64 MiB is free; native browser qualification is held.');
const puppeteer = require(options.get('--puppeteer') || 'puppeteer');
fs.mkdirSync(out); fs.mkdirSync(path.join(out, 'fixtures')); fs.mkdirSync(path.join(out, 'downloads'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (condition, name) => {
  for (let attempt = 0; attempt < 200; attempt++) { if (await condition()) return; await pause(50); }
  throw Error('Timed out: ' + name);
};
const metadata = { title: 'Read an event log', attribution: 'Original synthetic receiver fixture; no learner data.', license: 'Synthetic qualification fixture.' };
const items = [
  { id: 'observe-1', concept: 'observation', prerequisites: [], prompt: 'Which line records an observation, not a prediction?',
    options: ['The next step will fail.', 'The log says "ready" at 09:00.'], answer: 1,
    explanation: 'The second line reports a recorded event.\nThe first predicts a later outcome.', transfer: 'Write one recorded observation.' },
  { id: 'order-2', concept: 'sequence', prerequisites: ['observation'], prompt: 'The log has A at 09:00 and B at 09:02. Which is earlier?',
    options: ['A — first event', 'B <later>'], answer: 0, explanation: 'In the authored fixture, 09:00 precedes 09:02.',
    transfer: 'Describe the order without inventing a cause.' }
];
const expected = { format: 'recallweave-deck/1', ...metadata, concepts: ['observation', 'sequence'], items };
const header = ['id', 'concept', 'prompt', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'option_6',
  'correct_option', 'explanation', 'transfer', 'prerequisites'];
function csv(questionItems) {
  return [header, ...questionItems.map(item => [item.id, item.concept, item.prompt,
    ...Array.from({ length: 6 }, (_, number) => item.options[number] || ''),
    String(item.answer + 1), item.explanation, item.transfer, JSON.stringify(item.prerequisites)])]
    .map(row => row.map(cell => '"' + cell.replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
}
const fixtures = {
  'questions.csv': Buffer.from(csv(items)),
  'held.csv': Buffer.from(csv(items.map(item => ({ ...item, id: 'held-' + item.id })))),
  'replacement.csv': Buffer.from(csv(items.map(item => ({ ...item, id: 'replacement-' + item.id })))),
  'malformed.csv': Buffer.from(csv(items) + '"unclosed'),
  'invalid-utf8.csv': Buffer.from([0x69, 0x64, 0x2c, 0xc3, 0x28]),
  'oversized.csv': Buffer.alloc(262145, 0x61)
};
const bom = Buffer.from([0xef, 0xbb, 0xbf]);
fixtures['one-bom.csv'] = Buffer.concat([bom, fixtures['questions.csv']]);
fixtures['two-bom.csv'] = Buffer.concat([bom, bom, fixtures['questions.csv']]);
for (const [name, bytes] of Object.entries(fixtures)) fs.writeFileSync(path.join(out, 'fixtures', name), bytes);
const paths = ['csv-course.html', 'src/deck.mjs', 'src/course-csv.mjs', 'src/course-csv-ui.mjs',
  'templates/csv-course.html', 'tools/build_csv_course.mjs', 'examples/course-question-bank.csv'].map(name => path.join(repo, name));
paths.push(path.join(control, 'author.html'), path.join(control, 'demo.html'));
const before = Object.fromEntries(paths.map(file => [file, hash(fs.readFileSync(file))]));
const receipt = { schema: 'recallweave-course-csv-browser.v2', node: process.version, run_mode: mode, groups: [], source_before: before,
  executable: { path: __filename, sha256: hash(fs.readFileSync(__filename)) }, bom_cases: [],
  fixtures: Object.fromEntries(Object.entries(fixtures).map(([name, bytes]) => [name, { bytes: bytes.length, sha256: hash(bytes) }])),
  blocked_requests: [], page_errors: [], navigations: [], downloads: [], timing_injection: 'Only the real held.csv File.arrayBuffer result is deferred in one local fixture case.' };
let browser, page, primaryDownload;
const starts = [], finishes = [];
async function group(name, action) {
  if (mode === 'encoding-only' && name !== encodingGroup) return;
  try { await action(); receipt.groups.push({ name, ok: true }); }
  catch (error) { receipt.groups.push({ name, ok: false, error: String(error.stack || error) }); }
}
async function checked(condition, label) { assert.equal(await condition(), true, label); }
async function newPage(file) {
  const value = await browser.newPage();
  await value.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const target = pathToFileURL(file).href;
  await value.setRequestInterception(true);
  value.on('request', request => {
    if (request.url() === target || request.url().startsWith('blob:') || request.url().startsWith('data:')) request.continue();
    else { receipt.blocked_requests.push(request.url()); request.abort(); }
  });
  value.on('pageerror', error => receipt.page_errors.push(String(error)));
  await value.goto(target, { waitUntil: 'load' });
  receipt.navigations.push({ requested: target, actual: value.url(), source_sha256: before[file] });
  return value;
}
async function fill(target, selector, text) {
  await target.$eval(selector, element => { element.focus(); element.select(); });
  await target.keyboard.press('Backspace');
  await target.type(selector, text);
}
async function choose(name) {
  const waiting = page.waitForFileChooser();
  await page.click('#choose-csv');
  const chooser = await waiting;
  await chooser.accept([path.join(out, 'fixtures', name)]);
}
async function ready(name = 'questions.csv') {
  await choose(name);
  await until(() => page.$eval('#check-csv', element => !element.disabled), 'CSV read complete');
  await page.click('#check-csv');
  await until(() => page.$eval('#download-course', element => !element.disabled), 'checked preview');
}
async function downloaded(target, selector) {
  const prior = finishes.length;
  await target.click(selector);
  await until(() => finishes.length > prior, 'native download completion');
  const finish = finishes[prior], start = starts.find(entry => entry.guid === finish.guid);
  assert.ok(start);
  const file = path.join(out, 'downloads', start.guid);
  await until(() => fs.existsSync(file), 'native download file');
  const bytes = fs.readFileSync(file);
  receipt.downloads.push({ suggested_filename: start.suggestedFilename, artifact: path.relative(out, file),
    bytes: bytes.length, sha256: hash(bytes), guid: start.guid });
  return { file, bytes, name: start.suggestedFilename };
}
(async () => {
  try {
    browser = await puppeteer.launch({ executablePath: options.get('--chrome'), headless: true,
      userDataDir: path.join(out, 'profile'), args: ['--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--disable-sync', '--disk-cache-size=1048576'] });
    receipt.browser = await browser.version();
    const cdp = await browser.target().createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: path.join(out, 'downloads'), eventsEnabled: true });
    cdp.on('Browser.downloadWillBegin', event => starts.push(event));
    cdp.on('Browser.downloadProgress', event => { if (event.state === 'completed') finishes.push(event); });
    page = await newPage(path.join(repo, 'csv-course.html'));
    await until(() => page.$('#choose-csv'), 'converter mount');
    await group(encodingGroup, async () => {
      for (const [selector, text] of [['#course-title', metadata.title], ['#course-attribution', metadata.attribution],
        ['#course-license', metadata.license]]) await fill(page, selector, text);
      for (const [count, filename] of [[0, 'questions.csv'], [1, 'one-bom.csv'], [2, 'two-bom.csv']]) {
        await choose(filename);
        await until(() => page.$eval('#check-csv', element => !element.disabled), 'BOM fixture read');
        await page.click('#check-csv');
        const accepted = await page.$eval('#download-course', element => !element.disabled);
        const observation = {
          initial_boms: count, filename, input_bytes: fixtures[filename].length, input_sha256: hash(fixtures[filename]),
          accepted, expected_accepted: count < 2, matched_expected: accepted === (count < 2),
          status: await page.$eval('#csv-status', element => element.textContent),
          preview_hidden: await page.$eval('#course-preview', element => element.hidden)
        };
        if (accepted) {
          const actual = await downloaded(page, '#download-course');
          observation.output_bytes = actual.bytes.length;
          observation.output_sha256 = hash(actual.bytes);
          observation.output_artifact = path.relative(out, actual.file);
          assert.equal(actual.bytes.toString(), JSON.stringify(expected, null, 2) + '\n');
        } else {
          assert.equal(observation.preview_hidden, true);
          assert.match(observation.status, /CSV (?:header column|record) /);
        }
        receipt.bom_cases.push(observation);
      }
      assert.deepEqual(receipt.bom_cases.map(observation => observation.accepted), [true, true, false]);
    });
    await group('the visible template control downloads the exact checked-in UTF-8 CSV', async () => {
      const download = await downloaded(page, '#download-csv-template');
      assert.equal(download.name, 'course-question-bank.csv');
      assert.deepEqual(download.bytes, fs.readFileSync(path.join(repo, 'examples/course-question-bank.csv')));
    });
    await group('the complete preview and actual JSON download preserve every authored field', async () => {
      for (const [selector, text] of [['#course-title', metadata.title], ['#course-attribution', metadata.attribution],
        ['#course-license', metadata.license]]) await fill(page, selector, text);
      await ready();
      const prompts = await page.$$eval('.question-card .prompt', nodes => nodes.map(node => node.textContent));
      assert.deepEqual(prompts, items.map(item => item.prompt));
      const answerNumbers = await page.$$eval('.question-card .options', lists =>
        lists.map(list => [...list.children].findIndex(option => option.classList.contains('correct-choice'))));
      assert.deepEqual(answerNumbers, items.map(item => item.answer));
      primaryDownload = await downloaded(page, '#download-course');
      assert.equal(primaryDownload.name, 'recallweave-course.json');
      assert.deepEqual(JSON.parse(primaryDownload.bytes), expected);
      assert.equal(primaryDownload.bytes.toString(), JSON.stringify(expected, null, 2) + '\n');
      await page.screenshot({ path: path.join(out, 'course-desktop.png'), fullPage: true });
    });
    await group('metadata editing retires the prior download until the current data is rechecked', async () => {
      await fill(page, '#course-title', 'Edited course title');
      assert.equal(await page.$eval('#download-course', element => element.disabled), true);
      assert.equal(await page.$eval('#course-preview', element => element.hidden), true);
      await page.click('#check-csv');
      assert.equal(await page.$eval('#preview-title', element => element.textContent), 'Edited course title');
      await fill(page, '#course-title', metadata.title);
      await page.click('#check-csv');
      assert.equal(await page.$eval('#download-course', element => element.disabled), false);
    });
    await group('malformed CSV, invalid UTF-8 and oversized files cannot leave a stale deck downloadable', async () => {
      await choose('malformed.csv');
      await until(() => page.$eval('#check-csv', element => !element.disabled), 'malformed bytes read');
      await page.click('#check-csv');
      assert.match(await page.$eval('#csv-status', element => element.textContent), /no closing quote/);
      assert.equal(await page.$eval('#download-course', element => element.disabled), true);
      await choose('invalid-utf8.csv');
      await until(() => page.$eval('#csv-status', element => /not valid UTF-8/.test(element.textContent)), 'fatal UTF-8 refusal');
      assert.equal(await page.$eval('#check-csv', element => element.disabled), true);
      await choose('oversized.csv');
      await until(() => page.$eval('#csv-status', element => /no larger than 256 KiB/.test(element.textContent)), 'file byte-cap refusal');
      assert.equal(await page.$eval('#download-course', element => element.disabled), true);
      assert.equal(await page.$eval('#course-title', element => element.value), metadata.title);
    });
    await group('a late real file read cannot replace a newer chosen source', async () => {
      await page.evaluate(() => {
        const original = File.prototype.arrayBuffer;
        File.prototype.arrayBuffer = function () {
          const actual = original.call(this);
          if (this.name !== 'held.csv') return actual;
          return actual.then(bytes => new Promise(resolve => { window.releaseHeldCsv = () => resolve(bytes); }));
        };
      });
      await choose('held.csv');
      await until(() => page.evaluate(() => typeof window.releaseHeldCsv === 'function'), 'held file bytes');
      assert.equal(await page.$eval('#check-csv', element => element.disabled), true);
      assert.equal(await page.$eval('#download-course', element => element.disabled), true);
      await ready('replacement.csv');
      await page.evaluate(() => window.releaseHeldCsv());
      await pause(100);
      assert.equal(await page.$eval('#csv-filename', element => element.textContent), 'replacement.csv');
      const result = await downloaded(page, '#download-course');
      assert.deepEqual(JSON.parse(result.bytes).items.map(item => item.id), items.map(item => 'replacement-' + item.id));
      await ready();
    });
    await group('the downloaded deck reopens and re-exports in the untouched native Deck studio', async () => {
      assert.ok(primaryDownload);
      const studio = await newPage(path.join(control, 'author.html'));
      await (await studio.$('#open-deck')).uploadFile(primaryDownload.file);
      await until(() => studio.$eval('#open-preview', element => !element.hidden), 'studio preview');
      assert.equal(await studio.$eval('#open-preview-title', element => element.textContent), 'Open “' + metadata.title + '”?');
      await studio.click('#replace-draft');
      assert.equal(await studio.$eval('#deck-title', element => element.value), metadata.title);
      assert.equal(await studio.$eval('#question-count', element => element.textContent), '2 questions');
      const choices = await studio.$$eval('#question-picker option', nodes => nodes.map(node => node.value));
      assert.equal(choices.length, items.length);
      for (let index = 0; index < choices.length; index++) {
        await studio.select('#question-picker', choices[index]);
        assert.equal(await studio.$eval('#question-prompt', element => element.value), items[index].prompt);
      }
      await studio.click('#check-draft');
      assert.equal(await studio.$eval('#download-deck', element => element.disabled), false);
      const exported = await downloaded(studio, '#download-deck');
      assert.deepEqual(exported.bytes, primaryDownload.bytes);
      await studio.close();
    });
    await group('the same actual JSON starts and completes its questions in the untouched native learner', async () => {
      assert.ok(primaryDownload);
      const learner = await newPage(path.join(control, 'demo.html'));
      await (await learner.$('#deck-file')).uploadFile(primaryDownload.file);
      await until(() => learner.$('#start-deck'), 'learner deck preview');
      assert.equal(await learner.$eval('#deck-preview-title', element => element.textContent), metadata.title);
      await learner.click('#start-deck');
      const visited = [];
      for (let count = 0; count < items.length; count++) {
        const prompt = await learner.$eval('#session-content .question-card h2', element => element.textContent);
        const item = items.find(candidate => candidate.prompt === prompt);
        assert.ok(item); assert.equal(visited.includes(item.id), false); visited.push(item.id);
        await learner.click('[data-choice="' + item.answer + '"]');
        const feedback = await learner.$eval('#feedback-slot', element => element.textContent);
        assert.ok(feedback.includes(item.explanation)); assert.ok(feedback.includes(item.transfer));
        await learner.click('#next-button');
      }
      assert.deepEqual([...visited].sort(), items.map(item => item.id).sort());
      assert.match(await learner.$eval('#first-try-summary', element => element.textContent), /2 of 2/);
      await learner.close();
    });
    await group('390px controls remain reachable without horizontal page overflow', async () => {
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      await ready();
      const bounds = await page.evaluate(() => ({
        viewport: innerWidth, scroll: document.documentElement.scrollWidth,
        controls: ['choose-csv', 'download-csv-template', 'check-csv', 'download-course'].map(id => {
          const element = document.getElementById(id), box = element.getBoundingClientRect();
          return { id, x: box.x, right: box.right, width: box.width, height: box.height, disabled: element.disabled };
        })
      }));
      assert.ok(bounds.scroll <= bounds.viewport);
      for (const box of bounds.controls) {
        assert.ok(box.x >= 0 && box.right <= bounds.viewport);
        assert.ok(box.height >= 44);
      }
      receipt.narrow_bounds = bounds;
      await page.screenshot({ path: path.join(out, 'course-390.png'), fullPage: true });
    });
    assert.deepEqual(receipt.blocked_requests, []); assert.deepEqual(receipt.page_errors, []);
    receipt.sources_unchanged = paths.every(file => before[file] === hash(fs.readFileSync(file)));
    assert.equal(receipt.sources_unchanged, true);
  } catch (error) { receipt.infrastructure_error = String(error.stack || error); }
  finally {
    if (browser) await browser.close();
    fs.rmSync(path.join(out, 'profile'), { recursive: true, force: true });
    receipt.download_events = { starts, finishes };
    receipt.passed = receipt.groups.filter(group => group.ok).length;
    receipt.failed = receipt.groups.filter(group => !group.ok).length;
    fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, groups: receipt.groups,
      run_mode: mode, bom_cases: receipt.bom_cases,
      page_errors: receipt.page_errors, blocked_requests: receipt.blocked_requests,
      source_unchanged: receipt.sources_unchanged, infrastructure_error: receipt.infrastructure_error || null,
      receipt: path.join(out, 'receipt.json') }));
    process.exitCode = receipt.failed || receipt.infrastructure_error ? 1 : 0;
  }
})();
