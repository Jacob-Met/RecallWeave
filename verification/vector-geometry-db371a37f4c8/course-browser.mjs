// Receiving for course #17 through the import owner's final learner source.
// Run only against its frozen current-main composition, never the old snapshot.
// Reuses the qualified dependency-free native CDP transport pattern.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

const project = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)));
const courseRoot = fileURLToPath(new URL('../../', import.meta.url));
const browserPath = process.env.RECALLWEAVE_CHROMIUM ?? 'chromium';
const evidence = process.env.RECALLWEAVE_EVIDENCE_DIR ?? await fs.mkdtemp(path.join(os.tmpdir(),'recallweave-course-evidence-'));
const profileRoot = process.env.RECALLWEAVE_PROFILE_ROOT ?? os.tmpdir();
const coursePath = path.join(courseRoot,'courses/vector-geometry.json');
const explorerPath = path.join(courseRoot,'courses/vector-geometry-explorer.html');
const sourcePaths = ['index.html','styles.css','demo.html','data/deck.json','tools/make_demo.py',
  ...(await fs.readdir(path.join(project,'src'))).filter(name=>name.endsWith('.mjs')).map(name=>'src/'+name)];
for(const required of ['src/deck.mjs','src/deck-picker.mjs','src/session-export.mjs','src/answer-order.mjs','src/trace-archive.mjs']){
  assert.ok(sourcePaths.includes(required),`Final receiver must retain ${required}.`);
}
const sha = bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const hashes = async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async name=>[name,sha(await fs.readFile(path.join(project,name)))])));
const sourceSha256 = await hashes();
const courseBytes=await fs.readFile(coursePath), explorerBytes=await fs.readFile(explorerPath);
const load=name=>import(pathToFileURL(path.join(project,name)).href);
const [{parseDeck},{initialMastery,updateMastery},{createReview,beginPractice,currentPracticeItem,answerPractice},{createStudyNotes}]
  =await Promise.all(['src/deck.mjs','src/knowledge.mjs','src/review.mjs','src/session-export.mjs'].map(load));
