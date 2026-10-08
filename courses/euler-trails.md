# Euler trails — every edge, once

An edge-covering walk asks a different question from a shortest path: **can you traverse every edge exactly once?** The route may revisit a vertex. The edges are the things you must account for.

This original fourteen-question RecallWeave lesson comes with an offline explorer. Download the lesson JSON, then choose it in RecallWeave’s **Bring your own lesson** panel. Inspect the preview and explicitly start it. The explorer and the lesson are separate: changing a graph does not change the authored questions or your learning session.

## The convention used here

Our graphs are undirected. An edge can be traversed in either direction. Each edge row has its own identity, even when another row has the same endpoints.

- A **walk** follows adjacent vertices; vertices and edges may repeat.
- A **trail** does not repeat an edge.
- An **Euler trail** covers every edge exactly once. It may be open or closed.
- An **Euler circuit** here is a closed Euler trail with at least one edge.
- A loop joins a vertex to itself. It is one edge to traverse and contributes **two** to that vertex’s degree.
- Parallel edges share endpoints but are distinct edges.
- An isolated vertex has degree zero. Our edge-coverage convention does **not** require visiting isolated vertices.
- When there are no edges, we report a **zero-edge walk** at the selected start, separately from a positive-edge circuit.

Terminology varies. In particular, the MIT lecture linked below includes visiting every vertex in its Euler definitions. Our lesson states its edge-coverage convention explicitly, so an isolated vertex does not change whether all existing edges can be covered. Do not silently substitute one convention for the other.

## A small graph you can inspect

Declare A, B, C and D. Enter:

```text
A B
B C
C A
A D
```

The rows become e1, e2, e3 and e4. Degrees are A=3, B=2, C=2 and D=1. There is one edge-bearing component, and the odd vertices are A and D.

One complete route is:

```text
A —e1→ B —e2→ C —e3→ A —e4→ D
```

It has four edge IDs and five vertex occurrences. A occurs twice; that is permitted. Every edge ID appears once.

Now request start B and apply again. The graph still has an open Euler trail, but **B is an ineligible start**. That is a different result from “this graph has no Euler trail.” Request D and you can reverse the route:

```text
D —e4→ A —e3→ C —e2→ B —e1→ A
```

## Two checks before construction

For a graph with at least one edge:

1. **Connectivity of the edges:** all vertices with positive degree must lie in one connected component.
2. **Degree parity:** either every degree is even, giving a circuit, or exactly two degrees are odd, giving an open trail between those two vertices.

Why parity? At an interior visit, an arrival and departure use two edge ends. An open route has one unpaired departure at its start and one unpaired arrival at its finish. A closed route pairs them everywhere. A loop contributes two ends at its single vertex, so it does not change that vertex’s parity.

Connectivity is a separate requirement. Two disjoint triangles have only even degrees, but a walk in one cannot reach the edges in the other. A separate isolated point is different: it has no edge that the route must cover.

These conditions are also sufficient under our undirected edge-coverage convention. One way to see the closed case is to follow unused edges, then insert further closed portions wherever a vertex on the route still has unused edges. Connectivity prevents an unused edge-bearing part from remaining unreachable from the assembled route. For the two-odd case, imagine a temporary extra edge joining the odd vertices; it makes their degrees even. Construct a closed route, then remove that temporary edge and start just after it. The remaining route runs between the two original odd vertices. This explanation permits a temporary parallel edge.

## A route is not a greedy promise

In the four-edge example, taking A–D first strands you at D while the triangle remains unused. That failed partial choice does not disprove the existence of the full route above.

The explorer constructs and checks a complete route **before** showing replay steps. Its slider reveals prefixes of that completed route. It does not claim that every locally available unused edge is a safe next choice.

The construction keeps track of distinct unused edges. It continues from the current vertex while possible and assembles the finished portions when it runs out of unused incident edges. Input row order makes its choice deterministic; reversing or reordering rows may select a different valid route. No claim of a unique or shortest Euler route is made.

## Audit the record, not only the picture

A route record must satisfy all of these checks:

1. It has one more vertex occurrence than edge IDs.
2. It lists exactly the original number of edges.
3. Every original edge ID appears once, with no foreign ID or repetition.
4. Each edge’s endpoints match the adjacent vertex occurrences, in either orientation.
5. For a circuit the first and last vertices match; for an open Euler trail they are the odd vertices.

With parallel edges e1=A–B and e2=A–B, the record A, B, A paired with e1, e1 fails. Its drawn transitions look plausible, but e2 is missing. The table and edge IDs in the explorer preserve this distinction. Loops and parallel edges are valid; the drawing is only a view of the exact table.

## Use the offline explorer

Open `euler-trails-explorer.html` directly or serve the repository locally.

