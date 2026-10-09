# Negative-weight paths: finite routes, edge budgets and cycle influence

A negative edge can make a route cheaper without creating a negative cycle. This original twelve-question course continues [the existing shortest-paths lesson](shortest-paths.md), whose `sp-negative` example deliberately lies outside Dijkstra's nonnegative-weight contract. The existing Dijkstra course and explorer are unchanged.

Use the dependency-free Node CLI to inspect the examples, then study [negative-weight-paths.json](negative-weight-paths.json) through RecallWeave's existing checked-deck import flow. The CLI reads a local graph and prints its trace; it does not require a browser, account, server, package install or network connection.

## Run a worked example

From the repository root with an existing Node 20 or later:

```sh
node tools/negative-weight-paths.mjs --graph examples/negative-weight-paths/finite.json
node tools/negative-weight-paths.mjs --graph examples/negative-weight-paths/reachable-cycle.json --json
node tools/negative-weight-paths.mjs --stdin --json < examples/negative-weight-paths/disconnected-cycle.json
node tools/negative-weight-paths.mjs --help
```

The command prints either a readable table or a complete JSON teaching trace. It does not create an output file. If you use shell redirection, your shell controls that destination and may overwrite it; no no-overwrite file-publication guarantee is claimed. Invalid input produces a diagnostic on stderr, exit 2 and no partial result on stdout.

The graph input is one object with exactly `nodes`, `edges` and `source`:

```json
{
  "nodes": ["S", "A", "T", "X"],
  "edges": [
    {"from": "S", "to": "T", "weight": 2},
    {"from": "S", "to": "A", "weight": 5},
    {"from": "A", "to": "T", "weight": -4}
  ],
  "source": "S"
}
```

There are 1–7 distinct uppercase identifiers matching `[A-Z][A-Z0-9]{0,7}`, at most 49 distinct ordered edges, and integer weights from −50 through 50. Endpoints and source must be declared. Self-loops are allowed. Reverse edges are never inferred. Numeric negative zero is treated as zero. Unknown fields, fractions, strings standing in for numbers and out-of-range values refuse.

File input must be a nonsymlink regular file. File and stdin input are limited to 32 KiB of valid UTF-8 JSON; a leading byte-order mark is not part of this strict JSON input. The command refuses a detected file change during reading. Stdin is read until EOF, so interactive callers must end their input. The command does not write its input or the repository.

## Read the rounds correctly

This is the **synchronous** edge-budget variant of Bellman–Ford. Row 0 permits zero edges: S has distance 0 and route [S], and every other vertex is unreached. Row*k* reads only row*k*−1, so each entry is the cheapest source walk using **at most k edges**. The current row initially carries the previous row, then considers every declared edge against the previous row's source distance.

Strict improvements replace the carried value. Equal candidates retain the carried route, or the first improving candidate in declared edge order. Thus distances are independent of edge order, while equal-cost route choices may differ. All rows 0 through*n* are retained, even if they stop changing early.

Ordinary in-place Bellman–Ford implementations can use several newly updated edges within one pass. Their intermediate passes need not match these edge-budget rows. Do not compare the two kinds of pass as though they had the same meaning.

A walk may repeat vertices. A finite shortest-walk cost can be attained by a simple route: a repeated nonnegative cycle can be removed without increasing cost. Such a route uses at most*n*−1 edges. A reachable negative cycle can instead be repeated to lower the cost indefinitely for itself and every vertex it can reach.

### Finite negative-edge example

For the first example, the rows in node order S,A,T,X are:

| Edge budget | S | A | T | X |
| ---: | ---: | ---: | ---: | --- |
|0|0|unreached|unreached|unreached|
|1|0|5|2|unreached|
|2|0|5|1|unreached|
|3|0|5|1|unreached|
|4|0|5|1|unreached|

The route S→A→T costs 5 − 4 = 1, beating the direct edge's 2. Row 1 cannot already use A's newly discovered 5 because it reads row 0, where A is unreached. X is finally **unreachable**. There are no improvement witnesses or unbounded vertices.