const deck=parseDeck(courseBytes.toString('utf8'));
await fs.mkdir(evidence,{recursive:true}); await fs.mkdir(profileRoot,{recursive:true});
const profile=await fs.mkdtemp(path.join(profileRoot,'recallweave-course-db371a37f4c8-production-'));
const downloads=await fs.mkdtemp(path.join(evidence,'downloads-'));
const requests=[],exceptions=[],checks=[],begun=[],completed=[],notesEvidence=[];
let browser,socket,browserVersion,receipt,failure,serverClosed=false;
const server=http.createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path.resolve(project,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(project+path.sep))throw Error('Outside receiver root');
    const bytes=await fs.readFile(file);
    const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)];
    response.writeHead(200,{'content-type':(mime??'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const fileURL=pathToFileURL(path.join(project,'demo.html')).href;
const explorerURL=pathToFileURL(explorerPath).href;
let nextId=0;
const pending=new Map();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
    const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method))},15000);
    pending.set(id,{resolve,reject,timer,method});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
}
async function evaluate(sessionId,expression){
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
  return r.result.value;
}
async function until(check,label){
  const end=Date.now()+15000;
  while(Date.now()<end){if(await check())return;await delay(75)}
  throw Error('Timed out: '+label);
}
async function page(url,ready){
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  for(const method of ['Page.enable','Runtime.enable','Network.enable'])await send(method,{},sessionId);
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
  await send('Page.navigate',{url},sessionId);
  await until(()=>evaluate(sessionId,ready),'page ready '+url);
  return{targetId,sessionId};
}
async function activate(sessionId,selector){
  await evaluate(sessionId,`document.querySelector(${JSON.stringify(selector)}).focus()`);
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{
    type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r'}:{})},sessionId);
}
async function upload(sessionId,filename){
  const handle=await send('Runtime.evaluate',{expression:'document.querySelector("#deck-file")',returnByValue:false},sessionId);
  assert.ok(!handle.exceptionDetails&&handle.result.objectId,'Importer must expose its real file input.');
  try{
    await send('DOM.setFileInputFiles',{objectId:handle.result.objectId,files:[filename]},sessionId);
  }finally{await send('Runtime.releaseObject',{objectId:handle.result.objectId},sessionId)}
  await until(()=>evaluate(sessionId,'Boolean(document.querySelector("#start-deck"))'),'local course preview');
}
async function text(sessionId,selector){return evaluate(sessionId,`document.querySelector(${JSON.stringify(selector)}).textContent`)}
async function snapshot(sessionId){return evaluate(sessionId,`({
  summary:document.querySelector('#first-try-summary')?.textContent,
  estimates:[...document.querySelectorAll('.mastery-box output')].map(e=>e.textContent),
  step:document.querySelector('#step-count')?.textContent,
  overflow:document.documentElement.scrollWidth>innerWidth+1,
  review:[...document.querySelectorAll('.review-item')].map(e=>({prompt:e.querySelector('.review-prompt').textContent,
    answers:[...e.querySelectorAll('.review-answers dd')].map(c=>c.textContent),body:e.querySelector('.review-body').textContent})),
})`)}
async function screenshot(sessionId,name,selector){
  await evaluate(sessionId,`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
  await fs.writeFile(path.join(evidence,name),Buffer.from(shot.data,'base64'));
}
async function downloadAfter(prior){
  await until(()=>completed.length>prior,'actual browser download');
  const done=completed.at(-1),start=begun.find(record=>record.guid===done.guid);
  const filename=done.filePath??path.join(downloads,done.guid);
  return{filename,suggestedFilename:start.suggestedFilename,bytes:await fs.readFile(filename)};
}
async function notes(sessionId,label,input){
  const prior=completed.length;
  await activate(sessionId,'#save-notes-button');
  const downloaded=await downloadAfter(prior),body=downloaded.bytes.toString('utf8');
  const timestamp=body.match(/^Saved: (.+)$/m)?.[1];assert.ok(timestamp,'Actual saved timestamp is present.');
  const expected=createStudyNotes({...input,exportedAt:timestamp});
  assert.equal(downloaded.suggestedFilename,expected.filename);
  assert.equal(body,expected.text,'Every downloaded field is associated with this actual course trace.');
  await fs.writeFile(path.join(evidence,label+'.txt'),downloaded.bytes);
  notesEvidence.push({label,filename:downloaded.suggestedFilename,bytes:downloaded.bytes.length,sha256:sha(downloaded.bytes)});
}

try{
  browserVersion=execFileSync(browserPath,['--version'],{encoding:'utf8',timeout:45000}).trim();
  browser=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--password-store=basic',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  const endpoint=await new Promise((resolve,reject)=>{
    let log='';const timer=setTimeout(()=>reject(Error('Chromium startup: '+log.slice(-1500))),45000);
    browser.on('error',e=>{clearTimeout(timer);reject(e)});browser.on('exit',code=>{clearTimeout(timer);reject(Error('Chromium exited '+code+log.slice(-1500)))});
    browser.stderr.on('data',b=>{log+=b.toString();const found=log.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);if(found){clearTimeout(timer);resolve(found[1])}});
  });
  socket=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.id&&pending.has(m.id)){const t=pending.get(m.id);pending.delete(m.id);clearTimeout(t.timer);m.error?t.reject(Error(t.method+': '+JSON.stringify(m.error))):t.resolve(m.result)}
    if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);
    if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
    if(m.method==='Browser.downloadWillBegin')begun.push(m.params);
    if(m.method==='Browser.downloadProgress'&&m.params.state==='completed')completed.push(m.params);
  });
  await send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true});
  const explorer=await page(explorerURL,'Boolean(document.querySelector("#value-p")?.textContent)');
  await activate(explorer.sessionId,'#download-course');
  const actualCourse=await downloadAfter(0);
  assert.equal(actualCourse.suggestedFilename,'vector-geometry.json');assert.deepEqual(actualCourse.bytes,courseBytes);
  await send('Target.closeTarget',{targetId:explorer.targetId});
  checks.push('Course file comes from the real standalone explorer download, with the exact admitted bytes.');

  for(const [mode,url] of [['modular',origin+'/'],['standalone',fileURL]]){
    if(mode==='standalone'){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));serverClosed=true}
    const {targetId,sessionId}=await page(url,'Boolean(document.querySelector("#start-button") && document.querySelector("#deck-file") && document.querySelector("#trace-archive").children.length)');
    const before=await evaluate(sessionId,'document.querySelector("#session-content").innerHTML');
    await upload(sessionId,actualCourse.filename);
    assert.equal(await text(sessionId,'#deck-preview-title'),deck.title);
    assert.ok((await text(sessionId,'.deck-preview-count')).includes('12 questions · 6 concepts'));
    assert.ok((await text(sessionId,'.deck-preview-attribution')).includes(deck.attribution));
    assert.ok((await text(sessionId,'.deck-preview-license')).includes(deck.license));
    assert.deepEqual(await evaluate(sessionId,'[...document.querySelectorAll(".deck-questions li strong")].map(e=>e.textContent)'),deck.items.map(item=>item.prompt));
    assert.equal(await evaluate(sessionId,'document.querySelector("#session-content").innerHTML'),before);
    if(mode==='modular'){
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sessionId);
      assert.equal((await snapshot(sessionId)).overflow,false);await screenshot(sessionId,'course-preview-mobile.png','#deck-preview');
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
    }
    await activate(sessionId,'#start-deck');
    await until(()=>evaluate(sessionId,'Boolean(document.querySelector("[data-choice]"))'),'explicit imported lesson start');
    assert.equal(await text(sessionId,'#lesson-description'),deck.title);
    assert.equal(await text(sessionId,'#step-count'),'0 / 12');
    assert.deepEqual(await evaluate(sessionId,'[...document.querySelectorAll(".mastery-row > span")].map(e=>e.textContent)'),deck.concepts);
    checks.push(mode+': real file preview retains all12 prompts and attribution; explicit start installs six course concepts without preview mutation.');

    const answers=[],seen=new Set(),mastery=initialMastery(deck.concepts);
    for(let index=0;index<12;index++){
      const prompt=await text(sessionId,'.question-card h2'),item=deck.items.find(item=>item.prompt===prompt);
      assert.ok(item&&!seen.has(item.id));seen.add(item.id);
      const options=await evaluate(sessionId,`[...document.querySelectorAll('[data-choice]')].map(e=>{
        const clone=e.cloneNode(true);clone.querySelector('.choice-key').remove();return{index:Number(e.dataset.choice),text:clone.textContent};})`);
      assert.deepEqual(options.map(option=>option.index).sort(),[0,1,2,3]);
      for(const option of options)assert.equal(option.text,item.options[option.index]);
      const correct=index%3!==0,choice=correct?item.answer:(item.answer+1)%4;
      await activate(sessionId,`[data-choice="${choice}"]`);
      const feedback=await text(sessionId,'#feedback-slot');
      assert.ok(feedback.includes(item.explanation)&&feedback.includes(item.transfer));
      assert.equal(await evaluate(sessionId,`document.querySelector('[data-choice="${choice}"]').classList.contains(${JSON.stringify(correct?'correct':'incorrect')})`),true);
      answers.push({item:item.id,choice});mastery[item.concept]=updateMastery(mastery[item.concept],correct);
      await activate(sessionId,'#next-button');
    }
    let state=await snapshot(sessionId);const review=createReview(deck.items,answers);
    assert.match(state.summary,/8 of 12/);assert.equal(state.step,'12 / 12');
    assert.deepEqual(state.estimates,deck.concepts.map(concept=>`${Math.round(mastery[concept]*100)}%`));
    assert.equal(state.review.length,12);
    review.forEach((item,i)=>{
      assert.equal(state.review[i].prompt,item.prompt);
      assert.deepEqual(state.review[i].answers,[item.options[item.choice],item.options[item.answer]]);
      assert.ok(state.review[i].body.includes(item.explanation)&&state.review[i].body.includes(item.transfer));
    });
    const attribution=await text(sessionId,'.source-note');assert.ok(attribution.includes(deck.attribution)&&attribution.includes(deck.license));
    assert.doesNotMatch(attribution,/OpenStax/);assert.doesNotMatch(await text(sessionId,'.reflection'),/sunlight|cellular processes/);
    const firstState={summary:state.summary,estimates:state.estimates};
    const input={deck,review,mastery};await notes(sessionId,mode+'-unstarted-notes',input);
    checks.push(mode+': all12 unique questions preserve canonical choices, exact feedback and review; downloaded notes retain every actual course field.');

    let practice=beginPractice(review);await activate(sessionId,'#practice-button');
    let count=0;
    while(currentPracticeItem(practice)){
      const item=currentPracticeItem(practice);assert.equal(await text(sessionId,'.practice-card h2'),item.prompt);
      const choice=count%2===0?item.answer:(item.answer+1)%4;
      await activate(sessionId,`[data-practice-choice="${choice}"]`);
      assert.ok((await text(sessionId,'#practice-feedback')).includes(item.explanation));
      practice=answerPractice(practice,item.id,choice);count++;
      if(count===1){
        await activate(sessionId,'#back-to-review');await notes(sessionId,mode+'-paused-notes',{...input,practice});
        state=await snapshot(sessionId);assert.deepEqual({summary:state.summary,estimates:state.estimates},firstState);
        await activate(sessionId,'#practice-button');
      }else await activate(sessionId,'#practice-next');
    }
    state=await snapshot(sessionId);assert.deepEqual({summary:state.summary,estimates:state.estimates},firstState);
    assert.match(await text(sessionId,'#practice-status'),/2 of 4 correctly/);
    await notes(sessionId,mode+'-completed-notes',{...input,practice});
    assert.equal(await evaluate(sessionId,'document.querySelectorAll(".review-practice-answer").length'),4);
    if(mode==='modular'){
      await evaluate(sessionId,'document.querySelector(".review-item").open=true');
      await screenshot(sessionId,'course-review-desktop.png','.result-card');
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sessionId);
      assert.equal((await snapshot(sessionId)).overflow,false);await screenshot(sessionId,'course-review-mobile.png','.result-card');
    }
    checks.push(mode+': four initially missed questions support paused/resumed practice; downloaded notes keep first answers and model estimates unchanged.');
    await send('Target.closeTarget',{targetId});
  }
  assert.deepEqual(exceptions,[]);
  assert.ok(requests.every(url=>url.startsWith(origin+'/')||url===fileURL||url===explorerURL||url.startsWith('blob:')));
  assert.deepEqual(await hashes(),sourceSha256);assert.deepEqual(await fs.readFile(coursePath),courseBytes);assert.deepEqual(await fs.readFile(explorerPath),explorerBytes);
  checks.push('Final learner source, course and explorer are unchanged; no external page request or uncaught page exception.');
  receipt={status:'pass',node:process.version,browser:browserVersion,actualBrowser:true,sourceSha256,
    courseSha256:sha(courseBytes),explorerSha256:sha(explorerBytes),checks,notesEvidence,requests,
    modularServing:'real isolated loopback HTTP',standaloneServing:'fresh file:// page after HTTP server shutdown',
    syntheticAnswerFixture:true,learningEfficacyClaimed:false};
}catch(error){failure=error;receipt={status:'fail',node:process.version,browser:browserVersion,sourceSha256,checks,requests,exceptions,error:{message:error.message,stack:error.stack}}}
finally{
  if(socket?.readyState===WebSocket.OPEN)await Promise.race([send('Browser.close').catch(()=>{}),delay(3000)]);socket?.close();
  if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),delay(4000)]);if(browser.exitCode===null)browser.kill('SIGKILL')}
  if(!serverClosed){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
  await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});for(const t of pending.values())clearTimeout(t.timer);
}
await fs.writeFile(path.join(evidence,'course-browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
if(failure)throw failure;
