#!/usr/bin/env node
/** Optional actual-browser receiving; no browser package is required by the application. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { analyzeCacheTrace } from '../courses/cache-replacement-core.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const flags = new Map();
for (let index=2; index<process.argv.length; index+=2) {
  const key = process.argv[index], value = process.argv[index+1];
  if (!['--playwright','--browser','--output'].includes(key) || !value || flags.has(key)) {
    throw new Error('Usage: node tools/check-cache-replacement-browser.mjs --playwright /path/to/index.mjs --browser /path/to/chromium --output /new/output');
  }
  flags.set(key,value);
}
if (flags.size !== 3) throw new Error('Specify --playwright, --browser and a new --output directory.');
const output = resolve(flags.get('--output'));
await mkdir(output);
const sha = value => createHash('sha256').update(value).digest('hex');
const save = (name,value) => writeFile(resolve(output,name),JSON.stringify(value,null,2)+'\n');
const sourcePaths = [
  'src/app.mjs','src/deck.mjs','src/deck-picker.mjs','demo.html',
  'courses/cache-replacement-core.mjs','courses/cache-replacement-ui.mjs',
  'courses/cache-replacement-entry.mjs','courses/cache-replacement.template.html',
  'courses/cache-replacement.html','courses/cache-replacement.css','courses/cache-replacement.json',
  'tools/check-cache-replacement-browser.mjs'
];
const sourceHashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => {
  const bytes = await readFile(resolve(root,path)); return [path,{bytes:bytes.length,sha256:sha(bytes)}];
})));
const before = await sourceHashes();
await save('source-before.json',before);
const courseBytes = await readFile(resolve(root,'courses/cache-replacement.json'));
const course = JSON.parse(courseBytes);
const defaultResult = analyzeCacheTrace({references:['A','B','A','C','B'],capacity:2});
const groups = [], requests = [], pageErrors = [], externalRequests = [], downloads = [];
let browser, server, baseURL, failure;
const started = Date.now();
const group = async (name, action) => {
  const time = Date.now();
  try { await action(); groups.push({name,ok:true,milliseconds:Date.now()-time}); }
  catch (error) { groups.push({name,ok:false,error:String(error.stack||error)}); throw error; }
};
const text = async (page,id) => (await page.locator('#'+id).textContent()).trim();
const count = async (page,id) => Number(await text(page,id));
const contents = (page,id) => page.locator('#'+id+' li:not(.empty)').allTextContents();
const download = async (page,id,name) => {
  const event = page.waitForEvent('download');
  await page.locator('#'+id).click();
  const file = await event;
  const destination = resolve(output,name);
  await file.saveAs(destination);
  assert.equal(await file.failure(),null);
  const bytes = await readFile(destination);
  downloads.push({name,suggestedName:file.suggestedFilename(),bytes:bytes.length,sha256:sha(bytes)});
  return bytes;
};
try {
  server = createServer(async (request,response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      const path = resolve(root,'.'+(pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(root.endsWith(sep)?root:root+sep) || !(await stat(path)).isFile()) {
        response.writeHead(404); response.end(); return;
      }
      const type = {'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain'}[extname(path)] || 'application/octet-stream';
      response.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});
      response.end(await readFile(path));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((accept,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',accept); });
  baseURL = 'http://127.0.0.1:'+server.address().port;
  const {chromium} = await import(pathToFileURL(resolve(flags.get('--playwright'))).href);
  browser = await chromium.launch({headless:true,executablePath:resolve(flags.get('--browser'))});
  await save('runtime.json',{node:process.version,browser:browser.version(),baseURL,args:process.argv.slice(2)});
  for (const mode of ['modular','standalone']) {
    const context = await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true,serviceWorkers:'block'});
    await context.route('**/*',route => {
      const url = route.request().url();
      requests.push({mode,url,method:route.request().method()});
      if (!url.startsWith(baseURL+'/') && !url.startsWith('file:') && !url.startsWith('blob:') && !url.startsWith('data:')) {
        externalRequests.push(url); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror',error => pageErrors.push({mode,error:String(error)}));
    const url = mode === 'modular' ? baseURL+'/courses/cache-replacement.template.html'
      : pathToFileURL(resolve(root,'courses/cache-replacement.html')).href;
    await group(mode+': explicit Run and shared prefix',async () => {
      await page.goto(url);
      await page.waitForFunction(() => document.documentElement.dataset.cacheReady === 'true');
      assert.equal(await page.locator('#results').isHidden(),true);
      assert.equal(await text(page,'course-counts'),'12 questions · 4 concepts');
      await page.locator('#run-comparison').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#results').isVisible(),true);
      assert.deepEqual(await contents(page,'fifo-slots'),[]);
      assert.equal(await count(page,'fifo-misses'),0);
      for (let step=0;step<3;step++) await page.locator('#step-next').click();
      assert.deepEqual(await contents(page,'fifo-slots'),['A','B']);
      assert.deepEqual(await contents(page,'lru-slots'),['B','A']);
      assert.equal(await count(page,'fifo-hits'),1); assert.equal(await count(page,'fifo-misses'),2);
      assert.equal(await count(page,'lru-hits'),1); assert.equal(await count(page,'lru-misses'),2);
      const bytes = await download(page,'download-trace',mode+'-step3-experiment.json');
      assert.deepEqual(JSON.parse(bytes),{format:'recallweave-cache-experiment/1',shownStep:3,result:defaultResult});
      assert.ok(bytes.toString().endsWith('\n'));
      await page.locator('#step-last').click();
      assert.equal(await count(page,'fifo-misses'),3); assert.equal(await count(page,'lru-misses'),4);
      await page.locator('#step-back').click(); await page.locator('#step-first').click();
      assert.equal(await count(page,'fifo-hits'),0); assert.equal(await count(page,'lru-misses'),0);
      assert.equal(await page.locator('#step-first').isDisabled(),true);
    });
    await group(mode+': anomaly and complete-sequence capacity table',async () => {
      await page.locator('#load-anomaly').click();
      assert.equal(await page.locator('#results').isHidden(),true);
      assert.equal(await page.locator('#download-trace').isDisabled(),true);
      await page.locator('#run-comparison').click();
      const table = await page.locator('#capacity-rows tr').evaluateAll(rows => rows.map(row =>
        [Number(row.dataset.capacity),...Array.from(row.querySelectorAll('td'),cell=>Number(cell.textContent))]));
      assert.deepEqual(table,[[1,12,12],[2,12,12],[3,9,10],[4,10,8],[5,5,5]]);
      await page.locator('#step-last').click();
      assert.equal(await count(page,'fifo-misses'),9); assert.equal(await count(page,'lru-misses'),10);
      await page.locator('#capacity').selectOption('4');
      assert.equal(await page.locator('#results').isHidden(),true);
      await page.locator('#run-comparison').click(); await page.locator('#step-last').click();
      assert.equal(await count(page,'fifo-misses'),10); assert.equal(await count(page,'lru-misses'),8);
      assert.match(await text(page,'capacity-observation'),/9 misses at capacity 3 to 10 at capacity 4/);
      await page.screenshot({path:resolve(output,mode+'-desktop.png'),fullPage:true});
    });
    await group(mode+': invalidation, refusal and empty sequence',async () => {
      await page.locator('#references').fill('AB');
      assert.equal(await page.locator('#results').isHidden(),true);
      await page.locator('#run-comparison').click();
      assert.match(await text(page,'input-error'),/single page IDs/);
      assert.equal(await page.locator('#download-trace').isDisabled(),true);
      assert.equal(await page.locator('#download-course').isEnabled(),true);
      await page.locator('#references').fill('');
      await page.locator('#run-comparison').click();
      for (const name of ['fifo','lru']) {
        assert.deepEqual(await contents(page,name+'-slots'),[]);
        assert.equal(await count(page,name+'-hits'),0); assert.equal(await count(page,name+'-misses'),0);
      }
      for (const id of ['step-first','step-back','step-next','step-last']) assert.equal(await page.locator('#'+id).isDisabled(),true);
      assert.match(await text(page,'whole-observation'),/no hit-rate percentage/);
      const empty = JSON.parse(await download(page,'download-trace',mode+'-empty-experiment.json'));
      assert.deepEqual(empty,{format:'recallweave-cache-experiment/1',shownStep:0,result:analyzeCacheTrace({references:[],capacity:4})});
      const bytes = await download(page,'download-course',mode+'-course.json');
      assert.deepEqual(bytes,courseBytes);
    });
    await group(mode+': phone layout and visible keyboard focus',async () => {
      await page.setViewportSize({width:390,height:844});
      await page.locator('#load-recency').click(); await page.locator('#run-comparison').click();
      for (let step=0;step<4;step++) await page.locator('#step-next').click();
      await page.locator('.trace-panel summary').click();
      await page.locator('#step-first').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#step-back').evaluate(node=>document.activeElement===node),true);
      assert.ok(await page.locator('#step-back').evaluate(node=>parseFloat(getComputedStyle(node).outlineWidth)>0));
      const dimensions = await page.evaluate(()=>({body:document.body.scrollWidth,html:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert.ok(dimensions.body<=390 && dimensions.html<=390,JSON.stringify(dimensions));
      await page.screenshot({path:resolve(output,mode+'-phone.png'),fullPage:true});
      await save(mode+'-layout.json',dimensions);
    });
    await context.close();
  }

  const context = await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true,serviceWorkers:'block'});
  await context.route('**/*',route => {
    const url=route.request().url(); requests.push({mode:'learner',url,method:route.request().method()});
    if (!url.startsWith('file:')&&!url.startsWith('blob:')&&!url.startsWith('data:')) {externalRequests.push(url);return route.abort();}
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  page.on('pageerror',error=>pageErrors.push({mode:'learner',error:String(error)}));
  await group('actual downloaded course: preview, explicit adoption and twelve first tries',async () => {
    await page.goto(pathToFileURL(resolve(root,'demo.html')).href);
    await page.locator('#start-button').click();
    const existingQuestion = await page.locator('.question-card h2').textContent();
    await page.locator('#deck-file').setInputFiles(resolve(output,'standalone-course.json'));
    await page.locator('#start-deck').waitFor();
    assert.equal(await page.locator('.question-card h2').textContent(),existingQuestion);
    assert.equal(await text(page,'deck-preview-title'),course.title);
    assert.match(await page.locator('.deck-preview-count').textContent(),/12 questions.*4 concepts/);
    await page.locator('#start-deck').click();
    assert.equal(await page.locator('#deck-preview').isHidden(),true);
    const seen = [];
    for (let index=0;index<12;index++) {
      const prompt = await page.locator('.question-card h2').textContent();
      const item = course.items.find(item=>item.prompt===prompt);
      assert.ok(item,'Native prompt belongs to exact downloaded course');
      assert.ok(!seen.includes(item.id)); seen.push(item.id);
      const choice = index===0 ? (item.answer+1)%item.options.length : item.answer;
      await page.locator('[data-choice="'+choice+'"]').click();
      assert.ok((await page.locator('#feedback-slot').textContent()).includes(item.explanation));
      assert.ok((await page.locator('#feedback-slot').textContent()).includes(item.transfer));
      await page.locator('#next-button').click();
    }
    assert.equal(seen.length,12);
    assert.match(await text(page,'first-try-summary'),/11 of 12/);
    assert.equal(await page.locator('.review-item').count(),12);
    await save('actual-learner-question-order.json',seen);
  });
  await group('downloaded course: targeted practice and exact notes preserve first tries',async () => {
    const summary = await text(page,'first-try-summary');
    const mastery = await page.locator('.mastery-box').textContent();
    await page.locator('#application-reflection').fill('A capacity comparison keeps the request sequence fixed.');
    await page.locator('#practice-button').click();
    const prompt = await page.locator('.question-card h2').textContent();
    const item = course.items.find(item=>item.prompt===prompt);
    assert.ok(item);
    await page.locator('[data-practice-choice="'+item.answer+'"]').click();
    await page.locator('#practice-next').click();
    assert.equal(await text(page,'first-try-summary'),summary);
    assert.equal(await page.locator('.mastery-box').textContent(),mastery);
    assert.equal(await page.locator('#application-reflection').inputValue(),'A capacity comparison keeps the request sequence fixed.');
    assert.match(await text(page,'practice-status'),/1 of 1 correctly/);
    const notes = (await download(page,'save-notes-button','cache-study-notes.txt')).toString('utf8');
    assert.ok(notes.includes(course.title));
    assert.ok(notes.includes('A capacity comparison keeps the request sequence fixed.'));
    for (const item of course.items) assert.ok(notes.includes(item.prompt));
    await page.screenshot({path:resolve(output,'course-review.png'),fullPage:true});
  });
  await context.close();
  assert.deepEqual(pageErrors,[]); assert.deepEqual(externalRequests,[]);
} catch(error) {
  failure=String(error.stack||error); process.exitCode=1;
} finally {
  await browser?.close();
  if (server) await new Promise(accept=>server.close(accept));
  const after = await sourceHashes();
  const unchanged = JSON.stringify(before)===JSON.stringify(after);
  if (!unchanged) {failure = (failure||'')+'\nSource bytes changed during browser receiving.';process.exitCode=1;}
  await save('source-after.json',after);
  await save('requests.json',requests);
  await save('report.json',{ok:!failure,seconds:(Date.now()-started)/1000,groups,downloads,pageErrors,externalRequests,sourceUnchanged:unchanged,failure:failure||null});
  console.log(JSON.stringify({ok:!failure,groups:groups.length,passed:groups.filter(item=>item.ok).length,seconds:(Date.now()-started)/1000,pageErrors:pageErrors.length,externalRequests:externalRequests.length,sourceUnchanged:unchanged,output,failure:failure||null}));
}
