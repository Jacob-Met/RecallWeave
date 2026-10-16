# CSV question-bank preparation: author qualification

This contribution gives a teacher a local path from an explicitly mapped CSV question bank to a checked RecallWeave JSON deck. The downloaded JSON is received by the existing Deck studio and learner. The preparation page keeps the answer key visible before download and uses the unchanged native deck validator.

Ownership is [RecallWeave #100](https://github.com/Jacob-Met/RecallWeave/issues/100), worker `ultra-20b27c2e-20261008`. Root owns publication, current-tree integration, hosted checks and final receiving.

## Source and ownership boundary

The packet contributes nine new source/test/doc files and one narrow README addition:

- `csv-course.html` and `templates/csv-course.html`.
- `src/course-csv.mjs` and `src/course-csv-ui.mjs`.
- `tools/build_csv_course.mjs` and `tools/check_csv_course_browser.cjs`.
- `tests/course-csv.test.mjs`.
- `docs/CSV_COURSES.md` and `examples/course-question-bank.csv`.
- The README discovery paragraph, preserved separately in `readme-addition.txt` for exact receiving composition.

Original before source: commit `ab7e2dddc03dd2629b7d67c291217c946772d10c`, actual tree `540fd835b60f6b916d24841c6bae4d68998f8140`.

Claimed receiving source: commit `3575993d43245ba38e43801e08c9bbbac7a6b58e`, actual tree `8e1ceed381f1e662e7b87312f4137613402c142f`. Root's complete primary tree had no applicable AGENTS, HALT or WORKSTREAMS file and all nine new paths were vacant. The README original is Git blob `e975e4464a4799c8d437e984f7e4722ccee433a8`; removing the single recorded addition restores it exactly.

The three actual receiving dependencies remained identical between the original before source and the claimed current base:

| Dependency | Exact Git blob |
|---|---|
| `src/deck.mjs` | `f0f8a4b234489c2388f427633f548d56c6ed4c03` |
| `author.html` | `e2e5a2f2294bea56f863319a75d8cb589966fc53` |
| `demo.html` | `cf7eea3792deacc3eb98a22aef539b920fb66746` |

No editor, loader, learner, catalog, course, knowledge model, existing builder or workflow source was modified. Nine staged original control files remained byte-identical. `frozen-source-manifest.json` binds the ten contribution files and the unchanged staged closure; the two baseline manifests retain every fetched original blob.

## Completed native observations

| Receiving path | Outcome |
|---|---|
| Actual original Deck studio before witness | Three positive controls passed; the equivalent CSV was refused as invalid JSON. The requested CSV-to-editable-course capability was absent. |
| Existing deck-contract tests on the original baseline | 12 tests passed in directly captured native stdout. |
| Final native converter plus inherited deck-contract tests | 56/56 passed: 44 converter cases and 12 inherited controls; process exit 0, no skips. |
| Actual Chrome converter and existing applications | 8/8 browser groups passed; zero page errors or nonlocal requests. |
| Scoped standalone build check | Generated HTML and downloadable CSV matched their source exactly. |
| Source preservation | Converter source unchanged during qualification; exact README inverse and all nine staged originals verified. |

The native browser run:

1. Downloaded the exact checked-in CSV template through the visible control.
2. Chose the original synthetic CSV through the actual file chooser, previewed its prompt and numbered-answer order, and downloaded the exact expected JSON bytes.
3. Retired a prior download when metadata changed, then checked the current title.
4. Refused malformed later CSV, invalid UTF-8 bytes and an oversized file without retaining a downloadable old deck.
5. Held the real byte result for one local File.arrayBuffer read, selected a newer file, and verified that the late result could not replace the newer source.
6. Opened the actual saved JSON in untouched Deck studio, inspected both questions, and downloaded an identical checked deck.
7. Opened the same actual saved JSON in the untouched learner, answered both questions by their original choice identity despite display shuffling, and completed the lesson.
8. Inspected the 390px layout: all four controls stayed inside the viewport, were at least 44px high, and the page had no horizontal overflow.

The four native downloads are retained with their browser GUIDs, user-facing filenames, lengths and SHA256 values. They contain the 635-byte template, the 1,144-byte original course, the 1,168-byte newer-source course, and the 1,144-byte studio re-export. `native-delivery-proof.json` binds their exact byte relationships to the before fixture.

The desktop and 390px captures were visually inspected. The before capture shows the retained draft and visible CSV refusal. These are native captures, not generated UI illustrations.

- [Original CSV refusal and retained draft](before-native/csv-refused-draft-kept.png)
- [Completed desktop preparation](candidate-browser-v1/course-desktop.png)
- [Completed 390px preparation](candidate-browser-v1/course-390.png)

## Retained failures and setup limits

The original before witness stays unchanged: `before-native/receipt.json`, SHA256 `5d224555f9ae35c38027d964fc447cb30f8104d669843d0e782613ad447a830b`. Its CSV and valid JSON control are retained byte-for-byte.

The first converter test run passed 55/56. The unknown-header `__proto__` test fixture accidentally read Object.prototype while encoding the test row and called replaceAll on a non-string. That call failed before the converter ran. The correction uses own-property lookup in the fixture helper; every assertion and all production source stayed unchanged. The original test, complete failing stdout and corrected run are retained.

The baseline browser probe had one correction before its first execution: its expected studio heading was changed to the exact native `Open “<title>”?` label. The original unexecuted version and correction note are retained.

Two Mac helper writes hit ENOSPC before execution. The original source, source manifests and completed receipts were intact. No alternate host, dependency install, user-profile reuse or repeated blocked write was used. Native work resumed only after a fresh free-space observation; the source export used an explicit small-space guard. The direct baseline test stdout is retained as the original tool response and does not invent a process exit code that the response did not expose.

Two document-staging setup errors also preceded any document write: a code-cell quoting error and a missing owned docs directory. They changed no tested source. `setup-limits.json` distinguishes all setup failures from executed product results.

## Execution and receiving limits

Local execution used the already installed Node v26.3.0, Puppeteer and Chrome on the approved Mac, only in an owned temporary namespace with synthetic files and new headless profiles. Completed profiles were removed. There were no provider/account calls or changes to a real course or learner state.

The current repository workflow's broader gate is `node --test tests/*.test.mjs` under hosted Node 20, followed by its existing demo-source rebuild comparison. Those hosted gates and later full-tree composition belong to root integration and are not claimed by this author packet. Existing workflow and demo bytes are preserved.

The converter's accepted output is a completed deck: all rows, choice identities, prerequisite links and the exact serialized byte size must pass native admission. It does not infer answers or metadata, import arbitrary spreadsheet schemas, save an unfinished CSV draft, or alter the learner's model assumptions.

## Packet custody

Every publication entry records repository path, native source path, length, SHA256 and Git blob hash. The export uses UTF-8 only where decoding and re-encoding preserves the exact bytes; PNGs and the malformed UTF-8 fixture use base64. Empty stderr files are retained as actual empty files.

All original native source and evidence remains at `/tmp/ultra-20b27c2e-memory-recall-csv`. The publication packet does not include browser profiles or duplicated source checkouts. Root adds its independent receiving receipts and actual integration evidence separately.
