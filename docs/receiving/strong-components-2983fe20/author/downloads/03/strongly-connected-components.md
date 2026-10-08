# Return paths: strongly connected components

This original RecallWeave lesson connects directed reachability, DFS finishing
order, a reversed graph and the smaller graph of mutually reachable groups. The
companion explorer opens directly from a file. Its twelve-question JSON course
uses the learner’s existing **Bring your own lesson** preview and explicit
**Start this deck** flow.

## 1. An arrow does not promise a return trip

Suppose the edges are A → B, B → A and B → C. A and B can each reach the other.
C can be reached from both, but it has no way back. The strongly connected
components are therefore **{A, B}** and **{C}**.

A strongly connected component is a maximal group of vertices in which every
vertex can reach every other by following directed edges. Maximal means that
adding any outside vertex would destroy that property. A path with zero edges
lets a vertex reach itself, so an isolated vertex forms a singleton component.
These groups partition all vertices. Edges can still run between groups.

The distinction is useful whenever direction matters: an action may lead to
another state without a route back, and one dependency may reach another
without belonging to the same dependency cycle. A strongly connected component
records mutual reachability; it does not, by itself, assign a real-world meaning
or declare a dependency acceptable.

### Worked example: cycles with a one-way exit

The default explorer uses nodes A, B, C, D, E, F and these edges, in this order:

| Edge | Role in this example |
| --- | --- |
| A → B | First cycle |
| B → C | First cycle |
| C → A | First cycle’s return |
| C → D | One-way bridge |
| D → E | Second cycle |
| E → D | Second cycle’s return |
| E → F | One-way exit |

The groups are {A, B, C}, {D, E} and {F}. Adding F → A joins all six: the existing
route reaches F, and the new edge supplies a route back through the first cycle.
Adding another forward edge alone would not provide that return route.

## 2. Record when a DFS call finishes

The explorer uses the two-pass method commonly called Kosaraju’s algorithm.
Its first pass follows the original graph and appends each node to a list when
that node’s recursive DFS call returns. A call returns after its outgoing edges
have been inspected and any new searches started from them have returned.

For A → B → C, discovery is A, B, C; finishing is C, B, A. These are different
records of the same traversal. In the default six-node example, the chosen edge
order makes the finishing list F, E, D, C, B, A. The root order for the next pass
is its reverse: A, B, C, D, E, F.

All declared nodes are considered as potential first-pass roots. An unseen node
starts a new search; a previously discovered node is skipped. This reaches
isolated regions as well as the region reachable from the first declared node.

Do not call the resulting node list a topological ordering of an arbitrary
cyclic graph. Such a graph has no topological ordering. The finishing information
is used to order **fresh component searches** after the edges are reversed.

## 3. Reverse the arrows and search in reverse finish order

The transpose contains exactly one reversed edge for each original edge. It
preserves the strongly connected groups: reversing both paths between two nodes
still leaves a path in each direction. It can reverse a one-way connection
between different groups.

Pass 2 keeps the first pass’s finish list but uses new visited marks. In reverse
finish order, every still-unassigned root starts a DFS in the transpose. That
search assigns one complete component. Nodes already assigned by an earlier
second-pass search are not revisited.

In the default graph, starting at A in the transpose reaches C and then B.
It cannot escape into D: the bridge C → D became D → C. Thus the first group is
{A, C, B}, the same membership as {A, B, C}. The later root D reaches E, and F
becomes the final singleton. Member order in the display records actual search
order; it is not part of the mathematical component identity.

### Why the root order matters

Choose the explorer’s second example: declared nodes A, B, C; edges B → A and
A → C. The first DFS starts at A and finishes C, then A. B is a later root and
finishes last. Reverse finishing therefore gives **B, A, C**.

The transpose has A → B and C → A. Starting at B assigns only B. Starting at A
then stops at the already assigned B. C similarly stops at A. Each is a singleton.
If the second pass simply started at A because A was declared first, its search
would reach B and incorrectly join two vertices that have no return path in the
original graph. Reversing arrows without retaining the correct root order is
insufficient.

## 4. Collapse the groups to see the remaining direction

The condensation graph replaces each component by one node. Every original
edge between different groups contributes a directed edge between their
component nodes. The explorer combines repeated component edges and lists all
original edges that support each one. Edges internal to a group are omitted.

