import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeGame,FORMAT,MODEL} from '../courses/coalition-power-core.mjs';
import {parseDeck} from '../src/deck.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const text=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const counts=a=>a.players.map(p=>p.swing_count);
const fractions=(a,k)=>a.players.map(p=>p[k].text);
test('literal default table distinguishes membership from criticality',()=>{
 const a=analyzeGame([6,4,2],7);
 assert.equal(a.format,FORMAT);assert.equal(a.model,MODEL);
 assert.deepEqual(a.input,{weights:[6,4,2],quota:7,player_count:3,total_weight:12});
 assert.deepEqual(a.coalitions,[
 {mask:0,members:[],weight:0,winning:false,critical_members:[]},
 {mask:1,members:[1],weight:6,winning:false,critical_members:[]},
 {mask:2,members:[2],weight:4,winning:false,critical_members:[]},
 {mask:3,members:[1,2],weight:10,winning:true,critical_members:[1,2]},
 {mask:4,members:[3],weight:2,winning:false,critical_members:[]},
 {mask:5,members:[1,3],weight:8,winning:true,critical_members:[1,3]},
 {mask:6,members:[2,3],weight:6,winning:false,critical_members:[]},
 {mask:7,members:[1,2,3],weight:12,winning:true,critical_members:[1]}]);
 assert.deepEqual(counts(a),[3,1,1]);
 assert.deepEqual(a.players.map(p=>p.swing_without_masks),[[2,4,6],[1],[1]]);
 assert.deepEqual(fractions(a,'absolute_swing_probability'),['3/4','1/4','1/4']);
 assert.deepEqual(fractions(a,'normalized_banzhaf_share'),['3/5','1/5','1/5']);
 assert.deepEqual(a.summary,{coalition_count:8,winning_count:3,losing_count:5,total_swings:5,other_player_coalitions:4});
});
test('unequal weights can have equal power; a positive weight can be a dummy',()=>{
 const equal=analyzeGame([4,3,2],5);
 assert.deepEqual(counts(equal),[2,2,2]);
 assert.deepEqual(fractions(equal,'normalized_banzhaf_share'),['1/3','1/3','1/3']);
 const dummy=analyzeGame([5,3,1],7);
 assert.deepEqual(counts(dummy),[2,2,0]);
 assert.deepEqual(dummy.players[2].swing_without_masks,[]);
 assert.deepEqual(dummy.players[2].absolute_swing_probability,{numerator:0,denominator:1,text:'0/1'});
 assert.deepEqual(counts(analyzeGame([6,2,1],6)),[4,0,0]);
});
test('a zero-weight player doubles raw old witnesses but preserves reduced measures',()=>{
 const a=analyzeGame([6,4,2],7),b=analyzeGame([6,4,2,0],7);
 assert.deepEqual(counts(b),[6,2,2,0]);
 for(let i=0;i<3;i++){
  assert.deepEqual(b.players[i].absolute_swing_probability,a.players[i].absolute_swing_probability);
  assert.deepEqual(b.players[i].normalized_banzhaf_share,a.players[i].normalized_banzhaf_share);
  assert.deepEqual(b.players[i].swing_without_masks,[...a.players[i].swing_without_masks,...a.players[i].swing_without_masks.map(m=>m+8)]);
 }
 assert.deepEqual(counts(analyzeGame([1],1)),[1]);
 assert.deepEqual(counts(analyzeGame([1,0],1)),[2,0]);
});
test('integer rescaling preserves the threshold game, while quota stays explicit',()=>{
 const a=analyzeGame([3,2,1],4),b=analyzeGame([6,4,2],8);
 assert.deepEqual(counts(a),counts(b));
 assert.deepEqual(a.coalitions.map(c=>[c.members,c.winning,c.critical_members]),b.coalitions.map(c=>[c.members,c.winning,c.critical_members]));
 const q6=analyzeGame([6,4,2],6),q7=analyzeGame([6,4,2],7);
 assert.equal(q6.coalitions[6].winning,true);assert.equal(q7.coalitions[6].winning,false);
});
test('permuting equal and zero weights retains all distinct original identities',()=>{
 const a=analyzeGame([2,0,2,1],3);
 const permutation=[3,1,0,2],b=analyzeGame(permutation.map(i=>a.input.weights[i]),3);
 assert.deepEqual(b.players.map(p=>p.index),[1,2,3,4]);
 assert.deepEqual(b.players.map(p=>p.label),['A','B','C','D']);
 permutation.forEach((original,i)=>{
  assert.equal(b.players[i].swing_count,a.players[original].swing_count);
  assert.deepEqual(b.players[i].absolute_swing_probability,a.players[original].absolute_swing_probability);
 });
 assert.equal(a.coalitions.length,16);assert.equal(b.coalitions.length,16);
});
test('maximum six-player endpoints are complete and exact',()=>{
 const all=analyzeGame([20,20,20,20,20,20],120);
 assert.equal(all.coalitions.length,64);assert.equal(all.summary.winning_count,1);
 assert.deepEqual(counts(all),[1,1,1,1,1,1]);
 assert.deepEqual(fractions(all,'absolute_swing_probability'),Array(6).fill('1/32'));
 assert.deepEqual(fractions(all,'normalized_banzhaf_share'),Array(6).fill('1/6'));
 assert.deepEqual(all.coalitions[63].critical_members,[1,2,3,4,5,6]);
 const any=analyzeGame([20,20,20,20,20,20],1);
 assert.equal(any.summary.winning_count,63);assert.deepEqual(counts(any),[1,1,1,1,1,1]);
 assert.deepEqual(any.players.map(p=>p.swing_without_masks),Array.from({length:6},()=>[0]));
});
test('native admission refuses coercion, sparse arrays and every numerical boundary',()=>{
 const invalidWeights=[undefined,null,1,'1',[0],[0,0],[],Array(7).fill(1),new Uint8Array([1]),[21],[-1],[-0],[1.5],[NaN],[Infinity],[-Infinity],['1'],[true],[null],[undefined],Array(1),[1,,2]];
 for(const w of invalidWeights) assert.throws(()=>analyzeGame(w,1),undefined,JSON.stringify(w));
 for(const q of [undefined,null,false,true,'1',0,-0,-1,4,1.5,NaN,Infinity,-Infinity]) assert.throws(()=>analyzeGame([1,2],q));
});
test('returned objects detach from inputs, one another and repeat calls',()=>{
 const input=Object.freeze([6,4,2]),a=analyzeGame(input,7),reference=analyzeGame(input,7);
 a.input.weights[0]=99;a.coalitions[3].members.push(6);a.coalitions[7].critical_members[0]=6;
 a.players[0].swing_without_masks.push(99);a.players[0].absolute_swing_probability.numerator=99;a.assumptions[0]='changed';
 assert.deepEqual(analyzeGame(input,7),reference);
 assert.deepEqual(input,[6,4,2]);
 assert.equal(a.players[0].weight,6);
 assert.deepEqual(reference.players[0].normalized_banzhaf_share,{numerator:3,denominator:5,text:'3/5'});
});
test('each critical membership has exactly one corresponding without-player witness',()=>{
 for(const [w,q] of [[[1],1],[[2,0,2,1],3],[[6,4,2],7],[[3,3,2,1,0,4],8]]){
  const a=analyzeGame(w,q);
  for(const p of a.players){
   const fromWinners=a.coalitions.filter(c=>c.critical_members.includes(p.index)).map(c=>c.mask-(1<<(p.index-1))).sort((a,b)=>a-b);
   assert.deepEqual(p.swing_without_masks,fromWinners);
   assert.equal(p.swing_count,fromWinners.length);
  }
 }
});
test('original course is admitted by the unchanged learner parser',async()=>{
 const raw=await text('courses/coalition-power.json'),d=parseDeck(raw);
 assert.equal(d.items.length,12);assert.equal(d.concepts.length,4);
 assert.equal(new Set(d.items.map(x=>x.id)).size,12);
 assert.deepEqual(d.items.map(x=>x.answer),[2,0,3,1,0,2,1,3,2,1,3,0]);
 assert.equal(d.title,'Coalition power: when a weight changes the result');
 for(const c of d.concepts) assert.equal(d.items.filter(x=>x.concept===c).length,3);
});
test('generated page is a reproducible standalone artifact with exact embedded course and guide',async()=>{
 execFileSync(process.execPath,['tools/build-coalition-power.mjs','--check'],{cwd:root});
 const html=await text('courses/coalition-power-explorer.html');
 const embedded=name=>JSON.parse(html.match(new RegExp('const '+name+' = (.*);'))[1]);
 assert.equal(embedded('COURSE_TEXT'),await text('courses/coalition-power.json'));
 assert.equal(embedded('GUIDE_TEXT'),await text('courses/coalition-power.md'));
 assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.equal((html.match(/<\/script>/g)||[]).length,1);
 assert.ok(!/<script[^>]+src=|<link[^>]+href=|<img[^>]+src=/i.test(html));
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/href="\.\.\/demo\.html"/);
 for(const id of ['weights','quota','apply','player','critical-only','result','observation-save','course-save','guide-save'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
