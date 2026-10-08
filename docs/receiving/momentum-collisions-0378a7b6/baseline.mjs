import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'file:///C:/hamon-receiving-b47cbcf18759/dependencies/playwright-core-1.62.1/index.mjs';
const repo='C:/Users/minec/hamon-0378a7b6-recallweave';
const proof=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(proof,'baseline');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:4*1024*1024}).trim();
await fs.mkdir(out);
const receipt={kind:'Original native learner and missing momentum-course baseline',at:new Date().toISOString(),node:process.version,head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),checks:[],errors:[],external_requests:[]};
let browser;
try{
  assert.equal(receipt.head,'3a3704c352f8a12e20c208445c2c5ade412b365d');
  const entries=git('ls-tree','-r','--full-tree','HEAD').split('\n').map(line=>{
    const [metadata,name]=line.split('\t');const [mode,type,blob]=metadata.split(' ');return{path:name,mode,type,blob};
  });
  for(const entry of entries)entry.native_sha256=sha(await fs.readFile(path.join(repo,entry.path)));
  assert.equal(entries.length,2084);
  await fs.writeFile(path.join(out,'original-source-native.json'),JSON.stringify(entries,null,2)+'\n');
  receipt.original_leaf_count=entries.length;
  receipt.original_native_manifest_sha256=sha(await fs.readFile(path.join(out,'original-source-native.json')));
  receipt.questions_only_sha256=sha(await fs.readFile(path.join(proof,'questions-only.json')));
  receipt.driver_sha256=sha(await fs.readFile(fileURLToPath(import.meta.url)));
  for(const missing of ['courses/momentum-collisions.json','courses/momentum-collisions-explorer.html','src/momentum-collisions.mjs']){
    await assert.rejects(fs.stat(path.join(repo,missing)),{code:'ENOENT'});
  }
  receipt.checks.push('Proposed course, explorer and model are absent from the actual original source');
  const temp=path.join(out,'browser-temp');await fs.mkdir(temp);process.env.TEMP=temp;process.env.TMP=temp;
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--disable-background-networking','--disable-component-update','--no-first-run']});
  receipt.browser=browser.version();
  const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1360,height:1000}});
  const page=await context.newPage();
  page.on('pageerror',error=>receipt.errors.push(error.message));
  page.on('console',entry=>{if(entry.type()==='error')receipt.errors.push(entry.text());});
  page.on('request',request=>{if(!/^(file:|data:|blob:)/.test(request.url()))receipt.external_requests.push(request.url());});
  await page.goto(pathToFileURL(path.join(repo,'demo.html')).href);
  await page.locator('#download-deck').waitFor({state:'visible'});
  const pending=page.waitForEvent('download');await page.locator('#download-deck').click();
  const download=await pending;const deckPath=path.join(out,'original-example-deck.json');await download.saveAs(deckPath);
  const {validateDeck}=await import(pathToFileURL(path.join(repo,'src/deck.mjs')).href);
  const downloaded=validateDeck(JSON.parse(await fs.readFile(deckPath,'utf8')));
  const original=validateDeck(JSON.parse(await fs.readFile(path.join(repo,'data/deck.json'),'utf8')));
  assert.deepEqual(downloaded,original);
  receipt.original_download_sha256=sha(await fs.readFile(deckPath));
  receipt.checks.push('Existing learner physically downloads its exact checked original example deck');
  await page.locator('#deck-file').setInputFiles(deckPath);
  await page.locator('#start-deck').waitFor({state:'visible'});
  assert.equal(await page.locator('#deck-preview-title').textContent(),downloaded.title);
  assert.match(await page.locator('.deck-preview-count').textContent(),/6 questions/);
  await page.locator('#start-deck').click();
  const prompt=await page.locator('.question-card h2').textContent();
  const item=downloaded.items.find(candidate=>candidate.prompt===prompt);assert.ok(item);
  await page.locator('[data-choice="'+item.answer+'"]').click();
  assert.ok((await page.locator('#feedback-slot').textContent()).includes(item.explanation));
  assert.equal(await page.locator('#step-count').textContent(),'1 / 6');
  receipt.checks.push('Physical local deck reopens through preview and explicit start, and original answer feedback/progress works');
  await page.screenshot({path:path.join(out,'original-learner.png'),fullPage:true});
  assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.external_requests,[]);
  receipt.checks.push('Original offline page has zero observed runtime errors or external requests');
  await browser.close();browser=null;await fs.rm(temp,{recursive:true,force:true});
  for(const entry of entries)assert.equal(sha(await fs.readFile(path.join(repo,entry.path))),entry.native_sha256,entry.path);
  receipt.checks.push('All 2084 original native source leaves remain unchanged');
  receipt.passed=true;
}catch(error){receipt.passed=false;receipt.failure=error.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));}
