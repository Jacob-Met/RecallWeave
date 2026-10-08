# Minimum spanning forests: connect without cycles

This original twelve-question course teaches a precise objective: choose available undirected links with minimum total weight while connecting every vertex in each original connected component and avoiding cycles.

## Study the course

Save `minimum-spanning-forest.json`. Open RecallWeave's `demo.html`, choose that file under **Bring your own lesson**, inspect its preview, then choose **Start this deck**. The learner records your original chosen answers and provides the authored explanations and transfer prompts. Practice is separate from the first pass; the model's learning estimate is not a grade or evidence that you have mastered graph theory.

Open `minimum-spanning-forest-explorer.html` directly from your files to inspect the worked graphs. The explorer is an algorithm demonstration, separate from a learner session. It uses no server, account, network request, browser storage or user-data upload. Its optional external references open only when you choose a reference link.

## Input and graph conventions

Choose 1–8 vertices, named A through the selected final letter. Enter one edge per nonblank line, for example:

```text
A B 4
A C 1
B C 2
B D 5
C D 3
```

Each line contains two letters and a whole-number weight from −99 through 99, separated by spaces or tabs. Letters are case-insensitive. Signed decimal integers, including zero, are accepted; decimals, scientific notation and comments are not. Empty lines are ignored. A blank edge list is valid.

The graph is **undirected**: A–B and B–A name the same pair. The explorer accepts a **simple graph**, so it refuses a self-loop or a second line for an already used unordered pair. These are explicit teaching-interface limits; more general graph representations can permit parallel edges.

The drawing is a layout of the entered graph. A geometric crossing between two lines is not an extra vertex or connection. Weight labels are costs, not distances in the picture.

## The rule and its invariant

1. Give each entered edge its original line-order identity.
2. Inspect edges in increasing weight order. For equal weights, use original input order.
3. Accept an edge exactly when its endpoints are in different currently accepted components.
4. After an acceptance, merge those two components and add the weight to the running total. After a rejection, leave the accepted set, components and total unchanged.

The accepted edges always form a forest. If two endpoints already have an accepted path between them, adding their edge creates a cycle; that is why it must be rejected. An accepted edge joins two separate trees and lowers the number of components by one.

The greedy choice is supported by the cut property: a lightest edge crossing a component boundary that no accepted edge crosses can extend a compatible minimum spanning forest. If a compatible minimum forest already contains the chosen edge, it is immediately a valid extension. Otherwise, within the original connected component, adding that edge to the component's minimum tree creates a cycle containing another edge crossing the same boundary. Removing a suitable crossing edge of at least as much weight restores that component's tree without increasing its total. The trees of other original components remain unchanged. Thus the statement also applies when the whole graph is disconnected. Equal weights can leave several minimum spanning forests available.

The explorer inspects **every input edge**, including edges that would be unnecessary to examine after a connected tree has already formed. Its decision count therefore equals the number of input edges. It is not a sorting-comparison count, a count of component lookups, or a measurement of runtime. Rendering and input validation are excluded. The trace includes explicit component snapshots for learning, not a claim about the storage cost of an optimized implementation.

## Worked connected graph

For the five lines above, inspect:

| Decision | Edge | Weight | Result | Accepted components | Running total |
|---|---|---:|---|---|---:|
| 1 | A–C | 1 | Accept | {A, C}, {B}, {D} | 1 |
| 2 | B–C | 2 | Accept | {A, B, C}, {D} | 3 |
| 3 | C–D | 3 | Accept | {A, B, C, D} | 6 |
| 4 | A–B | 4 | Reject: cycle | {A, B, C, D} | 6 |
| 5 | B–D | 5 | Reject: cycle | {A, B, C, D} | 6 |

The final tree has three edges and total weight 6. There are five edge decisions. The two rejected edges remain in the original input graph; they are simply absent from the chosen tree.

## Ties and negative weights

For the equal-weight triangle entered as A–C 1, A–B 1, B–C 1, accept the first two lines and reject the third. Reordering those equal-weight lines may select another minimum tree, but each has total 2. A deterministic trace does not prove uniqueness.

Negative weights require no special discard rule. With A–B −4, B–C −2, A–C 1, C–D 3 and A–D 9, accept weights −4, −2 and 3 for total −3. The cycle rule still applies, and D must still be included.

## Disconnected graphs and isolated vertices

For A–B 1, B–C 2, A–C 4 and D–E −2, no available link joins {A, B, C} to {D, E}. The result is a **minimum spanning forest**: edges D–E, A–B and B–C, total 1, with two components. It does not invent an edge to join them.

An isolated vertex remains a one-vertex component. For n vertices and k final components, a spanning forest contains n − k accepted edges. With one vertex and no edges, k = 1, so the graph is connected and its empty tree has weight 0. With three vertices and no edges, k = 3: the result is a disconnected forest with weight 0.

## Minimum total connection cost is a distinct objective

