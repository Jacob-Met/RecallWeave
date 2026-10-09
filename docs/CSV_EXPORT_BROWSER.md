# Export a lesson in your browser

Open [CSV question bank](../csv-export.html) directly from your files. It is a
self-contained teacher page: no server, installation, account or connection is
needed. Choose a checked RecallWeave lesson JSON, inspect its title and source
credit, then download both:

- **CSV question bank** saves `question-bank.csv`, with editable question rows.
- **Metadata receipt** saves `question-bank.metadata.json`, with the exact title,
  attribution and license needed to import those rows again.

Keep both files and the original lesson JSON. The established thirteen CSV
columns do not contain the lesson metadata. When using the existing CSV importer,
provide the receipt's three `metadata` values explicitly. Editing the CSV changes
its hash; the downloaded receipt describes the original export, not later edits.

The preview shows the selected filename, question and concept counts, literal
source credit and the source/CSV SHA-256 values. Expand **Inspect the CSV text**
to see the exact proposed output. Source text is displayed as text, including
markup and formula-looking strings. Spreadsheet programs may interpret formula
text when opening a CSV; use their text-import controls when preserving it as
literal text. The exporter does not modify those cells.

## What is checked

The browser uses the same `exportCourseCsv` module, lesson validator and PR #122
CSV importer as the [qualified terminal exporter](CSV_EXPORT.md). It rejects
invalid UTF-8 instead of replacing bytes, and retains the terminal decoder's
byte-order-mark behavior: a leading UTF-8 BOM is not silently removed and is
refused as invalid JSON. Source bytes are checked against 256 KiB before and after
reading. Generated CSV and the importer's regenerated JSON must also fit their
existing limits.

The established native schema and losslessness refusals still apply. Unsupported
fields, unpaired Unicode surrogates, unsupported concept order, invalid answers
and other invalid lessons produce no downloadable result. The unchanged importer
must reproduce the checked source before the browser prepares the receipt.

The receipt retains the terminal format `recallweave-course-csv-export/1`.
`input` is the selected browser filename, not an absolute filesystem path;
`output` is `question-bank.csv`. `input_sha256` covers the exact selected bytes,
including original whitespace, and `csv_sha256` covers the exact UTF-8 CSV bytes.
Metadata and counts come from the checked exporter result. The CSV has CRLF
records, quotes every cell and has no BOM. Hashing requires browser Web Crypto;
an unavailable or failed digest disables both downloads and reports an error.

## Replacing or cancelling a selection

Starting another file selection immediately clears the current preview and both
downloads. Cancelling the file chooser, selecting no file, selecting an invalid
file or choosing **Clear selection** leaves no prior result available. You can
choose the same file again. A slow read or hash from an older selection cannot
restore it after a later selection, cancellation or clear action.

The page keeps its state only in memory. It makes no network requests, uses no
browser storage and never writes back to the source file. The two explicit
download buttons use the browser's normal save behavior; a download request is
not proof that a file was saved. The browser controls the destination and any
existing-file naming or replacement prompt. Already completed downloads remain
your files when you clear the preview.

This separate teacher surface does not change Deck studio, importer ownership,
learner sessions or the terminal exporter's create-only filesystem behavior.
The PR #122 importer dependency remains explicit; this page does not establish
its integration into repository main. Structural checking does not establish
teaching accuracy, authorship or reuse rights.

## Sources and checks

The modular page is `csv-export/index.html`; the controller is
`src/course-csv-export-ui.mjs`. The existing validator, importer and exporter are
included unchanged in the generated standalone file.

Rebuild only this page with `python3 tools/make_csv_export.py`. Add `--check` to
verify exact generated-source parity without writing the page. Run the native
controller, real CLI receipt and builder regression tests with:

`node --test tests/course-csv-export-ui.test.mjs`

The standalone artifact opens through `file://`. The modular page needs an
ordinary local static server because browsers restrict module loading from local
files; no server is needed by the shipped `csv-export.html`.
