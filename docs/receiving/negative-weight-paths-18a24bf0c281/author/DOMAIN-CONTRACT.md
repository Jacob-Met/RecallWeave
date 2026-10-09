# Pre-candidate domain and recipient contract
Status: proposed new-only RecallWeave continuation; implementation not started; root public claim pending.
Parent698902f9c9c1d5c5023092b85b3632a7cb7a01ed / tree d6d3707b691850af7928299242631534cff89aa8.
Existing Dijkstra refusal is correct. This capability extends the learner's explicit sp-negative question.

## Input and finite domain
The native entrypoint will be node tools/negative-weight-paths.mjs --graph FILE [--json], or --stdin [--json]; --help is standalone. Exactly one input selector is required. Unknown/repeated flags, missing values and mutually exclusive selectors refuse.
Input is one JSON object with exactly nodes,edges,source. nodes has1..7 distinct strings matching /^[A-Z][A-Z0-9]{0,7}$/. edges has0..49 objects with exactly from,to,weight. Endpoints and source must belong to nodes; each ordered pair occurs at most once. Integer weights from-50 through50 inclusive; finite only; JSON negative zero has ordinary numeric zero semantics. Self-loops allowed. There is no implicit reverse edge, unit conversion, index sorting or weight coercion.
File input must be a nonsymlink regular file; input/stdin maximum32768 UTF-8 bytes, fatal UTF-8 decode and JSON parse. File descriptor admission/bounded read must not open FIFOs for a blocking read; source file metadata and content preserved. Empty/invalid/oversized input refuses with diagnostic/exit2 and no partial report. No product output file option: reports go only to stdout. Caller shell redirection is caller-owned and outside no-overwrite claims.
No network, provider, dependency install, learner state, browser storage or source mutation.

## Algorithm and emitted semantics
The graph is copied and frozen after validation; output is immutable. No mutation of supplied arrays/objects.
round0 has source distance0 with path[source], every other distance null/path null. null in a round means no source walk with at most that round's edge count.
Every round k=1..n reads exclusively round k-1. Begin by carrying each old distance/walk forward, then consider each declared edge against the previous round's source distance. Strictly cheaper candidate replaces; equal candidate keeps carried/earlier candidate. Declared node/edge order is preserved; no vertex settlement assertion. Each round records chosen distances/walks plus per-edge source-distance, candidate, previous best/current result and reason. Intermediate walks may repeat vertices and are not final shortest-path claims.
Return all n+1 rounds even if stable early, making the edge-count invariant directly observable.
Compare round n to n-1; witness vertices are strict decreases in graph node order. The union of vertices forward-reachable from those witnesses is unbounded-below. A witness need not be a cycle vertex. No unreachable negative component contaminates source results. A reachable negative cycle affects only vertices reachable from it.
Final status per node is exactly finite, unreachable, or unbounded-below. finite uses round n-1 numeric distance and its source-to-node route; other statuses have distance:null and path:null. Source itself is finite0 unless a reachable negative cycle can return to it. A zero or positive cycle does not itself imply unboundedness.
Versioned JSON format recallweave-negative-weight-paths-trace/1 contains algorithm label, normalized graph, source, ordered rounds, witnesses, affected nodes and final results. No Infinity/-Infinity, invented finite optimum, execution timestamps or restore semantics. Human stdout identifies edge-count rows, witnesses and the same final classifications. It is a learning trace, not a learner-session save.