For the default graph, this gives C1 → C2 → C3. The original graph’s two cycles
are inside C1 and C2. If several distinct components formed a directed cycle,
following that cycle and their internal paths would make them mutually
reachable. They would be one component, contradicting their claimed separation.
The condensation is therefore a directed acyclic graph.

This implementation’s component numbers follow second-pass discovery order.
For its original-first, transpose-second convention, that is a topological order
of the condensation. Different valid declarations may change traversal order
and component numbers while preserving membership. Treat C1, C2 and so on as
labels for one trace, not permanent identifiers.

## Use the offline explorer

1. Choose an example or enter 1–12 distinct node names, separated by whitespace.
   Names are case-sensitive, start with a letter, and contain at most 12 letters,
   digits or underscores.
2. Enter one directed edge per line as two declared names, such as `A B`.
   Blank lines are ignored. There may be 0–36 edges. Self-loops are supported;
   repeated identical directed edges are refused. Reverse edges are distinct.
3. Select **Build trace**. Edits to either graph field immediately retire the
   earlier trace and its trace download until a new valid graph is built.
4. Use **Next**, **Previous**, **First**, **Finish** or the event selector to
   inspect immutable snapshots. The diagram reverses every arrow during pass 2.
   The table, DFS path and lists provide the same state without relying on color.
5. Predict the number of groups if you wish. Checking a prediction reveals the
   computed count without advancing the trace or recording a learner score.

The first pass tries roots in declared node order. Each pass inspects neighbors
in the original edge-line order, even when those lines are traversed in reverse
direction in the transpose. The displayed DFS path is the active call chain;
finished calls leave it. A component may contain vertices whose calls have
already returned.

**Download trace** retains the complete event sequence, entered text, graph,
computed partition, condensation edge witnesses and selected event index. It is
an algorithm inspection record, separate from RecallWeave learner-answer files.
The course JSON and this guide download as their exact authored bytes. None of
these actions writes browser storage, contacts a server or changes a learner
session. Keep the downloaded files if you want to revisit them after a reload.

The graph limits keep each diagram and trace inspectable. They are not limits
of the underlying algorithm. Adjacency-list traversal and constructing the
transpose use O(V + E) work. Each complete pass inspects E edges, including
self-loops, for 2E displayed edge inspections. The teaching implementation also
copies state into snapshots and renders it; those costs are outside that
algorithmic traversal count.

## Course answer notes

| Question | Correct result | Reason to check |
| --- | --- | --- |
| `scc-return` | {A, B}, {C} | C has no return path. |
| `scc-join` | Add D → A | The new edge closes the route between both cycles. |
| `scc-singleton` | {Z} | The zero-edge path supplies self-reachability. |
| `scc-finish` | C, B, A | Descendant calls return before their callers. |
| `scc-root-order` | B, A, C | Reverse the complete finish list C, A, B. |
| `scc-finish-meaning` | Finish after edges and descendants | First discovery does not close a DFS call. |
| `scc-transpose` | Groups stay the same | Both directions reverse together. |
| `scc-second-pass` | {B}, {A}, {C} | Previously assigned destinations are skipped. |
| `scc-reset` | Fresh searches still need to run | First-pass discovery is not a component assignment. |
| `scc-collapse` | C1 → C2, C2 → C3 | Two original witnesses can support one component edge. |
| `scc-no-cycle` | A cycle would join the groups | Distinct maximal groups cannot be mutually reachable. |
| `scc-edge-work` | 18 edge inspections | There are nine entries in each of two passes. |

For the extra branch A → D in the finish-order transfer, with A → B inspected
first, discovery is A, B, C, D and finishing is C, B, D, A. Adding C → B to the
root-order example closes B → A → C → B and makes one three-node component.
A seven-node graph with no edges has zero edge inspections but still starts and
finishes searches and assigns every node. The other transfer prompts invite an
explanation or an authored example rather than a separately graded answer.

## Sources and authorship

- [Cornell CS 2112, Graph traversals (2022)](https://www.cs.cornell.edu/courses/cs2112/2022fa/lectures/traversals/)
  supplies background on DFS and the two-pass strong-component algorithm.
- [MIT 6.1200J, Lecture 14: Digraphs and DAGs (Spring 2024)](https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec14.pdf)
  supplies background on strong connectivity, vertex partitions and condensation.

The lesson’s wording, small graphs, distractors, trace interface and worked
answers are original contributions for RecallWeave. No source exercise,
illustration or passage is copied. AI assistance was used in drafting and
implementation; the project’s [AI disclosure](../AI-DISCLOSURE.md) applies.
