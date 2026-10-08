# Make room for one more pair: bipartite matching

This original twelve-question course accompanies [the offline matching lab](bipartite-matching-explorer.html). Download the lesson JSON in the lab, open [the RecallWeave learner](../demo.html), choose the file, inspect its preview and explicitly start the deck.

The lab maximizes the **number of pairs** in an unweighted bipartite graph. Left and right vertices are separate groups; every edge connects one vertex from each group. A matching selects edges with no shared endpoint. A free vertex belongs to no selected pair.

## Start with a greedy trap

Enter left labels `A B`, right labels `X Y`, and these edges:

```text
A X
A Y
B X
```

Start with the pair `A X`. In this graph, A and X are already occupied. B and Y are free. Neither unused edge can be added by itself: A–Y repeats A, while B–X repeats X.

That makes {A–X} **maximal**: adding one extra edge without changing the current matching cannot help. It is not **maximum**: {A–Y, B–X} contains two valid pairs.

The improvement follows the alternating path:

**B → X → A → Y**

| Step | Edge before the flip | Action |
| --- | --- | --- |
| B → X | Unmatched B–X (`e3`) | Add |
| X → A | Matched A–X (`e1`) | Remove |
| A → Y | Unmatched A–Y (`e2`) | Add |

At **Path found**, the matching is still {A–X}. The next event applies the whole flip at once. The result is {A–Y, B–X}; every vertex is used once.

The arrows describe a search orientation on the original undirected edges. Unmatched edges point left to right; matched edges point right to left. After a flip, those directions are recomputed from the new matching.

## What the search and its stopping rule mean

Each search begins at every free left vertex in declaration order. It explores a breadth-first queue and examines eligible outgoing arcs in entered edge order. A vertex keeps its first search parent. On reaching a free right vertex, the parent chain gives a shortest augmenting path for the current matching, measured in edges.

The path alternates unmatched, matched, unmatched, and so on. Its endpoints are free. There is one more edge to add than to remove, so flipping the whole path increases the matching size by exactly one.

After a flip the matching remains, but the queue, reached sets and parent links are reset. The new orientation can make previously explored vertices useful in different ways.

A search must account for **all** free left roots before failure proves anything about the whole graph. If that complete search reaches no free right endpoint, there is no augmenting path. The matching then has maximum cardinality. This does not imply that it is unique or perfect. If every left vertex is already matched, the number of left vertices itself gives an attained upper bound.

The arc counter counts eligible outgoing arcs examined by these searches, including repeated examinations in later searches. It is a recorded quantity for this trace, not the total number of operations used by the implementation.

## A longer rearrangement

Load **A longer rearrangement · 3 × 3**. Its edges, in order, are A–X, A–Y, B–X, C–Y and C–Z. The starting matching is {A–X, C–Y}.

Only B is free on the left and Z is free on the right. The path is:

**B → X → A → Y → C → Z**

Remove `e1` (A–X) and `e4` (C–Y). Add `e3` (B–X), `e2` (A–Y) and `e5` (C–Z). Three additions minus two removals yield one extra pair. The new matching has size three and covers all six vertices.

This example shows why a matching cannot be improved by treating each added edge independently. The replacements make the new endpoint assignments valid.

## Worked answers and transfer checks

### 1. Valid pair sets

**Answer: {A–X, C–Y}.** Its endpoints are all distinct. With left {A, B, C} and right {X, Y}, B is the only free vertex. Another valid size-two matching in the complete graph is {B–X, C–Y}. Having more available graph edges does not permit using a vertex twice in the selected matching.

### 2. Maximal and maximum

**Answer: maximal, but not maximum.** In the greedy trap, the free endpoints are B and Y. Adding B–X alone would use X twice because A–X is still selected. Remove A–X as part of the alternating-path flip, and both B–X and A–Y can be selected.

### 3. Maximum and perfect

**Answer: maximum, but not perfect.** Two right vertices permit at most two pairs, and the displayed matching already has two. C is still free. Adding Z with edge C–Z makes {A–X, B–Y, C–Z} perfect. Adding Z alone supplies no edge with which to match C.

### 4. Free endpoints

