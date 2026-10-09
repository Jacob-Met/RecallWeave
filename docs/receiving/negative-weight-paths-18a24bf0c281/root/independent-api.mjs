import assert from "node:assert/strict";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";

function graph(nodes, tuples, source=nodes[0]) {
  return {nodes,edges:tuples.map(([from,to,weight])=>({from,to,weight})),source};
}
function exhaustiveOracle(g) {
  const n=g.nodes.length, adj=Object.fromEntries(g.nodes.map(v=>[v,g.edges.filter(e=>e.from===v)]));
  const rows=Array.from({length:n+1},()=>Object.fromEntries(g.nodes.map(v=>[v,null])));
  // Enumerate whole walks; record each visited walk in every adequate edge budget.
  function walks(v,cost,depth) {
    for(let k=depth;k<=n;k++) if(rows[k][v]===null || cost<rows[k][v]) rows[k][v]=cost;
    if(depth===n) return;
    for(const e of adj[v]) walks(e.to,cost+e.weight,depth+1);
  }
  walks(g.source,0,0);
  function simplePaths(start) {
    const best=Object.fromEntries(g.nodes.map(v=>[v,null]));
    function visit(v,cost,seen) {
      if(best[v]===null || cost<best[v]) best[v]=cost;
      for(const e of adj[v]) if(!seen.has(e.to)) visit(e.to,cost+e.weight,new Set([...seen,e.to]));
    }
    visit(start,0,new Set([start])); return best;
  }
  const reach=Object.fromEntries(g.nodes.map(v=>[v,simplePaths(v)])), bad=new Set();
  // Exhaust every simple directed cycle independently of the bounded walk tables.
  for(const start of g.nodes) {
    if(reach[g.source][start]===null) continue;
    function cycles(v,cost,seen) {
      for(const e of adj[v]) {
        if(e.to===start) {
          if(cost+e.weight<0) for(const w of g.nodes) if(reach[start][w]!==null) bad.add(w);
        } else if(!seen.has(e.to)) cycles(e.to,cost+e.weight,new Set([...seen,e.to]));
      }
    }
    cycles(start,0,new Set([start]));
  }
  const results=Object.fromEntries(g.nodes.map(v=>[v,bad.has(v)?{status:"unbounded-below",distance:null}:reach[g.source][v]===null?{status:"unreachable",distance:null}:{status:"finite",distance:reach[g.source][v]}]));
  const witnesses=g.nodes.filter(v=>rows[n][v]!==null&&(rows[n-1][v]===null||rows[n][v]<rows[n-1][v]));
  return {rows,witnesses,affected:g.nodes.filter(v=>bad.has(v)),results};
}
const handGraphs=[
 ["finite",graph(["S","A","T","X"],[["S","T",2],["S","A",5],["A","T",-4]])],
 ["mixed",graph(["S","A","B","T","U","X","Y"],[["S","A",2],["A","B",-3],["B","A",1],["B","T",4],["S","U",7],["X","Y",-2],["Y","X",1]])],
 ["disconnected",graph(["S","T","X","Y"],[["S","T",3],["X","Y",-2],["Y","X",1]])],
 ["source-negative-loop",graph(["S"],[["S","S",-1]])],
 ["source-zero-loop",graph(["S"],[["S","S",0]])],
 ["isolated-source",graph(["S"],[])],
 ["zero-cycle",graph(["S","A","T"],[["S","A",-3],["A","S",3],["A","T",4]])],
 ["positive-cycle",graph(["S","A","T"],[["S","A",-3],["A","S",4],["A","T",4]])],
 ["return-to-source",graph(["S","A","T"],[["S","A",1],["A","A",-1],["A","S",0],["S","T",7]])],
 ["reverse-declared-chain",graph(["S","A","B","T"],[["B","T",-4],["A","B",2],["S","A",1]])],
 ["tie-carry",graph(["S","A","T"],[["S","A",1],["A","T",1],["S","T",2]])],
 ["tie-edge-order",graph(["S","A","B","T"],[["S","A",1],["S","B",1],["B","T",1],["A","T",1]])],
 ["weight-limits",graph(["S","A","B","T"],[["S","A",50],["A","B",-50],["B","T",-50],["S","T",50]])]
];
const generatedGraphs=[];
for(let seed=0;seed<32;seed++) {
  const nodes=["S","A","B","T"], pairs=[["S","A"],["A","B"],["B","A"],["B","T"],["T","S"],["S","T"]];
  const weights=[-2,0,3]; let state=seed+1, edges=[];
  for(let j=0;j<pairs.length;j++) {
    state=(state*1664525+1013904223)>>>0;
    if((state>>>9)%4!==0) edges.push([...pairs[j],weights[(state>>>17)%3]]);
  }
  generatedGraphs.push(["enumerated-"+seed,graph(nodes,edges)]);
}

