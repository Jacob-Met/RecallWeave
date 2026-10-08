import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startBrowser,waitFor} from './browser-transport.mjs';

const root=dirname(fileURLToPath(import.meta.url)),project=join(root,'source-v2'),out=join(root,process.argv[2]??'browser-v1');
await mkdir(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFreeze=JSON.parse(await readFile(join(root,'source-freeze-v2.json'),'utf8'));
const courseBytes=await readFile(join(project,'courses/grouped-data.json'));
const course=JSON.parse(courseBytes);
const report={status:'running',started_at:new Date().toISOString(),checks:[],frames:[],downloads:[],screenshots:[],source:sourceFreeze};
const groups=['newcomers','experienced'],options=['a','b'];
const fields=options.flatMap(o=>groups.flatMap(g=>['successes','total'].map(f=>o+'-'+g+'-'+f)));
const reversal={a:{newcomers:{successes:30,total:100},experienced:{successes:9,total:10}},b:{newcomers:{successes:2,total:10},experienced:{successes:80,total:100}}};
const empty={a:{newcomers:{successes:0,total:0},experienced:{successes:1,total:2}},b:{newcomers:{successes:1,total:4},experienced:{successes:3,total:4}}};
const tiny={a:{newcomers:{successes:999999,total:1000000},experienced:{successes:999999,total:1000000}},b:{newcomers:{successes:999998,total:1000000},experienced:{successes:999998,total:1000000}}};
let b;
const passed=name=>{report.checks.push(name);console.log('PASS '+name);};
async function frame(label){
  const value=await b.evaluate(`(()=>{
    const t=id=>document.getElementById(id)?.textContent;
    const v=id=>document.getElementById(id)?.value;
    return {url:location.href,counts:Object.fromEntries([...document.querySelectorAll('[data-count]')].map(n=>[n.id,n.value])),mix:v('mix'),resultsHidden:document.getElementById('results').hidden,errorHidden:document.getElementById('input-error').hidden,error:t('input-error'),status:t('current-status'),dataDisabled:document.getElementById('download-data').disabled,courseDisabled:document.getElementById('download-course').disabled,groupCells:Object.fromEntries(['newcomers-a-rate','newcomers-b-rate','experienced-a-rate','experienced-b-rate','newcomers-direction','experienced-direction'].map(id=>[id,t(id)])),pooled:[t('pooled-a'),t('pooled-b')],pooledCounts:[t('pooled-a-counts'),t('pooled-b-counts')],originalMix:[t('mix-a-text'),t('mix-b-text')],reference:[t('reference-a'),t('reference-b')],referenceDirection:t('reference-direction'),referenceGap:t('reference-gap'),referenceSupport:t('reference-support'),pooledDirection:t('pooled-direction'),interpretation:t('interpretation'),fractions:[...document.querySelectorAll('#exact-fractions > *')].map(n=>n.textContent),overflow:document.documentElement.scrollWidth>innerWidth,focus:document.activeElement.id,visibleText:document.body.innerText};
  })()`);
  report.frames.push({label,...value});
  return value;
}
async function valid(label){
  const f=await frame(label);assert.equal(f.resultsHidden,false);assert.equal(f.errorHidden,true);assert.equal(f.dataDisabled,false);assert.equal(f.courseDisabled,false);return f;
}
async function setCounts(counts){
  for(const o of options)for(const g of groups)for(const f of ['successes','total'])await b.replace('#'+o+'-'+g+'-'+f,String(counts[o][g][f]));
}
async function mix(percent){
  await b.evaluate('document.getElementById("mix").focus()');
  await b.key(percent===100?'End':'Home');
  if(percent!==100)for(let i=0;i<percent;i++)await b.key('ArrowRight');
  assert.equal(await b.evaluate('document.getElementById("mix").value'),String(percent));
}
async function preset(index){
  await b.evaluate('document.getElementById("preset").focus()');
  await b.key('Home');for(let i=0;i<index;i++)await b.key('ArrowDown');await b.key('Tab');
}
function countsFromFrame(f){
  const r={a:{},b:{}};for(const o of options)for(const g of groups)r[o][g]={successes:Number(f.counts[o+'-'+g+'-successes']),total:Number(f.counts[o+'-'+g+'-total'])};return r;
}
function fraction(actual,n,d){
  if(n===null){assert.equal(actual,null);return;}
  assert.ok(actual&&typeof actual.numerator==='string'&&typeof actual.denominator==='string');
  assert.ok(BigInt(actual.denominator)>0n);
  assert.equal(BigInt(actual.numerator)*BigInt(d),BigInt(n)*BigInt(actual.denominator));
  assert.ok(Math.abs(actual.value-Number(n)/Number(d))<1e-12);
}
function direction(a,b){
  if(a===null||b===null)return 'unavailable';
  const diff=BigInt(a[0])*BigInt(b[1])-BigInt(b[0])*BigInt(a[1]);
  return diff===0n?'equal':diff>0n?'a_higher':'b_higher';
}
function difference(actual,a,b){
  if(a===null||b===null){assert.equal(actual,null);return;}
  fraction(actual,BigInt(a[0])*BigInt(b[1])-BigInt(b[0])*BigInt(a[1]),BigInt(a[1])*BigInt(b[1]));
}
function verifyData(data,counts,percent,refs,classification){
  assert.equal(data.format,'recallweave-grouped-data/1');
  assert.deepEqual(data.counts,counts);
  assert.equal(data.reference.experiencedPercent,percent);
  const pooled=[];
  for(const o of options){
    let successes=0,total=0;
    for(const g of groups){
      const cell=counts[o][g],group=data.groups.find(x=>x.key===g);
      fraction(group[o],cell.total?cell.successes:null,cell.total);
      successes+=cell.successes;total+=cell.total;
    }
    const p=data.observed[o];assert.equal(p.successes,successes);assert.equal(p.total,total);
    fraction(p.rate,total?successes:null,total);
    fraction(p.experiencedWeight,total?counts[o].experienced.total:null,total);
    pooled.push(total?[successes,total]:null);
    const index=o==='a'?0:1,reference=refs[index];
    fraction(data.reference[o],reference===null?null:reference[0],reference===null?1:reference[1]);
  }
  for(const g of groups){
    const a=counts.a[g],bb=counts.b[g],ar=a.total?[a.successes,a.total]:null,br=bb.total?[bb.successes,bb.total]:null,group=data.groups.find(x=>x.key===g);
    assert.equal(group.comparison,direction(ar,br));difference(group.difference,ar,br);
  }
  assert.equal(data.observed.comparison,direction(...pooled));difference(data.observed.difference,...pooled);
  assert.equal(data.reference.comparison,direction(...refs));difference(data.reference.difference,...refs);
  assert.equal(data.classification,classification);
  assert.ok(data.interpretation.includes('do not alter the counts or estimate a causal effect'));
}
async function download(kind,name){
  const previous=new Set(b.downloads.keys());
  await b.activate('#download-'+kind);
  const d=await waitFor(()=>[...b.downloads.values()].find(x=>!previous.has(x.guid)&&x.state==='completed'),'actual '+kind+' download');
  const bytes=await readFile(join(b.downloadPath,d.guid));
  assert.equal(d.suggestedFilename,kind==='data'?'grouped-data-comparison.json':'grouped-data-course.json');
  await writeFile(join(out,name),bytes);
  report.downloads.push({name,suggestedFilename:d.suggestedFilename,guid:d.guid,bytes:bytes.length,sha256:sha(bytes)});
  return bytes;
}
async function capture(name){
  const height=await b.evaluate('Math.ceil(document.documentElement.scrollHeight)');
  assert.ok(height<9000,'Bound the full-page receiving capture');
  const width=await b.evaluate('innerWidth');
  const {data}=await b.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});
  await writeFile(join(out,name),Buffer.from(data,'base64'));report.screenshots.push({name,width,height});
}
function noStorage(state){
  assert.deepEqual(state.calls,[]);
  assert.deepEqual(state.local,[]);assert.deepEqual(state.session,[]);
  if(typeof state.cookie==='string')assert.equal(state.cookie,'');
  if(Array.isArray(state.databases))assert.deepEqual(state.databases,[]);
  if(Array.isArray(state.cacheNames))assert.deepEqual(state.cacheNames,[]);
}
async function checkCourse(name){
  const bytes=await download('course',name);
  assert.ok(bytes.equals(courseBytes),'Course download must preserve original bytes, including Unicode and final newline');
  assert.equal(sha(bytes),'8ea687ed9157c0a81f155d2f96bc381ebe3024c0c582cf177c0814656460d20d');
}

