import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {buildSearchComparison} from '../recallweave-substring-discovery/candidate/src/substring-search.mjs';
const root=new URL('../recallweave-substring-discovery/candidate/',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const checks=[];
async function receive(name,fn){try{checks.push({name,passed:true,detail:await fn()});}catch(error){checks.push({name,passed:false,error:error.stack});}}
const cp=s=>Array.from(s);
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const occurrences=(text,pattern)=>{const out=[];for(let end=pattern.length;end<=text.length;end++){if(equal(text.slice(end-pattern.length,end),pattern))out.push(end-pattern.length);}return out;};
const borders=p=>p.map((_,end)=>{let answer=0;for(let width=1;width<=end;width++){if(equal(p.slice(0,width),p.slice(end+1-width,end+1)))answer=width;}return answer;});
const cases=[
 ['','AB'],['A','ABC'],['A'.repeat(64),'A'.repeat(16)],['😀'.repeat(64),'α'.repeat(15)+'β'],
 ['ABCABDABCABXABCABDABCABE','ABCABDABCABE'],['aAaAaA','AaA'],
 [String.fromCodePoint(0x65,0x301,0xe9,0x65,0x301,0xe9),String.fromCodePoint(0x65,0x301)],
 ['\r\n\r\n\r','\r\n\r'],['😀A😀A😀A😀','😀A😀'],['<x>&<x>&','<x>&']
];
await receive('independent semantic receiving of complete model snapshots',()=>{
 const summaries=[];
 for(const [text,pattern]of cases){
  const r=buildSearchComparison(text,pattern),t=cp(text),p=cp(pattern),matches=occurrences(t,p),pi=borders(p);
  assert.deepEqual(r.naive.matches,matches);assert.deepEqual(r.kmp.matches,matches);assert.deepEqual(r.prefix.table,pi);
  assert.deepEqual(r.textTokens,t);assert.deepEqual(r.patternTokens,p);
  for(const phase of ['naive','prefix','kmp']){
   const trace=r[phase];let count=0;let emitted=[];
   assert.equal(trace.steps[0].kind,'initial');assert.equal(trace.steps.at(-1).kind,'complete');
   for(const s of trace.steps){
    if(s.kind==='compare'){
     count++;const pair=s.comparison;assert.ok(pair);
     const left=pair.left.sequence==='text'?t:p;
     assert.equal(pair.left.token,left[pair.left.index]);assert.equal(pair.right.token,p[pair.right.index]);
     assert.equal(pair.equal,pair.left.token===pair.right.token);
    }else assert.equal(s.comparison,null);
    assert.equal(s.comparisons,count);
    if(phase==='naive')assert.deepEqual(t.slice(s.start,s.start+s.offset),p.slice(0,s.offset));
    if(phase==='kmp'){
     assert.ok(s.i>=0&&s.i<=t.length&&s.q>=0&&s.q<=p.length);
     assert.deepEqual(t.slice(s.i-s.q,s.i),p.slice(0,s.q));
    }
    if(phase==='prefix'){
     assert.deepEqual(p.slice(s.i-s.q,s.i),p.slice(0,s.q));
     assert.deepEqual(s.table,pi.map((v,j)=>j<s.i?v:null));
    }else{
     if(s.kind==='match')emitted.push(s.match);
     assert.deepEqual(s.matches,emitted);
    }
    if(s.fallback){assert.ok(s.fallback.to<s.fallback.from);assert.equal(s.fallback.to,pi[s.fallback.from-1]);}
   }
   assert.equal(trace.comparisons,count);
  }
  assert.equal(r.counts.kmpTotal,r.prefix.comparisons+r.kmp.comparisons);
  const before=JSON.stringify(r);const stack=[r];let frozen=0;
  while(stack.length){const value=stack.pop();if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));frozen++;stack.push(...Object.values(value));}}
  assert.throws(()=>r.kmp.matches.push(99),TypeError);assert.throws(()=>{r.prefix.table[0]=99;},TypeError);
  assert.equal(JSON.stringify(r),before);
  summaries.push({text_code_points:t.length,pattern_code_points:p.length,matches,counts:r.counts,states:r.naive.steps.length+r.prefix.steps.length+r.kmp.steps.length,frozen_objects:frozen,trace_sha256:crypto.createHash('sha256').update(before).digest('hex')});
 }
 const maximum=summaries[2];assert.equal(maximum.matches.length,49);assert.equal(maximum.counts.naive,784);assert.equal(maximum.counts.kmpTotal,79);
 return {cases:summaries};
});
await receive('Unicode token renaming preserves the complete search decisions',()=>{
 const map={A:'😀',B:String.fromCodePoint(0x301),C:String.fromCodePoint(0),D:'\n',E:'<',X:'\r'};
 const [text,pattern]=cases[4],renamed=s=>cp(s).map(x=>map[x]).join('');
 const first=buildSearchComparison(text,pattern),second=buildSearchComparison(renamed(text),renamed(pattern));
 assert.deepEqual(second.prefix.table,first.prefix.table);assert.deepEqual(second.kmp.matches,[12]);assert.deepEqual(second.counts,first.counts);
 for(const phase of ['naive','prefix','kmp']){
  assert.deepEqual(second[phase].steps.map(s=>[s.kind,s.i,s.q,s.start,s.offset,s.comparisons]),first[phase].steps.map(s=>[s.kind,s.i,s.q,s.start,s.offset,s.comparisons]));
 }
 const fallbacks=second.kmp.steps.filter(s=>s.kind==='fallback'&&s.i===11).map(s=>[s.fallback.from,s.fallback.to]);
 assert.deepEqual(fallbacks,[[11,5],[5,2],[2,0]]);
 return {matches:second.kmp.matches,counts:second.counts,stationary_fallbacks:fallbacks};
});
await receive('declared input boundary rejects without changing prior captures',()=>{
 const saved=buildSearchComparison('😀'.repeat(64),'😀'.repeat(16)),before=JSON.stringify(saved);
 const invalid=[['A',''],['A'.repeat(65),'A'],['A','A'.repeat(17)],[String.fromCharCode(0xd800),'A'],['A',String.fromCharCode(0xdc00)],[null,'A'],['A',[]]];
 for(const pair of invalid)assert.throws(()=>buildSearchComparison(...pair));
 assert.equal(JSON.stringify(saved),before);return {refused:invalid.length,accepted_code_points:[64,16]};
});
const html=read('courses/substring-search-explorer.html'),course=read('courses/substring-search.json');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const payload=scripts.find(m=>m[1].includes('substring-course-source'));
const inline=scripts.find(m=>/type="module"/.test(m[1]));
await receive('the delivered artifact contains exactly the reviewed native source and course',()=>{
 assert.equal(scripts.length,2);assert.equal(JSON.parse(payload[2]),course);
 const importLine="import { buildSearchComparison, EXAMPLES } from './substring-search.mjs';\n";
 const ui=read('src/substring-search-ui.mjs');assert.ok(ui.startsWith(importLine));
 assert.equal(inline[2],read('src/substring-search.mjs')+'\n'+ui.slice(importLine.length));
 assert.doesNotMatch(inline[2],/^\s*import(?:\s|\()/m);assert.doesNotMatch(html,/<(?:script|link)\b[^>]*(?:src|href)\s*=/i);
 const deck=JSON.parse(course);assert.equal(deck.items.length,12);assert.equal(deck.concepts.length,4);
 const histogram=[0,0,0,0];for(const item of deck.items){histogram[item.answer]++;assert.ok(item.explanation&&item.transfer);}
 assert.deepEqual(histogram,[3,3,3,3]);
 return {course_bytes:Buffer.byteLength(course),module_bytes:Buffer.byteLength(inline[2]),answer_histogram:histogram};
});
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this._text='';this.value='';this.hidden=false;this.disabled=false;}
 set textContent(s){this._text=String(s);this.children=[];}get textContent(){return this._text+this.children.map(x=>x.textContent??String(x)).join('');}
 set innerHTML(_){throw Error('HTML parsing was not permitted in this receiving DOM');}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 dispatch(type){for(const fn of this.listeners[type]??[])fn({preventDefault(){},target:this});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
 click(){if(this.tagName==='A'){if(platformState.failClick)throw Error('independent anchor failure');platformState.downloads.push({name:this.download,url:this.href,blob:platformState.live.get(this.href),attached:!!this.parent});}else this.dispatch('click');}
}
const document={body:new Element('body'),nodes:new Map(),createElement:tag=>new Element(tag),getElementById(id){return this.nodes.get(id)??null;}};
for(const match of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi))document.nodes.set(match[2],new Element(match[1]));
document.getElementById('substring-course-source').textContent=payload[2];
const platformState={live:new Map(),created:[],revoked:[],downloads:[],failClick:false};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);platformState.live.set(url,blob);platformState.created.push(url);return url;};
URL.revokeObjectURL=url=>{platformState.live.delete(url);platformState.revoked.push(url);revoke(url);};
globalThis.document=document;
function descendants(node){return [node,...node.children.flatMap(descendants)];}
try{
 await receive('actual inline module bootstrap and event handlers preserve captured downloads',async()=>{
  await import('data:text/javascript;base64,'+Buffer.from(inline[2]).toString('base64'));
  const get=id=>document.getElementById(id),text='</script>😀</script>',pattern='</script>';
  assert.equal(get('search-result').hidden,true);assert.equal(get('download-calculation').disabled,true);
  get('search-text').value=text;get('search-pattern').value=pattern;get('search-form').dispatch('submit');
  assert.equal(get('search-result').hidden,false);assert.equal(get('download-calculation').disabled,false);
  const accepted=buildSearchComparison(text,pattern),summary=get('search-summary').textContent;
  for(const [index,phase]of ['naive','prefix','kmp'].entries()){
   const select=descendants(get('trace-'+phase)).find(n=>n.tagName==='SELECT');
   select.value=String(index===0?accepted[phase].steps.length-1:Math.floor(accepted[phase].steps.length/2));select.dispatch('change');
  }
  assert.equal(get('search-summary').textContent,summary);
  platformState.failClick=true;get('download-calculation').dispatch('click');
  assert.match(get('search-status').textContent,/trace is retained/);assert.equal(get('download-calculation').disabled,false);
  assert.equal(platformState.live.size,0);assert.equal(platformState.created.length,platformState.revoked.length);
  platformState.failClick=false;get('download-calculation').dispatch('click');
  const calculation=platformState.downloads.at(-1);assert.equal(calculation.name,'substring-search-calculation.json');assert.ok(calculation.attached);
  const bytes=await calculation.blob.text();assert.deepEqual(JSON.parse(bytes),accepted);assert.ok(bytes.endsWith('\n'));assert.equal(platformState.live.size,0);
  get('download-course').dispatch('click');const lesson=platformState.downloads.at(-1);assert.equal(lesson.name,'substring-search.json');assert.equal(await lesson.blob.text(),course);
  // A programmatic edit without an input event must still retire a stale capture.
  const captures=platformState.downloads.length;get('search-pattern').value='changed';get('download-calculation').dispatch('click');
  assert.equal(platformState.downloads.length,captures);assert.equal(get('search-result').hidden,true);assert.equal(get('download-calculation').disabled,true);
  get('search-pattern').value='';get('search-form').dispatch('submit');
  assert.equal(get('search-pattern').value,'');assert.equal(get('download-calculation').disabled,true);assert.match(get('search-status').textContent,/at least one/);
  get('search-pattern').value='😀';get('search-form').dispatch('submit');assert.equal(get('download-calculation').disabled,false);
  get('search-text').value='new draft';get('search-text').dispatch('input');assert.equal(get('search-result').hidden,true);
  assert.equal(platformState.created.length,3);assert.equal(platformState.revoked.length,3);assert.equal(platformState.live.size,0);
  assert.equal(document.body.children.filter(n=>n.tagName==='A').length,0);
  return {module:'exact generated inline ES module',dom:'explicit local simulation',real_node_blob_urls_created:3,revoked:3,received_downloads:platformState.downloads.map(x=>x.name),literal_match_starts:accepted.kmp.matches,complete_trace_counts:accepted.counts,native_browser:false,completed_file_save:false};
 });
}finally{delete globalThis.document;URL.createObjectURL=create;URL.revokeObjectURL=revoke;for(const url of platformState.live.keys())revoke(url);}
console.log(JSON.stringify({runtime:process.version,checks,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length},null,2));
process.exitCode=checks.some(x=>!x.passed)?1:0;