Adding 4 to every edge would make the direct route cost 6 and the two-edge route cost 9. This reverses their order, which explains why a common edge-weight shift is not a general substitute for an algorithm that supports negative edges.

### Reachable and disconnected negative cycles together

The mixed example has node order S,A,B,T,U,X,Y and edges:

```text
S → A: 2       A → B: -3      B → A: 1
B → T: 4       S → U: 7
X → Y: -2      Y → X: 1
```

A→B→A costs −2. Each additional circuit lowers a continuing walk's cost by 2. The final two bounded rows are:

| Edge budget | S | A | B | T | U | X | Y |
| ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
|6|0|−2|−5|1|7|unreached|unreached|
|7|0|−4|−5|−1|7|unreached|unreached|

A and T decrease between rows*n*−1 and*n*, so they are **improvement witnesses**. T has no outgoing edges and is not on a cycle. Witnesses are evidence of negative-cycle influence, not a list of cycle members. B does not decrease in this exact last comparison, but it is reachable from witness A and must also be marked.

The final affected set is A,B,T. These vertices are **unbounded-below**, with no finite minimum or shortest route to report. Their last table entries remain legitimate bounded-walk costs, not final optima.

S stays finite at 0 because the cycle cannot return to it. U stays finite at 7 because the cycle cannot reach U. X and Y have a separate negative cycle, but neither is reachable from S. They are **unreachable**.

Try changing B→A to 3. The reachable cycle then costs 0; extra circuits do not lower a route, and T becomes finite at 3. Alternatively, restore B→A to 1 and add B→S with weight 0. The cycle can then return to the source, so S and its previously finite branch U also become unbounded.

### A disconnected negative cycle alone

The third input contains only S→T(3), X→Y(−2) and Y→X(1). From S, the result is S0, T=3, and X/Y unreachable. The presence of any negative cycle somewhere in a graph is not a reason to label every source result unbounded or reject the whole input.

## JSON and module interface

The trace format is `recallweave-negative-weight-paths-trace/1`. It contains the copied graph/source, rows, per-edge relaxation observations, ordered witnesses, ordered affected vertices and final results. Each row's `edgesAllowed` states its budget; `null` there means no walk within that budget. Per-edge candidates always read the previous row, while `before` and `after` describe the current row's best value at that edge.

Final results use an explicit status:

| Status | distance | path |
| --- | --- | --- |
|finite|integer|source-to-vertex route|
|unreachable|null|null|
|unbounded-below|null|null|

The two null cases are distinguished by status. JSON contains no Infinity or −Infinity values. The trace is not an accepted learner-session restore file.

The pure model exports `validateNegativeGraph`, `parseNegativeGraph`, `analyzeNegativePaths`, `formatNegativePaths` and `MAX_GRAPH_BYTES` from `src/negative-weight-paths.mjs`. Validation copies and freezes the graph; analysis copies input and deeply freezes every report descendant. The formatter expects a report produced by the analyzer.

## Study the course

The course uses the existing `recallweave-deck/1` format. Open the existing learner and select `courses/negative-weight-paths.json` through its checked-deck file-selection/start flow. The [existing shortest-paths guide](shortest-paths.md) describes that retained learner flow. This contribution's native qualification covers the unchanged schema parser and CLI; it does not claim a new browser-import, installed-user or learning-efficacy test.

The catalog builder reads an explicit `catalog/courses.json` list. This addition does **not** update that list, the bundled catalog or the standalone offline pack. Direct file import and the commands above are the provided entrypoints; catalog/pack composition remains a separate owner-held action.

| Concept | Items | Worked answer |
| --- | --- | --- |
|signed-routes|nw-finite, nw-shift, nw-domain|cost 1 via A; shifted costs 6/9; Dijkstra's domain differs from finiteness|
|edge-budgets|nw-zero-round, nw-two-rounds, nw-simple-bound|only S=0; T=2 then 1; finite optimum has a simple route|
|cycle-influence|nw-cycle-cost, nw-affected, nw-witness|two circuits lower by 4; A/B/T affected; T is a witness outside the cycle|
|reading-results|nw-disconnected, nw-zero-cycle, nw-source-return|disconnected cycle irrelevant to S; zero-cycle T=3; return edge makes S unbounded|

