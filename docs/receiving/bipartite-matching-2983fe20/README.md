# Matching lab: source and receiving record

## User outcome

The original twelve-question course and directly openable lab show how a maximal greedy matching can be improved. A learner enters a bounded bipartite graph and optional valid starting pairs, follows the alternating search, inspects the whole-path edge replacement and checks the maximum size. The actual lesson download opens in the existing learner.

## Source custody

- Repository: Jacob-Met/RecallWeave; public reservation [issue 133](https://github.com/Jacob-Met/RecallWeave/issues/133).
- Owner: hamon-2983fe20e77b/mac_assimilation, coordinated by hamon-2983fe20e77b/root.
- Initial current-main base: `48611be99baa20f51d1e3846ed8cd38879748961`, tree `e9973d2221bfb1a0175a8f40b5a6bca376970637`.
- Independently received pure core: `dbee56265cdacfedc959d11dc5d7faa79d2ddf36`; SHA256 `9df48b6ed5f249c4e18e8f2b9eff452db1267ab6053e8a1464cf1766a962509b`.
- Frozen runtime/course/UI and author browser input: `c0a4682f7f31fb29c126d9185cf1e83b3c31e2e0`.
- Native isolated source: `/home/jacob/recall-bipartite-matching-2983fe20e77b/source`, branch `feat/bipartite-matching-2983fe20`.

The source fence is new bipartite-matching course, core/UI, builder, tests and receiving paths plus one additive README section. Learner, catalog and all other course source files are unchanged from the initial base.

## Independent core receiving

Reviewer hamon-2983fe20e77b-thinkpad authored a separate oracle and admission/trace controls. The original receiver commit is `7db515c0d8d2a05bd0f85bde6461e0e0d3b21c51`; the additive maximum-bound supplement is `fd9435f003b61951097020c0674a97121501e635`.

The original run passed 6,046 valid graph/initial-matching cases, checking 89,947 events and 7,249 augmentations, including 1,294 paths that remove existing pairs. It includes every 3×3 edge set with every feasible initial matching, bounded generated families, deterministic replay, shortest-path checks and 33 invalid admission controls. The separate four-case supplement covers complete 6×6 graphs, input ordering variants and an eleven-edge reversal from size five to six. These are the reviewer's results, distinct from the author's twelve model/content tests.

Both original and final archives, complete reviewer Git bundles, transfer receipts and attribution are retained under `independent-core/`. All eleven final manifest entries were verified after extraction and as actual tracked blobs in a separately cloned reviewer repository. The exact core module was unchanged throughout.

## Author browser receiving

`author-browser/receipt.json` records an actual isolated Chromium 153 run on Node 22, completed 2026-10-08 from 19:10:43.980Z to 19:10:56.193Z. All eleven groups passed:

1. Direct-file default graph and exact initial matching.
2. Actual saved trace at the three-edge augmenting path, retaining the old matching before the flip.
3. Atomic flip, matching pairs, updated search arrows and backward replay.
4. Actual saved five-edge rearrangement with exact add/remove edge IDs.
5. Fractional prediction refusal and unchanged selected event.
6. Input edits retire the old trace; invalid matching, reversed sides, duplicate edges and overlapping labels cannot export.
7. A complete 6×6 graph at 375 CSS pixels, twelve maximum-length labels, exact thirty-six edges and six matching pairs, without page overflow.
8. Actual lesson/guide downloads byte-identical to original sources.
9. Downloaded lesson through the existing learner: preview preserves the active bundled question; explicit start; all twelve original questions; one deliberately wrong first answer; eleven correct answers; all explanations and transfers visible.
10. Algorithm trace refused as a lesson without losing the completed learner result.
11. Zero page HTTP(S) requests, zero JavaScript exceptions, nine consumed source files unchanged and source checkout clean.

This is author receiving, not the independent end-user/content verdict. The browser transport was reused from this worker's earlier independently authored SCC receiver; the matching cases and expectations are original. No installed/user browser session was used.

### Visual inspection

All six original PNG captures were inspected. Desktop path and maximum views show matching membership, direction, free endpoints and the exact add/remove explanation clearly. The complete 6×6 graph is dense at mobile width, but all twelve exact labels and six pair chips remain legible, with no clipping or horizontal page overflow. The original learner preview, wrong-answer explanation and completed twelve-item review display the downloaded course correctly.

The first full-page desktop capture was taken after a download control had scrolled into view. Its sticky editor therefore appears lower in the full-page capture; this is retained as the original capture rather than altered. The ordinary desktop capture at the maximum state shows the top-aligned layout. No correctness blocker was observed.

## Qualification limits and integration

The module solves unweighted bipartite maximum cardinality, within the explicit input bounds. The recorded arc count is examined eligible search arcs, not total implementation work. Browser receiving here covers installed Chromium on Linux; other browser engines and screen readers were not exercised.

An ENOSPC event during two unfinished prefreeze writes was caught and recovered. Its empty test-file run is explicitly rejected; see `ENOSPC-RECOVERY.json`. The matching source was restored and fully checked before the frozen browser run.

Root owns a separate end-user/content receiving pass before integration. Final current-main composition, exact public PR/CI gates and integration receipts will be appended when completed. This record does not claim that source is already merged or deployed.

## Native repository gate

The exact runtime c0a4682 was materialized in a separate owned detached worktree and ran the repository workflow commands. All 561 tests passed (546 top-level TAP subtests), with zero failures, in 51.935 seconds on Node 22.22.1. The existing Python demo generator reproduced the original demo bytes exactly and the gate worktree remained clean. The maintained hosted workflow uses Node 20; this native result does not claim a hosted CI result. Original log and receipt are retained as native-gate.log and native-gate.json.
