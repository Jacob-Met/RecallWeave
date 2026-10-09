import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PRESETS, validateConfiguration, parseDraft, traceInput, analyzeNetwork, configurationJSON, observationJSON} from "../courses/sorting-networks-core.mjs";
import {parseDeck} from "../src/deck.mjs";
const config = p => ({wires:p.wires, values:[...p.values], comparators:p.comparators.map(x=>[...x])});
test("written three-wire trace retains every no-swap step", () => {
 const a=analyzeNetwork(config(PRESETS[0]));
 assert.deepEqual(a.authored.steps.map(s=>s.after),[[1,3,2],[1,2,3],[1,2,3]]);
 assert.deepEqual(a.authored.steps.map(s=>s.swapped),[true,true,false]);
 assert.equal(a.binary.total,8);assert.equal(a.binary.failed,0);
});
test("four-wire counterexample and complete exact binary failure list", () => {
 const a=analyzeNetwork(config(PRESETS[2]));
 assert.deepEqual(a.authored.steps.map(s=>s.after),[[2,4,1,3],[2,4,1,3],[1,4,2,3],[1,3,2,4]]);
 assert.deepEqual(a.authored.firstInversion,[2,3]);
 assert.deepEqual(a.binary.failingOrdinals,[5,6,9,10]);
 assert.deepEqual(a.binary.cases.filter(x=>!x.sorted).map(x=>x.input),[[0,1,0,1],[0,1,1,0],[1,0,0,1],[1,0,1,0]]);
 const b=analyzeNetwork(config(PRESETS[1]));
 assert.equal(b.binary.total,16);assert.equal(b.binary.failed,0);
 assert.deepEqual(b.authored.output,[1,2,3,4]);
});
test("equal, negative, repeated and empty comparisons have literal semantics", () => {
 const c={wires:3,values:[2,2,-1],comparators:[[1,2],[2,3],[1,2],[1,2]]};
 const t=traceInput(c,c.values);
 assert.deepEqual(t.steps.map(s=>s.after),[[2,2,-1],[2,-1,2],[-1,2,2],[-1,2,2]]);
 assert.deepEqual(t.steps.map(s=>s.swapped),[false,true,true,false]);
 const z=analyzeNetwork({wires:2,values:[-999,999],comparators:[]});
 assert.deepEqual(z.authored.output,[-999,999]);assert.equal(z.authored.sorted,true);
 assert.deepEqual(z.binary.failingOrdinals,[2]);assert.equal(z.binary.passed,3);
});
test("exact copies are deeply frozen while caller-owned objects remain unchanged", () => {
 const c=config(PRESETS[1]), before=structuredClone(c), a=analyzeNetwork(c);
 assert.deepEqual(c,before);assert.notEqual(a.configuration.values,c.values);
 const walk=x=>{if(x&&typeof x==="object"){assert.ok(Object.isFrozen(x));Object.values(x).forEach(walk);}};walk(a);
 assert.throws(()=>a.binary.cases[0].steps[0].after.push(7));
 c.values[0]=99;assert.equal(a.configuration.values[0],4);
});
test("all bounded three-wire comparator sequences satisfy the independently enumerated permutation criterion", () => {
 const pairs=[[1,2],[1,3],[2,3]], permutations=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
 const evaluate=(list,v)=>{const a=v.slice();for(const [i,j] of list){const l=a[i-1],r=a[j-1];a[i-1]=Math.min(l,r);a[j-1]=Math.max(l,r);}return a;};
 let checked=0;
 const visit=(list,depth)=>{
   const a=analyzeNetwork({wires:3,values:[3,2,1],comparators:list});
   const universal=permutations.every(v=>JSON.stringify(evaluate(list,v))==="[1,2,3]");
   assert.equal(a.binary.sortsAll,universal);checked++;
   if(depth)for(const p of pairs)visit([...list,p],depth-1);
 };
 visit([],4);assert.equal(checked,121);
});
test("six-wire insertion network preserves all values and sorts all 720 permutations", () => {
 const pairs=[];for(let end=2;end<=6;end++)for(let j=end;j>=2;j--)pairs.push([j-1,j]);
 const c={wires:6,values:[6,5,4,3,2,1],comparators:pairs};
 const a=analyzeNetwork(c);assert.equal(a.binary.total,64);assert.equal(a.binary.failed,0);
 let checked=0;
 function perm(prefix,rest){if(!rest.length){assert.deepEqual(traceInput(c,prefix).output,[1,2,3,4,5,6]);checked++;return;}for(let i=0;i<rest.length;i++)perm([...prefix,rest[i]],[...rest.slice(0,i),...rest.slice(i+1)]);}
 perm([],[1,2,3,4,5,6]);assert.equal(checked,720);
});
test("programmatic input refuses incomplete, extra, coercible and out-of-range data", () => {
 const good={wires:2,values:[2,1],comparators:[[1,2]]};
 const bad=[null,[],{}, {...good,extra:1}, {...good,wires:true},{...good,wires:"2"},{...good,wires:1},{...good,wires:7},{...good,wires:2.1},
 {...good,values:[1]},{...good,values:[1,2,3]},{...good,values:[NaN,1]},{...good,values:[Infinity,1]},{...good,values:[true,1]},{...good,values:["1",2]},{...good,values:[1.2,2]},{...good,values:[-1000,2]},{...good,values:[1,1000]},{...good,values:Array(2)},
 {...good,comparators:null},{...good,comparators:Array(31).fill([1,2])},{...good,comparators:[[0,2]]},{...good,comparators:[[1,3]]},{...good,comparators:[[2,1]]},{...good,comparators:[[1,1]]},{...good,comparators:[[1,2,2]]},{...good,comparators:[["1",2]]},{...good,comparators:[null]}];
 for(const c of bad)assert.throws(()=>analyzeNetwork(c));
 assert.equal(analyzeNetwork({...good,comparators:Array(30).fill([1,2])}).authored.steps.length,30);
 assert.deepEqual(validateConfiguration({...good,values:[-0,0]}).values,[0,0]);
});
test("editor grammar is explicit and bounded; configuration and observation roundtrip exactly", () => {
 const c=parseDraft(" +03 "," +3  -1  02 ","1 2\r\n2 3\r1 2");
 assert.deepEqual(c,{wires:3,values:[3,-1,2],comparators:[[1,2],[2,3],[1,2]]});
 assert.deepEqual(parseDraft("2","1 2","  \n ").comparators,[]);
 for(const args of [["2","1,2","1 2"],["2","1e0 2","1 2"],["2","0x1 2","1 2"],["2","1.0 2","1 2"],["2","1 2","1 2\n\n1 2"],["2","1 2","1 2 1"],["","1 2","1 2"],["2","1 ".repeat(101),"1 2"],["2","1 2"," ".repeat(2001)]]){
  assert.throws(()=>parseDraft(...args));
 }
 assert.deepEqual(JSON.parse(configurationJSON(c)),c);
 assert.deepEqual(JSON.parse(observationJSON(c)),analyzeNetwork(c));
});
test("original deck parser admits twelve questions without cycles, and standalone embeds exact bytes", () => {
 const raw=readFileSync(new URL("../courses/sorting-networks.json",import.meta.url),"utf8");
 const deck=parseDeck(raw);assert.equal(deck.items.length,12);
 const html=readFileSync(new URL("../courses/sorting-networks-explorer.html",import.meta.url),"utf8");
 const b64=html.match(/id="course-data"[^>]*>([^<]+)<\/script>/)[1].trim();
 assert.equal(Buffer.from(b64,"base64").toString("utf8"),raw);
 assert.ok(!html.includes("@@SCRIPT@@"));
});
