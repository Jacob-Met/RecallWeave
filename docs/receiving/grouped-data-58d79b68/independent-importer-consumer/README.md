# Actual grouped-data importer consumer receiving

## Verdict

**PASS for the exact received learner composition and the actual grouped-data course.** This closes the previously unavailable consumer integration check: the twelve-question course now runs through the finalized importer on both the modular loopback learner and the standalone file learner. No importer, learner, notes, authoring, explorer or course source was changed by this receiving lane.

Two browser scenarios ran once in one owned Chromium process. Together they passed **1,272 granular assertions**; that count is not a claim of 1,272 independent test cases. Each scenario recorded twelve first answers, with one deliberate denominator mistake, then one separately recorded correct practice answer.

## Source and ownership

- Importer parent: `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`.
- Received native composition: `7bd6f10eb76939ab51abdd54c003b1e4fd8eb8dd`, tree `823281f8bb0f035f85a23d6a7251cdce93bdd33f`.
- Actual course SHA256: `8ea687ed9157c0a81f155d2f96bc381ebe3024c0c582cf177c0814656460d20d`.
- Public offer: [RecallWeave PR42](https://github.com/Jacob-Met/RecallWeave/pull/42), head `73bb20468137060757614ee08f89fb844dadfe9f`, tree `c2688cd57d6758ed920c768274b8e5016abb2af8`.
- Original importer ownership remains `estate-490fcd7c4056`; the course remains root's #27 contribution. This review was declared in [issue7 comment6060810651](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6060810651) and native claim 4128.

Only thirteen learner files, 152,513 bytes, were materialized from exact committed Git blobs. Each independently matched the importer parent. The hosted readback also matched all thirteen learner blobs/modes and the actual course; unrelated documentation and evidence were outside that source comparison. The materialized files were hashed again after the browser run.

## Independent control construction

`consumer-control-freeze.json` pins the receiver specification, the exact input course, the independently derived answer expectations and the existing transport before current app internals were read. The expectations came from this reviewer's previously sealed blind content review, with the received v2 option mapping. Author tests and internal learner state were not used as the answer oracle.

After freezing expectations, the current app, picker and notes module were read to locate public controls and interpret the exposed notes format. The saved receiver selects the physical course file with CDP's file-input operation and uses native Enter key events for Start, answer, review, practice and download controls. It chooses by displayed option text, then independently checks the canonical index and all displayed options against the exact course.

## Observed behavior on each route

The modular route used the owned GET-only loopback server; the standalone route opened `candidate/demo.html` using `file://`.

1. A bundled lesson was left unfinished after one answer, at 1/6. Selecting the course produced the actual title, twelve prompts, attribution, license and explicit replacement warning.
2. Preview and cancellation preserved the current question HTML, feedback, model display, progress, page context and trace-control markup exactly. A second preview also preserved the unfinished session. Only activating **Start this deck** switched to the imported course and reset progress to 0/12.
3. Every one of the twelve distinct course prompts appeared. All visible option texts and canonical mappings matched the received course. Feedback preserved the independently reviewed explanation and transfer text.
4. The deliberate `grouped-denominator` first answer was **42 / 90**, while the correct answer was **42 / 70**. The other eleven first answers were correct. The learning trace retained the original **11 of 12** result and all twelve first-answer records.
5. Practice offered the single missed question. Opening practice, returning to the trace and resuming retained an unanswered 0/1 retry. Choosing **42 / 70** then recorded one correct retry. The original first answer, first-result status and model estimates remained unchanged.
6. Four actual notes downloads completed: one before and one after practice for each route. Their original GUID files and exact text copies are retained. The receiver compared every prompt, concept, first choice, original correctness, correct answer, explanation, transfer, supplied attribution and license. The final notes added the separate correct retry without changing the first answers or original model block.

The current UI exposes **plain-text .txt study notes**. It does not emit item IDs in that format; the receiver maps unique exact prompt text to the independent course IDs. No JSON or Markdown notes output is claimed. Original download timestamps and bytes were preserved without normalization.

| Actual download | Bytes | SHA256 |
| --- | ---: | --- |
| Modular before practice | 10,734 | `02c7cc5d54a2df64c2bbba75dd20260799ab5f1deacb921f7438a9af368d574f` |
| Modular after practice | 10,766 | `4e61de34c672f0b4212d62e175f0b9df4b8ebd88a6d32f5d201727b4496eb9bd` |
| Standalone before practice | 10,734 | `ab1785fd2294922b3605fbec6bdc4cc3fff34ea1d9215c93babbd8a44c709ede` |
| Standalone after practice | 10,766 | `a872564b00ee974cec7289a150f34c04c0dd210556a91e1dad765d8d39352775` |

## Runtime and limits

The receiving run used native Node 22.22.1 and Chromium 153.0.8010.47 on the ThinkPad, from 13:40:34Z to 13:40:50Z on 2026-10-08. The reused v2 transport was changed only to pin the direct `/snap/bin/chromium` executable and its launch receipt. The original transport and exact adaptation are retained.

No page runtime exceptions, blocked remote page requests or instrumented page persistence/upload calls were observed. The modular server recorded only GET requests to its own source/data paths plus its favicon. The standalone file route made a file document request. These observations do not establish whole-process zero networking; Chromium's native stderr is retained without being rewritten.

The browser exited with code 0. Its owned profile measured 3,082,195 apparent bytes and was removed after exit. The owned server closed. No additional browser was run and no packages were installed.

This receives the current in-memory preview/cancel/explicit-Start boundary. It does not qualify the separate unfinished-session save/resume proposal in #21/PR37, trace-archive restoration, general importer mutation behavior, all possible practice histories or a different future source composition. It does not repeat the already sealed mathematics or explorer review.

## Evidence navigation

- `RECEIVER-SPEC.md`, `consumer-expectations.json`, `consumer-control-freeze.json`: independent frozen controls.
- `source-freeze.json`, `canonical-readback.json`, `candidate/`: exact native, parent and hosted source provenance.
- `actual-consumer-v1.mjs`, both transport copies and `transport-adaptation.json`: runnable receiver and isolated transport.
- `run-v1/result.json`, `events.jsonl` and the two `*-surface-result.json` files: native completion and detailed observed state.
- `run-v1/*-study-notes.txt`, paired receiving receipts and `downloads/`: four actual completed downloads.
- `run-v1/*.png`: actual preview and retained-miss/retry screenshots for both routes. The modular preview and standalone final trace were independently inspected visually.
- Browser launch/version/observations/cleanup and native stderr remain in `run-v1/`.
- `manifest.json` pins every evidence file except itself and the subsequent `native-receipt.json`. The latter records the final native result and closure of the exact original claim key.
