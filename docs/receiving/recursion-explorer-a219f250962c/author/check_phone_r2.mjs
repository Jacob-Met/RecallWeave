import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from '/Users/me/suite-projects-066deeadcc8b/source/packages/suite-shell/node_modules/playwright/index.mjs';
const root='/Users/me/recallweave-recursion-a219f250962c';
const output=root+'/receiving/phone-r2';
await mkdir(output);
const profile=await mkdtemp(output+'/profile-');
const html=root+'/source/courses/recursion-call-stack-explorer.html';
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt={sourceHash:hash(await readFile(html)),pageErrors:[],requests:[]};
let context;
try {
  context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:390,height:844},args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  await context.route(/^https?:/,route=>{receipt.requests.push(route.request().url());return route.abort();});
  const page=await context.newPage();
  page.on('pageerror',error=>receipt.pageErrors.push(String(error)));
  await page.goto(pathToFileURL(html).href);
  await page.getByLabel('Algorithm',{exact:true}).selectOption('memo-fibonacci');
  await page.getByLabel('Input n',{exact:true}).fill('5');
  await page.getByRole('button',{name:'Run trace',exact:true}).click();
  for(let i=0;i<7;i++)await page.getByRole('button',{name:'Next',exact:true}).click();
  receipt.layout=await page.evaluate(()=>{const value=document.getElementById('result');return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,value:value.textContent,valueHeight:value.getBoundingClientRect().height,valueWidth:value.getBoundingClientRect().width,valueRight:value.getBoundingClientRect().right,calls:document.getElementById('count-calls').textContent,depth:document.getElementById('count-activeDepth').textContent};});
  assert.equal(receipt.layout.value,'pending');
  assert.ok(receipt.layout.valueHeight<35);
  assert.ok(receipt.layout.valueRight<390);
  assert.ok(receipt.layout.scrollWidth<=390);
  assert.equal(receipt.layout.calls,'4');assert.equal(receipt.layout.depth,'4');
  await page.screenshot({path:output+'/phone-stack.png',fullPage:true});
  receipt.screenshotHash=hash(await readFile(output+'/phone-stack.png'));
  assert.deepEqual(receipt.pageErrors,[]);assert.deepEqual(receipt.requests,[]);
  receipt.passed=true;
} catch(error) {receipt.passed=false;receipt.error=String(error.stack??error);process.exitCode=1;}
finally {
 if(context)await context.close();
 await rm(profile,{recursive:true,force:true});
 receipt.profileRemoved=true;receipt.sourceAfter=hash(await readFile(html));
 assert.equal(receipt.sourceAfter,receipt.sourceHash);
 await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
}
console.log(JSON.stringify(receipt));
