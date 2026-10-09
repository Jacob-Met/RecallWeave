# Compare two course revisions

Run the read-only command from a RecallWeave checkout with an existing Node installation:

```sh
node tools/compare-course.mjs before.json after.json
node tools/compare-course.mjs before.json after.json --format text
```

Both files must be valid local RecallWeave course decks. The command reads them and writes a report to stdout; it never replaces a deck, changes a learner session, or migrates an answer, trace or writing file. Keep the exact original course when using existing course-bound archives.

The JSON report separates **same bytes** from **same validated content**. Its file records contain the literal path arguments, captured byte counts and SHA-256 values. The shared course validator copies only fields used by the lesson runtime. Indentation, JSON key order, an omitted optional format marker and unknown extension fields can therefore change the bytes without changing the compared content. The report is not a lossless copy of the original JSON text.

Questions are paired by their exact IDs. A renamed ID appears as one removed and one added question even when its prompt is unchanged. The complete validated before/after records remain in each retained row; added and removed records are included too. Strings are compared literally, including whitespace, case and Unicode representation. No fuzzy matching or text normalization occurs.

A retained question reports two different kinds of position information. `positionChanged` compares its zero-based indices in the full before and after lists. Inserting one question at the start changes all later absolute positions. `retainedOrderChanged` instead compares the relative order of IDs present on both sides, so that insertion alone does not report a retained reorder. Concepts use the same relative-order distinction and list additions and removals.

Changed question fields appear in this fixed order: concept, prerequisites, prompt, options, answer, explanation, transfer. Ordered prerequisite and option arrays are compared literally. A question can be content-unchanged while its position changes; the summary reports those counts independently.

The answer flags also have distinct meanings:

- `answerIndexChanged` compares the canonical correct-option indices.
- `answerTextChanged` compares the literal text at those indices.

If the options `["A", "B"]` with answer0 become `["B", "A"]` with answer1, the index changes and the correct text remains A. Editing A's wording at the same index changes its text without changing the index. Neither flag establishes semantic equivalence, scientific correctness, teaching quality or compatibility with an old learner record.

The default JSON output is the complete deterministic report, formatted with two-space indentation and one final LF. Text output contains both file identities, equality statements, metadata/concept/order information and a count summary, then the complete relevant records for added, removed or changed/moved questions. Literal text is JSON-quoted so embedded newlines remain unambiguous.

Arguments are exactly two paths, optionally followed by `--format json` or `--format text`. Paths starting with a dash can be written with a leading `./`. `--help` alone prints usage. The command does not read stdin and has no output-file option.

Each input must be a regular file of at most262,144 raw bytes. UTF-8 decoding is strict; malformed bytes are refused. A leading UTF-8 BOM is preserved into the text and refused by the existing JSON parser. Both complete inputs are read and validated before normal output begins. A malformed or missing second input produces no partial comparison.

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | Valid comparison, whether equal or different; or help |
| 2 | Invalid arguments, over-size input, malformed UTF-8, invalid deck, or successful-stat non-regular input refusal |
| 1 | Open/read/stat/close or output I/O error |

Errors are one JSON object on stderr. A failure while writing output can follow partial bytes, so a nonzero command exit must not be treated as a complete report. There is no automatic retry. Concurrently modified files are not read as a cross-file transaction.

The pure helper is `compareCourses(beforeText, afterText)` in `src/course-comparison.mjs`. It delegates to the unchanged `parseDeck`, returns a deeply frozen JSON-safe record and does not access files. The CLI adds raw file identities around that normalized-content result.

Qualification status of the initial private candidate: the contract and independent expected cases were frozen before source authoring. Ordinary-file native receiving, maintained tests and final integration remain unrun/held until an appropriate execution surface is available. Jacob's no-new-GitHub-Actions direction remains active; this guide does not authorize a push, PR, merge or workflow run.
