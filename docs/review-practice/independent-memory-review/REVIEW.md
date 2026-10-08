# Independent RecallWeave practice review

**Decision: the frozen product candidate passes the reviewed source and browser paths.**
No product source change was required by this review. These are local browser
and source results, not learner-effectiveness evidence or a deployment claim.

## Exact candidate and reviewer

Reviewer: `memory_capability`, independent of the implementation owner.
Implementation commit: `38e128905cc76e9ac75cb3de0b6f34d99792b5ea`.
The implementation owner's subsequent evidence commit
`fca805724b55a9a01f073966cf26507fe2c3d6a0` contains the same product bytes.
The original GitHub source is
`Jacob-Met/RecallWeave@476a8889d14d38dbb83818dada44563cad76c1da`.

| Product file | Verified SHA-256 before and after browser review |
|---|---|
| `src/app.mjs` | `1a6c1d5e4d9e9a5ae223e42cbaf46bbd8471686629eaad4e36c093354fba89cf` |
| `src/review.mjs` | `06f23787c718313e0a3a546ba6677441f7708f3f74cbb4e3d5b347d39a4bf81a` |
| `demo.html` | `3d426fe2c75b57c88ebc163eacec771a230e1dfac69602f51d88e8829196ce01` |

The knowledge model and deck remain the implementation owner's unchanged native
inputs. The independent local source copy passed the existing 14 Node tests.
Running the repository's existing Python demo builder in that copy reproduced
the supplied `demo.html` byte-for-byte. No new runtime dependency was installed.

## Browser result

The final run passed **7 checkpoints**, exited **0**, and recorded no JavaScript
exceptions on ThinkPad Chromium `153.0.8010.47`, using a fresh isolated profile.
The browser consumed the frozen candidate from the implementation owner's QA
copy. Its source files were read only. The full report and execution log are
`candidate-browser-report.json` and `candidate-browser-run.log`.

| Reviewed behavior | Evidence |
|---|---|
| Welcome simulation | It changes neither learner nor retry state before the lesson. |
| First-session preservation | Direct-file lexical bindings expose exact model values, answers, asked IDs and immutable review rows; these match the native model after six initial misses. |
| Practice without rewriting the original | Every one of six incorrect retries and final completion preserves the full original-state snapshot, beyond the rounded percentages displayed in the UI. |
| Repeated input and final Back action | Two successive physical pointer clicks record one retry per question. A single submitted answer focuses the next action. Back from the last feedback completes the bounded round with six separate retry records and no further retry button. |
| Keyboard and accessibility | Space opens and closes native disclosures; all six carry first-try labels and correct expanded state in the accessibility tree. The final result heading receives focus. |
| Actual reset | The actual reload control clears exact mastery, answers, asked IDs, review and completed practice in the direct build. It also discards a paused modular round. Fresh all-correct sessions match across both builds and contain no stale retry records. |
| Bundle and network completeness | The direct build completes with HTTP(S) blocked, attempts only file requests, and writes no local or session storage. The modular build requests only its own loopback origin. |

The report contains eight raw-state fingerprint observations: one for the
welcome simulation and seven for the six retries plus completion. Those are
invariant observations within the tested sessions, not independent learners or
additional trials. The mobile screenshot shows distinct first, correct and
practice answers after the all-incorrect retry round, with no horizontal
overflow at 390 pixels.

## Review driver provenance

The final driver is `review-product-browser.mjs`, SHA-256
`9948358a32950a8ef5dcae08b345fc94994b55ca8d3a3c386d43e54e72e54e03`.
It reuses the implementation owner's CDP transport and basic lesson driver at
SHA-256 `c86c6fe64d3650ab4602f26a0f4bb9346bd7b375f57f55bc139d90ef707e212f`.
The independent scenarios add the assertions above. The transport's startup
allowance is increased from 16 to 45 seconds after the retained initial timeout.
The rest of the transport is unchanged. This shared transport is disclosed;
the independently checked invariants are not claimed to be an independent
browser automation implementation.

Run from any complete copy with Node 22+ and an installed Chromium or Chrome:

```sh
node docs/review-practice/independent-memory-review/review-product-browser.mjs --root "$PWD" --browser chromium --output /tmp/recallweave-independent-review
```

Use a new output directory for each run so failed evidence is not overwritten.
The driver needs no browser package installation and creates an isolated browser
profile under that output directory.

## Retained unsuccessful runs

All preceding failures are preserved and excluded from the final passing count.

| Artifact | Interpretation and correction |
|---|---|
| `startup-failure.json` | Chromium did not publish its debugging endpoint within 16 seconds, before any app checks. The startup allowance was raised to 45 seconds. |
| `initial-simulation-scope-error.json` | The reviewer assumed the welcome-only simulation remained available during practice. The scenario was corrected to exercise the control where the UI provides it. |
| `initial-double-click-focus-error.json` | The reviewer required focus to survive a second pointer click on an already disabled answer. The test now checks the actual first-click focus transition, while retaining duplicate-write and state-preservation assertions after both clicks. |
| `initial-review-selector-error.json` | The reviewer used `:first-child` although the review section begins with a heading and paragraph. The screenshot selector now selects the first matching review item. |
| `receiving-write-failure.json` | A remote write returned `ENOSPC` and left the uploaded driver at zero bytes. Its subsequent empty execution exited 0 with no checks; this is explicitly invalid evidence. Later readings showed 7.2 GB available and 26% inode use, and a fresh rewrite succeeded. The cause of the earlier write failure was not established. |

The matching earlier driver files are retained. Only the reviewer's own stale
failed-startup profile was removed after its browser process had exited; the
entire review fixture tree was 1.9 MB. Available space was already 7.2 GB before
that small cleanup, so the review does not attribute the recovery to it. Other
workers' files, shared caches, live data and installed services were untouched.

## Limits

This review exercises the fixed six-item demo and two local entry points in a
single browser family. It does not establish educational benefit, production
authentication, persistence, synchronization, or general compatibility with
arbitrary external decks. Reset intentionally starts a fresh local session;
there is no durable learner-record assertion. The implementation owner's source
baseline comparison and tests remain separately recorded in the main review
packet. No new product defect was found in these independent scenarios.
