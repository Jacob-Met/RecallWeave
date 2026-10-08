# Dependency-planning companion — receiving evidence

This contribution gives a RecallWeave learner an editable prerequisite graph beside the existing dependency-graphs course. A learner can inspect prerequisites and reachability, complete a ready job, undo or reset progress, and distinguish jobs in a cycle from downstream blocked jobs. **X → Y means X must finish before Y.**

The companion is a standalone offline HTML page built from native JavaScript and a template, with no new dependencies or automatic storage. It admits 1–8 literal job names and at most 64 unique arrows. Completion orders are deterministic and bounded: the UI displays at most 12; the model admits integer limits 1–24 and reports truncation only after observing another order. Editing the draft invalidates old controls until explicit preview.

The page downloads the original course unchanged and opens the existing learner through `../demo.html`. Six new product paths and one additive guide pointer are recorded in [qualification.json](qualification.json).

## Provenance

[HAMON #140 claim 6061540775](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6061540775) authorized this bounded scope. Author: HAMON estate `60b2c08feb01`, workspace-discovery lane.

| Stage | Commit | Tree |
| --- | --- | --- |
| Original base | `98d43c30b3e0d8cc488339b6979867cb93f9586f` | `a5bbf78bc3faba7be3787e94c7b1a9271cd4dde2` |
| Initial source, before receiving correction | `21e609cdd938c1c1c822a0d279ad9f3b5d5de6bf` | `12062e9b9368f6d3c8f1ed496bf81ea89840de45` |
| Corrected original source | `b48f33b507418ef4eaa16407567e7dfa5567218c` | `2bd8932fbfdfb2be5449940820dc30c096052a70` |
| Current base | `3cdebd86e69506709bcaeaeff4026deb3d1fc208` | `4d8cfac84b84818af1a7e13cfa4d569fdbbef2d6` |
| Qualified current composition | `9e53e0435905f72b6fd33770859e1d2d6fd8a22e` | `9bc8580e3e00f4a55aa35992cbc45cc8533f46b6` |

The current composition has parents current base and corrected source. Its 877 leaves preserve all 870 unrelated current leaves, including new learner reflections and other courses. This receiving directory is an evidence-only addition. Original source commits and raw receipts remain unchanged; historical pending fields in source-freeze metadata are superseded only by the additive qualification summary.

## Qualification

- Corrected original source: **150 native tests pass**, companion build equality, exact old learner rebuild, 91 native input files unchanged.
- Author browser: **six groups pass** on real offline HTML and the recorded old learner. Ready-only order, undo/reset, cycle members versus descendants, custom graph, actual course download, all 12 questions and four missed-question retries. Practice preserved first-attempt summary/model displays.
- Independent oracle: authored before reading the model, using separate permutations and positive transitive closure. Corrected source passes **519 graphs, 871 valid histories, 7,360 invalid histories, 2,613 enumerations, 1,583 reachability queries and 31 admission cases**.
- Independent browser: four graph groups cover draft invalidation, literal names, cycle counterexamples and keyboard interaction at 375px. The raw process later fails on a harness selector, retained below.
- Current composition: **225 native tests pass**, companion build equality, byte-exact 81,178-byte learner rebuild, 118 native input files unchanged.
- Separate current learner import: native exit 0 with the actual previous 12,121-byte download and exact current learner. Native preview shows attribution/license; explicit keyboard Start reaches the original first question at 0/12. No answers or graph replay in this bounded run.

The browser receipts record Chromium 153.0.8010.0, actual product files, and zero observed off-origin attempts or product page/console errors. The old complete learner walkthrough remains pinned to its old learner; current import has its own receipt. No deployment, measured learning improvement, or broad assistive-technology certification is claimed.

## Retained negatives

1. The initial model accepted U+0085 NEXT LINE in a name, contrary to its control-character contract. The independent process exits 1. The correction extends two regex admission ranges through U+009F, adds native cases, and regenerates the HTML. Graph algorithms/UI logic remain unchanged. The identical receiver then passes.
2. The independent browser passed four graph groups and saved the exact course, then exited 1 waiting for `#start-button`. Picker Start had already rendered the first question; the selector belongs to the welcome page. Raw failure and screenshot are retained. A separate corrected current-import run exits 0. The failed process is not relabeled as clean.
3. Local Git custody initially rejected a signed commit reconstructed with a trimmed signature newline and a porcelain commit with missing inherited evidence objects. Exact signed payload and canonical partial-tree composition were subsequently admitted by hashes. No incorrect source/ref was accepted. These are infrastructure records.

## Evidence and replay

[Author evidence](author-evidence.tar.gz) and its [hash manifest](author-archive-manifest.json) preserve 43 verified members: raw logs/receipts, exact executed harnesses, frozen seven source files, canonical manifests and commit bytes, current learner diff, and one inspected author screenshot. The [independent review](independent-review.json) and [verified archive](independent-native-evidence.tar.gz) retain separate authorship; [its adoption manifest](independent-archive-manifest.json) records every member hash.

Extract into a disposable directory. At the qualified source:

```sh
node --test tests/*.test.mjs
node tools/build-dependency-graphs.mjs --check
python -B tools/make_demo.py
```

The last command must reproduce the tracked learner exactly. The archived `current/run-native-current.mjs` performs these checks in a private Linux `/dev` export and records every native input hash. Pass explicit source/output paths:

```sh
node current/run-native-current.mjs /absolute/source /absolute/new-receipts
node author/receive-author-browser.mjs /absolute/source /absolute/new-browser-receipts
```

The author browser harness accepts `GRAPH_CHROMIUM` and `GRAPH_PLAYWRIGHT` overrides. Its six-group historical result is bound to the old learner; running against another learner creates new evidence. The independent current-import harness pins the current learner and accepts the actual downloaded course path; its exact invocation is retained in its command record.

Original course: 12,121 bytes, SHA-256 `e6538a1a28c6a1ce31be2b20095abf8c0d4461c4ba3aa07388181f9efd57810d`.
Generated companion: 54,137 bytes, SHA-256 `2a88659ac288a89dc1b1443b3a9deb5a2e28e61d78d71aac491e6f2f70e8e170`.
Verify recorded hashes before interpreting any replay.


## Local sparse custody

The local receiving packet supplies both immutable archive files, their exact
Git blob IDs, and a native expected tree for root publication. Shared storage
filled before a final evidence commit could be written; the qualified source
commit remains unchanged. Root must read the actual files and require matching
remote blob/tree hashes. No final local evidence commit or complete local archive
object custody is claimed. This does not substitute for remote publication checks.
