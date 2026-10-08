# Shortest paths: from a promising route to a proven distance

Open **[shortest-paths-explorer.html](shortest-paths-explorer.html)** directly in a browser. It is a complete offline page with its graph model, interface and course embedded. It follows RecallWeave’s existing direct-open `demo.html` / `author.html` convention: no server, package install, account, API key or build step is needed to use the checked-in page.

The companion **[shortest-paths.json](shortest-paths.json)** is an original twelve-question course in the current `recallweave-deck/1` format. Use the explorer to investigate the examples; use the question explanations and transfer prompts to explain each decision in your own words. The activity provides feedback on the examples. It is not a validated assessment or evidence of learning gains.

## What the activity teaches

A weighted path follows the arrows and adds the weights of the edges it actually uses. The goal is the lowest total cost. A route using more edges can be cheaper. A missing path has no finite distance. These definitions follow the [MIT 6.006 Lecture 11 background on weighted shortest paths](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/aa57a9785adf925bc85c1920f53755a0_MIT6_006S20_lec11.pdf).

Dijkstra’s rule selects the minimum discovered distance among unsettled vertices, then tries routes through that vertex. With nonnegative weights, the selected distance is final. Merely discovering a target does not establish that guarantee. Zero weights and equal distances are permitted. See the [MIT 6.006 Lecture 13 background on Dijkstra’s algorithm](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/d819e7f4568aced8d5b59e03db6c7b67_MIT6_006S20_lec13.pdf). All graphs, question wording and worked calculations below are newly authored for this course.

The four concepts form a simple progression:

| Concept | Questions | What to explain |
| --- | --- | --- |
| Weighted paths | `sp-cost`, `sp-direction`, `sp-zero` | Total cost, arrow direction and zero-cost edges |
| Tentative distances | `sp-relax`, `sp-initialize`, `sp-no-improvement` | Initialization and replacing an estimate only with a cheaper complete route |
| Settling vertices | `sp-minimum`, `sp-target`, `sp-tie` | Minimum-frontier choice, safe target stopping and equal-route policy |
| Algorithm limits | `sp-negative`, `sp-unreachable`, `sp-proof` | Why the guarantee needs nonnegative weights and what an exhausted frontier means |

You need only addition, comparison and the idea of a directed arrow to begin. The final proof question extends those concrete examples into a short argument.

## Work through the four examples

### 1. A route improves later

Keep source **S**, target **T** and the original weights. Before each step, use **Predict the next settled vertex** if you want feedback. Checking a prediction does not change the run or record a score.

Select **Settle next vertex** five times. The useful changes are:

| Newly settled vertex | Its final distance | Distances discovered or improved by this step |
| --- | ---: | --- |
| S | 0 | A becomes 4; B becomes 1 |
| B | 1 | A improves from 4 to 3; C becomes 6 |
| A | 3 | C improves from 6 to 4; T becomes 10 |
| C | 4 | T improves from 10 to 7 |
| T | 7 | No outgoing edges remain to examine from T |

The final target route is **S → B → A → C → T**, costing **1 + 2 + 1 + 3 = 7**. Notice that T’s displayed value of 10 was a real route cost. It was still tentative.

The graph and table show the same state. Numbered boxes on arrows are edge weights; numbers beside vertices are current total distances from the source. **Via** names the recorded predecessor. The green route line traces the current target route, whose heading explicitly says whether its distance is tentative or final.

### 2. Finding the target is not finishing

Choose **Finding the target is not finishing**. After settling S, the direct edge has discovered T at **9**. Stop here and explain why that number is not final.

The frontier also contains A at 2. Settling A finds B at 3; settling B lowers T to **5**. Even this improved value remains labeled tentative until T is selected and settled. A search interested only in T could stop at that settlement. The explorer’s **Finish run** completes all reachable distances instead.

### 3. Two routes can be equally short

Choose **Two routes can be equally short**. A and B both start with tentative distance 2 after S is settled. This implementation chooses A before B because their distances tie and A comes first alphabetically.

A sets T to 5. B then offers another route costing 5. The trace keeps A as T’s predecessor because equal-cost routes do not replace an existing predecessor here. Both **S → A → T** and **S → B → T** are shortest routes. A different valid tie policy could display the other route while agreeing on the distance.

### 4. Zero is allowed; unreachable is different

Choose **Zero is allowed; unreachable is different** and finish the run. S → A costs zero, so A’s final distance is **0**. B has distance **2** and T has distance **3**. X remains **unreachable** because no directed path from S reaches it.

