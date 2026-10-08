# Membrane course receiving on the merged importer

**Accepted:** the frozen membrane course completes local import, lesson, review, practice, and UTF-8 study-notes export in both the modular and published standalone RecallWeave learner. This closes the course-specific consumer gate for PR #26. The earlier independent content and format receipt remains unchanged.

## Exact source and input

The browser used [RecallWeave d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74](https://github.com/Jacob-Met/RecallWeave/commit/d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74), tree `2d6b3849fe9efe0d38f8c3cd62588fb9477d328d`, after importer #7 merged. All 362 files (18,497,252 bytes) matched the authoritative Git blob inventory before execution and all source bytes remained unchanged afterward. No AGENTS.md files are present in that tree. See `source-pins.json`, `upstream-tree.json`, and `post-browser-source-integrity.json`.

The subsequent [receiving main 5c6e5b4ee4b928b01466ffe1ff67ceeca44fb9cc](https://github.com/Jacob-Met/RecallWeave/commit/5c6e5b4ee4b928b01466ffe1ff67ceeca44fb9cc), tree `1c27aa6d30975d556ee5665492b552eee9a94425`, has identical consumer bytes. All 19 files under `src/` and `data/`, together with `index.html`, `styles.css`, and `demo.html`, match; no files were added or removed in that set. Native Git fetch and the GitHub tree read independently confirm the map in `consumer-continuity.json`.

The input is the original `courses/membrane-transport.json` from course commit `8cf80eb0bd1dc1c669285789cb1965277770c509`: SHA-256 `b9f0c657dee8d5bd2dd10cfed8d8205b464473a6b46f707c1336363dc170f800`, 16,328 bytes. Its guide remains SHA-256 `d5c3136fcf63733e7ecec2f04d887805be1d4e55fbfe84e43fb663b5d79a19b1`. The unchanged prior independent content receipt is SHA-256 `50dafcaff9425b3b7413b7c6a555c49fa5c50d9d34ec146e2078eeac5acc32af` in the existing course `independent/` packet.

The receiving contract was frozen before merged-learner inspection. Final driver `review_membrane_current.mjs` is SHA-256 `eda268ed060361b81afcf93bbfae0833fd4bfba22071a11db27b731c32acf2af`. It uses the previously recorded independent answer key and selects complete option text without assuming its displayed letter or position.

## Native observations

Chromium `153.0.8010.0` ran the successful groups on 2026-10-08 from 13:29:48.590 UTC through 13:29:55.653 UTC. Exact observations are in `browser-r3/browser-receipt.json`.

| Consumer | Viewport | First answers | Practiced misses | Actual notes downloads |
| --- | --- | --- | --- | --- |
| Modular index.html, local HTTP | 1280 × 900 | 12 unique items; 8 correct | ms-1, pt-2, os-2, at-3 | Before practice and after completion |
| Standalone demo.html, local file | 390 × 844 | 12 unique items; 9 correct | ms-3, os-3, at-2 | Before practice and after completion |

Both previews showed the exact title, 12-question/four-concept count, attribution, license, and all 12 prompts. Preview preserved the current session markup and lesson description. Explicit **Start this deck** activated the membrane course, with its correct concept labels and document title.

All 24 first-answer interactions used native displayed choices. Twenty-three observed option orders differed from canonical order; expected answers still followed the option text. Every feedback panel contained its exact explanation and transfer prompt. Review contained every item once with the expected original choice, correct choice, result, explanation, and transfer.

Each group paused after its first practice retry, returned to the learning trace, and resumed at the next unanswered item. All original review fields and displayed mastery percentages and meter widths stayed equal to the pre-practice snapshot. The seven intended retries completed separately. The mastery section of each final notes file exactly matched its corresponding pre-practice notes section.

The four actual downloads total 53,886 bytes. Strict UTF-8 decoding passed, preserving the course's en dashes, em dashes, and curly apostrophes. Each file includes all 12 prompts, original first answers, correct answers, explanations, transfer prompts, attribution, and license. Final notes also include exact separate retry answers and completion counts. Download hashes, lengths, and browser-suggested filenames are in the receipt; original bytes are retained.

The standalone group used keyboard interaction for every control, including opening the native file chooser, starting the course, selecting answers, moving between questions, pausing/resuming practice, and downloading notes. Its context had networking disabled and observed only local-file requests. The modular group requested only its local HTTP source. Neither group recorded a page or console error.

Ten document-width checks across preview, question, review, and completed practice found no horizontal overflow. Both mobile screenshots were also inspected: the long title and reference URLs wrap within the viewport, and the final learning trace and mastery labels remain readable.

## Harness corrections and acceptance boundary

Two early attempts stopped at harness assumptions before any course answer was submitted. R1 waited for a trace-download button to be visible while it was inside initially closed controls; waiting for attachment correctly establishes module initialization. R2 tried the bundled welcome button after **Start this deck**, although the importer already starts the first question. The final driver waits for that visible question. Original drivers, failed receipts, logs, and precise dispositions are retained. Neither correction changed the contract, any answer/content/state assertion, or application source. The R2 preview screenshot had the same bytes as the retained R3 modular preview and is not duplicated in this compact packet.

This receipt qualifies the membrane input against the exact merged consumer and its demonstrated byte-identical successor. Other workers retain generic importer, authored-deck, trace-compatibility, and unrelated course receiving. This run does not repeat or reassert their coverage. It is evidence from the stated Chromium build and does not establish learning effectiveness or acceptance of a later changed consumer.

## Reproduction

Use the pinned source archive and exact membrane JSON with the native Node, Playwright, and Chromium paths recorded in the unchanged driver. Create an exclusive runtime/download directory and run Python's local HTTP server and Node within the same execution/network namespace:

```sh
TMPDIR="$REVIEW_RUNTIME" node review_membrane_current.mjs \
  "$REVIEW_SOURCE" "$REVIEW_DECK" "$REVIEW_OUTPUT" \
  "http://127.0.0.1:$REVIEW_PORT" "$REVIEW_RUNTIME"
```

The driver opens demo.html from the same source for the standalone group and writes observations and actual downloads to REVIEW_OUTPUT. It does not edit the source. Compare all input source bytes with source-pins.json before and after execution.
