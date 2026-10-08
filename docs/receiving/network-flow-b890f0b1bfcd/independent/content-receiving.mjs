import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/home/jacob/hamon-b890f0b1bfcd';
const out=root+'/production/network-flow-receiver';
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const courseFile=root+'/recall-network-flow/courses/network-flow.json';
const course=JSON.parse(readFileSync(courseFile,'utf8'));
const answers=[
 ['nf-capacity',2,'The permitted bound stays 7; flow 4 leaves forward residual 3. Transfer: flow 6 leaves 1.'],
 ['nf-conservation',0,'Incoming 3+2=5; outgoing 1+x=5 implies x=4. Capacity 3 on that edge makes the unchanged assignment infeasible.'],
 ['nf-value',3,'Net value is outgoing 5 minus incoming 1 = 4. Adding a unit of source circulation increases both totals by 1 and preserves value 4.'],
 ['nf-series',1,'The only route has bound min(7,2)=2, attained by flow 2 on both edges. Raising only 7 to 12 preserves the bound.'],
 ['nf-parallel',2,'Independent branches deliver 3+2=5, also equal to the outgoing source-cut capacity. A subsequent shared capacity-4 edge changes the upper bound to 4.'],
 ['nf-forward',0,'Forward residual is 9-4=5. Adding 3 produces flow 7, forward residual 2, cancellation residual 7.'],
 ['nf-cancel',3,'Cancelling 3 from an assigned 4 leaves flow 1 without changing capacity. Cancelling more than assigned flow would violate nonnegativity.'],
 ['nf-opposite',1,'Original B-to-A has forward residual 4-1=3; reverse residual associated with A-to-B is 5. Cancelling 2 gives original flows 3 and 1; forwarding 2 gives 5 and 3.'],
 ['nf-reroute',2,'Independent fixture confirms S-B-C-A-D-T, with C-to-A cancelling A-to-C. Final ordered seven flows are 1,1,0,1,1,1,1 and value 2.'],
 ['nf-bfs',0,'A 2-edge residual path precedes a 3-edge path under BFS regardless of their bottlenecks 1 and 8. Documented ties make the trace and edge assignment reproducible.'],
 ['nf-cut',3,'Only source-side-to-sink-side capacities count: 3+4=7. Reverse capacity 9 and within-side capacity 20 do not enter that sum.'],
 ['nf-certificate',1,'A feasible value 6 is a lower bound; any source-sink cut of capacity 6 is an upper bound. Matching bounds prove optimum 6 without uniqueness or global saturation. A value 4 and cut 6 would bound optimum in [4,6].'],
 ['nf-unreachable',0,'With no positive residual source-sink path, the residual reachable partition certifies optimum. In S-A capacity 8, A-T capacity 0 it is {S,A}/{T}, cut 0 and flow 0.'],
 ['nf-upgrade',2,'The source cut remains 2 and a flow 2 is feasible. Raising A-T from 7 to 9 cannot improve that optimum. After the proposed upgrade, raising S-A can increase optimum up to 9.']
];
assert.equal(course.items.length,14);
assert.equal(new Set(course.items.map(i=>i.id)).size,14);
for(const [id,answer,reason] of answers) {
 const item=course.items.find(i=>i.id===id);
 assert(item,'missing reviewed question '+id);
 assert.equal(item.answer,answer,'independent answer index '+id);
 assert(item.options[answer] && item.explanation && item.transfer,'complete learning item '+id);
}
const concepts=new Set(course.concepts);
const dependencies=new Map(course.concepts.map(c=>[c,new Set()]));
for(const item of course.items) {
 assert(concepts.has(item.concept),'listed concept '+item.id);
 for(const prerequisite of item.prerequisites) {assert(concepts.has(prerequisite),'listed prerequisite '+item.id);dependencies.get(item.concept).add(prerequisite);}
}
const visiting=new Set(),done=new Set();
function visit(c) {assert(!visiting.has(c),'acyclic prerequisite '+c);if(done.has(c))return;visiting.add(c);for(const p of dependencies.get(c))visit(p);visiting.delete(c);done.add(c);}
for(const c of concepts)visit(c);
const receipt={
 passed:true,
 source:{modelSha256:sha(root+'/recall-network-flow/src/network-flow.mjs'),courseSha256:sha(courseFile)},
 review:{items:14,answerIndices:answers.map(([id,answer])=>({id,answer})),concepts:5,prerequisiteGraph:'acyclic',mathematicalIssuesFound:0},
 authoredReview:answers.map(([id,answer,reason])=>({id,answer,reason})),
 scope:'Independent mathematical and content receiving only. Browser, hosted CI, integration and installed state are outside this receipt.',
 provenance:{blindOracleSha256:sha(out+'/blind-receiver.mjs'),schemaReceiverSha256:sha(out+'/schema-receiver.mjs'),correctedReceiverSha256:sha(out+'/schema-receiver-r2.mjs')}
};
writeFileSync(out+'/content-receiving.json',JSON.stringify(receipt,null,2)+'\n');
const report=[
 '# Independent network-flow mathematical and content receiving',
 '',
 'Contributor: b890f0b1bfcd/production. Native receiving: ThinkPad d55b2499-5e82-4805-819a-d0d7ddea1efe, Node 22.22.1. All writes are in this contribution’s private directory.',
 '',
 '## Exact received source',
 '',
 '- Model SHA256: '+receipt.source.modelSha256,
 '- Course SHA256: '+receipt.source.courseSha256,
 '- Blind oracle SHA256: '+receipt.provenance.blindOracleSha256,
 '- Contract-adapted receiver SHA256: '+receipt.provenance.schemaReceiverSha256,
 '- Corrected receiver SHA256: '+receipt.provenance.correctedReceiverSha256,
 '',
 '## Independence and preserved first failure',
 '',
 'The seven worked examples, exhaustive cut-enumeration oracle, residual path checks and generated corpus were written and self-checked before either candidate source file was read. The original freeze is blind-receiver.mjs and blind-self-check.json. The author then clarified that supplied edge IDs normalize to e1, e2, ... in original edge order. schema-receiver.mjs adds only the corresponding fixture ID adaptation; mathematical expectations and generated graphs remain unchanged.',
 '',
 'The first candidate import failed in the receiver because node:assert/strict distinguishes 0 from -0 in an initial terminal-balance check. receiving-first.json preserves that failure. schema-receiver-r2.mjs corrects only that comparison to source net plus sink net equals zero. This was a receiver defect, not a production solver defect. Both earlier receiver files and the failure are retained.',
 '',
 '## Solver result',
 '',
 'The unchanged model passes seven worked fixtures and 5,145 generated valid networks: every capacity assignment 0..2 on the six directed pairs of three vertices (729), every capacity assignment 0..1 on the twelve directed pairs of four vertices (4,096), and 320 seeded directed networks spanning five through eight vertices and capacities 0..99. The receiver obtains optimum by enumerating every source-containing/sink-excluding cut, not by another maximum-flow implementation.',
 '',
 'Every trace verifies zero initial assignment, original edge identity/order/capacity, integer nonnegative flows, capacity bounds, intermediate conservation, equal net terminal value, independent deterministic shortest residual path selection, bottleneck, exact signed per-edge change, augmentation count, final residual unreachability, exact reachable cut partition and flow/cut equality. Eleven malformed networks are rejected. receiving-r2.json records exact outcomes and source hashes.',
 '',
 'The named cancellation graph reaches 2 using S-A-C-T then S-B-C-A-D-T, cancelling the original A-C edge. Adding an original C-A edge selects forward use of C-A before cancellation of A-C, retains both edge IDs and leaves their one-unit circulation intact while still delivering 2. The independent six-vertex textbook control reaches 23. The generated corpus had no cancellation cases under its deterministic order; cancellation coverage comes from the explicit named fixture and is not attributed to random coverage.',
 '',
 '## Fourteen-item content review',
 '',
 'All answer/explanation pairs were independently checked, including each transfer prompt. The five-concept prerequisite graph is acyclic and every referenced concept exists. No mathematical correction is requested on the received bytes.',
 '',
 ...answers.flatMap(([id,answer,reason])=>['- **'+id+'** — option '+(answer+1)+'. '+reason]),
 '',
 '## Boundaries',
 '',
 'This receipt qualifies the small directed integer-capacity teaching model and the original course explanations. It does not claim a browser pass, hosted CI, repository integration, deployment or operational application to measured physical systems. No candidate production file was modified by this independent receiver.',
 ''
].join('\n');
writeFileSync(out+'/INDEPENDENT_REVIEW.md',report);
console.log(JSON.stringify(receipt,null,2));
