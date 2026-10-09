/** Optional actual-browser receiving; no package is added to the application.
 * PUPPETEER_MODULE points to an existing installed module; BROWSER_BIN to existing Chromium.
 * node tools/check-edit-distance-browser.mjs /absolute/source /absolute/new-output
 * Output/profile/download paths must be visible to the chosen browser (including Snap).
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const [sourceArg,outputArg]=process.argv.slice(2);
if(!sourceArg||!outputArg||process.argv.length!==4)throw new Error('Supply exact source and a new output directory.');
const source=resolve(sourceArg),out=resolve(outputArg),downloads=join(out,'downloads');
await mkdir(out);await mkdir(downloads);await mkdir(join(out,'offline'));
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const sourcePaths=['src/edit-distance.mjs','src/edit-distance-ui.mjs','courses/edit-distance.json','courses/edit-distance.md','courses/edit-distance-explorer.template.html','courses/edit-distance-explorer.html','tools/build-edit-distance.mjs','tests/edit-distance.test.mjs','src/app.mjs','src/deck.mjs','src/knowledge.mjs','src/review.mjs','src/deck-picker.mjs','index.html','styles.css','demo.html'];
const pins=async()=>Promise.all(sourcePaths.map(async path=>{const raw=await readFile(join(source,path));return{path,bytes:raw.length,sha256:sha(raw)};}));
const before=await pins(),groups=[],pageErrors=[],external=[],requests=[],files=[];
await writeFile(join(out,'source-before.json'),JSON.stringify(before,null,2)+'\n');
await copyFile(join(source,'courses/edit-distance-explorer.html'),join(out,'offline/edit-distance-explorer.html'));
await copyFile(join(source,'demo.html'),join(out,'offline/demo.html'));
const lessonBytes=await readFile(join(source,'courses/edit-distance.json')),deck=JSON.parse(lessonBytes);
let browser,server,port;
async function group(name,body){try{await body();groups.push({name,pass:true});}catch(error){groups.push({name,pass:false,error:String(error.stack||error)});}await writeFile(join(out,'progress.json'),JSON.stringify(groups,null,2)+'\n');}
const completed=new Map(),announced=new Map();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function setupPage(){
 const page=await browser.newPage();await page.setViewport({width:1280,height:950});
 page.on('pageerror',error=>pageErrors.push(String(error)));
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=request.url();requests.push(url);
  if(url.startsWith('http://127.0.0.1:'+port+'/')||url.startsWith(pathToFileURL(join(out,'offline')).href+'/')||url.startsWith('blob:')||url==='about:blank')request.continue();
  else{external.push(url);request.abort();}
 });
 return page;
}
async function click(page,selector){
 await page.bringToFront();await page.waitForSelector(selector,{visible:true});
 const point=await page.$eval(selector,async el=>{
  el.scrollIntoView({behavior:'instant',block:'center',inline:'center'});
  let last=null,stable=0,box;
  for(let k=0;k<80;k++){await new Promise(r=>requestAnimationFrame(r));box=el.getBoundingClientRect();const now=[box.x,box.y,box.width,box.height].join(',');stable=now===last?stable+1:0;last=now;if(stable>=3)break;}
  const x=box.x+box.width/2,y=box.y+box.height/2,hit=document.elementFromPoint(x,y);
  if(!hit||!(hit===el||el.contains(hit)))throw new Error('Pointer target does not hit '+el.id);
  return{x,y};
 });await page.mouse.click(point.x,point.y);
}
async function fill(page,selector,value){
 await click(page,selector);
 await page.$eval(selector,el=>{el.focus();el.setSelectionRange(0,el.value.length);});
 await page.keyboard.press('Backspace');if(value)await page.keyboard.type(value);
}
async function text(page,selector){return page.$eval(selector,el=>el.textContent);}
async function firstReviewText(page){
 // Native learner appends separately labeled retries inside the same review list.
 // Compare the original first-attempt view while asserting retry blocks separately.
 return page.$eval('.review-list',el=>{
  const snapshot=el.cloneNode(true);
  snapshot.querySelectorAll('.review-practice-answer').forEach(node=>node.remove());
  return snapshot.textContent;
 });
}
async function download(page,selector){
 const old=new Set(completed.keys());await click(page,selector);
 for(let i=0;i<400;i++){
  const id=[...completed.keys()].find(id=>!old.has(id));
  if(id){assert.equal(completed.get(id),'completed');const path=join(downloads,id),raw=await readFile(path);const record={guid:id,name:announced.get(id)?.suggestedFilename,path,bytes:raw.length,sha256:sha(raw)};files.push(record);return{record,raw};}
  await pause(50);
 }throw new Error('No completed download from '+selector);
}
try{
 server=createServer(async(req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),path=resolve(source,'.'+pathname);
   if(!(path===source||path.startsWith(source+'/')))throw new Error('Outside source');
   const raw=await readFile((await stat(path)).isDirectory()?join(path,'index.html'):path);
   res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream');
   res.end(raw);
  }catch{res.statusCode=404;res.end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
 browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||'/snap/bin/chromium',headless:true,userDataDir:join(out,'browser-profile'),args:['--disk-cache-size=1048576','--disable-background-networking']});
 const cdp=await browser.target().createCDPSession();
 cdp.on('Browser.downloadWillBegin',event=>announced.set(event.guid,event));
 cdp.on('Browser.downloadProgress',event=>{if(event.state==='completed'||event.state==='canceled')completed.set(event.guid,event.state);});
 await cdp.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true});
 const page=await setupPage();await page.goto('http://127.0.0.1:'+port+'/courses/edit-distance-explorer.html');
 await page.waitForFunction(()=>document.querySelector('#edit-minimum')?.textContent==='1');
 let course;
 await group('exact prefix candidates, ties, weighted witness and real experiment download',async()=>{
  await fill(page,'#edit-source','ab');await fill(page,'#edit-target','ac');await click(page,'#edit-compute');
  assert.equal(await text(page,'#edit-minimum'),'1');
  assert.deepEqual(await page.$$eval('#edit-matrix tbody tr',rows=>rows.map(row=>[...row.querySelectorAll('td button')].map(button=>Number(button.textContent)))),[[0,1,2],[1,0,1],[2,1,1]]);
  assert.match(await text(page,'#edit-details'),/substitute: D\[1, 1\] 0 \+ 1 = 1 — minimum/);
  await fill(page,'#edit-source','a');await fill(page,'#edit-target','b');await fill(page,'#edit-substitute','4');await click(page,'#edit-compute');
  assert.equal(await text(page,'#edit-minimum'),'2');assert.match(await text(page,'#edit-details'),/2 predecessor choices tie/);
  await click(page,'#edit-next');await click(page,'#edit-next');
  assert.equal(await text(page,'#edit-replay-text'),'"b"');
  const {raw}=await download(page,'#edit-download-experiment'),record=JSON.parse(raw);
  assert.deepEqual(record.input,{source:'a',target:'b',costs:{insert:1,delete:1,substitute:4}});
  assert.equal(record.distance,2);assert.equal(record.replay.at(-1).text,'b');
  assert.deepEqual(record.alignment.map(x=>x.kind),['insert','delete']);
 });
 await group('draft and refusal retire all experiment surfaces while static lesson stays exact',async()=>{
  const first=await download(page,'#edit-download-lesson');assert.deepEqual(first.raw,lessonBytes);
  await fill(page,'#edit-source','x'.repeat(17));
  assert.equal(await page.$eval('#edit-result',el=>el.hidden),true);
  assert.equal(await page.$eval('#edit-download-experiment',el=>el.disabled),true);
  assert.equal(await text(page,'#edit-matrix'),'');assert.equal(await text(page,'#edit-alignment'),'');
  await click(page,'#edit-compute');assert.match(await text(page,'#edit-status'),/at most 16/);
  assert.equal(await page.$eval('#edit-result',el=>el.hidden),true);
  course=await download(page,'#edit-download-lesson');assert.deepEqual(course.raw,first.raw);
 });
 await group('literal scalar case, keyboard table navigation and390px layout',async()=>{
  await fill(page,'#edit-source','é');await fill(page,'#edit-target','e\u0301');await fill(page,'#edit-substitute','1');await click(page,'#edit-compute');
  assert.equal(await text(page,'#edit-minimum'),'2');
  await page.focus('#edit-matrix button[aria-pressed="true"]');await page.keyboard.press('ArrowLeft');
  assert.equal(await page.$eval('#edit-column',el=>el.value),'1');
  await page.setViewport({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.bringToFront();await page.screenshot({path:join(out,'phone.png'),fullPage:true});
 });
 await group('direct-file standalone retains exact original course and works without server requests',async()=>{
  const offline=await setupPage();await offline.goto(pathToFileURL(join(out,'offline/edit-distance-explorer.html')).href);
  await offline.waitForFunction(()=>document.querySelector('#edit-minimum')?.textContent==='1');
  const saved=await download(offline,'#edit-download-lesson');assert.deepEqual(saved.raw,lessonBytes);
  const guide=await download(offline,'#edit-download-guide');assert.deepEqual(guide.raw,await readFile(join(source,'courses/edit-distance.md')));
  await offline.close();
 });
 await group('genuine downloaded course through unchanged standalone learner and separate practice',async()=>{
  assert.ok(course);const learner=await setupPage();
  await learner.goto(pathToFileURL(join(out,'offline/demo.html')).href);
  await learner.waitForSelector('#deck-file');
  const initial=await text(learner,'#session-content');
  await (await learner.$('#deck-file')).uploadFile(course.record.path);
  await learner.waitForSelector('#start-deck');assert.match(await text(learner,'#deck-preview-title'),/Edit distance/);
  assert.equal(await text(learner,'#session-content'),initial);
  await click(learner,'#cancel-deck');assert.equal(await text(learner,'#session-content'),initial);
  await (await learner.$('#deck-file')).uploadFile(course.record.path);await learner.waitForSelector('#start-deck');await click(learner,'#start-deck');
  const seen=new Set();
  for(let n=0;n<12;n++){
   const prompt=await text(learner,'.question-card h2'),item=deck.items.find(item=>item.prompt===prompt);
   assert.ok(item);assert.equal(seen.has(item.id),false);seen.add(item.id);
   await click(learner,'[data-choice="'+(n%4===0?(item.answer+1)%item.options.length:item.answer)+'"]');await click(learner,'#next-button');
  }
  assert.equal(seen.size,12);const summary=await text(learner,'#first-try-summary');assert.match(summary,/9 of 12/);
  const mastery=await text(learner,'.mastery-box'),review=await firstReviewText(learner);
  await click(learner,'#practice-button');
  for(let n=0;n<3;n++){const prompt=await text(learner,'.practice-card h2'),item=deck.items.find(item=>item.prompt===prompt);assert.ok(item);await click(learner,'[data-practice-choice="'+item.answer+'"]');await click(learner,'#practice-next');}
  assert.match(await text(learner,'#practice-status'),/3 of 3 correctly on retry/);
  assert.equal(await text(learner,'#first-try-summary'),summary);assert.equal(await text(learner,'.mastery-box'),mastery);assert.equal(await firstReviewText(learner),review);
  assert.deepEqual(await learner.$$eval('.review-practice-answer strong',nodes=>nodes.map(node=>node.textContent)),Array(3).fill('Practice answer · correct on retry'));
  const notes=await download(learner,'#save-notes-button');assert.match(notes.raw.toString(),/Edit distance/);
  await learner.close();
 });
 assert.deepEqual(pageErrors,[]);assert.deepEqual(external,[]);
 await page.bringToFront();await page.setViewport({width:1280,height:950});await page.screenshot({path:join(out,'desktop.png'),fullPage:true});
}catch(error){groups.push({name:'setup or overall browser checks',pass:false,error:String(error.stack||error)});}
finally{
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
 const after=await pins();const unchanged=JSON.stringify(before)===JSON.stringify(after);
 await writeFile(join(out,'source-after.json'),JSON.stringify(after,null,2)+'\n');
 const result={node:process.version,source,groups,passed:groups.filter(x=>x.pass).length,failed:groups.filter(x=>!x.pass).length,source_unchanged:unchanged,pageErrors,external,requests,downloads:files};
 await writeFile(join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 if(result.failed||!unchanged||pageErrors.length||external.length)process.exitCode=1;
}
