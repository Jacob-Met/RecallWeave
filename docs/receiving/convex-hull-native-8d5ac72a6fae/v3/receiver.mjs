import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const stage=process.argv[2], req=createRequire(import.meta.url);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(stage,p)),{recursive:true});fs.writeFileSync(path.join(stage,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n')};
const config=JSON.parse(fs.readFileSync(path.join(stage,'receiving-config.json'),'utf8'));
const report={schema:'recallweave.convex-hull.visual-correction-native.v1',receiver:'estate-8d5ac72a6fae/product',started_at:new Date().toISOString(),node:process.version,source_freeze:'37953c8f25c85354e84fa66458ec69327c85b2ca',owner_expectations:'10e83a3ca94a7539d48b6fd41437bc7d386a0e13',original_packet:'74f94cf5be44426ef77c8cb1fcb616605ac9bc3a',witness_phase:'Driver authored after source exposure; owner public visual expectations predate candidate source. No new baseline or old15-group execution.',groups:[],commands:[],page_errors:[],console_errors:[],remote_requests:[],snapshots:[],downloads:[],limitations:['Focused display receiving only; original15 automated groups remain separately accepted.','No universal label separation claim for arbitrary16-point sets.','No new learner/course/math suite acceptance, hosted deployment or main/ref mutation.']};
const inventory=()=>config.pins.map(p=>{const file=path.join(stage,p.path),b=fs.readFileSync(file);return {path:p.path,bytes:b.length,sha256:sha(b),gitBlob:git(b),physical_mode:fs.statSync(file).mode&0o777}});
const exactPins=inv=>{for(let i=0;i<inv.length;i++)for(const key of ['bytes','sha256','gitBlob'])assert.equal(inv[i][key],config.pins[i][key],inv[i].path+' '+key)};
const group=async(name,fn)=>{const at=Date.now();try{await fn();report.groups.push({name,pass:true,elapsed_ms:Date.now()-at});console.log('PASS '+name)}catch(e){report.groups.push({name,pass:false,error:String(e),stack:e.stack});throw e}};
let browser,chrome,closed,context,chromeOut='',chromeErr='';
try{
report.before=inventory();exactPins(report.before);
await group('native-builder-and-check-exact-pins',async()=>{
for(const args of [['tools/build-convex-hull.mjs'],['tools/build-convex-hull.mjs','--check']]){
 const at=Date.now(),r=spawnSync(process.execPath,args,{cwd:stage,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 const entry={command:[process.execPath,...args],cwd:stage,started_at:new Date(at).toISOString(),elapsed_ms:Date.now()-at,status:r.status,signal:r.signal,error:r.error?String(r.error):null,stdout:r.stdout,stderr:r.stderr};
 report.commands.push(entry);write('builder-'+(args.length===1?'build':'check')+'.stdout.txt',r.stdout||'');write('builder-'+(args.length===1?'build':'check')+'.stderr.txt',r.stderr||'');assert.equal(r.error,undefined);assert.equal(r.status,0);assert.equal(r.stderr,'');exactPins(inventory());
}});
const chromePath='/workspace/scratch/86776bb3cdb8/product-delivery/browser-runtime/chromium';
assert.equal(sha(fs.readFileSync(chromePath)),'53a15d6c3a3d27dfb54c4ba60278b1683136f70cf1e67e989da7dfbd3d451ef0');
const {chromium}=req('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const launchArgs=['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+path.join(stage,'profile'),'about:blank'];
const launched=Date.now();chrome=spawn(chromePath,launchArgs,{env:{...process.env,TMPDIR:path.join(stage,'tmp')},stdio:['ignore','pipe','pipe']});
chrome.stdout.on('data',b=>chromeOut+=b);chrome.stderr.on('data',b=>chromeErr+=b);closed=new Promise(resolve=>chrome.on('close',(code,signal)=>resolve({code,signal,at:new Date().toISOString()})));
const endpoint=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Chrome endpoint timeout')),15000);chrome.stderr.on('data',()=>{const m=chromeErr.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(t);resolve(m[1])}});chrome.on('error',reject)});
report.browser={executable:chromePath,sha256:'53a15d6c3a3d27dfb54c4ba60278b1683136f70cf1e67e989da7dfbd3d451ef0',pid:chrome.pid,args:launchArgs,started_at:new Date(launched).toISOString()};
browser=await chromium.connectOverCDP(endpoint);report.browser.version=browser.version();
context=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>report.page_errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.console_errors.push(m.text())});page.on('request',r=>{if(/^https?:/.test(r.url()))report.remote_requests.push(r.url())});
await page.goto(pathToFileURL(path.join(stage,'courses/convex-hull-explorer.html')).href);await page.locator('#compute-hull').waitFor();
const compute=async(points)=>{await page.locator('#points-input').fill(JSON.stringify(points));await page.locator('#compute-hull').click();assert.equal(await page.locator('#hull-error').textContent(),'');};
const snap=async name=>{const value=await page.evaluate(()=>{
 const svg=document.querySelector('#hull-diagram'), bb=e=>{const b=e.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height}}, rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}};
 return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,svg:{box:rect(svg),viewBox:svg.getAttribute('viewBox')},labels:[...svg.querySelectorAll('.point-label')].map(e=>({text:e.textContent,box:bb(e),screen:rect(e),style:e.getAttribute('style')})),circles:[...svg.querySelectorAll('circle')].map(e=>({title:e.querySelector('title').textContent,cx:+e.getAttribute('cx'),cy:+e.getAttribute('cy'),r:+e.getAttribute('r'),box:bb(e)})),axis:[...svg.querySelectorAll('.axis-label')].map(e=>({text:e.textContent,box:bb(e)})),numericAttributes:[...svg.querySelectorAll('*')].flatMap(e=>[...e.attributes].filter(a=>/^(x|y|x1|x2|y1|y2|cx|cy|r)$/.test(a.name)).map(a=>({name:a.name,value:a.value}))),caption:document.querySelector('#plot-scale').textContent,result:document.querySelector('#result-summary').textContent,step:document.querySelector('#step-summary').textContent,rows:[...document.querySelectorAll('#point-rows tr')].map(r=>[...r.children].map(c=>c.textContent))};
});report.snapshots.push({name,...value});return value};
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const finiteAndBounds=s=>{assert.ok(s.documentWidth<=s.viewport.width,'document horizontal overflow');for(const a of s.numericAttributes)assert.ok(Number.isFinite(Number(a.value)),'nonfinite '+JSON.stringify(a));for(const p of [...s.labels,...s.circles,...s.axis]){const b=p.box;for(const v of Object.values(b))assert.ok(Number.isFinite(v));assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=520&&b.y+b.height<=520,'clipped '+JSON.stringify(p));}};
const separated=s=>{for(let i=0;i<s.labels.length;i++){for(let j=i+1;j<s.labels.length;j++)assert.ok(!intersects(s.labels[i].box,s.labels[j].box),'labels intersect');for(const c of s.circles)assert.ok(!intersects(s.labels[i].box,c.box),'label/marker intersect '+s.labels[i].text)}};
const positions=s=>s.circles.map(c=>[c.title,c.cx,c.cy,c.r]);
const download=async(name,ref)=>{const promise=page.waitForEvent('download');await page.locator('#download-trace').click();const d=await promise;const destination=path.join(stage,'downloads',name);fs.mkdirSync(path.dirname(destination),{recursive:true});await d.saveAs(destination);const b=fs.readFileSync(destination),expected=fs.readFileSync(path.join(stage,ref));assert.equal(d.suggestedFilename(),'convex-hull-trace.json');assert.ok(b.equals(expected),'trace differs from original accepted trace');report.downloads.push({path:'downloads/'+name,bytes:b.length,sha256:sha(b),gitBlob:git(b),original_reference:ref,exact:true});};
const capture=async(name,selector)=>{await page.locator(selector).screenshot({path:path.join(stage,'screenshots',name),type:'jpeg',quality:72,caret:'initial'});};
fs.mkdirSync(path.join(stage,'screenshots'),{recursive:true});
const rectangle=JSON.parse(fs.readFileSync(path.join(stage,'fixtures/rectangle.json'),'utf8'));
const rows=[['P1','(-2, -1)','P1','vertex'],['P2','(2, -1)','P2','vertex'],['P3','(2, 2)','P3','vertex'],['P4','(-2, 2)','P4','vertex'],['P5','(0, 0)','P5','interior'],['P6','(2, 0)','P6','edge'],['P7','(-2, -1)','P1 (duplicate)','vertex']];
for(const viewport of [{width:1280,height:1000},{width:390,height:844}]){
 await page.setViewportSize(viewport);
 await group('compact-rectangle-'+viewport.width,async()=>{
 await compute(rectangle);const first=await snap('rectangle-'+viewport.width+'-first');finiteAndBounds(first);separated(first);assert.deepEqual(first.labels.map(l=>l.text).sort(),['P1 ×2','P2','P3','P4','P5','P6']);assert.deepEqual(first.rows,rows);
 assert.equal(first.result,'Complete result: polygon · vertices P1 → P2 → P3 → P4 · twice-area 24 · area 12 square coordinate units.');
 assert.equal(first.caption,'Both axes use the same scale. Marked ticks: −2 and 2.');
 const c=[...first.circles].sort((a,b)=>a.title.localeCompare(b.title)),dx=(c[1].cx-c[0].cx)/4,dy=(c[1].cy-c[2].cy)/3;assert.ok(dx>0&&dy>0);assert.equal(dx,dy);assert.equal(c[0].cy,c[1].cy);assert.equal(c[1].cx,c[2].cx);
 if(viewport.width===1280)await download('rectangle-first-step.json','references/rectangle-first-step.json');
 await page.locator('#next-step').click();const next=await snap('rectangle-'+viewport.width+'-next');assert.deepEqual(positions(next),positions(first));assert.notEqual(next.step,first.step);
 await page.locator('#previous-step').click();const previous=await snap('rectangle-'+viewport.width+'-previous');assert.deepEqual(positions(previous),positions(first));assert.equal(previous.step,first.step);
 if(viewport.width===1280){const ref=JSON.parse(fs.readFileSync(path.join(stage,'references/rectangle-selected-step.json'),'utf8'));assert.ok(Number.isInteger(ref.selectedStep)&&ref.selectedStep>=0&&ref.selectedStep<100);for(let i=0;i<ref.selectedStep;i++)await page.locator('#next-step').click();assert.deepEqual(positions(await snap('rectangle-selected-download')),positions(first));await download('rectangle-selected-step.json','references/rectangle-selected-step.json');}
 await page.locator('#final-step').click();const final=await snap('rectangle-'+viewport.width+'-final');finiteAndBounds(final);separated(final);assert.deepEqual(positions(final),positions(first));assert.deepEqual(final.rows,rows);assert.equal(final.caption,first.caption);assert.ok(await page.locator('#final-step').isDisabled());assert.ok(await page.locator('#previous-step').isEnabled());
 if(viewport.width===1280)await download('rectangle-final-step.json','references/rectangle-final-step.json');
 await capture('rectangle-'+viewport.width+'-plot.jpg','section[aria-labelledby="result-title"]');
 await capture('rectangle-'+viewport.width+'-table.jpg','section[aria-labelledby="identity-title"]');
 });
}
await group('focused-finite-and-clipping-display-guards',async()=>{
for(const viewport of [{width:1280,height:1000},{width:390,height:844}]){
 await page.setViewportSize(viewport);
 for(const [name,points] of [['empty',[]],['duplicate',[[3,-2],[3,-2]]],['full-range',[[-20,-20],[20,20]]],['top-axis',[[0,1]]]]){
 await compute(points);const s=await snap(name+'-'+viewport.width);finiteAndBounds(s);
 if(name==='empty'){assert.equal(s.circles.length,0);assert.match(s.result,/empty/);assert.equal(s.caption,'Both axes use the same scale. Marked ticks: −20 and 20.');}
 if(name==='duplicate'){assert.equal(s.circles.length,1);assert.equal(s.labels[0].text,'P1 ×2');assert.equal(s.rows[1][2],'P1 (duplicate)');}
 if(name==='full-range'){assert.deepEqual(s.circles.map(c=>[c.cx,c.cy]),[[60,460],[460,60]]);assert.equal(s.caption,'Both axes use the same scale. Marked ticks: −20 and 20.');}
 if(name==='top-axis'){const y=s.axis.find(a=>a.text==='y');assert.ok(y);assert.ok(!intersects(y.box,s.labels[0].box),'y-axis title overlaps point label');if(viewport.width===390)await capture('top-axis-390-plot.jpg','section[aria-labelledby="result-title"]');}
 }
}
});
await group('clean-browser-and-source-preservation',async()=>{assert.deepEqual(report.page_errors,[]);assert.deepEqual(report.console_errors,[]);assert.deepEqual(report.remote_requests,[]);report.after=inventory();assert.deepEqual(report.after,report.before);});
report.pass=true;
}catch(e){report.pass=false;report.error=String(e);report.stack=e.stack;console.error(e.stack);process.exitCode=1;}
finally{
 if(context)await context.close().catch(e=>report.context_close_error=String(e));
 if(browser&&chrome){try{const session=await browser.newBrowserCDPSession();await session.send('Browser.close')}catch(e){report.browser_close_note=String(e)}}
 if(chrome){const result=await Promise.race([closed,new Promise(resolve=>setTimeout(()=>resolve(null),5000))]);if(!result){chrome.kill('SIGTERM');report.browser_forced_close=true;}report.browser_close=result||await closed;}
 if(browser)await browser.close().catch(()=>{});
 // Chrome streams are maintained through explicit physical child close above.
 if(chrome){write('chromium.stdout.txt',chromeOut);write('chromium.stderr.txt',chromeErr);}
 try{report.after=inventory();report.source_unchanged=JSON.stringify(report.after)===JSON.stringify(report.before)}catch(e){report.inventory_error=String(e)}
 report.finished_at=new Date().toISOString();write('receipt.json',report);console.log('RESULT '+JSON.stringify({pass:report.pass,groups:report.groups.map(g=>({name:g.name,pass:g.pass})),downloads:report.downloads.length,source_unchanged:report.source_unchanged,browser_close:report.browser_close}));
}