**Answer: both endpoint vertices are free.** An alternating path from a free vertex to a matched vertex does not generally yield a one-pair increase. If it begins with an unmatched edge and ends with a matched edge, it adds and removes equally many edges. If it ends with an unmatched edge at a matched vertex, flipping only that path can conflict with the endpoint's existing matched edge outside the path. The free-endpoint condition avoids both problems.

### 5. The exact flip

**Answer: {B–X, A–Y}.** In the default lab, stop at Path found. The current matching still lists A–X · `e1`. Move one event: `e1` is removed, while `e3` and `e2` are added together. The matching list follows input edge order, so it displays `e2`, then `e3`, even though the path discovers them in the opposite order.

### 6. The net change

**Answer: one extra pair.** The longer example uses six vertices and five transitions: B–X–A–Y–C–Z. Add `e3`, `e2`, `e5`; remove `e1`, `e4`. The matching grows from two to three pairs. The trace preserves the old valid matching throughout the search and switches directly to the new valid matching.

### 7. Search direction

**Answer: unmatched left to right; matched right to left.** Starting with {A–X}, the arrows are X → A, A → Y and B → X. Removing A–X makes that edge point A → X. Selecting A–Y and B–X makes their new directions Y → A and X → B.

### 8. Every free root matters

**Answer: C's possible alternating paths must also be included.** For left {A, B}, right {X}, and only B–X, a search from A alone sees no outgoing arc. Stopping there would miss the valid one-pair matching {B–X}. A multi-source search begins with A and B, and reaches X when it explores B.

### 9. Fresh search state

**Answer: the matching changed, so allowed directions changed.** After the greedy trap's flip, the arcs are A → X, Y → A and X → B. Both left vertices are matched, so the next search has no free left root and the size-two matching is immediately maximum. Reached sets from the old search do not carry over.

### 10. Maximum size without perfect coverage

**Answer: no augmenting path implies maximum cardinality.** For left {A, B}, right {X}, and edges A–X and B–X, a maximum matching has one pair. The two left vertices compete for the only right endpoint. Either pair may be chosen; the maximum matching is not unique and leaves a vertex free.

### 11. Reproducible choices

**Answer: A–Y is first.** With roots A, B and edge lines A–Y, A–X, B–X, B–Y, A–Y is the first eligible arc from the first explored root. Swapping the first two lines makes A–X first. Both runs can still reach maximum size two, using different final pair sets.

### 12. Missing neighbors

**Answer: two pairs.** In the stated graph, A and B both need X, C can use Y, and Z is isolated. Add B–Z to permit {A–X, B–Z, C–Y}, a perfect matching of size three. Adding A–Y instead does not reach Z; maximum size stays two.

## Use and bounds

- Enter 1–6 labels on each side. Labels are globally distinct and case-sensitive, starting with an ASCII letter and followed by at most 11 ASCII letters, digits or underscores.
- Separate labels with spaces or commas. Enter edges and optional starting pairs as one `leftLabel rightLabel` pair per line. Blank lines are ignored.
- Use at most 36 unique edges. Starting pairs must be existing edges and cannot share endpoints.
- Editing any graph input retires the old trace and disables its export. Build a fresh trace to use the new input.
- First, Back, Next, End and the event slider revisit exact recorded states. Prediction checking does not change the selected event.
- Lesson and guide downloads retain the original source bytes. Save trace includes the accepted graph, every event, final matching, recorded counters and exact selected event.
- The lab runs directly from its HTML file with no server. Its learner link uses the ordinary sibling project layout; the learner opens downloaded lesson files through its existing picker.

## Background and authorship

The graphs, questions, distractors, explanations and implementation are original work for RecallWeave with AI assistance. No reference exercise, figure or passage is copied.

Mathematical background:

1. [Michel X. Goemans, MIT 18.433: Lecture notes on bipartite matching (2015), §§1.1–1.1.1](https://math.mit.edu/~goemans/18433S15/matching-notes.pdf).
2. [Norbert Zeh, Algorithms II: Augmenting Paths](https://web.cs.dal.ca/~nzeh/Teaching/4113/book/matching/bipartite_maximum_matching/augmenting_paths.html).

Original course content was authored for Jacob's RecallWeave project; no additional reuse license is granted here. Linked reference material retains its published terms.
