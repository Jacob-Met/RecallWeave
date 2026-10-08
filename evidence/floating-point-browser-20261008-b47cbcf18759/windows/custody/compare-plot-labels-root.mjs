import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const base='C:\\hamon-receiving-b47cbcf18759',sha=b=>createHash('sha256').update(b).digest('hex');
const beforeFile=path.join(base,'recallweave-v2-label-control','floating-point-lab.html');
const afterFile=path.join(base,'recallweave-current-81363271-v3','courses','floating-point-lab.html');
const sourcePins=new Map([[beforeFile,'6e4affdad15ff05b362b92fca03bf675d982cc832f6524fbada7b44bd1bf0094'],[afterFile,'a3e821c4fa514bd1b939ed9da97946bd089e0bb545bd36b0096d9c4bb530c418']]);
for(const [p,h]of sourcePins)assert.equal(sha(fs.readFileSync(p)),h);
const s=fs.statfsSync(base);assert.ok(Number(s.bavail)*Number(s.bsize)>=1073741824);
const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const out=path.join(base,'browser-receiving-labels-'+stamp);fs.mkdirSync(out);const tmp=path.join(out,'tmp'),profile=path.join(out,'profile');fs.mkdirSync(tmp);fs.mkdirSync(profile);
const r={format:'hamon.plot-label-independent-receiving/1',started:new Date().toISOString(),output:out,status:'running',sourcePins:Object.fromEntries(sourcePins),observations:[],captures:[],errors:[],requests:[],cleanup:{},boundary:'Same installed Chrome and private profile compare retained source-v2 against the visual successor at default1e7; two successor widths. Geometry/core/course data are untouched. Full learner acceptance remains the separate40-file current813 receipt.'};
let context,timer;
try{
 const {chromium}=await import(pathToFileURL(path.join(base,'dependencies','playwright-core-1.62.1','index.mjs')).href);
 context=await chromium.launchPersistentContext(profile,{executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,timeout:20000,env:{...process.env,TMPDIR:tmp,TMP:tmp,TEMP:tmp},args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check']});
 r.browser=context.browser().version();r.node=process.version;
 timer=setTimeout(()=>{r.deadlineExceeded=true;context.close().catch(e=>r.errors.push(e.message));},60000);
 await context.route(/^https?:\/\//i,async route=>{r.requests.push(route.request().url());await route.abort('blockedbyclient');});
 for(const [label,file,width,height]of [['v2-negative-wide',beforeFile,1280,1000],['v3-positive-wide',afterFile,1280,1000],['v3-positive-compact',afterFile,390,844]]){
  const page=await context.newPage();page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(10000);page.on('pageerror',e=>r.errors.push(e.message));await page.setViewportSize({width,height});await page.goto(pathToFileURL(file).href,{waitUntil:'load'});
  assert.equal(await page.locator('#stored-area').textContent(),'-3');
  const boxes=await page.locator('#plot-layer text').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return{text:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height};}));
  const collisions=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j],w=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),h=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);if(w>.25&&h>.25)collisions.push({a:a.text,b:b.text,width:w,height:h});}
  r.observations.push({label,width,height,boxes,collisions});
  const filename=label+'.png',png=await page.locator('#triangle-plot').screenshot({path:path.join(out,filename),timeout:5000});r.captures.push({path:filename,bytes:png.length,sha256:sha(png)});
  if(label.startsWith('v2'))assert.ok(collisions.some(c=>new Set([c.a,c.b]).has('b')&&new Set([c.a,c.b]).has('b′')),'Retained b/b-prime overlap must actually reproduce on the same browser.');
  else{assert.deepEqual(collisions,[]);assert.ok(boxes.every(b=>b.x>=-1&&b.y>=-1&&b.x+b.width<=451&&b.y+b.height<=411));}
  await page.close();
 }
 assert.deepEqual(r.errors,[]);assert.deepEqual(r.requests,[]);r.status='passed';
}catch(e){r.status='failed';r.error={name:e.name,message:e.message,stack:e.stack};}
finally{
 clearTimeout(timer);if(context){try{await context.close();r.cleanup.browserClosed=true;}catch(e){r.status='failed';r.cleanup.closeError=e.message;}}
 for(const [p,h]of sourcePins){if(sha(fs.readFileSync(p))!==h){r.status='failed';r.sourceChanged=p;}}
 for(const pof of [profile,tmp]){try{fs.rmSync(pof,{recursive:true,force:true});r.cleanup[path.basename(pof)]='removed';}catch(e){r.status='failed';r.cleanup[path.basename(pof)]=e.message;}}
 if(r.deadlineExceeded)r.status='failed';r.finished=new Date().toISOString();const p=path.join(out,'receiving.json'),fd=fs.openSync(p,'wx');try{fs.writeFileSync(fd,JSON.stringify(r,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 console.log(JSON.stringify({status:r.status,output:out,receipt:p,sha256:sha(fs.readFileSync(p)),observations:r.observations.map(o=>({label:o.label,collisions:o.collisions})),captures:r.captures,error:r.error,cleanup:r.cleanup}));process.exitCode=r.status==='passed'?0:1;
}
