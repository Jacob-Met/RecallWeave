# Export a checked lesson to a CSV question bank

A teacher can export an existing RecallWeave lesson for editing in the same
thirteen-column question-bank format accepted by the CSV course importer. The
export preserves question order, IDs, literal text, choice order, the correct
choice, and the ordered prerequisite names. It does not change the source lesson.

This tool depends on the existing CSV importer from PR #122. The initial native
qualification composes that unmerged contribution at
`35ad0108d0a4319db0fbc277c324816f4d93e86c` with main
`698902f9c9c1d5c5023092b85b3632a7cb7a01ed`; it does not establish that the importer
has been integrated into main. Keep the importer and its studio owner's work
unchanged when receiving this addition.

## Use

With the importer present, run from the repository root using Node.js:

`node tools/export_course_csv.mjs --input lesson.json --output question-bank.csv`

Both arguments are required once. `--help` alone prints usage. Paths containing
spaces may be quoted by the shell. The input must be a regular UTF-8 JSON file,
and the output's parent directory must already exist.

The command creates a new CSV and prints a JSON receipt containing the exact
title, attribution and license, source and CSV SHA-256 values, and question and
concept counts. Keep that receipt and the source lesson. These three metadata
fields have no columns in the established question-bank format. When importing
the CSV, provide the receipt's `metadata` values explicitly. A CSV file alone
does not contain a complete lesson's metadata.

An existing file, directory or symlink at the output path is never replaced.
The lesson and generated bank must pass all checks before any output staging
starts. A complete sibling file is then linked into the requested name with
create-only semantics; the private stage is removed. Filesystems that do not
support this local hard-link operation return an error instead of falling back
to overwriting or partially publishing the output.

If stage cleanup or receipt delivery fails after publication, the command exits
with status 1 and identifies the already-created complete CSV on standard error.
Keep that file and the source lesson, which still contains the metadata needed
for reimport. A cleanup failure can leave the private stage directory beside
the output. A closed receipt pipe is reported through this same completion-error
path; it does not mean the CSV was never created.

## Exact format and preservation

The header is exactly this ordered list:

`id,concept,prompt,option_1,option_2,option_3,option_4,option_5,option_6,correct_option,explanation,transfer,prerequisites`

Every cell is quoted. Quotes within cells are doubled, records use CRLF, and
the file ends with CRLF and has no byte-order mark. Empty trailing option cells
represent options that are absent; `correct_option` is the existing one-based
choice number. Prerequisites use a JSON array inside the quoted cell.

The writer does not trim, sort, translate, deduplicate, evaluate formula-looking
text, or alter line endings inside a field. Unicode, quotes, commas, and literal
markup are preserved as data. It imports its own result through the unchanged
CSV converter before returning. The reimported serialized checked lesson must
equal the serialized checked source, including the separately supplied metadata.

The API is `exportCourseCsv(jsonText)` from `src/course-csv-export.mjs`. It returns
a frozen object with `csv`, frozen `metadata`, `questionCount`, and `conceptCount`.
It performs no filesystem access.

## Explicit refusals

The exporter accepts the existing native lesson schema, with these additional
losslessness requirements:

- Declared concept order must equal first occurrence of each concept in question
  order. The importer derives concept order from those rows; the writer will not
  reorder questions or silently change the declared order to make it fit.
- Only the documented native top-level and question fields are accepted.
  Extra fields such as a question rubric or author notes are refused because
  the fixed CSV schema cannot retain them.
- Unpaired UTF-16 surrogates are refused because UTF-8 encoding would replace
  them. Invalid UTF-8 input bytes are also refused, rather than replaced.
- Input JSON, generated CSV, and the importer's generated checked JSON must
  each satisfy the existing 256 KiB byte limit. A compact source can fit while
  its reimported formatted JSON does not; that case is refused.
- Invalid native content, such as missing metadata, unsupported format versions,
  duplicate IDs, empty options, invalid answers or cyclic prerequisites, remains
  subject to the unchanged native validator.

The optional native format field is normalized to `recallweave-deck/1`.
JSON indentation and object-member order are not part of checked lesson data.
The exporter does not extend the schema, carry hidden metadata in new columns,
or silently drop unsupported question data.

## Native checks

`node --test tests/course-csv-export.test.mjs tests/deck.test.mjs`

The exporter tests include the real bundled lesson and the existing CSV example,
all supported option counts and answer positions, interleaved concepts,
punctuated prerequisite names, literal and Unicode text, metadata fidelity,
byte limits, explicit refusals, and actual CLI create-only behavior. These tests
use the real importer and native lesson validator; no replacement parser is
used to declare a round trip successful.
