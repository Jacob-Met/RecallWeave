#!/usr/bin/env node
'use strict';
// Optional real-browser receiving. Node 22+ and an existing Chrome/Chromium only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {spawn} = require('node:child_process');
const {createServer} = require('node:http');
const {pathToFileURL} = require('node:url');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const output = path.resolve(process.argv[3] || path.join(root, 'learner-leave-receiving'));
const executable = process.env.CHROME_PATH;
assert.ok(executable, 'Set CHROME_PATH to an existing Chrome/Chromium executable');
assert.ok(!output.startsWith(root + path.sep), 'Keep receiving output outside the offered source');
fs.mkdirSync(output, {mode: 0o700});
const profile = path.join(output, 'browser-profile');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const snapshotSource = () => {
  const result = {};
  for (const name of ['index.html', 'styles.css', 'demo.html', 'data/deck.json', ...fs.readdirSync(path.join(root, 'src')).filter(n => n.endsWith('.mjs')).map(n => 'src/' + n)]) {
    const bytes = fs.readFileSync(path.join(root, name));
    result[name] = {bytes: bytes.length, sha256: hash(bytes)};
  }
  return result;
};
const report = {kind:'RecallWeave learner leave browser course', node:process.version, platform:process.platform,
  source:snapshotSource(), groups:[], dialogs:[], downloads:[], pageErrors:[], outsideRequests:[], browserClosed:false};
