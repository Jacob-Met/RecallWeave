# Stable matching — native receiving

**State: native qualification accepted; GitHub Actions-triggering publication held.**

This contribution supplies an original 12-question RecallWeave course, a worked guide, a standalone preference/proposal explorer, three pure mathematical APIs, a maintained browser receiver and a portable offline package. It belongs to issue [#175](https://github.com/Jacob-Met/RecallWeave/issues/175), owned by external source contributor `estate-81ba1ed0179c/root`; no resident Za, goal or native lease is claimed.

## What a learner can do

A learner enters strict complete preferences for 1–4 participants on each side, explicitly applies them, and follows every hold, replacement and rejection. The lowest-index free proposer determines the next atomic step. The page retains both matching directions, free proposers and next-choice cursors, and labels the completed result separately from the currently selected partial state.

Every complete matching is enumerated in lexicographic order, at most 24. The inspector shows ordinal partner ranks and every blocking pair with both strict-improvement witnesses. Changing the proposing side exposes different stable outcomes when the profile permits them. Editing any applied preference or the proposing side retires the previous result and observation. Group-size changes visibly reset all rows.

Course and guide buttons download the fixed original UTF-8 files, including during an invalid preference draft. An observation contains the full applied profile, every trace state, all complete-matching inspections, the selected step, the inspected matching and six exact build-input hashes. The original downloaded course works through the unchanged learner's preview, explicit Start, feedback, review, practice and notes flow.

The model excludes ties, incomplete lists, unequal group sizes, capacities, strategic reporting and real allocations. Ranks are ordinal, not utilities. Stability/proposer optimality do not establish fairness, uniqueness, maximum weight or measured educational efficacy.

## Public mathematical contract

`traceStableMatching(profile)`, `inspectMatching(profile, leftMatching)` and `listCompleteMatchings(profile)` are exported from `src/stable-matching.mjs`.

A profile has exactly `leftPreferences`, `rightPreferences` and `proposingSide`. Both matrices contain equally many dense rows. Every row is a strict permutation of the ordinary integer indices 0 through n−1. The proposing side is exactly `left` or `right`. Extra fields, holes, duplicate/missing partners, accessors, booleans, strings, fractions, nonfinite values and signed zero are refused. Signed zero is excluded to preserve exact JSON round trips without changing an admitted index's representation.

All returned objects and arrays are detached, deeply frozen and JSON-safe. Inspection uses one-based `leftRanks`/`rightRanks`, both matching directions and ordered `blockingPairs`. Trace states include `step`, `leftMatching`, `rightMatching`, `freeProposers`, `nextChoiceIndices` and a null/hold/replace/reject `action`. Replacements identify the displaced incumbent. The complete trace includes `final`, all `matchings`, `stableMatchingIndices`, `proposerBestRanks` and `proposerOptimal`.

The complete frozen consumer contract is in [operator-contract.json](operator-contract.json).

## Source boundaries

The original 34-file learner/deck/author closure was imported byte-for-byte from canonical `1c8ece2713554f95b0e507297a34909d50222736`, tree `96df1efcba39ea0fd1f929391a68c21f5020a208`. All 34 original files remain unchanged in the partial native repository.

The later observed canonical `698902f9c9c1d5c5023092b85b3632a7cb7a01ed`, tree `d6d3707b691850af7928299242631534cff89aa8`, preserves all 33 non-README imported inputs. Its changed README remains preserved in the pending full-tree composition. The contribution adds only its ten dedicated product/test/receiver paths and this receiving directory. Existing learner, model, catalog, course, workflow, dependency and other-owner paths are unchanged.

Native commit ancestry is explicitly partial. The receiving packet and native coordination record contain the exact local commits, contribution hashes and an offline full-tree projection against the observed canonical snapshot. That projection is not a published commit, a live-head claim, a full canonical checkout or an integration result.

## Accepted evidence and retained negatives

| Layer | Actual result | Evidence |
| --- | --- | --- |
| Original new-builder baseline | Exit 1; builder absent; no explorer output | baseline-absence.stdout / baseline-absence.stderr |
| First selected native suite | 110/110: 99 unchanged original tests plus 11 new tests, on initial core | native-tests-v1.json / native-tests-v1.stdout |
| Signed-zero correction | Original output fails exact JSON round trip; regression fails before the added guard, then passes | negative-zero/ |
| Final dedicated suite | 12/12 on final core, including the new signed-zero regression and exact builder/payload tests | native-new-tests-v2.stdout |
| Independent mathematics | 12 groups; five profiles, all 39 complete permutations, seven hand-authored proposal traces, ordered blocking/rank witnesses and strict refusal controls | independent-math/ |
| Final independent admission addendum | One-guard-only byte delta; eight bounded ordinary-zero and signed-zero records accepted | independent-math/signed-zero-addendum.json |
| Blind course/content review | All 12 independently selected answers match; explanations, transfers, worked traces and model limits accepted | course-review/ |
| Actual browser and learner | 17/17 groups; seven real downloads; desktop/390px and five directly inspected screenshots | browser/receipt.json / browser/native-receiving.tar.gz |
| Extracted offline package | Seven members byte-identical after ZIP read/extraction; three actual relocated navigation/download/import groups | offline/package-receipt.json and browser receipt |

The first 110-test run and final 12-test run are separate executions. They are not reported as a single 111-test run, and neither is the entire canonical repository's test suite.

The original core accepts numeric `-0`, which then changes representation in JSON. The actual failed assertion and failing regression are retained, together with the exact original core. The final source adds only `Object.is(index, -0)` to the strict index refusal. The independent addendum verifies that removing this one guard reconstructs the original source exactly and that ordinary-zero behavior is unchanged.

Browser r1 timed out waiting 90 seconds for a DevTools endpoint, before any assertion or download. It establishes no product failure or accepted behavior. Its original receiver and negative receipt remain in the browser capsule. Following an observed improvement in native responsiveness/load, one fresh-profile r2 run used the same sandbox and startup allowance and passed. No product UI change was required.

## Actual browser receiving

Node 22.22.1 and installed Chrome 153.0.8010.47 received the final page directly from a file URL. The browser checked all seven default trace states, reversible controls, all six complete matchings, both-side rank witnesses, proposal/free/cursor tables and diagram labels. Actual observation downloads retained full state and exact source identities.

A keyboard-entered duplicate row `W W Y` retired the result and observation, remained unmodified when refused, and focused the error. Course/guide downloads still matched the original files exactly. Size reset, both proposer roles, four-person 10-proposal/24-matching behavior and the one-person boundary passed.

The actual downloaded course preview preserved the active learner session until explicit Start. All 12 source-choice identities and feedback/transfers were received. One intentional wrong answer produced an 11/12 first attempt; its separate 1/1 retry succeeded without rewriting first-attempt history. The downloaded study notes retained the typed reflection.

The extracted package's START-HERE links, explorer, actual course download and learner import/Start passed three additional groups without repeating the full question run. Final evidence reports zero external page requests, page exceptions, instrumented storage-write calls or source-byte changes. The receiver removed only its own browser profile and recorded cleanup.

The complete 31-member browser capsule is 2,350,735 bytes, SHA-256 `1327a265081ba61fb82ec4c701bb28027aca8c0674398e5ee47ff270cfec9acc`. Successful receipt SHA-256: `1a3e3b11a063b2790c0b15cc7f3f0b92fa5cfecd0c2b3806894a3559169807cf`.

## Reproduce natively

Run the dependency-free mathematical/course checks from the repository root:

```sh
node --test tests/stable-matching.test.mjs tests/stable-matching-course.test.mjs
node tools/build-stable-matching.mjs --check
```

To rebuild the standalone page after an intentional source edit:

```sh
node tools/build-stable-matching.mjs
```

The maintained browser receiver takes positional arguments: repository root, a **new** output directory, installed Chrome/Chromium executable, and optionally an extracted offline-package root. It refuses to reuse an output directory so prior failures remain separate.

```sh
node tools/check-stable-matching-browser.mjs /absolute/RecallWeave /absolute/new-receiving /absolute/chromium /absolute/RecallWeave-stable-matching
```

The optional package argument adds the three relocated checks. An installed sandboxed Chromium and Node 22+ are required; the receiver does not install dependencies or modify browser security settings. Its screenshots require direct visual review in addition to programmatic assertions.

## Portable delivery and publication hold

[offline/RecallWeave-stable-matching-offline.zip](offline/RecallWeave-stable-matching-offline.zip) contains START-HERE.html, README.txt, MANIFEST.json, the unchanged standalone learner and the three course files. It has seven members, 54,108 bytes, SHA-256 `409f4294672bc24e680f0a61e56e8b4a03a0c2b57b3296c800ae7e854b501e49`. Extract it before opening START-HERE.html. The manifest binds the six other files; receiving also binds the archive and extraction.

Jacob's [no GitHub Actions instruction](https://github.com/Jacob-Met/hamon/issues/143#issuecomment-6067592767) remains binding. At the last direct trigger check, all five RecallWeave workflows were unchanged push/pull_request declarations with no issue event, so issue #175 was nontriggering. This scope has created no GitHub source ref, pull request, merge, dispatch or rerun. No workflow, required gate or skip-CI workaround is used.

Native source, the usable offline package and exact evidence are available in the estate. Any later integration must first establish applicable current authority, refresh the canonical tree/ownership/trigger and gate evidence, and preserve concurrent changes. A recovered runner or expired API rate limit alone does not lift the Actions hold.
