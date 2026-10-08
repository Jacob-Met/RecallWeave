#!/usr/bin/env node
/** Optional direct-file receiving: Node 22+ and an installed Chromium. No npm dependency.
 * CDP transport follows the repository's existing tools/check_browser.mjs convention.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir, mkdtemp, rm, readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'shortest-paths-browser-check')));
await mkdir(output, {recursive:true});
const existing = await readdir(output);
assert.equal(existing.length, 0, 'Use an empty output directory so prior evidence cannot be overwritten.');
const downloads = join(output, 'downloads');
await mkdir(downloads);
const profile = await mkdtemp(join(output, 'profile-'));
const sourcePaths = [
  'courses/shortest-paths-core.mjs', 'courses/shortest-paths.json',
  'courses/shortest-paths-explorer.template.html', 'courses/shortest-paths-explorer-ui.mjs',
  'courses/shortest-paths-explorer.html', 'tools/make_shortest_paths_explorer.mjs',
  'tools/check_shortest_paths_browser.mjs', 'src/deck.mjs'
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pins = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, hash(await readFile(join(project,path)))])));
const report = {format:'recallweave-shortest-paths-author-browser/1', status:'running', started:new Date().toISOString(), node:process.version, project, executable, sourceSha256:await pins(), checks:[], captures:[], downloads:[], pageErrors:[], requests:[]};
const {parseDeck, serializeDeck} = await import(pathToFileURL(join(project, 'src/deck.mjs')));
const courseBytes = await readFile(join(project, 'courses/shortest-paths.json'));
let browser, socket, sessionId, browserLog = '', sequence = 0;
const pending = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  let last;
  for (let i=0;i<120;i++) {
    try { if (await check()) return; } catch(error) {last=error;}
    await pause(100);
  }
  throw new Error('Timed out: '+label+(last?' ('+last.message+')':''));
}
function command(method, params={}, scoped=true) {
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression) {
  const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description??value.exceptionDetails.text);
  return value.result.value;
}
async function key(name) {
  const code=name==='Tab'?9:13;
  for(const type of ['keyDown','keyUp']) await command('Input.dispatchKeyEvent',{
    type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,
    ...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})
  });
}
async function activate(selector) {
  assert.ok(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'));
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  await key('Enter');
}
async function choose(selector, value, event='change') {
  await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event('+JSON.stringify(event)+',{bubbles:true}));})()');
}
const rows = () => evaluate("Object.fromEntries([...document.querySelectorAll('#distances tr')].map(row=>[row.dataset.vertex,{cost:row.children[1].textContent,via:row.children[2].textContent,status:row.dataset.status}]))");
const value = selector => evaluate('document.querySelector('+JSON.stringify(selector)+').textContent');
async function snapshot(label) {
  return {label,rows:await rows(),heading:await value('#route-heading'),route:await value('#route-detail'),count:await value('#step-count'),status:await value('#run-status')};
}
async function screenshot(name, selector) {
  if(selector) await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');
  const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(data,'base64');
  await writeFile(join(output,name),bytes);
  report.captures.push({path:name,bytes:bytes.length,sha256:hash(bytes),viewport:await evaluate('({width:innerWidth,height:innerHeight,scrollY})')});
}
async function download(selector, filename) {
  await activate(selector);
  const target=join(downloads,filename);
  await waitFor(async()=>{const files=await readdir(downloads);return files.includes(filename)&&!files.some(x=>x.endsWith('.crdownload'));},filename+' browser download');
  const bytes=await readFile(target);
  report.downloads.push({path:'downloads/'+filename,bytes:bytes.length,sha256:hash(bytes)});
  return bytes;
}
const passed=name=>{report.checks.push(name);console.log('PASS '+name);};
const url=pathToFileURL(join(project,'courses/shortest-paths-explorer.html')).href;
try {
  browser=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',data=>{browserLog=(browserLog+data.toString()).slice(-12000);});
  let launchError;
  browser.on('error',error=>{launchError=error;});
  let port,endpoint;
  await waitFor(async()=>{
    if(launchError)throw launchError;
    if(browser.exitCode!==null)throw new Error('Browser exited '+browser.exitCode);
    [port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
    return Boolean(port&&endpoint);
  },'isolated Chromium startup');
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){
      const request=pending.get(message.id);if(!request)return;
      pending.delete(message.id);clearTimeout(request.timer);
      if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result);
    }else if(message.method==='Runtime.exceptionThrown'){
      report.pageErrors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
    }else if(message.method==='Network.requestWillBeSent'){
      report.requests.push(message.params.request.url);
    }
  });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true},false);
  const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride',{width:1360,height:1120,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url});
  await waitFor(()=>evaluate("document.readyState==='complete'&&document.querySelectorAll('#distances tr').length===5"),'direct-file explorer startup');
  assert.deepEqual(await rows(),{
    S:{cost:'0',via:'—',status:'tentative'},
    A:{cost:'∞',via:'—',status:'unreached'},
    B:{cost:'∞',via:'—',status:'unreached'},
    C:{cost:'∞',via:'—',status:'unreached'},
    T:{cost:'∞',via:'—',status:'unreached'}
  });
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  passed('direct-file startup shows a fresh five-vertex run without overflow');

  await choose('#prediction','B');
  await activate('#check-prediction');
  assert.match(await value('#prediction-feedback'),/next vertex is S at 0/);
  await choose('#prediction','S');await activate('#check-prediction');
  assert.match(await value('#prediction-feedback'),/Yes\. S/);
  assert.equal(await value('#step-count'),'0 settled');
  passed('prediction feedback checks the frontier without stepping or recording a score');

  await activate('#step');
  assert.equal((await rows()).A.cost,'4');
  await activate('#step');
  assert.equal((await rows()).A.cost,'3');
  assert.match(await value('#step-updates'),/1 \+ 2 = 3/);
  await activate('#step');
  assert.equal((await rows()).T.cost,'10');
  await activate('#step');
  assert.equal((await rows()).T.cost,'7');
  assert.equal((await rows()).T.status,'tentative');
  await activate('#step');
  assert.deepEqual((await snapshot('completed improvement')).rows,{
    S:{cost:'0',via:'—',status:'final'},A:{cost:'3',via:'B',status:'final'},
    B:{cost:'1',via:'S',status:'final'},C:{cost:'4',via:'A',status:'final'},T:{cost:'7',via:'C',status:'final'}
  });
  assert.equal(await value('#settled-order'),'Settled order: S → B → A → C → T');
  assert.match(await value('#route-detail'),/S → B → A → C → T/);
  assert.equal(await evaluate("document.querySelector('#step').disabled"),true);
  report.improvement=await snapshot('keyboard-settled cost-7 route');
  await screenshot('01-completed-wide.png','.setup');
  passed('five real keyboard activations show both improvements and the final cost-7 route');

  const traceBytes=await download('#download-run','recallweave-shortest-paths-S-to-T-step-5.json');
  const trace=JSON.parse(traceBytes);
  assert.equal(trace.format,'recallweave-shortest-paths-trace/1');
  assert.equal(trace.route.status,'final');
  assert.equal(trace.route.distance,7);
  assert.equal(trace.steps.length,5);
  assert.equal(trace.steps[2].distances.T,10);
  assert.equal(trace.steps[3].distances.T,7);
  assert.deepEqual(trace.route.path,['S','B','A','C','T']);
  const receivedCourse=await download('#download-course','recallweave-shortest-paths-course.json');
  assert.deepEqual(receivedCourse,courseBytes);
  assert.equal(serializeDeck(parseDeck(receivedCourse.toString('utf8'))),receivedCourse.toString('utf8'));
  passed('browser downloads contain the real full trace and byte-identical valid course');

  await choose('#preset','first-discovery');
  await activate('#step');
  assert.equal((await rows()).T.cost,'9');
  assert.equal((await rows()).T.status,'tentative');
  assert.match(await value('#route-heading'),/tentative distance 9/);
  report.discovery=await snapshot('first discovered target remains tentative');
  await screenshot('02-discovery-tentative.png','#graph-heading');
  await activate('#step');await activate('#step');
  assert.equal((await rows()).T.cost,'5');
  assert.equal((await rows()).T.status,'tentative');
  await activate('#step');
  assert.match(await value('#route-heading'),/final distance 5/);
  passed('the actual target UI distinguishes discovery at9, improvement to5 and final settlement');

  await choose('#preset','ties');await activate('#finish');
  assert.equal((await rows()).T.cost,'5');
  assert.equal((await rows()).T.via,'A');
  assert.equal(await value('#settled-order'),'Settled order: S → A → B → T');
  await choose('#preset','zero-unreachable');await activate('#finish');
  assert.equal((await rows()).A.cost,'0');
  assert.equal((await rows()).T.cost,'3');
  assert.equal((await rows()).X.status,'unreachable');
  assert.match(await value('#route-heading'),/X: unreachable from S/);
  passed('preset controls preserve equal-route policy, zero cost and final unreachable labeling');

  await choose('#preset','improvement');await activate('#finish');
  await choose('#weight-0','8','input');
  assert.equal(await value('#step-count'),'0 settled');
  assert.equal((await rows()).A.cost,'∞');
  assert.equal(await value('#setup-kind'),'Edited setup.');
  assert.match(await value('#setup-description'),/current source, target and weights/);
  await activate('#step');
  assert.equal((await rows()).A.cost,'8');
  await activate('#reset');
  assert.equal(await evaluate("document.querySelector('#weight-0').value"),'8');
  assert.equal(await value('#step-count'),'0 settled');
  passed('an edited weight clears prior decisions and reset preserves the displayed edited graph');

  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url});
  await waitFor(()=>evaluate("document.readyState==='complete'&&document.querySelectorAll('#distances tr').length===5"),'fresh compact direct-file document');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.className'),'skip');
  await key('Enter');
  assert.equal(await evaluate('document.activeElement.id'),'explorer');
  await activate('#finish');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  const geometry=await evaluate("({viewport:innerWidth,graph:document.querySelector('#graph').getBoundingClientRect().toJSON(),controls:[...document.querySelectorAll('button,select,input')].map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})");
  assert.ok(geometry.controls.every(control=>control.height>=44&&control.width>0));
  report.compactGeometry=geometry;
  await screenshot('03-completed-compact.png','#graph-heading');
  passed('390px direct-file layout has no horizontal overflow and keyboard skip/controls stay usable');

  await command('Page.reload',{ignoreCache:true});
  await waitFor(()=>evaluate("document.querySelector('#step-count')?.textContent==='0 settled'"),'reload clears run');
  assert.equal((await rows()).A.cost,'∞');
  assert.equal(await evaluate("document.querySelector('#weight-0').value"),'4');
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.requests.filter(url=>/^https?:/i.test(url)),[]);
  assert.deepEqual(await pins(),report.sourceSha256);
  passed('reload restores the original setup; all source bytes stay unchanged and no page errors or HTTP requests occur');
  report.status='passed';
} catch(error) {
  report.status='failed';report.error=error.stack||String(error);process.exitCode=1;
  if(socket&&sessionId){try{report.failureState=await snapshot('failure');await screenshot('failure.png');}catch(captureError){report.captureError=String(captureError);}}
  console.error(report.error);
} finally {
  report.finished=new Date().toISOString();
  try {
    await writeFile(join(output,'browser.log'),browserLog);
    await writeFile(join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
  } catch(error) {
    report.status='failed';
    process.exitCode=1;
    console.error('Could not preserve browser evidence: '+String(error));
  } finally {
    // Even ENOSPC while recording evidence must release this owned browser/profile.
    if(socket){try{await command('Browser.close',{},false);}catch{}socket.close();}
    if(browser&&browser.exitCode===null){browser.kill();await pause(300);}
    for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(new Error('Browser receiving finished.'));}pending.clear();
    await rm(profile,{recursive:true,force:true});
  }
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,output}));
}
