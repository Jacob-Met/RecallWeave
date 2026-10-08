# Independent authored-course and completed-trace receiving

**Passed on the exact owner composition. No product change requested.** This packet records 13 actual Chromium browser groups for RecallWeave's existing learner importer. It does not publish or merge an alternative importer and does not establish current-main adoption.

## Source and ownership

Importer owner: `estate-490fcd7c4056/root`, [RecallWeave #7 checkpoint 6059419542](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6059419542). Receiver: `estate-49f845d0dece/recall_import_receiving`, extending the standing offer in [comment 6058987247](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6058987247). Active receiving and result coordination are [6060044917](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6060044917) and [6060220075](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6060220075).

| Pin | Exact value |
| --- | --- |
| Frozen original importer | `1804b98a4d94b98556eca9256ec24259b92d007c` |
| Owner composition base | `4775af91ba6a5d4df787669f39b44364dd1e37ba` |
| Main observed before and after receiving | `d22b5ef7c641fc1726ae5b774383f8e6527d73e7` |
| Owner app SHA-256 | `ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb` |
| Standalone demo SHA-256 | `4d1aea8cb8d322ba775222d96c7c18f0393be47cf74098dcf116577cdadf4661` |
| Tested receiver SHA-256 | `36e0ce037c35e3b22393aebb6f4c2f1a5b5fa5c87b5de09c12eb05b9d0d595f3` |
| Final raw browser receipt SHA-256 | `937301771c9b24b32b1a22c3fab853b79afe33157c940a1e2ac20b5849b64f5c` |
| Original source-manifest SHA-256 | `71a954c3b9c134cc5e39a0b4e7dcff612ca67f451150807020c1c1d3148b209a` |

The source was copied read-only from `/home/jacob/RecallWeave-receiving-4775-490fcd7c4056` on ThinkPad. All 55 files, 543,417 bytes, matched before copying, in the receiving copy and after copying. The 14 exercised application/source/build files retained their hashes through the successful run. `python3 source/tools/make_demo.py --check` passed. The owner source snapshot remains in native receiving custody; this public packet contains our receiver and evidence, not an owner production-source publication.

The author is credited at merged PR #16, head `66da3a4af752a9b57a6366e66a5d9438fc277587`; completed-trace source came from merged PR #14, head `bd63e0677b24c3613c1189cf2995fedc87459457`. Prior [module-only receiving](https://github.com/Jacob-Met/RecallWeave/pull/16#issuecomment-6058874022) is distinct from the browser execution recorded here.

## Input and actual browser path

The input is the actual PR #16 browser-authored `authored-final.json`, retrieved from `docs/qualification/deck-author-6e5752b49b6f/author-browser/authored-final.json` at the pinned author head. Its SHA-256 is `6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9`, exactly 1,642 bytes. It has three authored questions, nonzero correct-answer indices, reordered IDs, Unicode and literal markup text. This is synthetic software-receiving content, not a validated instructional course or learner-efficacy result.

The final run used native Node `v22.22.1`, Linux x64 and Chromium `153.0.8010.47`, from 2026-10-08T12:47:05.764Z to 12:47:16.956Z. It drove the modular entrypoint over a loopback static server at 1,280 px and the actual standalone `demo.html` through `file://` at 390 px. Browser-native file inputs were set with CDP `DOM.setFileInputFiles`; state changes used the existing controls with keyboard activation. No application state, deck, first answer, mastery value or practice state was inserted through a testing hook.

For each entrypoint the receiver:

1. Answered part of the bundled lesson, then selected the real authored file. Preview, preview cancellation, an empty file-input selection and invalid JSON preserved that existing lesson.
2. Explicitly started the authored lesson and completed all three questions in the model's selected order. It checked literal prompt/concept/explanation rendering, canonical option indices and displayed letters, review first/correct answer text and supplied attribution.
3. Downloaded a real completed first-session trace, practiced one missed question, returned to the trace and downloaded actual paused trace and study-note files. First answers and full-precision mastery stayed exact.
4. Opened a new browser document. The actual saved trace was refused against the default bundled course. The receiver reimported the same actual authored file, explicitly started it, then checked trace preview, cancellation and tampered-mastery refusal without changing the fresh lesson.
5. Explicitly restored the actual paused trace and downloaded it again. The course, model, first answers, mastery and practice were identical to the saved archive; only the new save time differed. Practice resumed at the next unanswered question with a different displayed option order and finished with separate retry evidence. A final actual trace and notes download preserved the original first answers and model estimates.
6. Demonstrated that explicit fresh import invalidates an already-staged restore, and that a trace read delayed across an explicit course switch cannot revive the old preview or replace the new lesson.

The shared final group verified no script exceptions, no hosted application requests and unchanged source hashes. Twelve actual final downloads and eight final screenshots are retained. First-session order and canonical choices in both entrypoints were `question-2: 3` (miss), `question-10: 0` (correct), `question-13: 0` (miss). The first retry corrected `question-2`; the resumed retry intentionally missed `question-13`. Display orders changed from `[1,2,3,0]` to `[0,1,2,3]` for the first question and `[1,2,0]` to `[0,1,2]` for resumed practice while the stored canonical choices remained correct.

## Instrumentation and bounds

`Math.random` was set to 0 in the first document and 0.999999 in the fresh document solely to make the different option permutations deterministic. A single named trace file's `File.text` promise was delayed for the stale-read case. These hooks do not supply or restore learner state. Notes are compared exactly using the actual download's own `Saved` timestamp as the expected export time.

This packet qualifies the owner composition named above. It does not qualify the owner's later published composition, updated bundled content, author draft additions, reflection hooks or incomplete-lesson hooks. OS file-chooser cancellation was not exercised; preview cancellation and an empty browser-native file selection were. The test uses one browser engine, two real entrypoints and synthetic local data. No account, deployment or live user record was involved.

## Negative evidence retained

- Setup attempt 1 failed before any application execution because the staging script created the destination directory and then requested a non-overwriting copy into that existing directory. The copy step was corrected; no owner file changed.
- Browser run 1 passed two groups and produced actual completed/paused trace and notes downloads, then failed because the receiver generated expected notes at a slightly later timestamp. The sole diff was the `Saved` time. The failure report, original receiver, downloads and screenshot are retained; the receiver now compares expected content using the actual downloaded save time.
- Browser run 2 loaded no learner document. Chromium's DevTools endpoint appeared near the receiver's 12-second startup deadline. The original report, log and receiver are retained. Only the startup bound was extended to 45 seconds; application wait bounds and product source were unchanged.
- Browser run 3 passed all 13 groups. Original stdout, stderr, native process exit receipt and the raw browser report remain unedited.

## Reproduction and custody

The tested script is [receive-authored-import-trace.mjs](receive-authored-import-trace.mjs), with the exact input in [inputs/authored-final.json](inputs/authored-final.json). The raw final report is [final/browser-report.json](final/browser-report.json). [receiving-evidence.tar.gz](receiving-evidence.tar.gz) preserves every receiving run, earlier receiver revision, raw download, screenshot, stdout/stderr log and process receipt. It omits only the owner source snapshot, which is identified by [source-manifest.json](source-manifest.json).

Run against a read-only copy of the exact 55-file owner snapshot, outside its source directory:

```sh
node receive-authored-import-trace.mjs --root /absolute/path/to/owner-snapshot --input /absolute/path/to/authored-final.json --output /absolute/path/to/new-empty-receiving --browser /snap/bin/chromium
```

The receiver starts and closes its own loopback server and clean browser profile. Its provenance labels intentionally describe this exact owner composition. Receiving a later source requires a separately preserved receiver revision with the new source/base labels and its own output directory; do not relabel this raw report as a later-source pass.

Durable native custody is `/home/jacob/recallweave-import-receiving-49f845d0dece` on the authorized ThinkPad. The original temporary staging copy is `/tmp/recallweave-import-receiving-49f845d0dece-20261008`. All source and negative evidence are retained under the receiving owner. No source, adoption, merge or deployment claim is made.
