# RecallWeave: reopen a local deck for editing

Owner: `estate-6e5752b49b6f/production_slice`. The bounded implementation is recorded in [issue 10, comment 6057459630](https://github.com/Jacob-Met/RecallWeave/issues/10#issuecomment-6057459630), coordinated with the authoring owner `estate-6e5752b49b6f/github_integration`.

## Product result

`mountAuthorDeckLoader(root, onReplace)` stages a selected local JSON deck with the existing importer validator. Its title, filename, question count and concept count appear before replacement. Only **Replace draft** passes the immutable validated deck to the editor. The editor owns conversion into editable state, clearing its old undo/check state, rendering, and focus on the deck title.

**Keep current draft**, cancelled file selection, rejected files and failed reads leave the authored content intact. Starting another file choice retires the old staged deck immediately. A slow or failed older read cannot restore an old preview, replace a later choice or overwrite the later editor status. The same file can be selected again after cancellation or an error. Oversized files are rejected before reading their contents; malformed or structurally invalid JSON uses the existing validator's errors. Imported text is assigned with `textContent`.

The implementation and dedicated tests are the only source delta from this owner:

| Path | SHA-256 |
| --- | --- |
| `src/deck-author-loader.mjs` | `3e52e81849fca916f64d117761ebc033bb4308efa623c3e545f72b04401c3ab7` |
| `tests/deck-author-loader.test.mjs` | `ff1cfb001f8ca28b50a7b74c07a2026e13a44ecfcf4d5552dde887ec016d433a` |
| `tests/deck-author-loader.browser.mjs` | `ce908e4d1983601bc84019b157426540a484a1896464b4b59abbab1a3512d700` |

The importer contract remains owned by issue 7. Its exact dependency is `src/deck.mjs`, SHA-256 `621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`. This packet includes the source dependencies used for receiving, with their hashes in `verification/composition-source.json` and the final browser receipt. They were copied read-only into this isolated directory; no edits were made to another owner's checkout. The learner app, content, model, import contract, shared learner styles and author editor state remain with their existing owners.

## Verification

Seven Node tests pass. They challenge exact immutable handoff and single replacement, invalid/oversized/unreadable files and retry, explicit cancellation and focus, reopening the native chooser, newer choices superseding slow successes or failures, cancelled reads, and invalid newer choices retiring earlier valid staged or pending decks. The test fixture uses native `EventTarget` and `File`; browser receiving separately exercises the real DOM and actual file selection.

Six real-browser groups pass using Chromium `153.0.8010.0`. Fifteen native file chooser requests were observed. The browser checks include:

- An unfinished draft survives preview and keyboard cancellation without any form state change.
- An actual file downloaded by the authoring owner's browser suite reopens and downloads with full metadata, original question IDs, order, concepts, prerequisites, options, correct indices, explanations and transfer prompts preserved.
- A checked draft and its preview remain intact after malformed, oversized and unreadable real files, followed by a valid retry. The oversized file's `text()` method is never called.
- Controlled real-browser `File.text()` completions prove newer choices win against earlier success or failure, including after the newer draft is already committed and while the learner continues editing.
- A dispatched DOM `cancel` event retires a controlled pending read, and an invalid newer file retires an earlier staged replacement. The native operating-system chooser's Escape behavior is not claimed by this event-level control.
- The self-contained `author.html` works with network conditions set offline at a 390 px viewport. The long incoming title and filename wrap within their 306 px content regions. Keyboard Tab reaches Replace draft and Keep current draft, cancellation returns to Open a deck, and the actual phone-authored file round-trips exactly.

There are no observed page exceptions or off-origin requests. The modular and standalone source hashes were stable throughout receiving. `python3 tools/make_author.py --check` confirmed the standalone file matches those exact modular sources. Both final phone screenshots were inspected. This Linux browser image lacks CJK font glyphs, visible as fallback boxes in the deliberately repeated CJK-title stress fixture; the actual Unicode bytes and layout bounds are preserved, and no font coverage claim is made.

The final browser receipt is `verification/loader-browser/receiving.json`, SHA-256 `8a03b755d31623b62702348206b21cbaae068e96c04831d65ae3fe8c9e26c7ab`.

### Actual-file fidelity

These inputs came from the authoring owner's actual browser downloads, not a reconstruction for this test. The loader browser's reexported files match the original bytes, as well as their full parsed deck values.

| Input and reexport | Bytes | SHA-256 |
| --- | ---: | --- |
| `authored-final.json` | 1,642 | `6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9` |
| `authored-standalone-phone.json` | 1,614 | `0114f86e786a6db1ba0c0cd813e00e409935502fa9e1d5c18b434d9f4eec4035` |

### Preserved receiver correction

The first browser run passed the first five groups, then stopped on the receiver's assertion that document scroll width must equal the 390 px viewport. Chromium uses a 15 px native scrollbar, so the correctly fitting document is 375 px wide. The acceptance was corrected to require the viewport to equal 390 and the document width to be no greater than the viewport. The original harness, failed receipt and screenshot remain in `verification/loader-browser-r1/`. There was no production change between these two runs.

## Reproduce

Run from this packet's root with Node 22 or later and an installed Chromium executable:

```sh
node --test tests/deck-author-loader.test.mjs
python3 tools/make_author.py --check
node tests/deck-author-loader.browser.mjs --browser /path/to/chromium
```

The browser suite creates its own temporary files and profile. Profiles are closed after each run. The receiving archive omits generated browser fixtures and keeps the unchanged actual input downloads, reexports, sources, reports, screenshots, native log and both harness versions. Rerunning the final harness recreates every generated fixture. The archive's exact file list and SHA-256 values are in `evidence-manifest.json`.

The authoring owner separately exercised these real downloaded decks through the issue 7 learner importer. This packet qualifies the loader and author composition stated above; composition with current-main notes/reflections remains the relevant owner's integration responsibility.
