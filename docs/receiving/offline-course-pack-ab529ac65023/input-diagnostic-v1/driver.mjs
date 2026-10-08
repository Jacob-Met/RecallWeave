#!/usr/bin/env node
/** Observation-only diagnostic for the preserved #109 native preview failure.
 * Derived from frozen receiver f6015f27; does not alter its acceptance or source.
 * First use the exact retained included path. An existing ASCII same-byte control
 * is admitted only if no sample or native event ever shows selected files.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, statfs, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { tmpdir, freemem } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIN_DISK_BYTES = 1024n ** 3n;
const MIN_MEMORY_BYTES = 512 * 1024 * 1024;
const PACKET_LIMIT = 2 * 1024 * 1024;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(done => setTimeout(done, ms));

const MEMBER_LIMIT=1024*1024;
function options(args) {
  const result={root:null,retained:null,output:null,browser:'google-chrome',emitBundle:false};
  const seen=new Set();
  while(args.length){
    const flag=args.shift();
    if(seen.has(flag))throw new Error('Repeated option: '+flag);
    seen.add(flag);
    if(flag==='--emit-bundle'){result.emitBundle=true;continue;}
    const key={'--root':'root','--retained':'retained','--output':'output','--browser':'browser'}[flag];
    if(!key||!args[0])throw new Error('Use --root DIR --retained FIRST_EVIDENCE_DIR --output NEW_DIR --browser FILE [--emit-bundle]');
    result[key]=args.shift();
  }
  for(const key of ['root','retained','output']){
    if(!result[key])throw new Error('Missing --'+key);
    result[key]=resolve(result[key]);
  }
  return result;
}

async function waitFor(check, label, milliseconds = 15000) {
  const deadline = Date.now() + milliseconds;
  let last;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; }
    catch (error) { last = error; }
    await sleep(75);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}

const OBSERVER = `(() => {
  const observed = window.__catalogReceiving = {
    storageCalls: [], blockedApis: [], setupErrors: [],
    objectUrlAttempts: 0, objectUrlsCreated: 0, failNextObjectUrl: false,
    createdObjectUrls: [], revokedObjectUrls: [],
  };
  const originalUrl = URL.createObjectURL;
  URL.createObjectURL = function(...args) {
    observed.objectUrlAttempts++;
    if (observed.failNextObjectUrl) {
      observed.failNextObjectUrl = false;
      throw new Error('Injected synchronous object-URL preparation failure');
    }
    const url = originalUrl.apply(this, args);
    observed.objectUrlsCreated++;
    observed.createdObjectUrls.push(url);
    return url;
  };
  const originalRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = function(...args) {
    const result = originalRevoke.apply(this, args);
    observed.revokedObjectUrls.push(args[0]);
    return result;
  };
  function observe(object, name, label) {
    if (!object || typeof object[name] !== 'function') return;
    const original = object[name];
    object[name] = function(...args) {
      observed.storageCalls.push(label);
      return original.apply(this, args);
    };
  }
  try {
    for (const name of ['localStorage', 'sessionStorage']) {
      let owner = window;
      while (owner && !Object.getOwnPropertyDescriptor(owner, name)) owner = Object.getPrototypeOf(owner);
      const descriptor = owner && Object.getOwnPropertyDescriptor(owner, name);
      if (!descriptor?.get) throw new Error('Missing observable storage getter: ' + name);
      Object.defineProperty(window, name, {
        configurable: true,
        get() { observed.storageCalls.push(name + '.access'); return descriptor.get.call(window); },
      });
    }
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key'])
      observe(Storage.prototype, method, 'Storage.' + method);
    for (const method of ['open', 'deleteDatabase'])
      observe(globalThis.IDBFactory?.prototype, method, 'indexedDB.' + method);
    for (const method of ['open', 'delete', 'match', 'has', 'keys'])
      observe(globalThis.CacheStorage?.prototype, method, 'caches.' + method);
    observe(globalThis.ServiceWorkerContainer?.prototype, 'register', 'serviceWorker.register');
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    if (cookie?.get && cookie?.set) Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get() { observed.storageCalls.push('cookie.read'); return cookie.get.call(this); },
      set(value) { observed.storageCalls.push('cookie.write'); cookie.set.call(this, value); },
    });
    for (const name of ['WebSocket', 'EventSource', 'Worker', 'SharedWorker']) {
      if (typeof window[name] === 'function') window[name] = new Proxy(window[name], {
        construct() {
          observed.blockedApis.push(name);
          throw new Error('Offline catalog receiving refuses ' + name);
        },
      });
    }
    if (typeof navigator.sendBeacon === 'function') navigator.sendBeacon = () => {
      observed.blockedApis.push('sendBeacon');
      return false;
    };
  } catch (error) { observed.setupErrors.push(String(error)); }
})();`;


async function extractionSnapshot(root) {
  const result = [];
  async function visit(path) {
    const info = await lstat(path, {bigint: true});
    assert.ok(info.isDirectory() || info.isFile(), 'Extracted tree must not contain a link or special entry');
    const row = {path: relative(root, path).split(sep).join('/') || '.', mode: info.mode.toString(),
      inode: info.ino.toString(), device: info.dev.toString(),
      mtimeNs: info.mtimeNs.toString(), ctimeNs: info.ctimeNs.toString()};
    if (info.isFile()) {
      assert.ok(info.size <= BigInt(MEMBER_LIMIT), 'Extracted file size remains bounded');
      const bytes = await readFile(path);
      row.bytes = bytes.length;
      row.sha256 = sha256(bytes);
    }
    result.push(row);
    if (info.isDirectory()) for (const name of (await readdir(path)).sort()) await visit(join(path, name));
  }
  await visit(root);
  return result;
}

async function emitBundle(output) {
  const paths = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        assert.ok(entry.isFile(), 'Evidence packet contains a non-file: ' + path);
        paths.push(path);
      }
    }
  }
  await visit(output);
  const files = [];
  let total = 0;
  for (const path of paths.sort()) {
    const info = await lstat(path);
    total += info.size;
    assert.ok(total <= PACKET_LIMIT, 'Evidence packet exceeds 2 MiB; refusing incomplete export');
    const bytes = await readFile(path);
    files.push({path: relative(output, path).split(sep).join('/'), bytes: bytes.length,
      sha256: sha256(bytes), base64: bytes.toString('base64')});
  }
  const payload = Buffer.from(JSON.stringify({version: 1, files}));
  assert.ok(payload.length <= PACKET_LIMIT, 'Decoded evidence packet exceeds 2 MiB; refusing incomplete export');
  const encoded = payload.toString('base64');
  const chunks = Math.ceil(encoded.length / 4096);
  console.log('RECALLWEAVE_OFFLINE_PACK_INPUT_DIAGNOSTIC_BUNDLE_BEGIN ' + JSON.stringify({
    bytes: payload.length, sha256: sha256(payload), chunks, fileBytes: total,
  }));
  for (let index = 0; index < chunks; index++)
    console.log('RECALLWEAVE_OFFLINE_PACK_INPUT_DIAGNOSTIC_BUNDLE_CHUNK ' + index + ' ' + encoded.slice(index * 4096, (index + 1) * 4096));
  console.log('RECALLWEAVE_OFFLINE_PACK_INPUT_DIAGNOSTIC_BUNDLE_END');
}

async function main(settings) {
  const {root, output, browser: executable} = settings;
  try {
    const info = await lstat(output);
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Evidence destination must be a real directory');
    assert.deepEqual(await readdir(output), [], 'Use a new or empty evidence directory');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const preDisk = await statfs(dirname(output), {bigint:true});
  assert.ok(preDisk.bavail*preDisk.bsize >= MIN_DISK_BYTES, 'Diagnostic hold: less than 1 GiB free before output');
  await mkdir(output, {recursive: true});
  const report = {
    version: 1, schema: 'recallweave-offline-pack-input-diagnostic-v1',
    mode: 'instrumented-file-input-delivery', qualifiesProduct: false,
    status: 'running', root, executable, node: process.version,
    platform: process.platform, architecture: process.arch, checks: [], downloads: [],
    screenshots: [], sourceSha256: {}, pageErrors: [], unexpectedRequests: [],
    networkRequests: [], documentAudits: [], objectUrlCleanup: [], harnessErrors: [],
  };
  let server, browser, socket, profile;
  let browserDidClose = true;
  let browserClosed = Promise.resolve();
  let browserLog = '';
  const pending = new Map();
  const pages = new Map();
  const downloads = new Map();
  let sequence = 0;
  let base = '';
  let lastPage;
  let closing = false;
  let offlineOnly = false;
  const artifactPaths = new Set();
  const sourceBytes = new Map();

  function command(method, params = {}, sessionId) {
    const id = ++sequence;
    return new Promise((done, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) { reject(new Error('CDP connection unavailable: ' + method)); return; }
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, 10000);
      pending.set(id, {done, reject, timer});
      socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
    });
  }
  const onPage = (page, method, params = {}) => command(method, params, page.sessionId);
  async function evaluate(page, expression) {
    const response = await onPage(page, 'Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (response.exceptionDetails)
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  }
  const inPage = (page, fn, ...args) => evaluate(page,
    '(' + fn.toString() + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')');
  const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
  async function artifact(path, bytes) {
    assert.ok(!artifactPaths.has(path), 'Duplicate evidence path: ' + path);
    await mkdir(dirname(join(output, path)), {recursive: true});
    await writeFile(join(output, path), bytes, {flag: 'wx'});
    artifactPaths.add(path);
  }
  async function screenshot(page, name, selector) {
    if (selector) await inPage(page, value => document.querySelector(value)?.scrollIntoView({block: 'start'}), selector);
    const image = await onPage(page, 'Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    await artifact(name, Buffer.from(image.data, 'base64'));
    report.screenshots.push(name);
  }
  async function key(page, name) {
    const virtual = {Tab: 9, Enter: 13}[name];
    for (const type of ['keyDown', 'keyUp']) await onPage(page, 'Input.dispatchKeyEvent', {
      type, key: name, code: name, windowsVirtualKeyCode: virtual, nativeVirtualKeyCode: virtual,
      ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {}),
    });
  }
  async function click(page, selector) {
    const point = await inPage(page, value => {
      const element = document.querySelector(value);
      if (!element || element.disabled) throw new Error('Unavailable control: ' + value);
      element.scrollIntoView({block: 'center'});
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) throw new Error('Hidden control: ' + value);
      return {x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2};
    }, selector);
    await onPage(page, 'Input.dispatchMouseEvent', {type: 'mouseMoved', ...point});
    await onPage(page, 'Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
    await onPage(page, 'Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
  }
  async function configure(page) {
    // Queue setup on the paused target before resume, then await all replies.
    // A noopener popup can withhold Page.enable's reply until it is resumed.
    // Interception and the init script still precede resume on this session.
    const setup = [
      onPage(page, 'Page.enable'),
      onPage(page, 'Runtime.enable'),
      onPage(page, 'Network.enable'),
      onPage(page, 'Network.setCacheDisabled', {cacheDisabled: true}),
      onPage(page, 'Network.setBypassServiceWorker', {bypass: true}),
      onPage(page, 'Network.setBlockedURLs', {urls: ['ws://*', 'wss://*']}),
      onPage(page, 'Fetch.enable', {patterns: [
        {urlPattern: 'http://*', requestStage: 'Request'},
        {urlPattern: 'https://*', requestStage: 'Request'},
      ]}),
      onPage(page, 'Page.addScriptToEvaluateOnNewDocument', {source: OBSERVER}),
    ];
    setup.push(onPage(page, 'Network.emulateNetworkConditions', {
      offline: offlineOnly, latency: 0, downloadThroughput: offlineOnly ? 0 : -1, uploadThroughput: offlineOnly ? 0 : -1,
    }));
    setup.push(onPage(page, 'Runtime.runIfWaitingForDebugger'));
    await Promise.all(setup);
  }
  async function readyPage(targetId) {
    const page = await waitFor(() => pages.get(targetId), 'CDP page attachment');
    await page.ready;
    lastPage = page;
    return page;
  }
  async function newPage() {
    const {targetId} = await command('Target.createTarget', {url: 'about:blank'});
    return readyPage(targetId);
  }
  async function navigate(page, url, width = 1360, height = 1000, offline = false, selector = '#catalog-results') {
    await onPage(page, 'Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    await onPage(page, 'Network.emulateNetworkConditions', {
      offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1,
    });
    const navigation = await onPage(page, 'Page.navigate', {url});
    assert.ok(!navigation.errorText, navigation.errorText);
    assert.ok(navigation.loaderId, 'Navigation must create a new document');
    await waitFor(async () => {
      const frame = await onPage(page, 'Page.getFrameTree');
      if (frame.frameTree.frame.loaderId !== navigation.loaderId) return false;
      return inPage(page, (expected, readySelector) => location.href === expected && document.readyState === 'complete' &&
        !!document.querySelector(readySelector), url, selector);
    }, 'newly loaded document: ' + selector);
  }
  async function audit(page, name, isCatalog = true) {
    const snapshot = await inPage(page, () => ({
      url: location.href, observed: window.__catalogReceiving,
      courseData: document.querySelector('#course-data')?.textContent ?? null,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.ok(snapshot.observed, 'Document observer must precede application startup');
    assert.deepEqual(snapshot.observed.setupErrors, [], 'Browser observer must install completely');
    assert.deepEqual(snapshot.observed.storageCalls, [], 'Page must not access persistent browser storage');
    assert.deepEqual(snapshot.observed.blockedApis, [], 'Page must not start remote transports or workers');
    if (isCatalog) {
      assert.ok(snapshot.courseData, 'Catalog embeds its own source entries');
      JSON.parse(snapshot.courseData);
    }
    report.documentAudits.push({name, url: snapshot.url, observed: snapshot.observed,
      courseDataSha256: snapshot.courseData === null ? null : sha256(Buffer.from(snapshot.courseData)), overflow: snapshot.overflow});
    return snapshot;
  }
  try {
    assert.ok(Number(process.versions.node.split('.')[0])>=22,'Use Node22 or newer');
    const disk=[];
    for(const directory of [root,dirname(output),tmpdir()]){
      const info=await statfs(directory,{bigint:true});
      const free=info.bavail*info.bsize;
      disk.push({directory,freeBytes:String(free),minimumBytes:String(MIN_DISK_BYTES)});
      assert.ok(free>=MIN_DISK_BYTES,'Diagnostic hold: less than 1 GiB free at '+directory);
    }
    let availableMemory=freemem();
    if(process.platform==='linux'){
      const match=(await readFile('/proc/meminfo','utf8')).match(/^MemAvailable:\s+(\d+)\s+kB$/m);
      assert.ok(match,'MemAvailable must be observable');
      availableMemory=Number(match[1])*1024;
    }
    assert.ok(availableMemory>=MIN_MEMORY_BYTES,'Diagnostic hold: less than 512 MiB available memory');
    report.headroom={disk,availableMemoryBytes:availableMemory,minimumMemoryBytes:MIN_MEMORY_BYTES};
    report.receiverSha256=sha256(await readFile(fileURLToPath(import.meta.url)));
    report.locale={LANG:process.env.LANG??null,LC_ALL:process.env.LC_ALL??null,LC_CTYPE:process.env.LC_CTYPE??null};
    const retained=settings.retained;
    const priorBytes=await readFile(join(retained,'offline-pack-receiving.json'));
    assert.equal(sha256(priorBytes),'bc8c62dbec6d380ad93537bdb17df8c68dc6d0aaf2c9589fffeba3b7035b1fdc',
      'Diagnostic must use the retained exact first negative report');
    const prior=JSON.parse(priorBytes);
    assert.equal(prior.status,'failed');
    assert.match(prior.error,/Timed out: included course preview/);
    for(const [path,expected] of Object.entries(prior.sourceSha256)){
      const bytes=await readFile(join(root,path));
      assert.equal(sha256(bytes),expected,'Frozen candidate input: '+path);
      sourceBytes.set(path,bytes);report.sourceSha256[path]=expected;
    }
    const catalogPath=join(retained,'extracted offline pack é','RecallWeave','catalog.html');
    const learnerPath=join(retained,'extracted offline pack é','RecallWeave','demo.html');
    const includedPath=join(retained,'extracted offline pack é','RecallWeave','courses','binary-search.json');
    const controlPath=join(retained,'extracted-catalog-download','binary-search.json');
    for(const [path,source] of [[catalogPath,'catalog.html'],[learnerPath,'demo.html'],[includedPath,'courses/binary-search.json']])
      assert.deepEqual(await readFile(path),sourceBytes.get(source),'Retained original source: '+path);
    assert.deepEqual(await readFile(controlPath),await readFile(includedPath),'ASCII control must be identical original course bytes');
    report.retainedBefore=await extractionSnapshot(retained);
    report.inputs=[];
    for(const path of [includedPath,controlPath]){
      const info=await lstat(path,{bigint:true});
      report.inputs.push({path,pathUtf8Hex:Buffer.from(path).toString('hex'),bytes:Number(info.size),
        sha256:sha256(await readFile(path)),mode:info.mode.toString(),uid:info.uid.toString(),gid:info.gid.toString(),
        inode:info.ino.toString(),device:info.dev.toString(),mtimeNs:info.mtimeNs.toString()});
    }
    report.originalFailure={reportSha256:sha256(priorBytes),error:prior.error,producerZipSha256:prior.archive.sha256};
    profile=await mkdtemp(join(dirname(output),'recallweave-offline-pack-input-diagnostic-chrome-'));
    await mkdir(join(output,'downloads'));
    offlineOnly=true;
    browser = spawn(executable, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
      '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
      '--disk-cache-size=8388608', '--media-cache-size=8388608',
      '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      '--user-data-dir=' + profile, 'about:blank',
    ], {stdio: ['ignore', 'ignore', 'pipe']});
    // Observe close from launch: exit alone can precede shared stdio shutdown.
    browserDidClose = false;
    browserClosed = new Promise(done => browser.once('close', (code, signal) => {
      browserDidClose = true;
      report.browserExit = {code, signal};
      done();
    }));
    browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-8000); });
    let launchError;
    browser.on('error', error => { launchError = error; });
    const endpoint = await waitFor(async () => {
      if (launchError) throw launchError;
      if (browser.exitCode !== null) throw new Error('Chrome exited before startup: ' + browserLog);
      const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
      return port && path ? 'ws://127.0.0.1:' + port + path : null;
    }, 'Chrome startup', 20000);
    socket = new WebSocket(endpoint);
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id);
        clearTimeout(item.timer);
        if (message.error) item.reject(new Error(message.error.message));
        else item.done(message.result);
        return;
      }
      const {method, params, sessionId} = message;
      if (method === 'Target.attachedToTarget') {
        const page = {targetId: params.targetInfo.targetId, sessionId: params.sessionId};
        pages.set(page.targetId, page);
        page.ready = configure(page);
        page.ready.catch(error => { if (!closing) report.harnessErrors.push('Page setup: ' + error.message); });
      } else if (method === 'Browser.downloadWillBegin' || method === 'Browser.downloadProgress') {
        downloads.set(params.guid, {...downloads.get(params.guid), ...params});
      } else if (method === 'Runtime.exceptionThrown') {
        report.pageErrors.push({sessionId, error: params.exceptionDetails.exception?.description ?? params.exceptionDetails.text});
      } else if (method === 'Network.requestWillBeSent') {
        report.networkRequests.push({sessionId, url: params.request.url, method: params.request.method});
      } else if (method === 'Fetch.requestPaused') {
        const url = new URL(params.request.url);
        const allowed = !offlineOnly && params.request.method === 'GET' && url.origin === base &&
          ['/offline/index.html', '/offline/recallweave-offline.zip', '/favicon.ico'].includes(url.pathname) && !url.search;
        if (!allowed) report.unexpectedRequests.push({url: params.request.url, method: params.request.method});
        command(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest',
          {requestId: params.requestId, ...(!allowed ? {errorReason: 'BlockedByClient'} : {})}, sessionId)
          .catch(error => { if (!closing) report.harnessErrors.push('Network interception: ' + error.message); });
      }
    });
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP socket startup timeout')), 10000);
      socket.addEventListener('open', () => { clearTimeout(timer); done(); }, {once: true});
      socket.addEventListener('error', error => { clearTimeout(timer); reject(error); }, {once: true});
    });
    report.browser = await command('Browser.getVersion');
    await command('Browser.setDownloadBehavior', {behavior: 'allowAndName',
      downloadPath: join(output, 'downloads'), eventsEnabled: true});
    // Pause new pages so popup startup also receives network/storage observation.
    await command('Target.setAutoAttach', {autoAttach: true, waitForDebuggerOnStart: true, flatten: true,
      filter: [{type: 'page'}, {exclude: true}]});
    const catalog=await newPage();
    await navigate(catalog,pathToFileURL(catalogPath).href,390,844,true);
    await audit(catalog,'diagnostic-retained-catalog');
    const link=await inPage(catalog,()=>{
      const element=document.querySelector('#open-learner');
      return {href:element.href,target:element.target};
    });
    assert.equal(link.href,pathToFileURL(learnerPath).href);
    assert.equal(link.target,'_blank');
    const knownPages=new Set(pages.keys());
    await click(catalog,'#open-learner');
    const learner=await waitFor(async()=>{
      for(const page of pages.values()){
        if(knownPages.has(page.targetId))continue;
        await page.ready;
        if(await inPage(page,expected=>location.href===expected&&document.readyState==='complete'&&
          !!document.querySelector('#deck-file'),link.href))return page;
      }
      return null;
    },'same actual retained catalog-to-sibling learner popup');
    lastPage=learner;
    await onPage(learner,'Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
    await audit(learner,'diagnostic-learner-before-file',false);
    report.transportUnicodeProbe=await evaluate(learner,JSON.stringify('é Ω'));
    assert.equal(report.transportUnicodeProbe,'é Ω','Protocol string transport preserves Unicode');
    const initialSession=await inPage(learner,()=>({
      session:document.querySelector('#session-content').innerHTML,
      progress:document.querySelector('#step-count').textContent,
      description:document.querySelector('#lesson-description').textContent,
    }));
    // Observe native delivery without setting files, dispatching events, or changing app handlers.
    await inPage(learner,()=>{
      const control=document.querySelector('#deck-file');
      const state=globalThis.__offlineInputDiagnostic={control,events:[],attempt:null};
      for(const type of ['input','change'])document.addEventListener(type,event=>{
        if(event.target.id!=='deck-file')return;
        state.events.push({type:event.type,isTrusted:event.isTrusted,attempt:state.attempt,
          sameControl:event.target===control,connected:event.target.isConnected,
          files:[...event.target.files].map(file=>({name:file.name,size:file.size,type:file.type,lastModified:file.lastModified})),
          status:document.querySelector('#deck-status')?.textContent??null});
      },true);
    });
    async function state(){
      return inPage(learner,()=>{
        const control=document.querySelector('#deck-file'),observed=globalThis.__offlineInputDiagnostic;
        return {url:location.href,ready:document.readyState,
          control:{id:control.id,type:control.type,accept:control.accept,value:control.value,
            connected:control.isConnected,sameNode:control===observed.control,outerHTML:control.outerHTML},
          files:[...control.files].map(file=>({name:file.name,size:file.size,type:file.type,
            lastModified:file.lastModified,relativePath:file.webkitRelativePath})),
          mountedLessonInput:!!document.querySelector('#lesson-file'),
          status:document.querySelector('#deck-status')?.textContent??null,
          previewTitle:document.querySelector('#deck-preview-title')?.textContent??null,
          previewHidden:document.querySelector('#deck-preview')?.hidden??null,
          startDeckPresent:!!document.querySelector('#start-deck'),
          events:observed.events};
      });
    }
    async function attempt(label,path){
      await inPage(learner,name=>{globalThis.__offlineInputDiagnostic.attempt=name;},label);
      const document=await onPage(learner,'DOM.getDocument');
      const found=await onPage(learner,'DOM.querySelector',{nodeId:document.root.nodeId,selector:'#deck-file'});
      assert.ok(found.nodeId,'Actual retained file input exists');
      const described=await onPage(learner,'DOM.describeNode',{nodeId:found.nodeId});
      const frame=await onPage(learner,'Page.getFrameTree');
      const result={label,path,documentNodeId:document.root.nodeId,nodeId:found.nodeId,
        backendNodeId:described.node.backendNodeId,nodeName:described.node.nodeName,
        frameBefore:frame.frameTree.frame,before:await state(),samples:[]};
      report.attempts.push(result);
      result.protocolResult=await onPage(learner,'DOM.setFileInputFiles',{nodeId:found.nodeId,files:[path]});
      result.samples.push({elapsedMs:0,...await state()});
      let elapsed=0;
      for(const delay of [250,750,4000]){
        await sleep(delay);elapsed+=delay;result.samples.push({elapsedMs:elapsed,...await state()});
      }
      result.frameAfter=(await onPage(learner,'Page.getFrameTree')).frameTree.frame;
      result.nativeEvents=result.samples.at(-1).events.filter(event=>event.attempt===label);
      result.observedFileDelivery=result.samples.some(sample=>sample.files.length>0)||
        result.nativeEvents.some(event=>event.files.length>0);
      return result;
    }
    report.attempts=[];
    const included=await attempt('exact-included-path',includedPath);
    if(!included.observedFileDelivery){
      report.asciiControlReason='Exact included path left every observed FileList empty; no event showed a selected file';
      await attempt('retained-ascii-same-byte-control',controlPath);
    }
    const finalState=await state();
    report.finalState=finalState;
    report.outcome=included.observedFileDelivery?'included-file-delivery-observed':
      report.attempts[1]?.observedFileDelivery?'included-empty-ascii-control-delivered':'both-paths-left-file-list-empty';
    assert.deepEqual(await inPage(learner,()=>({
      session:document.querySelector('#session-content').innerHTML,
      progress:document.querySelector('#step-count').textContent,
      description:document.querySelector('#lesson-description').textContent,
    })),initialSession,'Diagnostic selection/preview must preserve the existing learner session');
    report.sessionPreserved=true;
    await audit(learner,'diagnostic-learner-final',false);
    await audit(catalog,'diagnostic-catalog-final');
    await screenshot(learner,'input-diagnostic.png','#deck-file');
    report.retainedAfter=await extractionSnapshot(retained);
    assert.deepEqual(report.retainedAfter,report.retainedBefore,'Diagnostic must leave every retained artifact unchanged');
    for(const [path,bytes] of sourceBytes)
      assert.deepEqual(await readFile(join(root,path)),bytes,'Diagnostic must preserve source: '+path);
    assert.equal(downloads.size,0,'Diagnostic must not start any download');
    assert.deepEqual(report.pageErrors,[]);
    assert.deepEqual(report.unexpectedRequests,[]);
    assert.deepEqual(report.harnessErrors,[]);
    passed('Observed file-input delivery with exact retained source, unchanged session/artifacts and no external activity');
    report.status='completed';

  } catch (error) {
    report.status = 'failed';
    report.error = error.stack ?? String(error);
    report.browserLog = browserLog;
    process.exitCode = 1;
    if (lastPage) {
      try {
        report.lastPage = await inPage(lastPage, () => ({
          url: location.href, ready: document.readyState, text: document.body.innerText.slice(0, 6000),
        }));
        await screenshot(lastPage, 'failure.png');
      } catch (failure) { report.captureFailure = String(failure); }
    }
    console.error(report.error);
  } finally {
    closing = true;
    if (socket?.readyState === WebSocket.OPEN) {
      try { await command('Browser.close'); } catch { /* Keep the original failure. */ }
    }
    socket?.close();
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('Browser receiver closed')); }
    pending.clear();
    try {
      if (server?.listening) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
      if (browser && !browserDidClose) {
        await Promise.race([browserClosed, sleep(3000)]);
        for (const signal of ['SIGTERM', 'SIGKILL']) {
          if (browserDidClose) break;
          (report.browserShutdownSignals ??= []).push(signal);
          browser.kill(signal);
          await Promise.race([browserClosed, sleep(2000)]);
        }
        assert.ok(browserDidClose, 'Chrome process and its stdio did not close before profile cleanup');
      }
      // Retry only transient filesystem refusal within this receiver's own profile.
      if (profile) await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
    } catch (error) {
      report.cleanupError = String(error);
      report.status = 'failed';
      process.exitCode = 1;
    }
    await artifact('input-diagnostic.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
    console.log('RESULT ' + JSON.stringify({status: report.status, checks: report.checks.length,
      downloads: report.downloads.length, sourceSha256: report.sourceSha256}));
    if (settings.emitBundle) await emitBundle(output);
  }
}

try { await main(options(process.argv.slice(2))); }
catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