- Declare 1–8 vertices. Their labels are A through the chosen count.
- Enter 0–16 edge rows, each as two uppercase labels separated by whitespace. Blank rows are ignored. A repeated row is a new parallel edge. `A A` is a loop.
- Choose Automatic or an explicit start. Automatic uses the first odd vertex if one exists; otherwise the first vertex with an edge; with no edges it uses A.
- Select **Apply graph**. The result shows degree evidence, edge-bearing components, isolated vertices and the requested-start outcome.
- Use **Previous edge**, **Next edge** or the replay slider to inspect the already completed route. Used and remaining IDs also appear in text.
- Any edit retires the prior result and analysis download until you apply again. Invalid input never keeps a stale result visible.
- **Download analysis** saves the complete applied analysis, independent of the current replay position. A valid impossibility or wrong-start result can also be saved.
- **Download lesson** and **Download guide** save the exact authored companion files. Nothing is automatically saved or uploaded.

The bounds keep the model small enough to inspect. Directed edges, weights, required visits to isolated vertices, route optimization and real road restrictions are outside this lesson. A route’s existence in this model is not a real-world travel recommendation.

## Transfer answers

Try the transfer prompt after each question before reading its working here.

| Item | Working |
| --- | --- |
| et-e1 | Three parallel A–B edges give degree 3 at each endpoint. An open trail exists, for example A–B–A–B using the three distinct IDs. |
| et-e2 | Adding a loop at B adds 2 there: A=3, B=3. Both remain odd. Loops preserve parity. |
| et-e3 | A sixteen-edge route has sixteen edge IDs and seventeen vertex occurrences. The three loops do not change that count. |
| et-d1 | E adds one degree-zero entry. The one edge-bearing component and the circuit’s existence remain unchanged. |
| et-d2 | A’s degree rises from 2 to 4. The two triangles remain disconnected; the extra loop does not join them. |
| et-d3 | Adding B–C gives A=3, B=2, C=2, D=1. The graph is connected and the odd endpoints are A and D. One route is D–A–B–C–A. |
| et-d4 | A becomes degree 4 and D becomes degree 2; B and C remain degree 2. All edges are connected, so a circuit exists. The two A–D edges must retain separate IDs. |
| et-s1 | D–A–B–C–A covers the four edges once, starting at D and ending at A. D–A–C–B–A is another valid answer. |
| et-s2 | B–A–A–B uses the first B–A edge, the loop at A, and the other A–B edge. It is closed. |
| et-s3 | The route becomes [A] with zero edge IDs. There is still no positive-edge circuit claim. |
| et-v1 | D has only the edge to A. After taking it, the remaining triangle can be traversed from A back to A, so D–A–B–C–A completes the route. |
| et-v2 | Check all original edge identities occur exactly once, verify every adjacent vertex transition matches its listed edge, and check the record has one extra vertex occurrence. A correct length alone does not establish coverage or adjacency. |
| et-v3 | Reverse vertices: C,A,D,C,B,A. Reverse IDs: e5,e4,e3,e2,e1. Endpoints are C and A; undirected traversal allows each edge’s reversed orientation. |
| et-v4 | A second distinct C–D edge makes C and D degree 4; all other degrees stay 2. Connectivity remains one edge-bearing component, so a circuit now exists. |

## Source and authorship notes

The questions, examples, explanations, transfer working and explorer visuals are original to this contribution. The course JSON and this guide are released under **CC0-1.0**. No source exercises, illustrations or implementation code were copied. The repository’s existing software license continues to apply to the explorer implementation.

Primary mathematical background:

- Z. Abel, B. Chapman and E. Demaine, MIT 6.1200J/18.062J, Spring 2024, [Lecture 13: Connectivity and Trees](https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec13.pdf), sections 1–3. The all-vertices terminology difference is stated above.
- Princeton Algorithms, [Graph API](https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/Graph.html), for its explicit undirected multigraph and loop-degree convention.
- Princeton Algorithms, [EulerianPath](https://algs4.cs.princeton.edu/code/edu/princeton/cs/algs4/EulerianPath.java.html), as a primary reference for edge-coverage existence with isolated vertices ignored. Its route terminology is not our separate positive-edge circuit label.

The MIT PDF was read directly. Princeton’s directly opened pages returned HTTP 403 during this contribution; available indexed primary excerpts were used for the cited conventions. This access limitation is not an execution or proof claim about Princeton’s implementation.

## Rebuild and verify

From the repository root:

```sh
node tools/build-euler-trails.mjs
node tools/build-euler-trails.mjs --check
node tools/check-euler-trails.mjs
node --test tests/euler-trails.test.mjs
```

The standalone contains the exact checked lesson and guide bytes. The builder does not require a package install or external service. Independent receiving records bind actual source, math/content review and downloaded-file/browser results separately from the authored tests.