All twelve questions include original distractors, worked explanations and transfer prompts. They offer practice and feedback on these bounded examples, not validated measurement of learner ability or gains.

## Source and verification

The algorithmic background is [MIT OpenCourseWare 6.006, Spring 2020, Lecture 12: Bellman–Ford](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/2430d7903a5529451d80c17f89a41fe8_MIT6_006S20_lec12.pdf), by Erik Demaine, Jason Ku and Justin Solomon. Its synchronous edge-budget formulation motivates this trace. The graphs, calculations, questions and wording here are original; no reference exercise, diagram or passage is copied. AI assistance was used in drafting and implementation.

With an existing Node installation, the focused maintained command is:

```sh
node --test tests/negative-weight-paths.test.mjs tests/negative-weight-paths-cli.test.mjs
```

The CLI tests create a small private temporary fixture under the normal temporary directory (or the caller's explicit TMPDIR) and retain it for inspection. POSIX link/FIFO cases require the existing `mkfifo` command; they are skipped on Windows. Source and fixture identity checks accompany actual CLI calls. No package installation is required.

Exact executed results and any environmental limits belong in the uniquely prefixed [receiving directory](../docs/receiving/negative-weight-paths-18a24bf0c281/). A source-module check, native file/CLI check, browser check and installed adoption are distinct boundaries.

## Complete question prompts

Each prompt is reproduced verbatim from the checked deck so a single card can be read without a prior card's graph.

### 1. nw-finite

The only edges are S → T (2), S → A (5), and A → T (−4). What is the shortest S-to-T route and its cost?

### 2. nw-shift

A graph has vertices S, A, T and only S → T (2), S → A (5), A → T (−4). Add 4 to every edge weight. What happens to the direct and two-edge S-to-T costs?

### 3. nw-domain

A graph has vertices S, A, T and only S → T (2), S → A (5), A → T (−4). The S → A → T route has finite cost 1. Why does the existing Dijkstra explorer refuse this graph?

### 4. nw-zero-round

Round k of this synchronous trace permits at most k edges. With source S, what does round 0 contain?

### 5. nw-two-rounds

For S → T (2), S → A (5), A → T (−4), what are T's distances in synchronous rounds 1 and 2?

### 6. nw-simple-bound

For an n-vertex graph, why is n−1 the relevant edge bound for a vertex whose shortest-walk cost is finite?

### 7. nw-cycle-cost

The edges A → B (−3) and B → A (1) form a directed cycle. What happens when a source-reachable walk makes two additional circuits before continuing?

### 8. nw-affected

Use S → A (2), A → B (−3), B → A (1), B → T (4), S → U (7), X → Y (−2), Y → X (1), with no other edges. Which vertices are unbounded-below from S?

### 9. nw-witness

Use source S and exactly seven vertices S, A, B, T, U, X, Y. The only edges are S → A (2), A → B (−3), B → A (1), B → T (4), S → U (7), X → Y (−2), Y → X (1). T improves from 1 in round 6 to −1 in round 7 and has no outgoing edges. What does this establish?

### 10. nw-disconnected

The only edges are S → T (3), X → Y (−2), and Y → X (1). From source S, what should the final report say?

### 11. nw-zero-cycle

Use source S and vertices S, A, B, T, U, X, Y. The only edges are S → A (2), A → B (−3), B → A (3), B → T (4), S → U (7), X → Y (−2), Y → X (1). What is T's final result from S?

### 12. nw-source-return

Use source S and vertices S, A, B, T, U, X, Y. The only edges are S → A (2), A → B (−3), B → A (1), B → T (4), S → U (7), X → Y (−2), Y → X (1), and B → S (0). What should the final result for S contain?
