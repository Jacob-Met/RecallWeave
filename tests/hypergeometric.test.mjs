import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseDeck } from "../src/deck.mjs";
import { MAX_POPULATION, parseWhole, admit, distribution, observationJSON } from "../src/hypergeometric.mjs";
const base={population:8,marked:3,draws:4,lower:2,upper:3};
const rationalEqual=(actual,n,d)=>assert.equal(BigInt(actual.numerator)*d,n*BigInt(actual.denominator));
function bits(mask) { let n=0; while(mask){n+=mask&1;mask>>>=1;} return n; }
// The oracle enumerates labelled subsets. It does not use a combination formula.
function enumeration(N,K) {
  const totals=Array(N+1).fill(0n), counts=Array.from({length:N+1},()=>Array(N+1).fill(0n));
  for(let mask=0;mask<(1<<N);mask++){
    const n=bits(mask), k=bits(mask&((1<<K)-1)); totals[n]++; counts[n][k]++;
  }
  return {totals,counts};
}
// Independent addition-only Pascal triangle covers large integer counts.
function pascal(N) {
  const rows=[[1n]];
  for(let n=1;n<=N;n++){const prev=rows[n-1];rows.push(Array.from({length:n+1},(_,k)=>(prev[k-1]??0n)+(prev[k]??0n)));}
  return rows;
}
test("all labelled subsets through population12 agree exactly, including events and moments",()=>{
  let configurations=0;
  for(let N=1;N<=12;N++)for(let K=0;K<=N;K++){
    const {totals,counts}=enumeration(N,K);
    for(let n=0;n<=N;n++){
      const lower=Math.floor(n/3),upper=Math.ceil(2*n/3), r=distribution({population:N,marked:K,draws:n,lower,upper});
      assert.equal(BigInt(r.totalSubsets),totals[n]);
      assert.equal(r.rows.length,n+1);
      let sum=0n,sumSquares=0n,event=0n;
      for(let k=0;k<=n;k++){
        const count=counts[n][k]; assert.equal(BigInt(r.rows[k].favourableSubsets),count);
        rationalEqual(r.rows[k].probability,count,totals[n]);
        assert.equal(r.rows[k].possible,count>0n);
        assert.equal(r.rows[k].possible,k>=r.support.minimum && k<=r.support.maximum);
        sum+=BigInt(k)*count;sumSquares+=BigInt(k*k)*count;
        if(k>=lower&&k<=upper)event+=count;
      }
      rationalEqual(r.mean,sum,totals[n]);
      rationalEqual(r.variance,sumSquares*totals[n]-sum*sum,totals[n]*totals[n]);
      rationalEqual(r.event.probability,event,totals[n]); configurations++;
    }
  }
  assert.equal(configurations,818);
});
test("200-token exact counts exceed Number precision and agree with independent Pascal coefficients",()=>{
  const p=pascal(MAX_POPULATION);
  for(const [N,K,n] of [[200,80,50],[200,100,100],[200,199,199],[200,0,200],[199,67,98]]){
    const r=distribution({population:N,marked:K,draws:n,lower:0,upper:n});
    assert.equal(BigInt(r.totalSubsets),p[N][n]);
    let sum=0n;
    for(const row of r.rows){
      const expected=(p[K][row.markedCount]??0n)*(p[N-K][row.unmarkedCount]??0n);
      assert.equal(BigInt(row.favourableSubsets),expected);sum+=expected;
      assert.ok(Number.isFinite(row.probability.approximate));
      assert.ok(row.probability.approximate>=0&&row.probability.approximate<=1);
    }
    assert.equal(sum,p[N][n]);assert.equal(r.event.probability.numerator,"1");
  }
  assert.ok(p[200][100]>BigInt(Number.MAX_SAFE_INTEGER));
});
test("worked counts, exact intervals, impossible events, census and one-token limits",()=>{
  const r=distribution(base);
  assert.deepEqual(r.rows.map(x=>x.favourableSubsets),["5","30","30","5","0"]);
  assert.equal(r.totalSubsets,"70");rationalEqual(r.mean,3n,2n);rationalEqual(r.variance,15n,28n);
  rationalEqual(r.event.probability,1n,2n);
  const narrow=distribution({population:10,marked:8,draws:7,lower:0,upper:4});
  assert.deepEqual(narrow.support,{minimum:5,maximum:7});rationalEqual(narrow.event.probability,0n,1n);
  for(const K of [0,1])for(const n of [0,1]){
    const one=distribution({population:1,marked:K,draws:n,lower:0,upper:n});
    rationalEqual(one.mean,BigInt(K*n),1n);rationalEqual(one.variance,0n,1n);
  }
  const census=distribution({population:9,marked:4,draws:9,lower:4,upper:4});
  assert.equal(census.totalSubsets,"1");rationalEqual(census.event.probability,1n,1n);
  const empty=distribution({population:7,marked:2,draws:0,lower:0,upper:0});
  assert.equal(empty.rows.length,1);rationalEqual(empty.event.probability,1n,1n);
});
test("category relabelling and sampled/unsampled complement bind exact event mappings",()=>{
  for(const [N,K,n,a,b] of [[10,4,3,1,2],[13,9,8,5,7],[8,3,4,2,3]]){
    const first=distribution({population:N,marked:K,draws:n,lower:a,upper:b});
    const renamed=distribution({population:N,marked:N-K,draws:n,lower:n-b,upper:n-a});
    assert.deepEqual(first.event.probability,renamed.event.probability);
    // Count among the complement sample equals K-X.
    const outside=distribution({population:N,marked:K,draws:N-n,lower:Math.max(0,K-b),upper:Math.min(N-n,K-a)});
    assert.deepEqual(first.event.probability,outside.event.probability);
  }
});
test("admission rejects malformed numbers and constraints without clamping",()=>{
  for(const text of [""," ","-1","+1","1.0","1e2","0x10","1 2","200x","1000",null,undefined,1])assert.throws(()=>parseWhole(text));
  for(const [text,value] of [["0",0],[" 200 ",200],["007",7]])assert.equal(parseWhole(text),value);
  for(const name of Object.keys(base))for(const value of [NaN,Infinity,-1,0.5,"2",true,null,undefined]){
    assert.throws(()=>distribution({...base,[name]:value}),name+" "+String(value));
  }
  for(const patch of [{population:0},{population:201},{marked:9},{draws:9},{lower:5},{upper:5},{lower:3,upper:2}])assert.throws(()=>distribution({...base,...patch}));
  for(const input of [null,undefined,[],{},true,"8"])assert.throws(()=>admit(input));
});
test("detached frozen results and observation recomputation prevent stale derived rows",()=>{
  const input={...base};const r=distribution(input);input.marked=0;
  assert.equal(r.config.marked,3);assert.ok(Object.isFrozen(r.rows[0].probability));
  assert.throws(()=>{r.rows[0].probability.numerator="900";},TypeError);
  const raw=observationJSON({...r.config,rows:[{favourableSubsets:"999"}]},3), parsed=JSON.parse(raw);
  assert.ok(raw.endsWith("\n"));assert.equal(parsed.format,"recallweave-hypergeometric-observation/1");
  assert.deepEqual(parsed.rows,r.rows);assert.equal(parsed.inspectedCount,3);assert.deepEqual(parsed.config,r.config);
  assert.equal(parsed.rows[0].probability.numerator,"1");assert.equal(parsed.rows[0].probability.denominator,"14");
  for(const k of [-1,5,0.5,"1",NaN,null])assert.throws(()=>observationJSON(base,k));
});
test("original14-question course passes native importer and frozen independent key",async()=>{
  const raw=await readFile(new URL("../courses/hypergeometric.json",import.meta.url),"utf8");const deck=parseDeck(raw);
  assert.equal(deck.items.length,14);assert.equal(deck.concepts.length,5);
  assert.deepEqual(deck.items.map(x=>x.answer),[1,2,1,1,2,1,2,0,1,1,2,0,1,2]);
  assert.match(deck.license,/CC0/);assert.match(deck.attribution,/stat.berkeley.edu/);
});
test("direct-open artifact and embedded downloads match exact builder inputs",async()=>{
  const root=new URL("../",import.meta.url);
  const page=await readFile(new URL("courses/hypergeometric-explorer.html",root),"utf8");
  for(const [id,path] of [["course-data","courses/hypergeometric.json"],["guide-data","courses/hypergeometric.md"]]){
    const encoded=page.match(new RegExp('<script id="'+id+'" type="application/octet-stream">([^<]+)</script>'))?.[1];
    assert.ok(encoded);assert.deepEqual(Buffer.from(encoded,"base64"),await readFile(new URL(path,root)));
  }
  assert.doesNotMatch(page,/<script[^>]+src=/i);assert.doesNotMatch(page,/\bimport\s+(?:\{|\*|["'])/);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL("tools/build-hypergeometric.mjs",root)),"--check"],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
});