A triangle with A–B 2, B–C 2 and A–C 3 has a minimum tree using the two weight-2 edges. Its total is 4. The route from A to C within that tree also costs 4, whereas the original direct A–C route costs 3. Minimum spanning trees minimize the total chosen connection cost; they do not generally preserve every shortest path.

## Inspect and save an exact trace

Choose **Build forest trace**. The initial frame has no accepted edges; isolated vertices appear as their own components. **Next** applies one decision, and **Previous**, **First** and **Finish** revisit stored frames. The highlighted candidate is the next edge to be decided; the last-decision text describes the decision already applied.

Editing either graph input retires the displayed trace until you build again. Preset selection alone changes nothing; **Use example** replaces the inputs and retires an earlier trace. The page labels selected edges, rejected cycles and undecided edges with text as well as visual styling. The edge table supplies the same facts as the drawing.

**Download trace** saves the complete immutable trace, original entered text and selected frame. It is an algorithm inspection record, not a learner-answer archive. **Download course** and **Download guide** save this original lesson content; they do not change any learning session.

## Original question explanations

### 1. msf-objective

A weighted undirected graph represents available links. What does a minimum spanning tree minimize when the graph is connected?

**Correct answer:** The total weight of the chosen cycle-free links connecting every vertex.

A spanning tree includes every vertex, stays connected and has no cycle. Among those trees, a minimum spanning tree has the smallest sum of chosen edge weights. There are no directed arrows or chosen start vertex in this problem.

**Transfer:** Suppose a network has four vertices. Every spanning tree has three edges, so counting its edges alone cannot choose the minimum-weight tree. Compare the sums of their edge weights.

### 2. msf-not-shortest

A triangle has edges A–B weight 2, B–C weight 2 and A–C weight 3. A minimum spanning tree chooses A–B and B–C. Which statement about a trip from A to C is correct?

**Correct answer:** Its tree route weighs 4, although the original graph has a direct route weighing 3.

The tree's A→B→C route uses two weight-2 edges, for a total of 4. The original graph also has a direct A–C edge of weight 3. The tree minimizes the total cost of connecting all vertices: 2 + 2 = 4, rather than either alternative tree's 5. That objective does not minimize every individual route.

**Transfer:** If the task changes to finding the cheapest route from a chosen start vertex, the objective has changed. A shortest-path method addresses that task; selecting a minimum spanning tree first does not generally preserve its answer.

### 3. msf-undirected

This explorer accepts a simple undirected graph. You enter 'A B 2', then 'B A 5'. Why must it refuse that pair of lines?

**Correct answer:** Both lines name the same unordered vertex pair; this explorer excludes parallel edges.

In an undirected graph, A–B and B–A connect the same pair. The explorer deliberately permits at most one edge per unordered pair, so these two lines are a duplicate even though their weights differ. A single line may use either endpoint order. This is an input convention for this bounded explorer, not a claim that all graph algorithms exclude parallel edges.

**Transfer:** Entering only 'B A 2' is valid and preserves that orientation in the trace record. The decision still tests whether A and B are already connected; reversing a single edge does not make it directed.

### 4. msf-weight-order

Input lines are A–B weight 4, A–C weight 1, B–C weight 2, B–D weight 5, C–D weight 3. Kruskal's rule inspects edges from smallest weight to largest. Which sequence is inspected?

**Correct answer:** A–C, B–C, C–D, A–B, B–D.

The weights in inspection order are 1, 2, 3, 4 and 5. Inspection order is a global order over the edges; it is not a walk starting at A. For this graph, the first three edges connect all four vertices without a cycle. The final two edges are inspected and rejected in this explorer's complete trace.

**Transfer:** Change A–B from weight 4 to weight 0 while keeping every other line fixed. A–B becomes the first edge inspected. Rebuild the trace after changing an input; a trace for the old weights is no longer evidence for the new graph.

### 5. msf-cut-choice

The accepted edges currently connect A and B in one component. No accepted edge leaves that component. Available crossing edges have weights 2, 5 and 7. Why can a lightest crossing edge of weight 2 be a safe next connection in Kruskal's process?

**Correct answer:** It joins two components, and the cut property allows a lightest edge across this component boundary in some minimum spanning forest extending the accepted forest.

The boundary separates {A, B} from the other vertices, and no already accepted edge crosses it. A lightest edge across that boundary is compatible with a minimum spanning forest extending the accepted choices. If it is already in a compatible minimum forest, no exchange is needed. Otherwise add it: inside its original connected component, this creates a cycle. Remove another crossing edge of at least the chosen weight to retain a minimum forest containing the chosen edge. Kruskal combines weight order with the rule that a newly accepted edge must join different components.

**Transfer:** If two crossing edges both have the smallest weight, either may be a safe choice. That does not mean both must be included: adding later edges still needs a cycle check. A tie can produce different minimum spanning forests with the same total weight.

### 6. msf-negative

Edges are A–B weight −4, B–C weight −2, A–C weight 1, C–D weight 3 and A–D weight 9. Which minimum spanning tree total follows the weight order and cycle rule?

**Correct answer:** −3, from A–B, B–C and C–D.

