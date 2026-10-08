#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,rename} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchBrowser,waitFor} from './browser-driver.mjs';
import {receiveLab} from './lab-receiving.mjs';
import {receiveLearner} from './learner-receiving.mjs';

const base=dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2),options={source:'/home/jacob/hamon-normal-modes-3e50c5ad22c5',browser:'/snap/chromium/current/usr/lib/chromium-browser/chrome'};
for(let i=0;i<args.length;i++){const key=args[i];assert.ok(['--source','--output','--browser','--lab','--course','--guide','--learner','--identity','--inputs'].includes(key)&&args[i+1],'Usage: node receive-normal-modes.mjs --output NEW_DIRECTORY --lab PATH --course PATH --guide PATH --learner PATH [--source PATH --browser PATH --identity JSON_PATH --inputs JSON_PATH]');options[key.slice(2)]=args[++i];}
for(const key of ['output','lab','course','guide','learner'])assert.ok(options[key],'Required --'+key);
const source=resolve(options.source),output=resolve(options.output);
for(const key of ['lab','course','guide','learner'])options[key]=resolve(source,options[key]);
await mkdir(output);
const staging=join(output,'download-staging');await mkdir(staging);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const saveJSON=(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const report={schema:'recallweave.normal-modes.independent-browser-receiving.v1',status:'running',startedAt:new Date().toISOString(),node:process.version,source,output,downloadStaging:staging,acceptanceSha256:sha(await readFile(join(base,'acceptance.json'))),acceptanceAddendumSha256:sha(await readFile(join(base,'acceptance-addendum.json'))),numericTolerances:{visibleRelativeToMaxOne:6e-8,exportedRelativeToMaxOne:2e-10,visibleContract:'8 significant digits'},checks:[],downloads:[],screenshots:[],surfaces:[],observations:[],geometry:[],pageErrors:[],requests:[],sourceBefore:{},sourceAfter:{},receiverSha256:{},limitations:['390px receiving is an emulated Chromium viewport, not a physical phone or touch test.','Scripted answers demonstrate course delivery and preserved review, not human learning efficacy.','Candidate and parent identifiers are supplied by the source owner; receiver independently pins and rechecks bytes.']};
if(options.identity)report.sourceIdentity=JSON.parse(await readFile(resolve(options.identity),'utf8'));
const inputs=options.inputs?JSON.parse(await readFile(resolve(options.inputs),'utf8')):[options.lab,options.course,options.guide,options.learner,join(source,'src/deck.mjs')];
for(const input of inputs){const path=resolve(source,typeof input==='string'?input:input.path),bytes=await readFile(path);if(typeof input==='object'&&input.sha256)assert.equal(sha(bytes),input.sha256,'Pinned input '+path);report.sourceBefore[path]={bytes:bytes.length,sha256:sha(bytes),gitBlobOid:gitBlob(bytes)};}
for(const name of ['acceptance.json','acceptance-addendum.json','acceptance-layout-addendum.json','browser-driver.mjs','lab-receiving.mjs','learner-receiving.mjs','receive-normal-modes.mjs'])report.receiverSha256[name]=sha(await readFile(join(base,name)));
const courseBytes=await readFile(options.course),deck=JSON.parse(courseBytes),guideBytes=await readFile(options.guide);
report.course={title:deck.title,questions:deck.items.length,concepts:deck.concepts,canonicalSha256:sha(courseBytes)};
await saveJSON('frozen-inputs.json',{frozenAt:new Date().toISOString(),sourceIdentity:report.sourceIdentity||null,source:report.sourceBefore,receiver:report.receiverSha256,acceptanceSha256:report.acceptanceSha256,acceptanceAddendumSha256:report.acceptanceAddendumSha256});
let b;
const passed=(id,name,details)=>{report.checks.push({id,name,status:'passed',...(details?{details}:{})});console.log('PASS '+id+' '+name);};
async function download(selector,name){
 const prior=new Set(b.downloads.keys());await b.activate(selector);let event;
 await waitFor(()=>{event=[...b.downloads.values()].find(e=>!prior.has(e.guid)&&e.state==='completed');return !!event;},'actual browser download '+name,400);
 const bytes=await readFile(join(staging,event.guid));assert.ok(bytes.length>0,'Nonempty actual download');
 const path=join(output,name);await rename(join(staging,event.guid),path);
 const receipt={path,name,guid:event.guid,suggestedFilename:event.suggestedFilename,bytes:bytes.length,sha256:sha(bytes),receivedBytes:event.receivedBytes,state:event.state};
 report.downloads.push(receipt);
 return {...receipt,bytes};
}
async function geometry(label,selectors){
 const observed=await b.evaluate(selectors=>({width:innerWidth,document:document.documentElement.scrollWidth,matched:Object.fromEntries(selectors.map(s=>[s,document.querySelectorAll(s).length])),elements:[...document.querySelectorAll(selectors.join(','))].map(n=>{const r=n.getBoundingClientRect();return {tag:n.tagName,id:n.id,text:n.textContent.trim().slice(0,100),left:r.left,right:r.right,width:r.width,client:n.clientWidth,scroll:n.scrollWidth,isTableWrapper:n.matches('.table-wrap'),overflowX:getComputedStyle(n).overflowX};})}),selectors);
 for(const [selector,count] of Object.entries(observed.matched))assert.ok(count>0,label+' missing '+selector);
 assert.ok(observed.document<=observed.width+1,label+' document horizontal overflow: '+observed.document+' > '+observed.width);
 for(const el of observed.elements){assert.ok(el.width>0&&el.left>=-1&&el.right<=observed.width+1,label+' offscreen '+JSON.stringify(el));if(el.isTableWrapper&&el.scroll>el.client+1)assert.ok(['auto','scroll'].includes(el.overflowX),label+' wide table is accessible inside its wrapper');}
 report.geometry.push({label,...observed});return observed;
}
async function capture(name){
 await b.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
 const layout=await b.command('Page.getLayoutMetrics'),size=layout.cssContentSize||layout.contentSize;
 const width=Math.ceil(size.width),height=Math.ceil(size.height);
 assert.ok(width<=2000&&height<=25000,'Bounded screenshot dimensions');
 const {data}=await b.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});
 const bytes=Buffer.from(data,'base64');await writeFile(join(output,name),bytes,{flag:'wx'});
 report.screenshots.push({path:name,width,height,bytes:bytes.length,sha256:sha(bytes)});
}
try{
 b=await launchBrowser(options.browser,report);
 const {coursePath}=await receiveLab({b,lab:options.lab,deck,guideBytes,report,download,capture,geometry,passed});
 const learner=await receiveLearner({b,learner:options.learner,coursePath,deck,report,download,capture,geometry});
 passed('NM-B08','physically downloaded course completes unchanged learner flow and retains feedback, review, notes and trace',learner);
 assert.deepEqual(report.pageErrors,[],'No application runtime exceptions');
 assert.ok(report.requests.every(r=>!/^(https?|wss?):/i.test(r.url)),'Offline product requests only');
 report.status='passed';
}catch(error){report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error.stack);}
finally{
 if(b)try{await b.close();}catch(e){report.status='failed';report.cleanupError=e.stack;}
 for(const [path,before] of Object.entries(report.sourceBefore)){try{const bytes=await readFile(path);report.sourceAfter[path]={bytes:bytes.length,sha256:sha(bytes),gitBlobOid:gitBlob(bytes)};if(bytes.length!==before.bytes||sha(bytes)!==before.sha256){report.status='failed';report.sourceChanged=true;}}catch(e){report.status='failed';report.sourceAfter[path]={error:e.message};}}
 report.stagingRemainder=await readdir(staging);
 if(report.stagingRemainder.length){report.status='failed';report.stagingError='Unclaimed browser download files';}
 if(!report.sourceChanged&&JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter))passed('NM-B09','all pinned source inputs unchanged after independent receiving',{inputCount:Object.keys(report.sourceBefore).length});
 report.completedAt=new Date().toISOString();
 await saveJSON('receipt.json',report);
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,downloads:report.downloads.length,screenshots:report.screenshots.length,output,receiptSha256:sha(await readFile(join(output,'receipt.json'))),sourceChanged:!!report.sourceChanged,cleanup:report.cleanup}));
 process.exitCode=report.status==='passed'?0:1;
}
