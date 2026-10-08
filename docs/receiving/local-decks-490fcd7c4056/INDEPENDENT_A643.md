# RecallWeave current composition — independent review

**Accepted at the pinned receiving source.** Six independent native browser groups pass: three on the modular app and the same three on the direct-open standalone file. No product repair was needed. All 24 source hashes remain unchanged, both surfaces have no page errors or attempted external requests, and no review-owned Chrome process remains.

## Source and integration review

The receiver composes importer **1804b98a4d94b98556eca9256ec24259b92d007c** over main **a64369f84fae4cfd0b81aa3878cc11e2fa8d298c**. The original importer base was **262bf32aa09bcc62fb5a29c3b97d26bcdc31b27d**.

| Receiving artifact | SHA256 |
| --- | --- |
| src/app.mjs | 127aa16906716e7c7644ed76221d160df64ac249a9295e8735fa8e09414aa33a |
| demo.html | 6fbe128ac99d88dbeae115acd8ba41e80f8a23954a72eca5f82db6b70ae01569 |
| tools/make_demo.py | 590e5b8fe8aee4b6cb075521ba2c6b8b3a96a6c138361a6f362da2c844a4d83b |
| Independent browser harness | 94407951bf9cb9ce5d109c191893dfb9eb0fdc42546787b7d7f7b070d29b5228 |

The source delta has the expected integration behavior: app.mjs imports both incoming modules, builds per-question option orders when initializing or resetting a session, renders escaped canonical choices in that order, retains the map through practice, and builds notes from the selected deck and canonical first-answer snapshot. The standalone builder embeds both new modules before the app and removes their module syntax consistently.

The two incoming modules, their tests, and both incoming browser tools remain byte-exact with current main: session-export.mjs, answer-order.mjs, their two test files, check_notes_browser.mjs, and check_browser.mjs. The knowledge model, review model, deck validator, deck picker, and bundled deck remain byte-exact with the original importer. The app, builder, and README are the expected composition changes. These comparisons are recorded in source-delta-review.json. README.md and the deck-format guide were read as the relevant behavior documentation.

## Distinct executed challenge

The isolated ThinkPad run used Node **22.22.1**, installed Chrome for Testing **154.0.8037.57**, and read-only Playwright **1.62.1**. It used its own copied source and short private browser temporary directory. The full run completed in **5.256 seconds**.

The fixture contains three imported questions with **2, 3, and 6 options**, plus a replacement deck that reuses the six-option question ID with two new choices. The harness supplies deterministic randomness as an external input; production handlers, models, and file readers remain intact. It answers with actual Enter and Tab events according to visible button position and downloads actual browser-produced files.

1. **Visible choices and canonical answers.** With randomness set to zero, each question has an observable nonidentity order. The reviewer selects the first visible answer through the keyboard, checks visible A–F labels and literal option text, and verifies the resulting first answers, canonical correct answers, adaptive question order, and count in the downloaded notes.
2. **Practice under changed randomness and a staged replacement.** Randomness changes to 0.999999 before practice. Each retry must retain its first-session display order. After one retry, the reviewer downloads paused notes, stages another deck with the same filename, resumes the original practice, cancels the staged deck, and finishes. Original first answers and model estimates remain unchanged; the completed download records the three correct retries separately.
3. **Fresh reset and explicit replacement.** While the replacement is staged, a fresh session retains the current deck and rebuilds its order from the changed randomness. Explicitly starting the replacement uses the new two-option content for a reused question ID. Its download contains only the replacement's questions and attribution. Earlier downloaded files retain their exact hashes. A subsequent reset retains the replacement deck and responds to another randomness change with a new order.

Each group passes on both source forms, for **6/6 groups**. There are **8 successful actual downloads** and **14 recorded answer-order observations**. The receiving source before and after the run matches all 24 expected hashes. This focused integration evidence complements the parent's existing importer and inherited-suite receipts.

## Evidence and handoff

- Receipt SHA256: **b09daea8e5a3b7fd4ec275ca9c6054522e6d3972135a003a19583d6052ae9cec**.
- Native log SHA256: **648acc7c6ae131828eeeb989fdb5b0db5ad6baac7d842316879777ce9a213ed7**.
- The archive contains the exact 24-file source snapshot, source manifest and comparison, independent harness, raw log, inputs, observed orders, all eight downloaded text files, and this review.

Native evidence remains at `/home/jacob/RecallWeave-independent-490fcd7c4056`. The independent local workspace is `/dev/shm/hamon-490fcd7c4056-recallweave-independent`; RAM was used because the shared overlay was full. Publication and any later upstream receiving composition remain with the parent. This acceptance applies to the exact pins above.
