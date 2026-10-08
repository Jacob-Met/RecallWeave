/**
 * Actual direct-file lab/download and maintained learner receiving.
 * Override PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE for an existing native install.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {parseDeck} from '../src/deck.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=path.join(root,'docs/receiving/mathematical-induction-0378a7b6');
const attempt=String(Date.now());
const run=path.join(evidence,'browser-'+attempt);
await mkdir(run,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/opt/hamon-voice/venv/lib/python3.14/site-packages/playwright/driver/package/index.mjs');
const browser=await chromium.launch({
  executablePath:process.env.CHROMIUM_EXECUTABLE || '/snap/chromium/current/usr/lib/chromium-browser/chrome',
  headless:true,args:['--disable-dev-shm-usage']
});
const context=await browser.newContext({viewport:{width:1100,height:850},acceptDownloads:true});
const page=await context.newPage();
const errors=[];const requests=[];const groups=[];const downloads=[];
context.on('page',p=>p.on('pageerror',error=>errors.push(error.message)));
page.on('pageerror',error=>errors.push(error.message));
await context.route('**/*',route=>{
  if(/^https?:/.test(route.request().url())){requests.push(route.request().url());return route.abort();}
  return route.continue();
});
await context.addInitScript(()=>{
  window.__inductionStorageWrites=[];
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(...args){window.__inductionStorageWrites.push(args[0]);return original.apply(this,args);};
});
await context.setOffline(true);
const sourceDeck=await readFile(path.join(root,'courses/mathematical-induction.json'));
const sourceGuide=await readFile(path.join(root,'courses/mathematical-induction.md'));
const deck=parseDeck(sourceDeck.toString('utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function saveDownload(target,selector,label){
  const pending=target.waitForEvent('download');
  await target.locator(selector).click();
  const download=await pending;
  const filename=path.join(run,label+'-'+download.suggestedFilename());
  await download.saveAs(filename);
  const bytes=await readFile(filename);
  downloads.push({label,filename:path.relative(root,filename),bytes:bytes.length,sha256:sha(bytes)});
  return {filename,bytes};
}
const receipt={sourceParent:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),node:process.version,browser:browser.version(),groups,downloads,errors,networkRequests:requests};
try{
  await page.goto(pathToFileURL(path.join(root,'courses/mathematical-induction-lab.html')).href);
  await page.locator('#example option').nth(5).waitFor({state:'attached'});
  assert.match(await page.locator('#status').innerText(),/^Proved for every integer n ≥ 0/);
  assert.equal(await page.locator('#rows tr').count(),10);
  await page.screenshot({path:path.join(run,'desktop.png'),fullPage:true});
  groups.push('initial complete proof and ten distinct illustrative rows');

  for(const [example,proved] of [[0,true],[1,true],[2,false],[3,false],[4,false],[5,true]]){
    await page.locator('#example').selectOption(String(example));
    assert.equal((await page.locator('#status').innerText()).startsWith('Proved'),proved);
  }
  await page.locator('#example').selectOption('4');
  assert.deepEqual(await page.locator('#rows tr').evaluateAll(rows=>rows.slice(0,3).map(row=>Array.from(row.cells,cell=>cell.textContent))),[
    ['1','1','1','Match'],['2','3','3','Match'],['3','6','8','Different']
  ]);
  await page.locator('#step').focus();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#step-label').innerText(),'Inspect n = 3 → 4');
  assert.match(await page.locator('#step-hypothesis').innerText(),/hypothesis, not a claim/);
  const record=await saveDownload(page,'#record','finite-counterexample');
  const parsed=JSON.parse(record.bytes);
  assert.equal(parsed.firstDisplayedCounterexample,3);
  assert.equal(parsed.successor.pass,false);
  assert.equal(parsed.finiteRowsAreProof,false);
  const repeat=await saveDownload(page,'#record','same-record');
  assert.deepEqual(record.bytes,repeat.bytes);
  groups.push('six actual examples, exact finite counterexample, keyboard successor and stable record');

  await page.locator('#A').fill('');
  assert.equal(await page.locator('#results').isHidden(),true);
  assert.equal(await page.locator('#record').isDisabled(),true);
  await page.locator('#check').click();
  assert.match(await page.locator('#status').innerText(),/A must be an integer/);
  const course=await saveDownload(page,'#course','course-during-invalid-draft');
  assert.deepEqual(course.bytes,sourceDeck);
  await page.locator('#A').fill('3');
  await page.locator('#D').fill('0');
  await page.locator('#check').click();
  assert.match(await page.locator('#status').innerText(),/D must be an integer from 1 through 20/);
  await page.locator('#D').fill('2');
  await page.locator('#check').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#results').isVisible(),true);
  assert.equal(await page.locator('#record').isDisabled(),false);
  const guide=await saveDownload(page,'#guide','worked-guide');
  assert.deepEqual(guide.bytes,sourceGuide);
  groups.push('edited-state retirement, invalid input refusal, keyboard recovery and exact course/guide downloads');

  await page.locator('#example').selectOption('0');
  await page.locator('#n0').selectOption('1');
  assert.equal(await page.locator('#results').isHidden(),true);
  await page.locator('#check').click();
  assert.match(await page.locator('#status').innerText(),/n ≥ 1/);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  assert.equal(await page.locator('label[for]').count(),9);
  await page.locator('#b').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'n0');
  await page.screenshot({path:path.join(run,'mobile.png'),fullPage:true});
  assert.deepEqual(await page.evaluate(()=>window.__inductionStorageWrites),[]);
  groups.push('changed domain, 390px layout, labeled inputs and keyboard navigation without storage writes');

  const learner=await context.newPage();
  await learner.goto(pathToFileURL(path.join(root,'demo.html')).href);
  await learner.locator('#deck-file').setInputFiles(course.filename);
  assert.equal(await learner.locator('#deck-preview-title').innerText(),deck.title);
  assert.match(await learner.locator('.deck-preview-count').innerText(),/12 questions · 4 concepts/);
  assert.equal(await learner.locator('#deck-preview li').count(),12);
  await learner.locator('#start-deck').click();
  const encountered=[];
  for(let index=0;index<12;index++){
    const prompt=await learner.locator('#session-content h2').innerText();
    const item=deck.items.find(item=>item.prompt===prompt);
    assert.ok(item,'The learner must display an exact downloaded course question.');
    assert.equal(encountered.includes(item.id),false);
    encountered.push(item.id);
    const choice=index===0?(item.answer+1)%item.options.length:item.answer;
    await learner.locator('[data-choice="'+choice+'"]').click();
    assert.ok((await learner.locator('#feedback-slot').innerText()).includes(item.explanation));
    await learner.locator('#next-button').click();
  }
  assert.equal(await learner.locator('.review-item').count(),12);
  assert.match(await learner.locator('#first-try-summary').innerText(),/11 of 12/);
  await learner.locator('#practice-button').click();
  const practicePrompt=await learner.locator('#session-content h2').innerText();
  const missed=deck.items.find(item=>item.prompt===practicePrompt);
  await learner.locator('[data-practice-choice="'+missed.answer+'"]').click();
  await learner.locator('#practice-next').click();
  assert.match(await learner.locator('#practice-status').innerText(),/1 of 1 correctly/);
  assert.match(await learner.locator('#first-try-summary').innerText(),/11 of 12/);
  const reflection='A true base needs a bridge for every allowed next integer.';
  await learner.locator('#application-reflection').fill(reflection);
  const notes=await saveDownload(learner,'#save-notes-button','real-learner-notes');
  assert.ok(notes.bytes.toString('utf8').includes(deck.title));
  assert.ok(notes.bytes.toString('utf8').includes(reflection));
  for(const item of deck.items) assert.ok(notes.bytes.toString('utf8').includes(item.prompt));
  groups.push('exact downloaded lesson: preview, all twelve questions, wrong/correct feedback, review, retry and actual study notes');

  assert.deepEqual(requests,[]);
  assert.deepEqual(errors,[]);
  receipt.passed=true;
  receipt.sourceHashes={};
  for(const name of ['src/mathematical-induction.mjs','src/mathematical-induction-ui.mjs','templates/mathematical-induction-lab.html','courses/mathematical-induction.json','courses/mathematical-induction.md','courses/mathematical-induction-lab.html','src/deck.mjs','src/app.mjs','demo.html','tools/check-mathematical-induction-browser.mjs']){
    receipt.sourceHashes[name]=sha(await readFile(path.join(root,name)));
  }
  console.log(JSON.stringify({passed:true,groups:groups.length,downloads:downloads.length,questions:12,networkRequests:requests.length,pageErrors:errors.length,evidence:path.relative(root,run)}));
}catch(error){receipt.passed=false;receipt.failure=error.stack;throw error;}
finally{
  await writeFile(path.join(run,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  await browser.close();
}
