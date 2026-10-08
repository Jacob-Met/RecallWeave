# Union-find native source and receiving packet

This packet accompanies the original **Connections and components: union-find** course and its standalone offline explorer. It records the source candidate, native behavior, independent algorithm and content acceptance, and the limits of each check. The product is a bounded teaching tool for incremental undirected connectivity, not a performance benchmark or evidence of learning efficacy.

## Source and scope

| Field | Value |
| --- | --- |
| Public project | [Jacob-Met/RecallWeave](https://github.com/Jacob-Met/RecallWeave) |
| Base commit | `2bc3e5084cf77547a8d2517d3ee8a62ce30524dc` |
| Base tree | `9e94d71f36cc1e410dd118083207395132b87ffe` |
| Initial product commit | `02618a196ee049e90059aca70b968260a097c11a` |
| Native branch | `feature/union-find-44df5c2e45ae` |
| Native worktree | `/home/jacob/recallweave-union-find-44df5c2e45ae` |
| Native host | ThinkPad `cadafaf3-4d0b-4c4f-a0d3-34a95d2cec90`, user `jacob` |
| Source contributor | `chatgpt-44df5c2e45ae/native_production` |
| Cohort root | `estate-44df5c2e45ae` |
| Independent core and content reviewer | `estate-44df5c2e45ae/source_integration` |

The product paths are `courses/union-find.json`, `courses/union-find.md`, `courses/union-find-explorer.html`, `templates/union-find-explorer.html`, `src/union-find.mjs`, `src/union-find-ui.mjs`, `tools/build-union-find.mjs`, and `tests/union-find.test.mjs`. The source contributor also owns `tools/check_union_find_browser.mjs`, this receiving directory except the root review subdirectory, and the additive README entry.

The root reviewer separately owns `tools/check-union-find-accessibility.cjs` and `root-accessibility/` in this directory. Its records describe a distinct independent browser review. No inference of those results is made from the source contributor's receiver.

The native checkout is sparse. Files such as root-level catalog or handout HTML may exist in the complete Git tree without being materialized in this worktree. Sparse absence is not evidence that a product entry point is absent from the repository.

## Authorized advisory reservation

The contributor inspected the complete current 2,073-file base tree, all 551 available central HAMON issue 140 comments through comment `6064838665`, the current 54 RecallWeave issues, public union-find/connectivity searches, and readable top-level native coordination scopes. No competing union-find scope was found. An earlier prefix-coding idea was withdrawn before edits after finding the existing owner of RecallWeave issue 67.

The scope was accepted and read back in shared LA7 journal `3f3aedcd-f4a5-8151-8f79-d34897ddac64` at 2026-10-08 17:26:32 UTC, with root identity, independent reviewer roles, and access qualifications corrected and read back at 17:28:29 UTC. These accepted Notion records are advisory coordination under Jacob's standing authority; they are not a native goal lease.

Thirteen native coordination files were unreadable. The installed `hamon-goals` wrapper could not enter `/opt/hamon-macros`. An exclusive create attempt for `/srv/hamon-estate/coord/chatgpt-44df5c2e45ae-union-find.json` returned PermissionError and created no file. No protected database was opened to work around that boundary.

GitHub content creation had returned a secondary 403 in the cohort's existing route. This source lane made no GitHub write attempts or alternate-route retries. Publication and current-main integration remain the cohort root's responsibility. These facts bound the ownership evidence; they do not represent global coordination coverage or a published claim. See [ownership-provenance.json](ownership-provenance.json).

## Product contract

The explorer accepts 1–8 elements, displayed A–H, and at most 32 explicit `join A B` or `find A` commands. It begins with one component per element and exposes the initial state plus one detached, immutable snapshot after each command.

A join finds its first argument, then its second argument. The smaller component root attaches to the larger component root; lower element index breaks only equal-size ties. A root stores the exact component cardinality and every nonroot stores zero, displayed as a dash. Optional full path compression changes only the visited parent paths. A redundant join can compress both paths while leaving component count and cardinalities unchanged.

The original undirected connection graph, internal parent forest, exact parent/size table, traversed paths, and component membership are presented separately. Changing any accepted input invalidates the previous trace and trace download. Downloaded traces include all snapshots, the selected state, the explicit assumptions, and the opposite compression setting for comparison.

The twelve-question original course uses six concept labels and an explicit CC BY 4.0 license with AI-assistance disclosure. Examples, questions and explanations were authored for this contribution. The guide distinguishes component size from rank and from observed parent-tree depth.

## Frozen product pins

| Path | SHA-256 |
| --- | --- |
| `src/union-find.mjs` | `bb9f71037ca95237e56fad7211a4306a494ad7fc3f231d93d6d6c52cf0c3747b` |
| `src/union-find-ui.mjs` | `e5f67dcc5576cf74ace4f2fec7c7103ab9f50bd793740684128b39f71fe5f370` |
| `courses/union-find.json` | `d7815a6b9da2218dd370fedd7cd0aadfaee793c18cf050b38c01eceedad1911d` |
| `courses/union-find.md` | `5e71d5505815cb8e46fa3d42266235b3dbcab2e11a0d87fc553ae5017b8199d1` |
| `courses/union-find-explorer.html` | `9acf2c11e21703c39839f2cbe2b204354badb3c8b2ed6aec2ebf5a583a697d89` |
| `templates/union-find-explorer.html` | `6d476ed306881e20f44d87cc60c4f471746ed97f5af6275a74ce5d5417afe765` |
| `tools/build-union-find.mjs` | `2a99ae259bf4eb8cd90c202a29742a1d274df1388ea042c283919163a95ca153` |

These pins identify the candidate received by the independent core reviewer and the source contributor's browser runs. The visual follow-up below records the later UI and generated-page changes; the original receipts are retained.

### Dense forest visual follow-up

Root's actual browser v1 found seven adjacent outer-ring pairs overlapping by four SVG units in the eight-element initial parent forest. It also retained and independently inspected a screenshot of that negative case. The producer then bounded each root circle to half its leaf spacing minus two units, with the inner node circle five units smaller. Eight isolated roots now use radii 19 and 14; seven leaves use 22 and 17; six or fewer leaves retain the original 23 and 18. This leaves four units between adjacent ring circles, or 2.5 units between their painted stroke edges, while preserving the 2.75-unit unpainted gap inside each root's double ring.

Only the parent-forest radii and generated HTML changed. The model, course, guide, template and builder retain the frozen pins above. The rebuild and declared-source check both passed. [visual-clearance-repair.json](visual-clearance-repair.json) records the exact delta and separates calculated geometry from the pending root browser recheck.

| Updated path | SHA-256 |
| --- | --- |
| `src/union-find-ui.mjs` | `a2ac2ea58062c39b3d7aa0cd7ce7bb49f1e9ac6a068b578852f9fa022cc3c981` |
| `courses/union-find-explorer.html` | `75ef4e4af235761ca131e4bb15f6b1fb2899653633643b95fa4c219e0ef9ceb7` |

## Native source checks

The authored Node test suite passed all 11 groups with no failures or skips. It covers exact component counts and costs, untouched branches during compression, weighted-size and tie behavior, both finds during redundant joins, empty/single-element/self-join cases, 24 seeded histories of 32 operations in both modes against an independent graph traversal, snapshot and input preservation, malformed input refusal, parser bounds, the unchanged course validator, and standalone source parity. See [tests-v1.log](tests-v1.log).

The standalone builder passed, and the final declared-source check passed separately in [build-check-final.log](build-check-final.log). It verifies that the checked-in HTML equals the page produced from its declared template, model, UI, course and guide inputs. This check does not exercise a browser.

Run from the repository root:

```sh
node tools/build-union-find.mjs --check
node --test tests/union-find.test.mjs
```

## Independent algorithm and content acceptance

The independent reviewer froze its graph-based contract and oracle before seeing the candidate. It sealed the final pre-exposure oracle at commit `adf795c44a6a224afc1580fc001b7d3ffbd057e7`, with five literal histories, 39 transitions, and 15 deliberately incorrect traces rejected. This history is retained in [source-integration.bundle](source-integration.bundle).

The candidate model then passed **1,709 valid histories, 18,775 transitions, 20,484 snapshots, and 35 invalid-input controls**. The valid cases comprise five literal goldens, 1,168 exhaustive histories, 512 seeded histories, eight default scenarios, and sixteen empty histories. Candidate source and inputs were unchanged. The receipt is [CANDIDATE-20261008-v1.json](source-integration/CANDIDATE-20261008-v1.json).

The reviewer solved all twelve questions from prompts and options before seeing their keys, sealing those answers at `fea9b2f005bfe7db63948531a157451e84604840`. Every key matched, and prompts/options were byte-equivalent to the blind input. Full model and guide review found no concrete correctness defect. Four additional hand-counted guide controls verified the 8-versus-9 island traversal totals, repeated H traversal counts of 3 then 1 versus 3 then 3, and the untouched D and F branches.

The completed independent packet is sealed at commit `2430eebee1dff17bf9b5f8111cd4345fc793e5a8`, tree `0f46c438c35e9fec3c07c85fd6308b7eaca68d49`. All 17 imported files match the reviewer's [handoff manifest](source-integration-handoff.json). The complete-history bundle and archive hashes were verified before copying, and the accepted model, course and guide were checked against the live candidate bytes. See [source-integration-import.json](source-integration-import.json) and [CONTENT-AND-SOURCE-REVIEW.md](source-integration/CONTENT-AND-SOURCE-REVIEW.md).

This review accepts the algorithm and course content. It does not substitute for root's browser review or establish a learning outcome.

## Actual browser behavior and retained harness failures

Native tests used Node 22.22.1 and the installed Chromium 153.0.8010.47 snap. They opened local `file://` pages with an exclusively created browser profile, observed native browser state and events, and used the existing learner without changing its source. Completed downloads were read from native disk. No package was installed.

| Run | Actual boundary | Result and qualification |
| --- | --- | --- |
| [browser-v1/receipt.json](browser-v1/receipt.json), 17:37:48–17:37:55 UTC | Explorer controls, keyboard stepping, compression comparison, invalidation/errors, completed downloads, 390px layout | Five groups passed. The overall process exited 1 when the driver incorrectly looked for a start button after the existing import action had already started the lesson. |
| [learner-v2/receipt.json](learner-v2/receipt.json), 17:39:17–17:39:38 UTC | Exact completed course file from v1 imported into unchanged learner; twelve first answers, review, separate retries, reflections and notes | All behavior checks passed, including all twenty source pins. The wrapper later exited 1 because its own browser profile cleanup raced the browser's shutdown. |
| [lifecycle-v3/receipt.json](lifecycle-v3/receipt.json), 17:41:31–17:41:34 UTC | Revised owned-process shutdown and profile cleanup only | Process exited 0 and the owned profile was removed. It is a lifecycle check, not another product run. |

The first driver assumed a second `#start-button` activation after `#start-deck`. Existing `mountDeckPicker` directly resets the session and renders its first question. Removing that extra driver action fixed the unresolved import boundary; product source remained unchanged. The original driver and error are retained in `browser-v1/receiver-v1.mjs` and its raw receipt.

In v2 the behavior receipt was written before the finalizer and therefore says `passed`. The overall process nevertheless exited 1 with `ENOTEMPTY` removing its own `profile/Default`. [wrapper-exit-observation.json](learner-v2/wrapper-exit-observation.json) explicitly records the later transcription of the observed wrapper error, rather than presenting it as a raw terminal capture. A subsequent exact-profile process check found no remaining process, and the contributor removed only the six files in that inactive, exclusively owned profile.

The maintained receiver waits for the owned browser process, terminates only that process if its bounded close wait expires, and retries removal of its own profile. Its final receipt now records behavior and cleanup separately and is written after cleanup. The minimal v3 check resolves that lifecycle failure; already accepted product cases were not repeated.

### Explorer evidence

Actual keyboard actions reached the intermediate two-component state where D still points to C, then the subsequent find where D points to A, and the final one-component state with all parents A. The graph and component partition remained stable while compression changed the expected paths. The default sequence showed eight cumulative parent links with compression and nine without it.

Native preset and compression changes cleared stale results. The eight-element preset showed the final H path using one link with compression and three without. Out-of-range input and 33 commands refused without leaving an exportable stale trace. A one-element empty history remained usable. At a 390px viewport, document width was 375px and all inspected form controls had labels.

Three actual downloads are retained in `browser-v1/downloads/`: the course and guide exactly match their product bytes; the trace has nine snapshots, selected state five, and the opposite-mode comparison. The trace SHA-256 is `88751ae46184e27170597c5b523bb5fe53111369288e0d6b5f4050a70a4f39a5`.

### Learner evidence

The v2 receiver reused that exact physically completed course download. It answered each of the twelve unique questions once, deliberately missing two. The first-answer result was 10/12, review displayed all twelve items, and two separate retry actions succeeded. First-answer totals and all six displayed concept estimates remained unchanged after practice. The reflection “A find can shorten its parent path while preserving every connected component.” appeared in both separately completed notes exports.

| Notes artifact | SHA-256 |
| --- | --- |
| `learner-v2/downloads/01/recallweave-study-notes-2026-10-08.txt` | `4795948438fbdfe560b002173a8ecbb89cf8aba8924a32062f2dfd6a7bdd5db3` |
| `learner-v2/downloads/02/recallweave-study-notes-2026-10-08.txt` | `89c2becf55dcface4e43a19bbd611ba3fd5e09ce7a96d45023c80b6842460e63` |

These scripted learner interactions demonstrate compatibility and retained first-attempt semantics, not human understanding or retention. No page exceptions or external requests were observed in the recorded explorer and learner boundaries.

For another controlled browser run, use an unused output directory. The receiver refuses an existing output directory:

```sh
node tools/check_union_find_browser.mjs --browser /snap/bin/chromium --output /absolute/unused/receiving-directory
```

## Root review and discovery receiving

Root's independent browser review is in progress at the time of this source packet. Its exact accepted records and any bounded follow-up source changes will be added before final cohort handoff. The contributor has not staged the root reviewer's unfinalized files.

The independent discovery reader confirmed that both catalog and handout HTML exist in the committed tree. The catalog builder consumes an explicit eleven-course list and does not automatically discover this JSON. Current catalog ownership belongs to the existing issue 39/40 and PR 63 reconciliation scopes. This contribution therefore supplies the additive README → standalone explorer → exact course download → unchanged learner route already exercised in the native browser. After independent entry-route review, the README section also links the unchanged learner directly. The original 684-byte addition and its receipt remain in the first receiving commit; [readme-insertion-v2.json](readme-insertion-v2.json) records the later direct-link addition and verifies every link target against committed bytes. Catalog registration is an explicit continuation for those existing owners, not an unverified claim of current catalog inclusion.

## Reference provenance

The guide links [Princeton Algorithms, section 1.5](https://algs4.cs.princeton.edu/15uf/) and [MIT OCW 6.046J Lecture 16](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/resources/mit6_046js12_lec16/). The producer read primary Princeton indexed excerpts on weighted quick-union and path compression; direct page and JavaDoc opens returned 403 and were not counted as successful direct reads. The linked eight-page MIT lecture PDF was opened and read. MIT's rank-based analysis was distinguished explicitly from this explorer's size-based rule. The independent reviewer separately checked the MIT distinction and retained its own Princeton 403 observation.

No source exercises, source code, or long passages were copied. The teaching examples and twelve-question deck are original to this contribution.
