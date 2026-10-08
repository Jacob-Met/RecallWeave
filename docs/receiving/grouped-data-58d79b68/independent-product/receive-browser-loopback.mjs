import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startBrowser,waitFor} from './browser-transport-v2.mjs';

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
report.replay_scope='Only the previously blocked loopback tail plus independent 100-to-99 and tiny-fraction browser controls; settled file-route checks are not repeated.';
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
  passed('the same exact source freeze is retained for bounded loopback continuation');
  b=await startBrowser(project,out);report.browser=b.version;
  let f;
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
  for(const [label,n,d]of [['Pooled option A',39n,110n],['Pooled option B',82n,110n],['Reference option A',3n,5n]]){
    const at=f.fractions.indexOf(label);assert.ok(at>=0);const [actualN,actualD]=f.fractions[at+1].split('/').map(x=>BigInt(x.trim()));
    assert.equal(actualN*d,n*actualD,'Visible fraction equivalence: '+label);
  }
  await capture('mobile-reversal.png');
  passed('390px loopback route supports keyboard editing, exact fractions and both real downloads without page overflow');
  await b.replace('#b-experienced-total','');f=await frame('loopback-invalid-390');
  assert.equal(f.resultsHidden,true);assert.equal(f.dataDisabled,true);assert.equal(f.courseDisabled,true);assert.equal(f.overflow,false);
  await b.screenshot('mobile-invalid.png');report.screenshots.push({name:'mobile-invalid.png',width:390,height:844});
  await b.replace('#b-experienced-total','100');f=await valid('loopback-repaired-390');assert.deepEqual(f.pooled,['35.45%','74.55%']);
  passed('mobile invalid edits clear available results and retain editable values for repair');
  await setCounts(empty);await mix(100);f=await valid('loopback-missing-group-100');
  assert.deepEqual(f.reference,['50.00%','75.00%']);
  await b.key('ArrowLeft');assert.equal(await b.evaluate('document.getElementById("mix").value'),'99');
  f=await valid('loopback-missing-group-99');assert.deepEqual(f.reference,['Unavailable','74.50%']);
  assert.match(f.referenceSupport,/Option A: newcomers.*positive weight/);
  verifyData(JSON.parse(await download('data','loopback-empty-99.json')),empty,99,[null,[149,200]],'unavailable');
  passed('one native slider step from 100 to 99 makes the missing group unavailable and exports the exact current support');
  const peer=JSON.parse(await readFile(join(root,'peer-numerical-expectations.json'),'utf8'));
  for(const id of ['tiny_strict_reversal','float_collapsed_reference_difference']){
    const test=peer.cases.find(x=>x.id===id),counts={a:{},b:{}};
    for(const [option,key]of [['a','A'],['b','B']])for(let i=0;i<2;i++)counts[option][groups[i]]={successes:test.input[key][i].success,total:test.input[key][i].total};
    await setCounts(counts);await mix(test.input.weight);f=await valid('peer-'+id);
    const refs=[test.expected.A.reference,test.expected.B.reference].map(value=>value.split('/'));
    const data=JSON.parse(await download('data','loopback-'+id+'.json'));
    verifyData(data,counts,test.input.weight,refs,id==='tiny_strict_reversal'?'strict_reversal':'mixed_groups');
    assert.equal(f.reference[0],f.reference[1]);assert.match(f.referenceDirection,/B has/);assert.match(f.referenceGap,/less than 0.01.*favor of B/);
    if(id==='tiny_strict_reversal'){
      assert.deepEqual(f.pooled,['50.00%','50.00%']);assert.match(f.pooledDirection,/A has/);assert.match(f.interpretation,/Both groups favor B.*favors A.*strict Simpson reversal/);
      assert.match(f.groupCells['newcomers-direction'],/B has/);assert.match(f.groupCells['experienced-direction'],/B has/);
    }else{
      assert.equal(data.reference.a.value,data.reference.b.value,'The receiving input must actually collapse the two display approximations');
      assert.match(f.pooledDirection,/exactly equal/);assert.match(f.interpretation,/different options/);
    }
    passed('actual mobile rendering and export preserve independent exact decisions for '+id);
  }
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
  report.receiver_sha256=sha(await readFile(fileURLToPath(import.meta.url)));report.transport_sha256=sha(await readFile(join(root,'browser-transport-v2.mjs')));report.finished_at=new Date().toISOString();
  await writeFile(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.status.toUpperCase()+': '+report.checks.length+' independent browser controls');
}
