# Independent archive review

Issue: https://github.com/Jacob-Met/RecallWeave/issues/11

Reviewer: `/root/source_coordination/trace_archive_review`.

Base source: `3e3217959bdf277ae5ef61a7afe68142e2626486`. Native directory: `/Users/me/workspace/estate/estate-49f845d0dece/recallweave-trace-archive`.

## Verdict

**Accepted at the exact pins below.** No consequential codec or controller data-loss/race defect was found. Actual browser download, file selection, rendering, and standalone-page qualification belong to the parent receiver; the small controller test here uses a DOM stub.

## Source reasoning

- The codec requires exactly one valid canonical first answer per loaded deck item, reconstructs immutable review, and checks full precision mastery by replaying the existing model.
- Archived deck content is structural identity only; restored content comes from the already loaded deck.
- Practice is replayed through the existing bounded round API, preserving original first answers and mastery.
- Reading and previewing produce separate state; errors cannot partially mutate the current lesson.
- The controller invalidates older file reads with generation tickets and compares deck, answers, mastery and practice after the read and immediately before confirmation.
- The sole state-changing callback is synchronous at this app pin, preserves the existing answer/mastery containers, replaces completed review/practice state, reconstructs asked IDs, and does not modify reflection-owner state.
- Preview copy explicitly describes replacement of first answers and practice, and preservation of any existing reflections.

The stamp intentionally covers recorded deck/answer/mastery/practice state. Merely moving between review and an unanswered prompt does not discard recorded work. Reflection state is outside this archive and remains untouched by the reviewed callback.

## Independent native observations

Node v26.3.0 on Mac.lan, device `0e3d582f-e25b-44b2-8418-9639fc4e4e33`.

| Case | Result |
| --- | --- |
| Archived explanation changed to different HTML content | Refused as a different course; current state byte-for-byte unchanged |
| A practice replay reaches valid answers, then encounters a duplicate later | Refused as invalid practice progress; current state byte-for-byte unchanged |
| Valid archive after those two refusals | Exact first answers, unrounded mastery, and existing practice restored |
| An earlier file read completes after a newer preview | Newer preview retained; preview did not mutate state; confirmation restores only the newer answers, once |
| An answer changes after preview without invoking refresh | Confirmation refuses; no restore callback; current state unchanged; preview cleared |

Codec receiver PID 19715 completed with exit 0 in 0.09 seconds. These are the previously captured outcomes, retained without a routine rerun. Controller receiver PID 29600 completed with exit 0 in 0.10 seconds. Exact captured output and the controller inline source are retained in `independent-review.json`.

## Source pins (SHA-256)

| File | SHA-256 |
| --- | --- |
| `src/trace-archive.mjs` | `d9e6d4343563eac97a17f0e79ea9080d0cfe694fd74f5e0173b53a4af3d912c6` |
| `src/trace-archive-ui.mjs` | `b32fdef2f1c311193abd25830862b265bca257461bacf008d65a80ed73f1f025` |
| `src/app.mjs` | `be4831f7a82fa5c1188092490412dfcdf6d5d270a31e9a0daa338b44ac352e13` |
| `tests/trace-archive.test.mjs` | `0eccb0565527f78266961796b0faf2d28585a530533b778a956069bcc5c96b27` |
| `src/knowledge.mjs` | `909dd4f171ed55ae7c65493f445b85a4df0f602bc354eca78a09bc4046e471c0` |
| `src/review.mjs` | `06f23787c718313e0a3a546ba6677441f7708f3f74cbb4e3d5b347d39a4bf81a` |

No application source was changed by this review. This acceptance is specific to these pins; later deck-picker, reflection, or option-order integration should retain these state and callback boundaries.

## Final source pin disposition

**Accepted by focused source inspection.** The final diff was read against local commit `7506eb005eb17d8472d359602ed0f103917e2fdf`, and both file hashes below were independently verified. The parent reports that the application was composed onto merged main `a64369f8`.

| Final file | SHA-256 |
| --- | --- |
| `src/trace-archive-ui.mjs` | `c62d7d40460ca20e47dba22a4401aff6aa2afbb0c9b873a94944d140c5fba28e` |
| `src/app.mjs` | `582e0ba9778f775a3b8455fb1928a9ce5a06ad2f1d1d53a3610c09593e3738a2` |

- clearPreview(message, resetInput = true) conditionally clears input.value; the file-change handler calls clearPreview(undefined, false), retaining the native selected filename during reading and preview.
- Generation increment, pending-state reset, post-read comparison, confirmation comparison and sole synchronous restore callback remain unchanged.
- Cancellation, validation/read failure, stale-session invalidation and confirmation retain default input clearing, allowing a later selection of the same file.
- Application composition adds a per-item optionOrders map and uses displayed positions only for option letters; data-choice and data-practice-choice remain canonical item.options indices.
- The archive restore callback is unchanged by the app composition. It does not read or replace presentation order and leaves the review's canonical saved choices intact.

The selected filename now remains visible while its read or preview is current. The three-line controller change preserves the generation and stamp boundaries reviewed earlier. The composed option presentation continues to record canonical indices, so it does not alter saved answer meaning.

No generic tests or earlier receiver cases were repeated. The original captured results and source pins above remain intact; this section records the final source disposition. Actual browser qualification at the final pin belongs to the parent receiver.

Prior report hashes, before this append: `independent-review.json` = `c29cba049affa5eb81b51af0d7434a8a08bcbea80083850933ed91b420c96ea2`; `independent-review.md` = `ec25941a8367cc3329c667646ecb1203d7bbd33810e143b640c833082fe673c8`.
