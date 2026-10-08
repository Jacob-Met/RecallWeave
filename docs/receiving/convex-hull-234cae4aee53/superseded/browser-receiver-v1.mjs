#!/usr/bin/env node
/**
 * Permitted-local-route receiver only. This script does not install a browser,
 * invoke GitHub Actions, discover hosts, or modify repository source.
 * Node >=22; explicit installed Chrome path; explicit complete source pin file.
 * node tools/check-convex-hull-browser.mjs SOURCE CHROME NEW_OUTPUT EXPECTED_PINS
 * EXPECTED_PINS: [{"path":"demo.html","sha256":"..."}, ...all served source/assets].
 * Output/profile must be new. The full source/manifest and first failed outputs
 * must be retained alongside any later successful run.
 */
import { readFile, writeFile, mkdir, readdir, realpath, statfs } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { freemem } from 'node:os';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
if (args.length !== 4 || Number(process.versions.node.split('.')[0]) < 22 || typeof WebSocket !== 'function') {
  console.error('Requires Node >=22: node tools/check-convex-hull-browser.mjs SOURCE CHROME NEW_OUTPUT EXPECTED_PINS');
  process.exit(2);
}
const [sourceArg, chromeArg, outputArg, expectedArg] = args;
const source = await realpath(resolve(sourceArg)), chrome = await realpath(resolve(chromeArg));
const output = resolve(outputArg), expectedFile = resolve(expectedArg);
const capacity = await statfs(dirname(output));
if (capacity.bavail * capacity.bsize < 1024 ** 3 || freemem() < 512 * 1024 ** 2) {
  throw new Error('Receiving requires at least 1 GiB free output capacity and 512 MiB available memory.');
}
await mkdir(output); // Exclusive namespace: existing output is always refused.
const profile = join(output, 'profile'); await mkdir(profile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [], observations = [], errors = [], requests = [], served = [], networkFailures = [];
const before = {}, after = {}, files = new Map();
let failure = null, version = null, child = null, socket = null, server = null, origin = null;
let stdout = '', stderr = '', processError = null, timedOut = false;
let serial = 0;
const pending = new Map();
const check = (name, fn) => { fn(); checks.push(name); };
async function until(fn, message, limit = 160) {
  let last;
  for (let i = 0; i < limit; i++) {
    try { const value = await fn(); if (value) return value; } catch (error) { last = error; }
    await pause(50);
  }
  throw new Error(message + (last ? ': ' + last.message : ''));
}
function send(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, {
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
    if (!socket || socket.readyState !== 1) { pending.delete(id); clearTimeout(timer); reject(new Error('CDP is closed')); return; }
    socket.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const value = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
  return value.result.value;
}
async function click(selector) {
  const box = await evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');if(!e||e.disabled)throw Error("Unavailable control");e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await send('Input.dispatchMouseEvent', {type:'mousePressed', button:'left', clickCount:1, ...box});
  await send('Input.dispatchMouseEvent', {type:'mouseReleased', button:'left', clickCount:1, ...box});
}
async function key(key, code, virtual, modifiers = 0) {
  const p = {key, code, windowsVirtualKeyCode: virtual, modifiers};
  await send('Input.dispatchKeyEvent', {type:'keyDown', ...p});
  await send('Input.dispatchKeyEvent', {type:'keyUp', ...p});
}
async function fill(selector, text) {
  await click(selector);
  await key('a', 'KeyA', 65, process.platform === 'darwin' ? 4 : 2);
  await send('Input.insertText', {text});
}
async function screenshot(name) {
  const image = await send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(join(output, name), Buffer.from(image.data, 'base64'));
}
async function navigate(path, ready) {
  await send('Page.navigate', {url: origin + '/' + path});
  await until(() => evaluate(ready), 'Page did not become ready: ' + path);
}
async function upload(selector, file) {
  const {root} = await send('DOM.getDocument');
  const {nodeId} = await send('DOM.querySelector', {nodeId:root.nodeId, selector});
  assert.ok(nodeId);
  await send('DOM.setFileInputFiles', {nodeId, files:[file]});
}
async function download(selector, folder, filename) {
  const destination = join(output, folder); await mkdir(destination);
  await send('Browser.setDownloadBehavior', {behavior:'allow', downloadPath:destination});
  await click(selector);
  const file = filename ? join(destination, filename) : await until(async () => {
    const names = await readdir(destination);
    const name = names.find(name => !name.endsWith('.crdownload'));
    return name && join(destination, name);
  }, 'Download did not start');
  let previous = null;
  const bytes = await until(async () => {
    const bytes = await readFile(file);
    const current = hash(bytes);
    if (bytes.length && current === previous) return bytes;
    previous = current; return false;
  }, 'Download did not stabilize');
  return {file, bytes};
}
async function snapshot(label) {
  const value = await evaluate('({summary:document.querySelector("#result-summary").textContent,step:document.querySelector("#step-summary").textContent,detail:document.querySelector("#step-detail").textContent,error:document.querySelector("#hull-error").textContent,previous:document.querySelector("#previous-step").disabled,next:document.querySelector("#next-step").disabled,final:document.querySelector("#final-step").disabled,download:document.querySelector("#download-trace").disabled,rows:[...document.querySelectorAll("#point-rows tr")].map(r=>[...r.cells].map(c=>c.textContent)),points:document.querySelectorAll("#hull-diagram circle").length,polygons:document.querySelectorAll("#hull-diagram polygon").length})');
  observations.push({label, ...value}); return value;
}
async function main() {
  const expectedBytes = await readFile(expectedFile);
  await writeFile(join(output, 'expected-source.json'), expectedBytes);
  const expected = JSON.parse(expectedBytes);
  assert.ok(Array.isArray(expected) && expected.length > 0 && expected.length <= 4096);
  let total = 0;
  for (const entry of expected) {
    assert.ok(entry && typeof entry.path === 'string' && /^[0-9a-f]{64}$/.test(entry.sha256));
    assert.ok(!isAbsolute(entry.path) && !entry.path.includes('\\') && !entry.path.split('/').some(p => !p || p === '.' || p === '..'));
    assert.ok(!files.has(entry.path));
    const path = await realpath(join(source, entry.path));
    const rel = relative(source, path);
    assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel));
    const bytes = await readFile(path);
    assert.ok(bytes.length <= 2 * 1024 ** 2);
    total += bytes.length; assert.ok(total <= 20 * 1024 ** 2);
    assert.equal(hash(bytes), entry.sha256, 'Source pin: ' + entry.path);
    before[entry.path] = entry.sha256; files.set(entry.path, bytes);
  }
  const required = ['courses/convex-hull-explorer.html','courses/convex-hull.json','courses/convex-hull.md',
    'src/convex-hull.mjs','src/convex-hull-ui.mjs','templates/convex-hull-explorer.html',
    'tools/build-convex-hull.mjs','tools/check-convex-hull-browser.mjs',
    'demo.html','src/app.mjs','src/deck.mjs','src/knowledge.mjs','src/review.mjs','src/session-export.mjs','data/deck.json'];
  for (const path of required) assert.ok(files.has(path), 'Missing mandatory source pin: ' + path);
  assert.equal(hash(await readFile(fileURLToPath(import.meta.url))), before['tools/check-convex-hull-browser.mjs'], 'Executed receiver source must match manifest');
  server = createServer((request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
      if (path === 'favicon.ico') { response.writeHead(204); response.end(); return; }
      const bytes = files.get(path);
      if (request.method !== 'GET' || !bytes) {
        networkFailures.push({method:request.method,path,status:404}); response.writeHead(404); response.end(); return;
      }
      served.push({path,sha256:hash(bytes)});
      const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.mjs') || path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.json') ? 'application/json' : path.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
      response.writeHead(200, {'Content-Type':type + '; charset=utf-8', 'Cache-Control':'no-store'}); response.end(bytes);
    } catch (error) {
      networkFailures.push({message:error.message}); response.writeHead(400); response.end();
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
  child = spawn(chrome, ['--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
    '--user-data-dir=' + profile,'--no-first-run','--no-default-browser-check','--disable-background-networking',
    '--disable-component-update','about:blank'], {stdio:['ignore','pipe','pipe']});
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  child.on('error', error => { processError = error.message; });
  const port = await until(async () => {
    if (processError) throw new Error(processError);
    const text = await readFile(join(profile, 'DevToolsActivePort'), 'utf8'); return text.split('\n')[0];
  }, 'Chrome did not publish a local debugging port');
  const tab = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', {method:'PUT'}).then(r => r.json());
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const p = pending.get(data.id); if (!p) return; pending.delete(data.id);
      data.error ? p.reject(new Error(JSON.stringify(data.error))) : p.resolve(data.result);
    } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params);
    else if (data.method === 'Network.requestWillBeSent') requests.push(data.params.request.url);
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP connection timeout')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, {once:true});
    socket.addEventListener('error', event => { clearTimeout(timeout); reject(new Error(String(event.message ?? 'CDP connection failed'))); }, {once:true});
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  version = await send('Browser.getVersion');
  await send('Emulation.setDeviceMetricsOverride', {width:1240,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('courses/convex-hull-explorer.html', '!!document.querySelector("#compute-hull")');
  let s = await snapshot('before-explicit-compute');
  check('explicit admission: default example has no stale result or downloadable trace', () => {
    assert.equal(s.download,true); assert.equal(s.points,0); assert.equal(s.rows.length,0);
  });
  await click('#compute-hull'); s = await snapshot('default-step-zero');
  check('rectangle preserves all input identities, duplicate representative and exact area', () => {
    assert.match(s.summary,/polygon.*P1 → P2 → P3 → P4.*twice-area 96.*area 48 /);
    assert.equal(s.rows.length,7); assert.equal(s.points,6);
    assert.deepEqual(s.rows[4],['P5','(0, 0)','P5','interior']);
    assert.deepEqual(s.rows[5],['P6','(0, -3)','P6','edge']);
    assert.deepEqual(s.rows[6],['P7','(4, -3)','P2 (duplicate)','vertex']);
    assert.match(s.step,/Step 1 of 23/); assert.equal(s.previous,true); assert.equal(s.next,false);
  });
  await click('#next-step'); await click('#next-step'); s = await snapshot('known-pop');
  check('actual next controls select the literal negative-turn removal', () => {
    assert.match(s.step,/Step 3 of 23 · lower · pop/);
    assert.match(s.detail,/Tested: P1 → P4 → P6/); assert.match(s.detail,/Exact determinant: -24/);
    assert.match(s.detail,/Remove P4/);
  });
  const trace = await download('#download-trace','selected-trace','convex-hull-trace.json');
  check('download retains complete trace separately from its selected cursor', () => {
    const value = JSON.parse(trace.bytes); assert.equal(value.format,'recallweave-convex-hull/1');
    assert.equal(value.selectedStep,2); assert.equal(value.steps.length,23); assert.equal(value.inputs.length,7);
    assert.equal(value.steps.at(-1).action,'complete'); assert.deepEqual(value.hull,['P1','P2','P3','P4']);
    assert.equal(value.area,48); assert.equal(value.steps[2].determinant,-24);
  });
  await click('#previous-step'); await click('#final-step'); s = await snapshot('complete-polygon');
  check('previous/final controls select the completed polygon', () => {
    assert.match(s.step,/Step 23 of 23 · complete/); assert.equal(s.polygons,1); assert.equal(s.next,true); assert.equal(s.final,true);
  });
  await screenshot('desktop-complete.png');
  const deckDownload = await download('#download-lesson','lesson-download','convex-hull.json');
  const guideDownload = await download('#download-guide','guide-download','convex-hull.md');
  check('actual lesson and guide downloads preserve exact published UTF-8 bytes', () => {
    assert.equal(hash(deckDownload.bytes),before['courses/convex-hull.json']);
    assert.equal(hash(guideDownload.bytes),before['courses/convex-hull.md']);
  });
  await fill('#points-input','[[0,0],[1,0],[0,1]]'); s = await snapshot('edited');
  check('edits immediately retire prior geometry, identities and downloads', () => {
    assert.equal(s.download,true); assert.equal(s.points,0); assert.equal(s.rows.length,0);
  });
  await click('#compute-hull'); s = await snapshot('half-area');
  check('integer inputs retain exact half-unit geometric area', () => assert.match(s.summary,/twice-area 1 · area 0.5 /));
  for (const [name,input,kind,rows] of [
    ['empty','[]','empty',0],['point','[[2,1],[2,1]]','point',2],
    ['vertical','[[2,3],[2,-1],[2,1],[2,1]]','segment',4],
  ]) {
    await fill('#points-input',input); await click('#compute-hull'); s = await snapshot(name);
    check('degenerate geometry: ' + name, () => {
      assert.match(s.summary,new RegExp('Complete result: ' + kind)); assert.equal(s.rows.length,rows);
      assert.match(s.summary,/twice-area 0 · area 0 /);
      if(name==='point') assert.deepEqual(s.rows[1],['P2','(2, 1)','P1 (duplicate)','vertex']);
      if(name==='vertical') { assert.match(s.summary,/P2 → P1/); assert.equal(s.rows[2][3],'edge'); assert.equal(s.rows[3][3],'edge'); }
    });
  }
  for (const input of ['[[21,0]]','[[0.5,0]]','[[null,0]]','</script><img src=x onerror=alert(1)>']) {
    await fill('#points-input',input); await click('#compute-hull'); s = await snapshot('refused:' + input);
    check('refused input retires current state: ' + input, () => {
      assert.ok(s.error); assert.equal(s.download,true); assert.equal(s.points,0); assert.equal(s.rows.length,0);
    });
  }
  await click('[data-hull-preset="rectangle"]'); s = await snapshot('preset-uncomputed');
  check('preset replacement requires explicit computation', () => assert.equal(s.download,true));
  await click('#compute-hull');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('window.scrollTo(0,0)'); await screenshot('phone-top.png');
  await evaluate('document.querySelector("#hull-diagram").scrollIntoView({block:"start"})'); await screenshot('phone-diagram.png');
  check('390-pixel view has no document horizontal overflow', () => {});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  await click('#compute-hull'); await key('Tab','Tab',9);
  assert.equal(await evaluate('document.activeElement.id'),'next-step');
  await key('Enter','Enter',13); s = await snapshot('keyboard-next');
  check('trusted Tab and Enter reach and activate the next available step', () => assert.match(s.step,/Step 2 of 23/));
  await send('Emulation.setDeviceMetricsOverride',{width:1240,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('demo.html','!!document.querySelector("#deck-file")');
  await upload('#deck-file',deckDownload.file);
  await until(()=>evaluate('!!document.querySelector("#start-deck")'),'Learner preview not ready');
  assert.match(await evaluate('document.querySelector("#deck-preview").textContent'),/Convex hulls: exact turns and outer boundaries/);
  await click('#start-deck');
  await until(()=>evaluate('!!document.querySelector(".question-card")'),'Imported lesson did not start');
  const deck = JSON.parse(deckDownload.bytes), seen = new Set(), first = [], missed = [];
  for (let index=0; index<12; index++) {
    const prompt = await evaluate('document.querySelector(".question-card h2").textContent');
    const item = deck.items.find(item=>item.prompt===prompt);
    assert.ok(item && !seen.has(item.id)); seen.add(item.id);
    const choice = index % 3 === 0 ? (item.answer+1)%item.options.length : item.answer;
    if(choice!==item.answer) missed.push(item.id);
    first.push({id:item.id,choice,correct:choice===item.answer});
    await click('[data-choice="'+choice+'"]');
    const feedback = await evaluate('document.querySelector("#feedback-slot").textContent');
    assert.ok(feedback.includes(item.explanation) && feedback.includes(item.transfer));
    await click('#next-button');
  }
  observations.push({label:'learner-first-answers',answers:first});
  const firstSummary = await evaluate('document.querySelector("#first-try-summary").textContent');
  const firstMastery = await evaluate('document.querySelector(".mastery-box").textContent');
  check('unchanged learner covers every original item and mixed first-attempt feedback', () => {
    assert.equal(seen.size,12); assert.match(firstSummary,/8 of 12/); assert.equal(missed.length,4);
  });
  await click('#practice-button');
  for(const id of missed) {
    const item=deck.items.find(item=>item.id===id);
    assert.equal(await evaluate('document.querySelector(".question-card h2").textContent'),item.prompt);
    await click('[data-practice-choice="'+item.answer+'"]');
    const feedback=await evaluate('document.querySelector("#practice-feedback").textContent');
    assert.ok(feedback.includes(item.explanation) && feedback.includes(item.transfer));
    await click('#practice-next');
  }
  check('practice preserves original first-attempt summary and mastery',()=>{});
  assert.equal(await evaluate('document.querySelector("#first-try-summary").textContent'),firstSummary);
  assert.equal(await evaluate('document.querySelector(".mastery-box").textContent'),firstMastery);
  assert.match(await evaluate('document.querySelector("#practice-status").textContent'),/4/);
  const notes = await download('#save-notes-button','study-notes');
  check('actual notes preserve all lesson content plus the first/practice distinction',()=>{
    const text=notes.bytes.toString('utf8');
    assert.match(text,/8 of 12 connections correct on the first try/);
    assert.match(text,/Complete: 4 of 4 practice answers recorded; 4 correct on retry/);
    for(const item of deck.items) for(const value of [item.prompt,item.explanation,item.transfer]) assert.ok(text.includes(value));
    assert.ok(text.includes(deck.attribution) && text.includes(deck.license));
  });
  await screenshot('learner-review.png');
  check('pages made no external requests, unmapped local requests or runtime exceptions',()=>{
    assert.deepEqual(errors,[]); assert.deepEqual(networkFailures,[]);
    assert.deepEqual(requests.filter(url=>!url.startsWith(origin+'/')&&!/^(?:blob:|data:|about:)/.test(url)),[]);
    assert.equal(processError,null); assert.equal(timedOut,false);
  });
}
const watchdog=setTimeout(()=>{timedOut=true;if(child)child.kill();if(socket)socket.close();},180000);
try { await main(); }
catch(error) {
  failure={name:error.name,message:error.message,stack:error.stack};
  try { await screenshot('failure.png'); } catch {}
} finally {
  clearTimeout(watchdog);
  if(socket?.readyState===1) { try { await send('Browser.close'); } catch {} socket.close(); }
  if(child && child.exitCode===null) { await pause(400); if(child.exitCode===null) child.kill(); }
  if(server) await new Promise(resolve=>server.close(resolve));
  for(const path of Object.keys(before)) {
    try { after[path]=hash(await readFile(join(source,path))); }
    catch(error) { after[path]={error:error.message}; }
  }
  if(JSON.stringify(before)!==JSON.stringify(after)&&!failure) failure={message:'Source changed during receiving'};
  await writeFile(join(output,'chrome.stdout.log'),stdout);
  await writeFile(join(output,'chrome.stderr.log'),stderr);
  async function inventory(dir,prefix='') {
    const entries=[];
    for(const entry of await readdir(dir,{withFileTypes:true})) {
      if(!prefix && (entry.name==='profile'||entry.name==='receipt.json')) continue;
      const path=join(dir,entry.name),name=prefix+entry.name;
      if(entry.isDirectory()) entries.push(...await inventory(path,name+'/'));
      else if(entry.isFile()) { const b=await readFile(path);entries.push({path:name,bytes:b.length,sha256:hash(b)}); }
    }
    return entries;
  }
  const receipt={format:'recallweave-convex-hull-browser-receiving/1',pass:!failure,
    node:process.version,platform:process.platform,source,chrome,output,version,
    receiverSha256:hash(await readFile(fileURLToPath(import.meta.url))),
    checks,observations,failure,before,after,sourceUnchanged:JSON.stringify(before)===JSON.stringify(after),
    processError,timedOut,exitCode:child?.exitCode??null,signalCode:child?.signalCode??null,
    errors,networkFailures,requests,served,artifacts:await inventory(output)};
  await writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({pass:receipt.pass,checks:checks.length,failure,sourceUnchanged:receipt.sourceUnchanged}));
  if(!receipt.pass) process.exitCode=1;
}