const deck = JSON.parse(fs.readFileSync(path.join(root, 'data/deck.json'), 'utf8'));
let browser, socket, sessionId, targetId, server, base, browserLog = '', nextId = 0, downloadIndex = 0;
let dialogAccept = false;
const pending = new Map(), downloads = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, name, timeout = 10000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try { const value = await check(); if (value) return value; } catch (e) { last = e; }
    await sleep(50);
  }
  throw new Error('Timed out: ' + name + (last ? ' (' + last.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function click(selector) {
  const point = await evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e || e.disabled) throw Error('Unavailable control'); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); if(!r.width || !r.height) throw Error('Hidden control'); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await command('Input.dispatchMouseEvent', {...point, type, button:'left', clickCount:1});
}
async function fill(selector, text) {
  await click(selector);
  assert.deepEqual(await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.select();return [document.activeElement===e,e.selectionStart,e.selectionEnd,e.value.length]})()`), [true,0,await evaluate(`document.querySelector(${JSON.stringify(selector)}).value.length`),await evaluate(`document.querySelector(${JSON.stringify(selector)}).value.length`)]);
  await command('Input.insertText', {text});
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`), text);
}
async function panel(selector) {
  if (!await evaluate(`document.querySelector(${JSON.stringify(selector)}).open`)) await click(selector + ' > summary');
}
async function fresh(url) {
  if (targetId) await command('Target.closeTarget', {targetId}, false);
  ({targetId} = await command('Target.createTarget', {url:'about:blank'}, false));
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten:true}, false));
  for (const method of ['Page.enable','Runtime.enable','Network.enable']) await command(method);
  await command('Fetch.enable', {patterns:[{urlPattern:'*'}]});
  await command('Emulation.setDeviceMetricsOverride', {width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate', {url});
  await until(() => evaluate(`document.readyState==='complete' && !!document.querySelector('#start-button')`), 'fresh learner');
}
async function state() {
  return evaluate(`({step:document.querySelector('#step-count').textContent,content:document.querySelector('#session-content').innerHTML,fields:[...document.querySelectorAll('#session-content textarea')].map(e=>[e.id,e.value])})`);
}
async function refresh(expectPrompt, accept = false) {
  const before = await state(), first = report.dialogs.length;
  const token = String(Date.now()) + '-' + first;
  await evaluate(`window.__receivingDocument=${JSON.stringify(token)}`);
  dialogAccept = accept;
  await command('Page.reload');
  await until(async () => expectPrompt && !accept ? report.dialogs.length > first : await evaluate(`window.__receivingDocument!==${JSON.stringify(token)} && document.readyState==='complete' && !!document.querySelector('#start-button')`), 'refresh outcome');
  await sleep(150);
  const observed = report.dialogs.slice(first);
  assert.equal(observed.length, expectPrompt ? 1 : 0, 'Actual beforeunload dialog count');
  if (expectPrompt) assert.equal(observed[0].type, 'beforeunload');
  if (expectPrompt && !accept) assert.deepEqual(await state(), before, 'Cancel preserves rendered lesson and literal fields');
  if (!expectPrompt || accept) assert.equal((await state()).step, '0 / 6');
}
async function save(selector, label, denied = false) {
  const directory = path.join(output, 'download-' + (++downloadIndex));
  fs.mkdirSync(directory);
  await command('Browser.setDownloadBehavior', {behavior:denied?'deny':'allow', downloadPath:directory,eventsEnabled:true}, false);
  const previous = new Set(downloads.keys());
  await click(selector);
  const entry = await until(() => [...downloads.values()].find(d => !previous.has(d.guid) && ['completed','canceled'].includes(d.state)), 'download result');
  assert.equal(entry.state, denied ? 'canceled' : 'completed');
  const result = {label, ...entry, directory:path.basename(directory)};
  if (!denied) {
    const file = path.join(directory, entry.suggestedFilename);
    assert.equal(path.dirname(file), directory);
    await until(() => fs.existsSync(file), 'download file');
    const bytes = fs.readFileSync(file);
    Object.assign(result, {file:path.relative(output,file),bytes:bytes.length,sha256:hash(bytes)});
  } else assert.deepEqual(fs.readdirSync(directory), []);
  report.downloads.push(result);
  return result.file ? path.join(output,result.file) : null;
}
async function chooseFile(selector, filename, preview) {
  const {result} = await command('Runtime.evaluate', {expression:`document.querySelector(${JSON.stringify(selector)})`});
  await command('DOM.setFileInputFiles', {files:[filename],objectId:result.objectId});
  await until(() => evaluate(`!document.querySelector(${JSON.stringify(preview)}).hidden`), 'real archive preview');
}
async function answerAll() {
  if (await evaluate(`!!document.querySelector('#start-button')`)) await click('#start-button');
  for (let count=0; count<deck.items.length; count++) {
    if (await evaluate(`!!document.querySelector('.result-card')`)) break;
    if (!await evaluate(`!!document.querySelector('#next-button')`)) {
      const prompt = await evaluate(`document.querySelector('.question-card h2').textContent`);
      const item = deck.items.find(i=>i.prompt===prompt);
      assert.ok(item, 'Question comes from offered native deck');
      await click(`[data-choice="${(item.answer+1)%item.options.length}"]`);
    }
    await click('#next-button');
  }
  assert.equal(await evaluate(`!!document.querySelector('.result-card')`), true);
}
const archive = file => { const value=JSON.parse(fs.readFileSync(file,'utf8')); delete value.savedAt; return value; };
async function group(name, url, run) {
  try { await fresh(url); await run(); report.groups.push({name,passed:true}); }
  catch (e) { report.groups.push({name,passed:false,error:e.stack}); }
  console.log(JSON.stringify(report.groups.at(-1)));
}
async function course(kind, url) {
  await group(kind + ': empty and unanswered refresh',url,async()=>{
    await click('#page-title'); await refresh(false);
    await click('#start-button'); await panel('#lesson-archive-panel');
    const zero=await save('#save-lesson-button',kind+' zero-answer archive');
    await refresh(false);
    await panel('#lesson-archive-panel'); await chooseFile('#lesson-file',zero,'#lesson-preview');
    await click('#resume-lesson-confirm'); await refresh(false);
  });
  await group(kind + ': partial answers and download outcomes',url,async()=>{
    await click('#start-button'); await click('[data-choice]');
    await panel('#lesson-archive-panel');
    const before=await save('#save-lesson-button',kind+' partial before refresh');
    await refresh(true);
    const after=await save('#save-lesson-button',kind+' partial after canceled refresh');
    assert.deepEqual(archive(after),archive(before),'Actual saved answers, model and ordering survive canceled refresh');
    await save('#save-lesson-button',kind+' denied partial download',true); await refresh(true);
    await evaluate(`window.__receivingCreateObjectURL=URL.createObjectURL;URL.createObjectURL=()=>{throw Error('declared receiving save failure')}`);
    await click('#save-lesson-button');
    assert.match(await evaluate(`document.querySelector('#save-lesson-status').textContent`),/could not be prepared/);
    await evaluate(`URL.createObjectURL=window.__receivingCreateObjectURL;delete window.__receivingCreateObjectURL`);
    await refresh(true);
    await chooseFile('#lesson-file',before,'#lesson-preview'); await click('#resume-lesson-cancel'); await refresh(true);
    await chooseFile('#lesson-file',before,'#lesson-preview'); await click('#resume-lesson-confirm'); await refresh(true);
    await refresh(true,true);
  });
  await group(kind + ': completed writing practice trace and reset',url,async()=>{
    await answerAll();
    await click('.review-item > summary'); await fill('#reflection-0','Learner explanation — literal <text> & details.');
    await fill('#application-reflection','I can use this connection in my own example.');
    await click('#practice-button'); await click('[data-practice-choice]'); await click('#back-to-review');
    const notes=await save('#save-notes-button',kind+' actual written notes');
    const text=fs.readFileSync(notes,'utf8'); assert.ok(text.includes('Learner explanation — literal <text> & details.')); assert.ok(text.includes('I can use this connection in my own example.'));
    await refresh(true);
    await panel('#trace-archive-panel'); const trace=await save('#save-trace-button',kind+' actual trace with practice');
    const saved=JSON.parse(fs.readFileSync(trace,'utf8')); assert.equal(saved.firstAnswers.length,6); assert.equal(saved.practice.answers.length,1);
    await chooseFile('#trace-file',trace,'#trace-preview'); await click('#restore-trace-cancel'); await refresh(true);
    await chooseFile('#trace-file',trace,'#trace-preview'); await click('#restore-trace-confirm'); await refresh(true);
    assert.equal(await evaluate(`document.querySelector('#application-reflection').value`),'I can use this connection in my own example.');
    await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'No horizontal overflow at 390px');
    await evaluate('window.scrollTo(0,0)');
    const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(output,kind+'-390.png'),Buffer.from(shot.data,'base64'),{flag:'wx'});
    await click('#reset-button'); await refresh(false);
  });
  await group(kind + ': zero-answer restore retains whitespace writing',url,async()=>{
    await click('#start-button'); await panel('#lesson-archive-panel'); const zero=await save('#save-lesson-button',kind+' zero for writing restore');
    await answerAll(); await click('.review-item > summary'); await fill('#reflection-0',' \n  ');
    await fill('#application-reflection','Writing survives an explicit zero-answer resume.');
    await chooseFile('#lesson-file',zero,'#lesson-preview'); await click('#resume-lesson-confirm');
    assert.equal((await state()).step,'0 / 6'); await refresh(true);
    await answerAll();
    assert.equal(await evaluate(`document.querySelector('#reflection-0').value`),' \n  ');
    assert.equal(await evaluate(`document.querySelector('#application-reflection').value`),'Writing survives an explicit zero-answer resume.');
    // Only literal whitespace remains after the second zero-answer resume.
    await fill('#application-reflection','');
    await chooseFile('#lesson-file',zero,'#lesson-preview'); await click('#resume-lesson-confirm'); await refresh(true);
    await answerAll(); await click('#reset-button'); await refresh(false);
  });
}
(async()=>{
  try {
    server=createServer((request,response)=>{
      try {
        const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
        const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
        if(!file.startsWith(root+path.sep)) {response.writeHead(403).end();return;}
        const body=fs.readFileSync(file);
        const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
        response.writeHead(200,{'Content-Type':mime+'; charset=utf-8'}).end(body);
      } catch {response.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); base='http://127.0.0.1:'+server.address().port;
    browser=spawn(executable,['--headless=new','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
    browser.stderr.on('data',b=>{browserLog=(browserLog+b).slice(-12000)});
    let launchError; browser.on('error',e=>{launchError=e});
    const endpoint=await until(()=>{
      if(launchError) throw launchError;
      // Windows Chrome may relaunch into its own process and exit its launcher with 0.
      if(browser.exitCode!==null && browser.exitCode!==0) throw Error('Browser launcher exited '+browser.exitCode);
      const [port,endpoint]=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/); return port&&endpoint&&'ws://127.0.0.1:'+port+endpoint;
    },'browser startup',20000);
    socket=new WebSocket(endpoint);
    socket.addEventListener('message',event=>{
      const m=JSON.parse(event.data);
      if(m.id) {const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);return;}
      if(m.method==='Runtime.exceptionThrown') report.pageErrors.push(m.params.exceptionDetails);
      if(m.method==='Fetch.requestPaused') {
        const url=m.params.request.url,allowed=url.startsWith(base+'/')||url===pathToFileURL(path.join(root,'demo.html')).href||/^(data:|blob:|about:)/.test(url);
        if(!allowed)report.outsideRequests.push(url);
        command(allowed?'Fetch.continueRequest':'Fetch.failRequest',{requestId:m.params.requestId,...(!allowed?{errorReason:'BlockedByClient'}:{})}).catch(e=>report.pageErrors.push(String(e)));
      }
      if(m.method==='Page.javascriptDialogOpening') {
        report.dialogs.push({type:m.params.type,message:m.params.message,accept:dialogAccept});
        command('Page.handleJavaScriptDialog',{accept:dialogAccept}).catch(e=>report.pageErrors.push(String(e)));
      }
      if(m.method==='Browser.downloadWillBegin')downloads.set(m.params.guid,{...m.params});
      if(m.method==='Browser.downloadProgress')Object.assign(downloads.get(m.params.guid)||{},m.params);
    });
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
    report.browser=await command('Browser.getVersion',{},false);
    await course('modular',base+'/index.html');
    await course('standalone',pathToFileURL(path.join(root,'demo.html')).href);
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.outsideRequests,[]);
    assert.deepEqual(snapshotSource(),report.source); report.sourcePreserved=true;
    report.passed=report.groups.length===8&&report.groups.every(g=>g.passed);
  }catch(e){report.fatal=e.stack;report.passed=false;}
  finally {
    if(socket?.readyState===WebSocket.OPEN) {
      try {await command('Browser.close',{},false)} catch(e){report.closeRequest=String(e)}
      await until(()=>socket.readyState===WebSocket.CLOSED,'browser connection closed',5000).then(()=>{report.browserClosed=true},e=>{report.closeError=String(e)});
      report.launcherExitCode=browser.exitCode;
      socket.close();
    }
    if(server) await new Promise(resolve=>server.close(resolve));
    report.browserLog=browserLog;report.finished=new Date().toISOString();
    fs.writeFileSync(path.join(output,'learner-leave-browser.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({passed:report.passed,groups:report.groups.filter(g=>g.passed).length,total:report.groups.length,browserClosed:report.browserClosed,sourcePreserved:report.sourcePreserved}));
    if(!report.passed||!report.browserClosed)process.exitCode=1;
  }
})();