Accept A–B (−4), then B–C (−2). A–C would close a cycle, so reject it. Accept C–D (3) to connect D, then reject A–D. The total is −4 − 2 + 3 = −3. Negative and zero weights are valid for this spanning-tree objective; the tree still has to connect every vertex and remain cycle-free.

**Transfer:** Change C–D's weight from 3 to 0. The same three edges are accepted and the total becomes −6. The negative values do not authorize omitting D or adding a cycle.

### 7. msf-cycle

The accepted edges are A–B and B–C. The next inspected edge is A–C. What should the explorer do?

**Correct answer:** Reject it, because A and C already have a path through B.

The accepted path A→B→C already joins A to C. Adding A–C would close the cycle A–B–C–A. A cycle check compares connected components, not just whether an identical edge was previously selected. A rejected edge leaves the accepted set, component count and cumulative weight unchanged.

**Transfer:** If the next edge were C–D and D were isolated, it would join different components and be accepted. That acceptance decreases the number of components by exactly one.

### 8. msf-tie-order

A triangle's three input lines are A–C weight 1, A–B weight 1, B–C weight 1, in that order. This explorer breaks equal-weight ties by original input line order. Which edges are accepted?

**Correct answer:** A–C and A–B; B–C is then rejected.

All weights tie, so inspect A–C first and A–B second. Both connect different components. All three vertices are then connected, so B–C would close a cycle and is rejected. The total is 2. Input order makes this trace reproducible; it is not a proof that this is the only minimum tree.

**Transfer:** Put B–C first, then A–B, then A–C. The accepted edges change to B–C and A–B while the total remains 2. A deterministic tie policy chooses one valid answer from potentially several.

### 9. msf-component-snapshot

There are five vertices A, B, C, D and E. The accepted edges are A–C and B–D. Which connected-component snapshot is correct, including isolated vertices?

**Correct answer:** {A, C}, {B, D}, {E}.

A–C joins A with C, and B–D joins B with D. There is no selected path connecting those two pairs. E is an isolated component and must remain visible. Components describe reachability using the edges accepted so far, not geometric proximity in the drawing.

**Transfer:** Accepting C–E merges {A, C} with {E}, leaving {A, C, E} and {B, D}. A line crossing another line in the drawing does not create a graph vertex or connection unless an endpoint says so.

### 10. msf-disconnected

For vertices A through E, the available edges are A–B weight 1, B–C weight 2, A–C weight 4 and D–E weight −2. There is no edge between {A, B, C} and {D, E}. What is the final result?

**Correct answer:** A minimum spanning forest with two components, three accepted edges and total 1.

Accept D–E (−2), A–B (1) and B–C (2); reject A–C because it closes a cycle. The total is −2 + 1 + 2 = 1. Each original connected component has its own minimum spanning tree. No available edge can join the two components, so the result is a forest, not a spanning tree over all five vertices.

**Transfer:** Add an isolated F with no new edges. The accepted edges and total stay the same, but there are now three components. For a spanning forest with n vertices and k components, the accepted edge count is n − k: 6 − 3 = 3 here.

### 11. msf-singleton

The input has one vertex A and no edges. Which result follows this explorer's conventions?

**Correct answer:** A connected one-vertex tree with zero edges, total 0 and zero edge decisions.

A is already the only connected component. A one-vertex graph is connected, and its empty edge set is a tree with total weight 0. There are no edges to inspect, so there are zero decisions. A self-loop is neither necessary nor accepted by this simple-graph input.

**Transfer:** Choose three vertices with no edges. The result has three isolated components and remains a minimum spanning forest with zero edges and total 0. It is not a connected tree.

### 12. msf-count

A connected graph has four vertices and five input edges. This explorer records a decision for every edge, even after a tree has formed. How many accepted edges and total edge decisions does its completed trace contain?

**Correct answer:** Three accepted edges and five decisions.

A tree over four vertices has 4 − 1 = 3 accepted edges. The remaining two input edges are rejected because their endpoints are already connected when they are inspected. This explorer deliberately records all five decisions. That count is not the number of sorting comparisons, component lookups, input-validation operations or rendering operations.

**Transfer:** Some implementations stop once n − 1 edges have been accepted in a connected graph. This explorer continues to show why every remaining edge is excluded. Compare algorithms only after stating exactly what is being counted.

## Sources and permission

Original questions, worked examples, guide and diagrams for RecallWeave, 2026. Algorithm background: Robert Sedgewick and Kevin Wayne, Algorithms 4/e, KruskalMST documentation (https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/KruskalMST.html); MIT OpenCourseWare 6.046J, Lecture 12, Greedy Algorithms: Minimum Spanning Tree, Spring 2015 (https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/resources/lecture-12-greedy-algorithms-minimum-spanning-tree/). No source exercises, prose, code or figures are reproduced.

CC0-1.0 for this original course content. Referenced materials retain their own terms and are not included in this deck.

The course's specific graphs, numerical solutions, questions, explanations, diagrams and interface are original. The references provide algorithm background; this file does not reproduce their exercises or implementation code.