An infinity symbol before the run finishes means no route has been found yet. Once the finite discovered frontier is empty, a vertex still without a finite distance is unreachable from this source.

Try changing the target to T. That edit starts a fresh run. Finish again to see T’s cost-3 route. Try a different source as well: arrows are not silently reversed.

## Edit, reset and keep a run

The page provides four fixed graph layouts. You can select any vertex in the chosen layout as source or target and change each displayed edge weight. It does not offer arbitrary graph-file import or topology editing.

Weights must be whole numbers from **0 to 50**. This bound is per edge; a multi-edge route can cost more than 50. A negative, fractional, blank or out-of-range weight clears the computed route, distances and decisions. The run controls and run download stay disabled until every displayed weight is valid.

Every valid source, target or weight edit starts a fresh run with no automatic settlement. The description changes to **Edited setup** when it no longer matches the original example. Predictions and stale download status clear with the run.

**Reset run** retains the weights and selections currently displayed. Selecting an example layout restores that example’s original source, target and weights. Refreshing the page also starts over; there is no automatic browser storage.

Two different downloads serve different purposes:

| Download | Content | What it can be used for |
| --- | --- | --- |
| **Download course (.json)** | The fixed twelve-question course, including answers, explanations, transfer prompts and attribution | Open and edit in RecallWeave’s current Deck Studio |
| **Download this run (.json)** | Current graph, source/target, all completed settlement and relaxation records, predecessors, distances and current target route/status | Read, compare or share a concrete run as JSON |

The course does not change when you edit graph weights. The trace describes the edited graph at the moment you request the download. A partially completed trace keeps a tentative target tentative. Its format is `recallweave-shortest-paths-trace/1`; absent distances use JSON `null`, corresponding to the interface’s infinity marker. It is a record, **not** a RecallWeave learner-session restore file. No trace-import feature is provided.

## Current RecallWeave intake boundary

The checked course works in both **[Deck Studio](../author.html)** and the direct-open **[RecallWeave learner](../demo.html)** at the separately received parent `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74`. The original importer and author-draft owners supplied these consumer implementations; this course does not modify them.

To edit the course, choose **Open draft or deck** in Deck Studio and select the downloaded course JSON. Inspect the preview, choose **Replace draft**, then **Check and preview** and **Download checked deck (.json)**. **Save draft (.json)** preserves unfinished editing work in a separate format; an editable draft must be repaired and checked before it can become a learner lesson.

To study the course, open `demo.html`, choose the checked JSON under **Bring your own lesson**, inspect the twelve questions, then choose **Start this deck**. Previewing or cancelling leaves the current learning session intact; starting the selected course replaces that session and its practice answers. Complete the questions to use **Review the connections**, retry missed questions, and **Download study notes (.txt)**. The question explanations and transfer prompts remain part of the course throughout this workflow.

The learner initially opens its bundled lesson, so selecting and starting the shortest-paths course is required. The selected lesson and answers stay in the current tab; reloading returns to the bundled lesson and clears that tab's active answers. Downloaded study notes preserve a readable account, but do not restore a session.

After completing the first session, open **Keep or restore a learning trace** and choose **Download trace (.json)** to retain the learner's first answers and practice progress. To return later, reopen `demo.html`, import and start the **same checked course**, then choose the saved learning trace, inspect its preview and select **Restore these answers**. Restoration replaces the current first answers and practice progress. A trace must match the exact loaded course; previewing or cancelling leaves the current answers intact.

The explorer's graph-run JSON is a separate inspection record and cannot be used as a learner lesson or learning-trace restore file. A checked course, an editable Studio draft, a graph-run record, readable study notes and a saved learner trace serve different purposes; none creates automatic browser storage.

The original acceptance at `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4` qualified only the then-present Deck Studio. A separate current-consumer receipt records the later checked-course download, explicit lesson import, answers, review, practice and notes at the new parent. These evidence versions are retained separately; the earlier browser result is not relabeled as a test of the newer app. See the [receiving record](../docs/receiving/shortest-paths-a2eaaec253d8/README.md) for exact source and proof dependencies.

## Answer and transfer notes

These notes name the answer content rather than displayed A–D positions. RecallWeave can shuffle displayed choices while preserving canonical answer identity.

