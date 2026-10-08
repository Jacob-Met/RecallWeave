import assert from 'node:assert/strict';
import fs from 'node:fs';
import {maximumSize} from './oracle.mjs';
import {parseBipartiteInput,traceBipartiteMatching} from './frozen/bipartite-matching.mjs';
const started=Date.now(),left=Array.from({length:6},(_,i)=>'L'+i),right=Array.from({length:6},(_,i)=>'R'+i),cases=[];
function receive(name,pairs,initial){
 const graph=parseBipartiteInput(left.join(' '),right.join(' '),pairs.map(p=>p.join(' ')).join('\n'),initial.map(p=>p.join(' ')).join('\n'));
 const trace=traceBipartiteMatching(graph),expected=maximumSize(left,graph.edges);
 assert.equal(expected,6);assert.equal(trace.maxSize,6);assert.equal(trace.finalMatching.length,6);
 const chosen=trace.finalMatching.map(id=>graph.edges.find(e=>e.id===id));
 assert.equal(new Set(chosen.map(e=>e.left)).size,6);assert.equal(new Set(chosen.map(e=>e.right)).size,6);
 assert.equal(trace.augmentations,6-initial.length);
 assert.deepEqual(trace,traceBipartiteMatching(graph));
 cases.push({name,edge_count:pairs.length,initial_size:initial.length,maximum:trace.maxSize,augmentations:trace.augmentations,event_count:trace.events.length,longest_path:Math.max(0,...trace.events.map(e=>e.path.length))});
 return trace;
}
const complete=left.flatMap(l=>right.map(r=>[l,r])),diagonal=left.map((l,i)=>[l,right[i]]);
receive('all36 edges, empty start',complete,[]);
receive('all36 edges, perfect start',complete,diagonal);
receive('all36 edges reversed order, one missing pair',[...complete].reverse(),diagonal.slice(0,5));
const chain=[...diagonal.slice(0,5),['L5','R4'],['L4','R3'],['L3','R2'],['L2','R1'],['L1','R0'],['L0','R5']];
const t=receive('eleven-edge alternating reversal from size5',chain,diagonal.slice(0,5));
const flip=t.events.find(e=>e.kind==='augment');assert.equal(t.augmentations,1);assert.equal(flip.path.length,11);assert.equal(flip.removed.length,5);assert.equal(flip.added.length,6);
assert.equal(flip.path[0].from,'L5');assert.equal(flip.path.at(-1).to,'R5');
const result={result:'pass',source_sha256:'9df48b6ed5f249c4e18e8f2b9eff452db1267ab6053e8a1464cf1766a962509b',purpose:'Maximum6-by-6 graph and longest possible simple augmenting path boundary; additive to original receipt, no rerun',finished_at:new Date().toISOString(),wall_ms:Date.now()-started,cases};
fs.writeFileSync(new URL('./BOUNDARY-RECEIPT.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
