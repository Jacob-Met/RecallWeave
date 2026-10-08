# Connections and components: union-find

Open [the offline explorer](union-find-explorer.html), download [the original course](union-find.json), or use the worked examples below. The explorer is one HTML file: it needs no server, account or installation.

## Start with a question about connections

Suppose A connects to B and B connects to C. A and C are connected even without a direct A–C edge: a path joins them. The connected components of an undirected graph form separate groups. An element belongs to exactly one group; an isolated element is a one-element group.

A union-find structure keeps that grouping as connections arrive. A **find** returns a component representative. A **join** finds two representatives and merges the components when they differ. The structure answers whether two elements belong together; it does not retain every path or original graph edge.

The explorer deliberately shows two views. **Connections you added** draws the graph edges from accepted join commands. **Parent pointers** shows the implementation's forest after the selected command. A parent pointer is an internal link and need not be an original edge. A double ring marks a root; written groups and the exact table make membership readable without color.

## This explorer's complete rules

Choose 1–8 elements, named A through H, and write up to 32 commands. Use `join A B` or `find A`; blank lines are ignored. The available letters follow the selected count. Uppercase element names and the command spelling are deliberate, explicit input rules.

Every element starts with itself as parent and size one. A join runs find on its first argument, then on its second argument. When roots differ, the root of the smaller component attaches to the root of the larger component. Equal sizes use the earlier root letter. Reversing the arguments therefore does not reverse the size or tie rule. The surviving root stores the combined cardinality; a nonroot's stored size is zero and displays as a dash.

When full compression is enabled, a find first follows its complete current path to the root, then makes its visited nonroots point directly to that root. Unvisited branches stay as they were. Finds run during joins can compress too. A redundant join can therefore change parent pointers while leaving component membership and cardinalities unchanged.

The default example starts accepted at its initial state. The slider, Previous/Next and initial/final buttons inspect frozen states; inspecting does not run another find. Editing the element count, command text or compression option clears the old result and trace download. Apply the whole edited sequence to calculate again. Selecting **Use example** stages that example for an explicit Apply.

## Worked example: connect three islands

Start with A–F and apply:

```text
join A B
join C D
join E F
join A C
find D
join D F
find F
join B E
```

The component counts, including the initial state, are **6, 5, 4, 3, 2, 2, 1, 1, 1**.

After the first three joins, the groups are {A,B}, {C,D}, and {E,F}. The fourth join attaches C to A under the equal-size rule; D still points to C. The fifth command, find D, follows D → C → A. It does not connect a new group. With compression enabled, D now points directly to A.

Next, join D F finds the four-element component at A and the two-element component at E. E attaches to A. F still points to E until find F follows F → E → A and compresses that path. The last command joins members already in the same group.

For this exact sequence the model follows **8 parent links with compression** and **9 without compression**. These totals count links followed by find calls, including both calls inside each join. Root inspection itself contributes zero links; table rendering contributes no calls. The counts are not timings, and this small example is not a performance benchmark.

## A longer path and an untouched branch

Choose **A path becomes shorter**. Its balanced joins produce H → G → E → A, while D → C → A and F → E → A are other branches.

The first find H follows three links. Full compression changes H's parent from G to A and G's parent from E to A; E already points to A. D remains a child of C and F remains a child of E. A second find H follows one link. With compression disabled, both find H calls follow three links.

Both modes still describe one eight-element component. Shape and grouping are different questions. The compression control makes this difference visible without changing the sequence of graph connections.

## Repeated connections and self-joins

Choose **Repeated connections**. A join between already connected elements does not count as another successful merge. Reversing a repeated pair does not add a new group, and a self-join does not connect an isolated element to anyone else.

The graph view draws a repeated undirected edge only once and draws a self-join as a loop. The accepted command list and downloaded trace retain every command. The interface says **No merge occurs** when roots already match; it does not declare every such command to be a new simple-graph cycle. For a previously absent edge between distinct vertices in a simple undirected graph, equal representatives do show that the new edge closes a cycle.

## Keep an observation and study the course

**Download this trace (.json)** records the applied sequence, the selected state, both compression modes, every parent/size snapshot, each visited path and each actual compression change. Its assumptions travel with the record. It is a worked observation, not a save file for an ongoing learner session.

**Download course (.json)** saves the exact original twelve-question deck. In RecallWeave, choose it under **Bring your own lesson**, inspect the preview, then explicitly select **Start this deck**. Complete the questions, inspect first-answer review, practice missed questions separately, and keep study notes with the existing learner. Nothing in the explorer changes an open learning session.

All downloads are explicit. The lab does not use browser storage, fetch data, upload files or make provider requests.

## Original answer derivations

| Item | Correct choice | Reason |
|---|---|---|
| uf-path | B | A–B–C is an undirected path, so a direct A–C edge is unnecessary. |
| uf-cycle | C | A previously absent A–C edge completes A–B–C–A inside one component. |
| uf-count | D | Three joins merge distinct groups: 6−3=3 components. |
| uf-successes | A | Reducing eight singleton groups to three requires five successful merges. |
| uf-pointers | B | Parent links encode a route to a representative; they are not an original-edge certificate. |
| uf-representative | D | Equal representatives identify membership in the same component. |
| uf-size | C | Root F's four-element group absorbs root B's two-element group. |
| uf-tie | B | Equal sizes invoke the declared lower-index rule: D attaches to B, size four. |
| uf-compress-path | A | H and G redirect to A; the unvisited D → C branch remains. |
| uf-redundant | C | Finds can compress their paths without another component merge. |
| uf-removal | D | An arbitrary graph-edge deletion requires information and operations beyond this merge-only structure. |
| uf-evidence | A | The recorded link count describes this sequence; it is not a timing result. |

The options are original distractors, and the course keeps canonical answers separate from the learner's displayed option order.

## Limits and references

This model treats connections as undirected, fixes the element set before tracing, and supports insertions and find operations. It does not support arbitrary edge deletion, directed reachability, path reconstruction, shortest paths, minimum spanning trees or a dynamic production graph service. A root is an implementation representative, not a socially or scientifically meaningful leader.

Weighted union and compression are established techniques. This course teaches their observable invariants; it does not derive an amortized complexity theorem, prove a universal per-operation bound, measure runtime, or establish learning efficacy.

Primary educational references reviewed on 2026-10-08:

- Robert Sedgewick and Kevin Wayne, [Princeton Algorithms, Section 1.5: Case Study—Union-Find](https://algs4.cs.princeton.edu/15uf/): representatives, weighted union by size, and full path compression.
- MIT OpenCourseWare, [6.046J Lecture 16: Disjoint-Set Data Structures](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/resources/mit6_046js12_lec16/), Spring 2012, [lecture PDF](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/dbbca5218779336114dcd3b3195e7783_MIT6_046JS12_lec16.pdf): set representatives, tree forests and the effect of full path compression. That lecture uses union by rank for its tree analysis; this lab explicitly uses component size.

All course wording, examples, questions and diagrams were authored for this contribution with AI assistance. No source exercises, figures, passages or implementation code were copied. Original course wording and examples are CC BY 4.0; reference materials retain their own terms.

## Rebuild and verify

From the repository root:

```bash
node tools/build-union-find.mjs
node tools/build-union-find.mjs --check
node --test tests/union-find.test.mjs
```

The existing deck validator is reused unchanged. The builder embeds only the declared model, UI, course and guide inputs into this standalone page. The default project test command discovers the focused test file. Native source, browser, downloaded-file and independent algorithm receiving are recorded separately under `docs/receiving/union-find-44df5c2e45ae/`.