## Hand-frozen source examples
A finite example: node order S,A,T,X. Edges S-T2,S-A5,A-T-4. Pass rows:
0: [0,null,null,null]
1: [0,5,2,null]
2: [0,5,1,null]
3: [0,5,1,null]
4: [0,5,1,null].
No witnesses/affected. Final S0,A5,T1 via[S,A,T]; X unreachable.
A mixed reachable/disconnected example: order S,A,B,T,U,X,Y. Edges S-A2,A-B-3,B-A1,B-T4,S-U7,X-Y-2,Y-X1. Rows:
0: [0,null,null,null,null,null,null]
1: [0,2,null,null,7,null,null]
2: [0,2,-1,null,7,null,null]
3: [0,0,-1,3,7,null,null]
4: [0,0,-3,3,7,null,null]
5: [0,-2,-3,1,7,null,null]
6: [0,-2,-5,1,7,null,null]
7: [0,-4,-5,-1,7,null,null].
Witnesses[A,T]; affected[A,B,T]. S0/U7 finite; X/Y unreachable. Repeating A-B-A decreases walk cost by2. T is a witness despite not lying on a cycle; U remains finite despite source access to the cycle.
A disconnected example: order S,T,X,Y. Edges S-T3,X-Y-2,Y-X1. Rows0=[0,null,null,null], rows1..4=[0,3,null,null]. No witnesses/affected. S0/T3 finite; X/Y unreachable.
Three examples will live at examples/negative-weight-paths/{finite,reachable-cycle,disconnected-cycle}.json and be direct CLI inputs, not non-deck files under courses/*.json.

## Native qualification and independence
The author uses exact hand rows above, shape/range/immutability and refusal controls plus real CLI file/stdin/human/JSON children. An independently frozen receiver should compare small graphs against exhaustive simple path/cycle classification and bounded-walk enumeration, not call this solver to derive expectations. Course answers/guide receive a separate human/source audit and current unchanged src/deck.mjs admission.
Original source-module witness f37bf6fa driver/e9ca0d9c stdout stays unchanged and is not relabeled CLI qualification. No original replay. Candidate execution needs its own actual source-file/native directory admission; existing Node only, new isolated namespace, bounded children, input/source hashes and exact outputs. Proposed admission floor32MiB free for a4MiB cap; max10s per child and120s campaign. If unavailable preserve failure and stop, no cleanup/install/host pivot.
No browser/installed uptake/learning-efficacy claim is part of this native content/CLI scope.

## Original course outline (twelve items, four concepts)
signed-routes (no prerequisites):
1. Original finite graph: compare direct2 against5+(-4)=1; answer via A, not smallest isolated edge.
2. Adding4 to every edge makes direct6 versus two-edge9; it changes route ordering.
3. Negative edge alone does not imply a negative cycle or unbounded optimum: the acyclic example is finite.
edge-budgets (prerequisite signed-routes):
4. Round0: source0 only, no edge traversals; unreachable and unbounded are not inferred yet.
5. Synchronous first/second pass: T2 thenT1, because pass1 cannot reuse A5 created within that same pass.
6. A finite shortest route can be simple and use at most n-1 edges; the condition is finiteness, not merely no negative individual edge.
cycle-influence (prerequisite edge-budgets):
7. Mixed example A-B-A has weight-2; repetitions lower cost without bound.
8. A,B,T affected; S,U finite; X,Y unreachable. Forward reachability, not whole-graph contamination.
9. T is an nth-pass improvement witness outside the cycle; witness does not mean cycle membership.
reading-results (prerequisite cycle-influence):
10. Disconnected X-Y negative cycle does not alter S-to-T3; source reachability matters.
11. Replacing cycle sum by0 removes strict repeated decreases; zero cycles are not negative cycles.
12. Add a return edge from the affected component to S: source then becomes unbounded; output must withhold a finite shortest route instead of reporting its last bounded-pass estimate.
Each final question will have2..6 distinct alternatives, exactly one answer, worked explanation and transfer. These are original teaching prompts, not copied source exercises. The existing learner's schema/import route is reused without changing shared files.

Primary algorithm reference: MIT6.006 Spring2020 Lecture12, https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/2430d7903a5529451d80c17f89a41fe8_MIT6_006S20_lec12.pdf . The synchronous edge-budget variant is intentional; usual in-place Bellman–Ford rounds do not generally equal the at-most-k-edge table. No efficiency benchmark or large-graph solver claim.