const checks=[];
function group(name,fn) {try {fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.stack||String(e)});}}
function deeplyFrozen(x) {if(x&&typeof x==="object"){assert.ok(Object.isFrozen(x));for(const v of Object.values(x)) deeplyFrozen(v);}}
function pathCost(g,p,target,budget) {
  assert.ok(Array.isArray(p));assert.equal(p[0],g.source);assert.equal(p.at(-1),target);assert.ok(p.length-1<=budget);
  let cost=0;for(let i=1;i<p.length;i++){const e=g.edges.find(e=>e.from===p[i-1]&&e.to===p[i]);assert.ok(e);cost+=e.weight;}return cost;
}
const api=await import(pathToFileURL(resolve(process.argv[2])).href);
group("exported public API",()=>{for(const key of ["validateNegativeGraph","parseNegativeGraph","analyzeNegativePaths","formatNegativePaths"])assert.equal(typeof api[key],"function");assert.equal(api.MAX_GRAPH_BYTES,32768);});
for(const [name,g] of [...handGraphs,...generatedGraphs]) group(name,()=>{
  const original=JSON.stringify(g),expected=exhaustiveOracle(g),report=api.analyzeNegativePaths(g);
  assert.equal(JSON.stringify(g),original);deeplyFrozen(report);
  assert.equal(report.format,"recallweave-negative-weight-paths-trace/1");
  assert.equal(report.algorithm,"Synchronous Bellman–Ford with at-most-k-edge rounds");
  assert.deepEqual(report.graph,{nodes:g.nodes,edges:g.edges});assert.equal(report.source,g.source);
  assert.equal(report.rounds.length,g.nodes.length+1);
  for(let k=0;k<report.rounds.length;k++){
    const r=report.rounds[k];assert.equal(r.edgesAllowed,k);assert.deepEqual(r.distances,expected.rows[k]);
    assert.deepEqual(Object.keys(r.paths),g.nodes);
    for(const v of g.nodes) if(r.distances[v]===null)assert.equal(r.paths[v],null);else assert.equal(pathCost(g,r.paths[v],v,k),r.distances[v]);
    assert.equal(r.relaxations.length,k?g.edges.length:0);
    if(k) for(let j=0;j<g.edges.length;j++){
      const e=g.edges[j], t=r.relaxations[j], d=expected.rows[k-1][e.from];
      assert.equal(t.edgeIndex,j);assert.equal(t.from,e.from);assert.equal(t.to,e.to);assert.equal(t.weight,e.weight);
      assert.equal(t.sourceDistance,d);assert.equal(t.candidate,d===null?null:d+e.weight);
      assert.ok(["unreached-source","improved","equal-kept","not-better"].includes(t.reason));
      if(d===null){assert.equal(t.reason,"unreached-source");assert.equal(t.before,t.after);}
      else if(t.before===null||t.candidate<t.before){assert.equal(t.reason,"improved");assert.equal(t.after,t.candidate);}
      else {assert.equal(t.reason,t.candidate===t.before?"equal-kept":"not-better");assert.equal(t.after,t.before);}
      const earlier=r.relaxations.slice(0,j).filter(x=>x.to===e.to);
      assert.equal(t.before,earlier.length?earlier.at(-1).after:expected.rows[k-1][e.to]);
    }
  }
  assert.deepEqual(report.witnesses,expected.witnesses);assert.deepEqual(report.affected,expected.affected);
  assert.deepEqual(Object.keys(report.results),g.nodes);
  for(const v of g.nodes){
    const got=report.results[v],want=expected.results[v];assert.equal(got.status,want.status);assert.equal(got.distance,want.distance);
    if(want.status==="finite")assert.equal(pathCost(g,got.path,v,g.nodes.length-1),want.distance);else assert.equal(got.path,null);
  }
  if(name==="tie-carry")assert.deepEqual(report.results.T.path,["S","T"]);
  if(name==="tie-edge-order")assert.deepEqual(report.results.T.path,["S","B","T"]);
  const before=JSON.stringify(report), human=api.formatNegativePaths(report);
  assert.equal(typeof human,"string");assert.ok(human.length>0);assert.equal(JSON.stringify(report),before);
  assert.ok(!JSON.stringify(report).includes("Infinity"));
});
group("copy and freeze input boundary",()=>{
  const g=graph(["S","T"],[["S","T",-2]]),copy=api.validateNegativeGraph(g);
  assert.deepEqual(copy,g);assert.notEqual(copy,g);assert.notEqual(copy.nodes,g.nodes);assert.notEqual(copy.edges,g.edges);assert.notEqual(copy.edges[0],g.edges[0]);deeplyFrozen(copy);
  g.nodes[0]="X";g.edges[0].weight=50;assert.equal(copy.nodes[0],"S");assert.equal(copy.edges[0].weight,-2);
  assert.deepEqual(api.parseNegativeGraph(JSON.stringify(copy)),copy);
});
const badInputs=[null,[],{},graph([],[]),graph(["S","S"],[]),graph(["s"],[]),graph(["S","T"],[["S","X",1]]),graph(["S"],[["S","S",51]]),graph(["S"],[["S","S",-51]]),graph(["S"],[["S","S",1.2]]),graph(["S"],[["S","S",true]]),graph(["S"],[["S","S","1"]]),graph(["S"],[["S","S",Infinity]]),graph(["S"],[["S","S",NaN]]),graph(["S"],[["S","S",1],["S","S",2]]),{...graph(["S"],[]),extra:1},{nodes:["S"],edges:[{from:"S",to:"S",weight:0,extra:1}],source:"S"},{nodes:["S"],edges:[],source:"X"},graph(["S","A","B","C","D","E","F","G"],[])];
for(let i=0;i<badInputs.length;i++)group("invalid-shape-"+i,()=>{assert.throws(()=>api.validateNegativeGraph(badInputs[i]));assert.throws(()=>api.analyzeNegativePaths(badInputs[i]));});
group("text byte limit and JSON admission",()=>{for(const text of ["","{",JSON.stringify(graph(["S"],[]))+" ".repeat(32768)])assert.throws(()=>api.parseNegativeGraph(text));});
console.log(JSON.stringify({schema:"recallweave-negative-weight-paths-independent-api/1",oracle:"whole bounded walks plus exhaustive simple paths and negative simple cycles",graphs:handGraphs.length+generatedGraphs.length,checks,passed:checks.filter(x=>x.pass).length,total:checks.length},null,2));
process.exitCode=checks.every(x=>x.pass)?0:1;
