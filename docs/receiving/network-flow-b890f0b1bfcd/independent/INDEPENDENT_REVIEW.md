# Independent network-flow mathematical and content receiving

Contributor: b890f0b1bfcd/production. Native receiving: ThinkPad d55b2499-5e82-4805-819a-d0d7ddea1efe, Node 22.22.1. All writes are in this contribution’s private directory.

## Exact received source

- Model SHA256: 0d89a642dbd6f06f572bac7a041223bd92c3e855861fe4adc8ff907befc2bb12
- Course SHA256: 9b706bc471a42a06018d3aa3c5d5ba54af1fd5b004cc288910429bba875b8d2e
- Blind oracle SHA256: 59d9fa646c644a0c56a339aad57d06146f1bff1ae6b8239759c5c66f0b447086
- Contract-adapted receiver SHA256: ed00bf25945120c7d1d471741b6391e5b34488f870c05bac1be53116506b6685
- Corrected receiver SHA256: a8a2d5ac000fc6e3d21c6efdd7b1d46671d61077517d5995684596df8230577c

## Independence and preserved first failure

The seven worked examples, exhaustive cut-enumeration oracle, residual path checks and generated corpus were written and self-checked before either candidate source file was read. The original freeze is blind-receiver.mjs and blind-self-check.json. The author then clarified that supplied edge IDs normalize to e1, e2, ... in original edge order. schema-receiver.mjs adds only the corresponding fixture ID adaptation; mathematical expectations and generated graphs remain unchanged.

The first candidate import failed in the receiver because node:assert/strict distinguishes 0 from -0 in an initial terminal-balance check. receiving-first.json preserves that failure. schema-receiver-r2.mjs corrects only that comparison to source net plus sink net equals zero. This was a receiver defect, not a production solver defect. Both earlier receiver files and the failure are retained.

## Solver result

The unchanged model passes seven worked fixtures and 5,145 generated valid networks: every capacity assignment 0..2 on the six directed pairs of three vertices (729), every capacity assignment 0..1 on the twelve directed pairs of four vertices (4,096), and 320 seeded directed networks spanning five through eight vertices and capacities 0..99. The receiver obtains optimum by enumerating every source-containing/sink-excluding cut, not by another maximum-flow implementation.

Every trace verifies zero initial assignment, original edge identity/order/capacity, integer nonnegative flows, capacity bounds, intermediate conservation, equal net terminal value, independent deterministic shortest residual path selection, bottleneck, exact signed per-edge change, augmentation count, final residual unreachability, exact reachable cut partition and flow/cut equality. Eleven malformed networks are rejected. receiving-r2.json records exact outcomes and source hashes.

The named cancellation graph reaches 2 using S-A-C-T then S-B-C-A-D-T, cancelling the original A-C edge. Adding an original C-A edge selects forward use of C-A before cancellation of A-C, retains both edge IDs and leaves their one-unit circulation intact while still delivering 2. The independent six-vertex textbook control reaches 23. The generated corpus had no cancellation cases under its deterministic order; cancellation coverage comes from the explicit named fixture and is not attributed to random coverage.

## Fourteen-item content review

All answer/explanation pairs were independently checked, including each transfer prompt. The five-concept prerequisite graph is acyclic and every referenced concept exists. No mathematical correction is requested on the received bytes.

- **nf-capacity** — option 3. The permitted bound stays 7; flow 4 leaves forward residual 3. Transfer: flow 6 leaves 1.
- **nf-conservation** — option 1. Incoming 3+2=5; outgoing 1+x=5 implies x=4. Capacity 3 on that edge makes the unchanged assignment infeasible.
- **nf-value** — option 4. Net value is outgoing 5 minus incoming 1 = 4. Adding a unit of source circulation increases both totals by 1 and preserves value 4.
- **nf-series** — option 2. The only route has bound min(7,2)=2, attained by flow 2 on both edges. Raising only 7 to 12 preserves the bound.
- **nf-parallel** — option 3. Independent branches deliver 3+2=5, also equal to the outgoing source-cut capacity. A subsequent shared capacity-4 edge changes the upper bound to 4.
- **nf-forward** — option 1. Forward residual is 9-4=5. Adding 3 produces flow 7, forward residual 2, cancellation residual 7.
- **nf-cancel** — option 4. Cancelling 3 from an assigned 4 leaves flow 1 without changing capacity. Cancelling more than assigned flow would violate nonnegativity.
- **nf-opposite** — option 2. Original B-to-A has forward residual 4-1=3; reverse residual associated with A-to-B is 5. Cancelling 2 gives original flows 3 and 1; forwarding 2 gives 5 and 3.
- **nf-reroute** — option 3. Independent fixture confirms S-B-C-A-D-T, with C-to-A cancelling A-to-C. Final ordered seven flows are 1,1,0,1,1,1,1 and value 2.
- **nf-bfs** — option 1. A 2-edge residual path precedes a 3-edge path under BFS regardless of their bottlenecks 1 and 8. Documented ties make the trace and edge assignment reproducible.
- **nf-cut** — option 4. Only source-side-to-sink-side capacities count: 3+4=7. Reverse capacity 9 and within-side capacity 20 do not enter that sum.
- **nf-certificate** — option 2. A feasible value 6 is a lower bound; any source-sink cut of capacity 6 is an upper bound. Matching bounds prove optimum 6 without uniqueness or global saturation. A value 4 and cut 6 would bound optimum in [4,6].
- **nf-unreachable** — option 1. With no positive residual source-sink path, the residual reachable partition certifies optimum. In S-A capacity 8, A-T capacity 0 it is {S,A}/{T}, cut 0 and flow 0.
- **nf-upgrade** — option 3. The source cut remains 2 and a flow 2 is feasible. Raising A-T from 7 to 9 cannot improve that optimum. After the proposed upgrade, raising S-A can increase optimum up to 9.

## Boundaries

This receipt qualifies the small directed integer-capacity teaching model and the original course explanations. It does not claim a browser pass, hosted CI, repository integration, deployment or operational application to measured physical systems. No candidate production file was modified by this independent receiver.