try{
  for(const file of sourceFreeze.files){const bytes=await readFile(join(project,file.path));assert.equal(sha(bytes),file.sha256);}
  assert.equal(sha(await readFile(join(project,'courses/grouped-data-explorer.html'))),'91e03d2c4c5fef3835fcfcf70a014e51a34122ff32ced9df0dd3bd84364c976d');
  passed('all twelve frozen source inputs and the standalone HTML are exact before launch');
  b=await startBrowser(project,out);report.browser=b.version;
  await b.navigate(pathToFileURL(join(project,'courses/grouped-data-explorer.html')).href);
  await waitFor(()=>b.evaluate('!!document.getElementById("current-status").textContent'),'explorer initialized');
  await valid('file-default');
  const labels=await b.evaluate('[...document.querySelectorAll("input")].map(n=>({id:n.id,aria:n.getAttribute("aria-label"),labels:[...n.labels].map(l=>l.textContent.trim()),type:n.type}))');
  assert.equal(labels.length,9);assert.ok(labels.every(x=>x.labels.length>0&&x.labels[0].length>0));
  assert.equal(new Set(labels.filter(x=>x.id!=='mix').map(x=>x.aria)).size,8);
  assert.ok(labels.filter(x=>x.id!=='mix').every(x=>x.aria&&x.type==='text'));
  assert.equal(await b.evaluate('document.getElementById("course-title").textContent'),course.title);
  assert.equal(await b.evaluate('document.getElementById("course-count").textContent'),'12');
  report.labels=labels;passed('file route initializes all nine distinctly labeled controls and the exact course title');
  await b.evaluate('document.getElementById("a-newcomers-successes").focus()');
  const focus=[];for(let i=0;i<9;i++){focus.push(await b.evaluate('document.activeElement.id'));await b.key('Tab');}
  assert.deepEqual(focus,['a-newcomers-successes','a-newcomers-total','b-newcomers-successes','b-newcomers-total','a-experienced-successes','a-experienced-total','b-experienced-successes','b-experienced-total','mix']);
  passed('native Tab moves through every editable count and into the reference slider');
  const presetStates=[];
  for(let i=0;i<4;i++){await preset(i);const f=await valid('preset-'+i);presetStates.push({counts:f.counts,interpretation:f.interpretation,reference:f.reference});}
  assert.equal(new Set(presetStates.map(x=>JSON.stringify(x.counts))).size,4);
  assert.match(presetStates[0].interpretation,/strict Simpson reversal/);
  assert.match(presetStates[1].interpretation,/no strict reversal/);
  assert.match(presetStates[2].interpretation,/different options/);
  assert.match(presetStates[3].interpretation,/unavailable/);
  passed('all four supplied presets are keyboard-selectable, distinct and truthfully classified');
  await setCounts(reversal);await mix(50);
  let f=await valid('independent-reversal-50');
  assert.deepEqual(countsFromFrame(f),reversal);assert.deepEqual(f.pooled,['35.45%','74.55%']);assert.deepEqual(f.pooledCounts,['39 successes / 110 attempts','82 successes / 110 attempts']);
  assert.deepEqual(f.reference,['60.00%','50.00%']);assert.match(f.pooledDirection,/B has/);assert.match(f.interpretation,/Both groups favor A.*favors B.*strict Simpson reversal/);
  assert.match(f.groupCells['newcomers-a-rate'],/30 \/ 100.*30.00%/);assert.match(f.groupCells['experienced-b-rate'],/80 \/ 100.*80.00%/);
  assert.deepEqual(f.originalMix,['90.91% newcomers · 9.09% experienced','9.09% newcomers · 90.91% experienced']);
  passed('real keyboard edits produce the independent reversal counts, weights, pooled and common-mix rates');
  const originalObserved={counts:f.counts,pooled:f.pooled,pooledCounts:f.pooledCounts,originalMix:f.originalMix,groupCells:f.groupCells};
  const data50=JSON.parse(await download('data','file-reversal-50.json'));
  verifyData(data50,reversal,50,[[3,5],[1,2]],'strict_reversal');
  await checkCourse('file-course.json');
  passed('actual file-route downloads preserve exact course bytes and independently recomputed current fractions');
  await capture('desktop-reversal.png');
  for(const [p,expected,refs]of [[0,['30.00%','20.00%'],[[3,10],[1,5]]],[100,['90.00%','80.00%'],[[9,10],[4,5]]]]){
    await mix(p);f=await valid('reference-endpoint-'+p);
    assert.deepEqual(f.reference,expected);
    assert.deepEqual({counts:f.counts,pooled:f.pooled,pooledCounts:f.pooledCounts,originalMix:f.originalMix,groupCells:f.groupCells},originalObserved);
    verifyData(JSON.parse(await download('data','file-reversal-'+p+'.json')),reversal,p,refs,'strict_reversal');
  }
  passed('native Home/End reference endpoints change only the common-mix calculation and current exports');
  await mix(50);
  const invalids=['','not-a-count','-1','1.5','1000001','101','Infinity','2e2','0x10'];
  for(let i=0;i<invalids.length;i++){
    await b.replace('#a-newcomers-successes',invalids[i]);
    const bad=await frame('invalid-'+i);
    assert.equal(bad.resultsHidden,true);assert.equal(bad.errorHidden,false);assert.equal(bad.dataDisabled,true);assert.equal(bad.courseDisabled,true);
    assert.ok(bad.error.length>0);assert.ok(!bad.visibleText.includes('39 successes / 110 attempts'));
    assert.equal(await b.evaluate('getComputedStyle(document.getElementById("results")).display'),'none');
    const n=b.downloads.size;await b.evaluate('document.getElementById("download-data").focus()');await b.key('Enter');assert.equal(b.downloads.size,n);
    await b.replace('#a-newcomers-successes','30');f=await valid('repaired-'+i);assert.deepEqual(f.pooled,['35.45%','74.55%']);
  }
  passed('nine real invalid edits immediately hide stale output, disable both downloads and recover after repair');
  await b.replace('#a-newcomers-successes','31');f=await valid('changed-after-invalid');
  const changed=structuredClone(reversal);changed.a.newcomers.successes=31;
  assert.deepEqual(f.pooledCounts,['40 successes / 110 attempts','82 successes / 110 attempts']);
  assert.deepEqual(f.reference,['60.50%','50.00%']);
  verifyData(JSON.parse(await download('data','file-changed-after-invalid.json')),changed,50,[[121,200],[1,2]],'strict_reversal');
  passed('after invalid-state repair the actual export uses newly changed counts, not an earlier cached result');
  await setCounts(tiny);f=await valid('tiny-strict-difference');
  assert.deepEqual(f.pooled,['100.00%','100.00%']);
  assert.match(f.pooledDirection,/A has/);assert.match(f.referenceDirection,/A has/);assert.match(f.referenceGap,/less than 0.01.*favor of A/);
  verifyData(JSON.parse(await download('data','file-tiny-strict.json')),tiny,50,[[999999,1000000],[999998,1000000]],'same_direction');
  passed('rounded-equal visible percentages retain their exact strict direction and exported fractions');
  await setCounts(empty);await mix(100);f=await valid('empty-positive-support-endpoint');
  assert.deepEqual(f.reference,['50.00%','75.00%']);assert.match(f.groupCells['newcomers-a-rate'],/0 \/ 0.*Unavailable/);
  verifyData(JSON.parse(await download('data','file-empty-100.json')),empty,100,[[1,2],[3,4]],'unavailable');
  await mix(0);f=await valid('empty-missing-reference');assert.deepEqual(f.reference,['Unavailable','25.00%']);assert.match(f.referenceSupport,/Option A: newcomers.*positive weight/);
  await mix(50);f=await valid('empty-half-reference');assert.deepEqual(f.reference,['Unavailable','50.00%']);
  passed('zero denominators remain unavailable while a zero-weight missing group is correctly excluded');
  const fileStorage=await b.storage();noStorage(fileStorage);report.fileStorage=fileStorage;
  assert.equal(b.blockedRequests.length,0);assert.ok(b.requests.every(x=>x.url.startsWith('file:')||x.url.startsWith('blob:')||x.url.startsWith('data:')));
  passed('file-route edits and real downloads make no HTTP requests or observed storage calls');
  const requestStart=b.requests.length;
  await b.navigate(b.base+'/courses/grouped-data-explorer.html',390,844);
  await waitFor(()=>b.evaluate('!!document.getElementById("current-status").textContent'),'loopback explorer initialized');
  f=await valid('loopback-default-390');assert.equal(f.overflow,false);
  await setCounts(reversal);await mix(50);f=await valid('loopback-reversal-390');
  assert.equal(f.overflow,false);assert.deepEqual(f.reference,['60.00%','50.00%']);
  verifyData(JSON.parse(await download('data','loopback-reversal-50.json')),reversal,50,[[3,5],[1,2]],'strict_reversal');
  await checkCourse('loopback-course.json');
  await b.activate('details > summary');assert.equal(await b.evaluate('document.querySelector("details").open'),true);
  f=await valid('loopback-exact-fractions-open');assert.equal(f.overflow,false);
  assert.ok(f.fractions.includes('39 / 110'));assert.ok(f.fractions.includes('82 / 110'));assert.ok(f.fractions.includes('3 / 5'));
  await capture('mobile-reversal.png');
  passed('390px loopback route supports keyboard editing, exact fractions and both real downloads without page overflow');
  await b.replace('#b-experienced-total','');f=await frame('loopback-invalid-390');
  assert.equal(f.resultsHidden,true);assert.equal(f.dataDisabled,true);assert.equal(f.courseDisabled,true);assert.equal(f.overflow,false);
  await b.screenshot('mobile-invalid.png');report.screenshots.push({name:'mobile-invalid.png',width:390,height:844});
  await b.replace('#b-experienced-total','100');f=await valid('loopback-repaired-390');assert.deepEqual(f.pooled,['35.45%','74.55%']);
  passed('mobile invalid edits clear available results and retain editable values for repair');
  const loopStorage=await b.storage();noStorage(loopStorage);report.loopbackStorage=loopStorage;
  report.loopbackRequests=b.requests.slice(requestStart);
  const applicationRequests=report.loopbackRequests.filter(x=>!x.url.startsWith('blob:')&&!x.url.startsWith('data:')&&x.url!==b.base+'/courses/grouped-data-explorer.html');
  const implicitIcons=applicationRequests.filter(x=>x.url===b.base+'/favicon.ico'&&x.type==='Other');
  assert.deepEqual(applicationRequests,implicitIcons,'No runtime application requests beyond an implicit browser favicon lookup');
  report.implicitBrowserFavicon=implicitIcons;
  assert.equal(b.blockedRequests.length,0);assert.deepEqual(b.pageErrors,[]);
  passed('loopback interactions have no application network, storage or JavaScript exceptions; browser favicon is separately recorded');
  report.status='passed';
}catch(error){
  report.status='failed';report.error=error.stack??String(error);console.error(report.error);process.exitCode=1;
  if(b){try{report.failedFrame=await frame('failure');await b.screenshot('failure.png');report.screenshots.push({name:'failure.png'});}catch(error2){report.capture_error=String(error2);}}
}finally{
  if(b){report.observations={requests:b.requests,blockedRequests:b.blockedRequests,pageErrors:b.pageErrors};report.cleanup=await b.close();}
  report.source_readback=[];for(const file of sourceFreeze.files){const bytes=await readFile(join(project,file.path));report.source_readback.push({path:file.path,sha256:sha(bytes),unchanged:sha(bytes)===file.sha256});}
  report.receiver_sha256=sha(await readFile(fileURLToPath(import.meta.url)));report.transport_sha256=sha(await readFile(join(root,'browser-transport.mjs')));report.finished_at=new Date().toISOString();
  await writeFile(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.status.toUpperCase()+': '+report.checks.length+' independent browser controls');
}
