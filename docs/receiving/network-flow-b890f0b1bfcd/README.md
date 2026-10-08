# Maximum-flow course and explorer: receiving record

Worker: `chatgpt:b890f0b1bfcd:root`. Independent mathematical/content receiver: `b890f0b1bfcd/production`. Source coordination: [RecallWeave #113](https://github.com/Jacob-Met/RecallWeave/issues/113).

## Qualified source and outcome

The contribution adds an original fourteen-question, five-concept course, a worked guide and a directly opened offline explorer. Learners inspect deterministic breadth-first residual paths, distinguish use of an original opposite edge from cancellation of an earlier assignment, and finish with a cut whose capacity equals the feasible flow.

The native source commit is `98bd4135a09e9f0d5e22b0307b914528ff8b3572`, tree `c35b2c310cef084fb65753982444cc6c717cafcc`, composed on canonical main `2bc3e5084cf77547a8d2517d3ee8a62ce30524dc`. The original author commit `f721be2516506baa7d89680e73db775d7cad5954` is retained on the native checkpoint branch; its original base was `dd02dfedb69d0f4b0ec3ee2cc8604db722816f87`.

[composition.json](composition.json) binds all ten changed product/gate files by size and SHA256. No unrelated upstream leaf changes. Removing only the added README section restores the exact current-parent README. All 64 source files captured by the accepted browser run retain their accepted bytes after composition, including the unchanged learner, importer and model. This receipt commit adds evidence only.

The implementation admits 2–8 distinct named vertices, distinct source and sink, and integer capacities from 0 through 99. Each ordered pair has at most one original edge; opposite directions are distinct originals. Self-loops and malformed input are refused. Every snapshot is detached and immutable. The source text parser requires ordinary decimal capacity spelling without leading zeros except the value zero itself. This is a deliberately bounded teaching model.

Native external contribution registration was read back from the existing estate coordinator: Conscience decision seq 4640, event cev_1d90d8cde6fa41d8827d08c6, actor chatgpt:b890f0b1bfcd:root. The exact record is retained in [native-contribution.json](native-contribution.json). It carries the source issue and bounded paths and grants no runtime lease.

## Actual qualification

| Boundary | Observed result | Retained evidence |
| --- | --- | --- |
| Maintained model, content and generated artifact | 11 test groups pass; independent cut enumeration for all 4,096 directed four-vertex binary-capacity networks plus 320 seeded weighted networks; checked course has 14 items and 5 concepts | `tests/network-flow.test.mjs`; author TAP files |
| Independent mathematical receiver | 7 worked fixtures plus 5,145 generated networks pass; 11 malformed networks refused | `independent/receiving-r2.json` and original/final receiver sources |
| Independent authored-content review | All 14 answers, explanations and transfer prompts agree; prerequisite graph is acyclic | `independent/INDEPENDENT_REVIEW.md`, `content-receiving.json` |
| Actual browser: isolated single file and served page | 14 receiving groups pass, 8 real downloads; sandbox enabled | `author/browser-evidence.tar.gz`, manifest and final receiving JSON |
| Unchanged learner in both browser modes | Preview/cancel/start, all 14 questions, review, paused practice and notes download pass; first-attempt and model-state values retained through practice | Same accepted browser packet |
| Current-parent repository suite | 498 tests pass; 0 failures, 0 skipped | `author/composed-full-suite.tap` |
| Existing demo and new explorer generation | Native demo rebuild is byte-identical; explorer read-only parity passes | `author/demo-parity.json`, composition and native logs |

Native execution used the existing ThinkPad Node 22.22.1 and Python toolchain in an isolated checkout. Browser receiving used Playwright 1.64.0 with the existing Chromium 153.0.8010.47. The browser launch explicitly sets `chromiumSandbox: true` and uses its own profile. Playwright is isolated receiving tooling, not a product dependency; no downloaded browser or shared profile is required.

The independent receiver froze its cut oracle, seven hand-worked fixtures and corpus before reading the candidate. The generated corpus includes 729 ternary three-vertex networks, 4,096 binary four-vertex networks and 320 seeded five-to-eight-vertex networks. It separately checks every intermediate capacity/conservation state, exact original edge identity, independently selected shortest residual path, bottleneck, signed edge adjustment, final residual partition and cut equality. The explicit cancellation fixture supplies cancellation coverage; none is attributed to the random corpus. An added original reverse edge separately demonstrates forward-edge priority and a retained circulation.

Browser receiving checks exact original-edge/residual tables, reverse cancellation, cut certificates for positive and zero results, all 56 possible directed edges in an eight-vertex network, input invalidation/refusal/recovery, literal vertex handling, keyboard navigation and a 375px page without horizontal overflow. Downloaded course and guide bytes match their source files exactly; the observation matches the accepted network and selected trace step. Neither tested mode produced a page error, external request or observed browser-persistence write.

The corrected desktop rerouting and phone inputs/certificate captures were visually inspected. Exact tables remain available when dense graphs omit edge labels. Scientific meaning is limited to the entered graph; there is no claim of measured learner benefit, physical system validation or general-purpose large-network performance.

## Preserved negative evidence

1. An early direct Chromium command timed out after 30 seconds with no DOM output and D-Bus warnings. Its stderr and empty output are retained. It proves neither a product failure nor successful browser receiving. The later sandboxed Playwright launch completed.
2. The first maintained model test run had a receiver-side strict comparison between zero and negative zero. Four groups failed before useful coverage. The original test and raw tool receipt remain in `author/`. Correcting that mathematical equality left the solver unchanged.
3. The separate frozen receiver independently encountered the same JavaScript strict signed-zero distinction. Its original schema adaptation and failed receipt remain in `independent/`; the revised receiver changes only terminal-balance equality.
4. Browser run 1 found a real 375px layout defect: a grid track expanded to the table's minimum content width. The exact earlier template, failed report and screenshot remain. The product correction gives grid children a zero minimum and bounds the single/two-column tracks. The unchanged browser harness then passed both modes.
5. The first whole-repository run reported 12 missing-file failures because the sparse checkout omitted existing author, template, catalog, focus and handout directories. The raw terminal whitespace is preserved. The failed TAP output remains in `author/full-suite.tap`. Restoring those existing tracked files produced 460/460 passes on the original parent. The newer parent adds cases; its composed suite passes 498/498.
6. GitHub refused normal issue creation at 17:01:30 and 17:15:25 UTC with a secondary content-creation limit. Both definite refusals are retained in `publication-blocks.json`. No issue, alternate identity or bypass was inferred. After cooldown and observed normal service recovery, the ordinary creation succeeded as #113 at 17:31:13 UTC.

## Reproduction

Run the ordinary repository gate with its existing toolchain:

```sh
node --test tests/*.test.mjs
node tools/build-network-flow.mjs --check
python3 tools/make_demo.py
git diff --exit-code -- demo.html courses/network-flow-explorer.html
```

For actual browser receiving, use an installed Playwright and Chromium with a new output directory:

```sh
NODE_PATH=/path/to/isolated/node_modules BROWSER_BIN=/path/to/chromium \
  node tools/check_network_flow_browser.cjs /new/receiving/output
```

The harness refuses an existing output directory, retains a failed run, enables the browser sandbox, blocks and records external requests, receives actual downloads, and hashes its production inputs before and after. The native run directories and exact original receiver are also preserved at `/home/jacob/hamon-b890f0b1bfcd/`.

## Integration boundary

At this record's creation, the implementation, independent receiving and current-parent native qualification are complete. Ordinary remote branch publication, hosted checks and expected-head integration follow. Catalog #39 and offline-pack #109 retain their own discovery/distribution updates. This source contribution is not a native goal lease, installed runtime change, hosted deployment or a claim that the broader autonomous estate mandate is complete.
