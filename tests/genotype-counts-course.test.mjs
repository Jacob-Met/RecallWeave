import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {parseDeck,serializeDeck} from '../src/deck.mjs';

const coursePath=new URL('../courses/genotype-counts.json',import.meta.url);
const raw=fs.readFileSync(coursePath,'utf8');
const source=JSON.parse(raw);
const deck=parseDeck(raw);
const sheet=fs.readFileSync(new URL('../courses/genotype-counts-worksheet.html',import.meta.url),'utf8');
const guide=fs.readFileSync(new URL('../courses/genotype-counts.md',import.meta.url),'utf8');
const publicCounts=[[7,6,3],[0,9,0],[5,0,5],[0,10,0],[8,0,0],[0,0,0]];

test('complete original lesson remains a native immutable deck after serialization',()=>{
 assert.equal(deck.format,'recallweave-deck/1');
 assert.equal(deck.items.length,14);
 assert.deepEqual(deck.items,source.items);
 assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
 assert.ok(Object.isFrozen(deck)&&Object.isFrozen(deck.items)&&deck.items.every(Object.isFrozen));
 assert.equal(new Set(deck.items.map(x=>x.id)).size,14);
 assert.deepEqual(deck.concepts,['Allele accounting','Random gamete union','Observed and expected','Model limits']);
 assert.deepEqual(deck.concepts.map(c=>deck.items.filter(x=>x.concept===c).length),[3,4,4,3]);
 for(const item of deck.items){
  assert.equal(item.options.length,4);
  assert.equal(new Set(item.options).size,4);
  assert.ok(Number.isInteger(item.answer)&&item.answer>=0&&item.answer<4);
  assert.ok(guide.includes('**Transfer:** '+item.transfer));
  assert.ok(item.prerequisites.every(c=>deck.concepts.indexOf(c)<deck.concepts.indexOf(item.concept)));
  assert.ok(guide.includes('### '+(deck.items.indexOf(item)+1)+'. '+item.id));
  assert.ok(guide.includes(item.prompt)&&guide.includes(item.options[item.answer])&&guide.includes(item.explanation));
 }
});
test('worksheet keeps all six public records and writing space without embedded computation or keys',()=>{
 assert.equal((sheet.match(/<article class="case"/g)||[]).length,6);
 assert.equal((sheet.match(/<td class="blank">/g)||[]).length,36);
 for(let i=0;i<publicCounts.length;i++){
  const [a,b,c]=publicCounts[i];
  assert.ok(sheet.includes('aria-label="G'+(i+1)+': AA '+a+', Aa '+b+', aa '+c+'"'));
 }
 assert.doesNotMatch(sheet,/<script\b|\bon\w+\s*=|<iframe\b|<form\b|<input\b|<textarea\b/i);
 assert.doesNotMatch(sheet,/data-answer|25\/64|15\/32|25\/4|9\/4/);
 for(const link of [...sheet.matchAll(/href="([^"]+)"/g)].map(m=>m[1])){
  assert.ok(['genotype-counts.json','genotype-counts.md','../demo.html'].includes(link));
 }
 assert.ok(sheet.includes('Separate worked guide — contains answers'));
 assert.ok(sheet.includes('@media print')&&sheet.includes('@page'));
});
test('authored exact fractions retain copy conservation, odd size, boundary and empty distinction',()=>{
 const gcd=(a,b)=>b===0?a:gcd(b,a%b);
 const rat=(n,d)=>{assert.ok(d>0);const g=gcd(n,d);return [n/g,d/g];};
 const expected=[
  {N:16,A:20,a:12,p:[5,8],q:[3,8],model:[[25,64],[15,32],[9,64]],counts:[[25,4],[15,2],[9,4]]},
  {N:9,A:9,a:9,p:[1,2],q:[1,2],model:[[1,4],[1,2],[1,4]],counts:[[9,4],[9,2],[9,4]]},
  {N:10,A:10,a:10,p:[1,2],q:[1,2],model:[[1,4],[1,2],[1,4]],counts:[[5,2],[5,1],[5,2]]},
  {N:10,A:10,a:10,p:[1,2],q:[1,2],model:[[1,4],[1,2],[1,4]],counts:[[5,2],[5,1],[5,2]]},
  {N:8,A:16,a:0,p:[1,1],q:[0,1],model:[[1,1],[0,1],[0,1]],counts:[[8,1],[0,1],[0,1]]}
 ];
 for(let i=0;i<5;i++){
  const [AA,Aa,aa]=publicCounts[i],N=AA+Aa+aa,A=2*AA+Aa,a=2*aa+Aa;
  const den=2*N,numerators=[A*A,2*A*a,a*a],square=den*den;
  assert.deepEqual({N,A,a,p:rat(A,den),q:rat(a,den),model:numerators.map(n=>rat(n,square)),counts:numerators.map(n=>rat(N*n,square))},expected[i]);
  assert.equal(A+a,2*N);assert.equal(numerators.reduce((a,b)=>a+b,0),square);
  assert.equal(2*numerators[0]+numerators[1],2*A*den);
 }
 assert.equal(publicCounts[5].reduce((a,b)=>a+b,0),0);
 assert.throws(()=>rat(0,0));
 assert.ok(guide.includes('Undefined from the table'));
});
test('observed/model and scientific limits remain explicit in course and companions',()=>{
 for(const text of [raw,guide,sheet]){
  assert.match(text,/observed/i);assert.match(text,/expected/i);
  assert.match(text,/independent/i);assert.match(text,/hypothetical/i);
 }
 assert.match(deck.items.find(x=>x.id==='gc-account-3').prompt,/nonempty/);
 assert.match(deck.items.find(x=>x.id==='gc-compare-4').explanation,/original observed count is nine/);
 assert.match(deck.items.find(x=>x.id==='gc-limits-1').explanation,/neither a significance test nor a biological diagnosis/);
 assert.match(deck.items.find(x=>x.id==='gc-limits-3').explanation,/finite-population drift/);
 assert.ok(guide.includes('https://openstax.org/books/biology-2e/pages/19-1-population-evolution'));
 assert.ok(guide.includes('https://csg.sph.umich.edu/abecasis/Exact/abstract.html'));
});