| Item | Answer and reason | Transfer response |
| --- | --- | --- |
| `sp-cost` | S → A → T costs 4 + 3 = **7**, less than the direct 9. Reaching the same destination or using fewer edges does not decide weighted cost. | If the direct edge becomes 6, S → T is cheaper at **6**. |
| `sp-direction` | There is **no directed route from T to S**. The graph has no outgoing edge from T. | Add one T → S edge. Neither original arrow implies a reverse arrow. |
| `sp-zero` | S → A → T costs 0 + 3 = **3**, less than 4. Stopping at A has not reached T. | A zero-cost edge to A still leaves the edge to T costing 3. Zero somewhere does not make every route free. |
| `sp-relax` | The route through B costs 1 + 2 = **3**, improving A’s old 4. Record B as predecessor. | If B → A costs 5, the candidate is **6**; keep A at 4 and preserve its predecessor. |
| `sp-initialize` | S starts at **0**. Other vertices begin unreached before any relaxation. | The empty route from S to itself costs 0 even when S has no outgoing edges. |
| `sp-no-improvement` | 3 + 7 = **10** is worse than C’s current 8, so keep both distance and predecessor. | Strict improvement requires 3 + w < 8. The largest permitted whole-number w is **4**. |
| `sp-minimum` | Settle **B at 2**, the minimum current source distance among the unsettled discovered vertices. | If A also has distance 2, choosing either tied vertex first is valid; a tie policy only makes the trace reproducible. |
| `sp-target` | Stop a target-only nonnegative Dijkstra search when **T is selected as the minimum and settled**. | After S alone: T is **9, tentative**. Its eventual final distance is **5**. |
| `sp-tie` | T remains **5 via A** under the stated first-predecessor policy. The route offered by B has equal cost. | Another implementation may keep B. Both must agree on **distance 5**, while the predecessor can differ. |
| `sp-negative` | The variant can stop at **2**, even though S → A → T costs 5 − 4 = **1**. The graph has no cycle and still has a valid shortest path. | Adding 4 to every edge changes the direct route from 2 to **6**, and the two-edge route from 1 to **9**. It changes their ordering, so it does not preserve this shortest path. |
| `sp-unreachable` | X has **no directed path from S**, rather than cost 0 or a copied finite distance. | Adding B → X with weight 0 gives X distance **2**. |
| `sp-proof` | A supposedly cheaper route would expose a frontier estimate below 4 at its first exit from the settled set, contradicting U’s minimum. The offered route can cost **no more than** that path prefix. | Nonnegative remaining edges are what keep a prefix no more expensive than the full route. In the negative example, the prefix to A costs 5 while the complete route to T costs 1. |

The negative example shows a failure of Dijkstra’s guarantee outside its stated condition. It does not say that every graph containing a negative edge gives an incorrect Dijkstra result, or that a negative edge automatically prevents a shortest path from existing. The explorer rejects negative weights rather than presenting an unsupported result.

The answer key is balanced across the four canonical positions, with three answers at each position. This is a content construction check, not a psychometric validation. Explanations, review and practice should help a learner reason about the graph; they do not establish an ability grade.

## Rebuild and verify

The production page contains no external script, font, image or data dependency. Its JavaScript model is in `shortest-paths-core.mjs`; the browser adapter is `shortest-paths-explorer-ui.mjs`. The interface template and exact canonical course are embedded by the additive Node builder.

From the repository root:

~~~bash
node tools/make_shortest_paths_explorer.mjs
node tools/make_shortest_paths_explorer.mjs --check
node --test tests/shortest-paths.test.mjs
~~~

The model deliberately uses a small visible graph and a frontier scan. It is not a heap implementation or performance benchmark. Graphs are directed, contain 1–7 unique named vertices and at most 49 unique directed edges, and use the bounded integer weights above. Run objects and histories are immutable. Downloaded JSON cannot be passed back as a live model state.

The optional browser receiver follows the repository’s existing Node/CDP convention, uses a fresh browser profile, exercises the actual direct-open page and writes receipts plus captures and real downloaded files to a new empty output directory. It requires Node 22+ and an already installed Chromium executable, with no npm package installation:

~~~bash
node tools/check_shortest_paths_browser.mjs \
  --browser /path/to/chromium \
  --output /tmp/recallweave-shortest-paths-check
~~~

See the [receiving record](../docs/receiving/shortest-paths-a2eaaec253d8/README.md) for exact source identity, checks, preserved negative evidence and the independent intake boundary.

## Provenance

The questions, distractors, graph layouts, calculations, explanations and interface were newly authored for Jacob’s RecallWeave project with AI assistance. No reference exercise, figure or passage was copied. Background references are Erik Demaine, Jason Ku and Justin Solomon’s MIT OpenCourseWare **6.006 Introduction to Algorithms, Spring 2020**, Lectures 11 and 13, linked above. The course JSON carries this attribution and an explicit permission statement; linked reference material retains its published terms.
