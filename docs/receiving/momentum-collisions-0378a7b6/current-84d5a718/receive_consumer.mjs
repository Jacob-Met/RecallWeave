import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'file:///C:/hamon-receiving-b47cbcf18759/dependencies/playwright-core-1.62.1/index.mjs';
const proof=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(proof,'../../../..'),out=path.join(proof,'consumer');
await fs.mkdir(out);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const paths=['demo.html','src/app.mjs','src/deck.mjs','courses/momentum-collisions-explorer.html','courses/momentum-collisions.json','src/momentum-collisions.mjs'];
const receipt={at:new Date().toISOString(),parent:'84d5a718c4075107dc2d0e13ba76e7cda4942532',composedTree:git('write-tree'),source:{},driverSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),checks:[],downloads:[],errors:[],requests:[]};
for(const name of paths)receipt.source[name]=sha(await fs.readFile(path.join(root,name)));
const temp=path.join(out,'browser-temp');await fs.mkdir(temp);process.env.TEMP=temp;process.env.TMP=temp;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--disable-background-networking','--disable-component-update']});
 const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:844}});
 const page=await context.newPage();
 context.on('page',p=>watch(p));
 function watch(p){p.on('pageerror',e=>receipt.errors.push(e.message));p.on('request',r=>{if(!/^(file:|data:|blob:)/.test(r.url()))receipt.requests.push(r.url());});}
 watch(page);
 async function download(p,id,name){const pending=p.waitForEvent('download');await p.locator(id).click();const d=await pending;const target=path.join(out,name);await d.saveAs(target);assert.equal(await d.failure(),null);const bytes=await fs.readFile(target);receipt.downloads.push({name,sha256:sha(bytes)});return target;}
 await page.goto(pathToFileURL(path.join(root,'courses/momentum-collisions-explorer.html')).href);
 await page.locator('#mc-preset').selectOption('fractions');await page.locator('#mc-load-example').click();
 await page.evaluate(()=>{window.originalURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error('receiving refusal');};});
 await page.locator('#mc-download-record').click();assert.match(await page.locator('#mc-download-status').textContent(),/could not be prepared/);
 await page.evaluate(()=>{URL.createObjectURL=window.originalURL;delete window.originalURL;});
 const analysis=JSON.parse(await fs.readFile(await download(page,'#mc-download-record','recovered-analysis.json'),'utf8'));
 assert.deepEqual(analysis.completelyInelastic.a.velocity,{numerator:'1',denominator:'3'});
 assert.match(await page.locator('#mc-download-status').textContent(),/Analysis download prepared/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:path.join(out,'phone-recovered.png'),fullPage:true});
 const deckPath=await download(page,'#mc-download-course','download-course.json');
 assert.deepEqual(await fs.readFile(deckPath),await fs.readFile(path.join(root,'courses/momentum-collisions.json')));
 const deck=JSON.parse(await fs.readFile(deckPath,'utf8'));
 receipt.checks.push('Actual explorer download recovers after injected preparation refusal; restored download binds exact fractional inputs; 390px screenshot has no overflow.');
 const learner=await context.newPage();await learner.setViewportSize({width:1360,height:1000});
 await learner.goto(pathToFileURL(path.join(root,'demo.html')).href);
 await learner.locator('#deck-file').setInputFiles(deckPath);
 assert.equal(await learner.locator('#deck-preview-title').textContent(),deck.title);
 await learner.locator('#start-deck').click();
 let missed;const seen=new Set();
 for(let index=0;index<12;index++){
  const prompt=await learner.locator('.question-card h2').textContent(),item=deck.items.find(i=>i.prompt===prompt);
  assert.ok(item&&!seen.has(item.id));seen.add(item.id);
  const choice=index===0?(item.answer+1)%item.options.length:item.answer;if(index===0)missed={item,choice};
  await learner.locator('[data-choice="'+choice+'"]').click();
  const feedback=await learner.locator('#feedback-slot').textContent();
  for(const part of ['Your answer:',item.options[choice],'Correct answer:',item.options[item.answer],item.explanation,item.transfer])assert.ok(feedback.includes(part),item.id+' feedback part '+part);
  await learner.locator('#next-button').click();
 }
 assert.equal(seen.size,12);assert.match(await learner.locator('#first-try-summary').textContent(),/11 of 12/);
 const itemReview=learner.locator('.review-item').filter({has:learner.locator('[data-reflection-item="'+missed.item.id+'"]')});
 await itemReview.locator('summary').click();
 const reflection='Current-parent scripted receiving: <positive gap> comes before endpoint formulas.';
 await learner.locator('[data-reflection-item="'+missed.item.id+'"]').fill(reflection);
 await learner.locator('#practice-button').click();assert.equal(await learner.locator('.practice-card h2').textContent(),missed.item.prompt);
 await learner.locator('[data-practice-choice="'+missed.item.answer+'"]').click();await learner.locator('#practice-next').click();
 assert.match(await learner.locator('#first-try-summary').textContent(),/11 of 12/);
 assert.match(await learner.locator('#practice-status').textContent(),/1 of 1 correctly on retry/);
 const notes=await fs.readFile(await download(learner,'#save-notes-button','study-notes.txt'),'utf8');
 for(const item of deck.items)for(const part of [item.prompt,item.options[item.answer],item.explanation,item.transfer])assert.ok(notes.includes(part));
 assert.ok(notes.includes(reflection));assert.ok(notes.includes(missed.item.options[missed.choice]));
 await learner.screenshot({path:path.join(out,'current-learner.png'),fullPage:true});
 receipt.checks.push('Current parent learner labels chosen and correct answers for all twelve downloaded questions; feedback, authored explanations and transfer text remain exact.');
 receipt.checks.push('Current parent retains11/12first answers after one successful retry and physically downloads every question/explanation/transfer plus literal reflection and original mistaken choice.');
 for(const[name,hash]of Object.entries(receipt.source))assert.equal(sha(await fs.readFile(path.join(root,name))),hash,name);
 assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.requests,[]);
 receipt.checks.push('Qualified runtime/source hashes unchanged; no external requests or runtime errors.');
 receipt.browser=browser.version();receipt.passed=true;
 await browser.close();browser=null;await fs.rm(temp,{recursive:true,force:true});
}catch(error){receipt.passed=false;receipt.error=error.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));}
