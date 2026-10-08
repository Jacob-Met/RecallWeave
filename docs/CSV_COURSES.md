# Prepare a RecallWeave course from CSV

Open [Question bank to course](../csv-course.html) directly in a browser. It turns a declared local question-bank CSV into the same checked JSON deck that the existing [Deck studio](../author.html) and [learning app](../demo.html) accept.

## Prepare and review a course

1. Select **Download CSV template**. Replace its two example questions with your own, keeping the declared header names. Save as UTF-8 CSV.
2. Select **Choose CSV**, then enter the course **Title**, **Author or source**, and **Permission to use this deck**. Supply the actual attribution and permission for your content; these values are never inferred from a filename or question.
3. Select **Check and preview**. Review all questions, choices, numbered correct options, explanations, transfer prompts and prerequisite names.
4. Select **Download checked deck (.json)**. The downloaded file is named `recallweave-course.json`. Open that saved file in Deck studio to edit it, or choose it under **Bring your own lesson** in the learning app.

The check validates the existing deck structure, identities, links and size. Review the accuracy of the questions and answer key yourself.

The preparation stays in the current tab. There is no upload, account, external request or saved browser state. Keep your source CSV and downloaded JSON before refreshing.

### Changing a preparation

Editing any metadata field clears the checked preview and disables the deck download. The loaded CSV remains available, so select **Check and preview** again.

Choosing a replacement CSV clears the previous source and preview immediately. Cancelling that file selection keeps the metadata but requires another CSV selection. While a file is being read, check and deck-download controls are disabled. A late result from an older selection cannot replace a newer source.

A refused file or later invalid record cannot leave an earlier preview downloadable. A fresh complete check is required.

## Declared columns

Headers are exact and case-sensitive. Their order may vary. Duplicate, unknown, missing required and gapped option headers are refused. For example, `ID`, ` id`, `answer` and `option_0` are not aliases.

Each data record must contain exactly as many fields as the header. Retain empty trailing cells when using the full template.

| Column | Required header | Cell meaning |
|---|---|---|
| `id` | Yes | The exact, unique question ID. |
| `concept` | Yes | The exact concept this question teaches. |
| `prompt` | Yes | The question text. |
| `option_1` | Yes | First choice; must be nonempty readable text. |
| `option_2` | Yes | Second choice; must be nonempty readable text. |
| `option_3` | No | Third choice, or an empty cell when unused. |
| `option_4` | No | Fourth choice; requires the `option_3` header. |
| `option_5` | No | Fifth choice; requires the `option_4` header. |
| `option_6` | No | Sixth choice; requires the `option_5` header. |
| `correct_option` | Yes | Exactly one ASCII digit, `1`–`6`, identifying a supplied choice. |
| `explanation` | Yes | Why the selected answer is correct. |
| `transfer` | Yes | How the learner can apply the idea. |
| `prerequisites` | No | Empty for none, or a JSON array of exact concept names. |

A single bank can mix questions with two through six choices. In the full template, a two-choice question leaves `option_3` through `option_6` empty. An empty choice before a later nonempty choice is refused. A whitespace-only choice is not an empty trailing cell: it is supplied text and fails the native readable-text requirement.

**`correct_option` is one-based:** `1` means `option_1`; `2` means `option_2`. Its value must identify an actually supplied choice. Labels, decimals, signs, leading zeros, surrounding spaces and zero-based guesses are refused. Conversion maps this declared identity to the native deck's zero-based `answer`.

### Exact identities and links

The CSV record order becomes the question order. The numbered option order remains the choice order. Concepts follow their first occurrence in the records.

No question text, ID, concept name or metadata is trimmed, sorted, case-folded, evaluated as a formula, rendered as HTML, or rewritten. Leading/trailing spaces are retained when the value passes the existing nonempty-text rule. For example, `Energy`, `energy` and ` Energy ` are distinct concept names.

An empty or absent `prerequisites` cell becomes `[]`. Otherwise the cell must contain a JSON array, such as `["observation"]`. It is then checked by the existing deck validator: names must occur in the same bank, duplicates and self-links are refused, and the union of links across questions must have no cycle.

In the CSV file, the JSON quotes themselves must be escaped using CSV quoting. A cell whose value is `["observation"]` is written as:

```csv
"[""observation""]"
```

This explicit array representation also supports exact concept names containing commas, quotes or line breaks. No separator guessing is used for concept names.

## Text and record format

The converter uses the comma, quoted-cell and doubled-quote conventions documented in [RFC 4180, section 2](https://www.rfc-editor.org/rfc/rfc4180#section-2). Its declared format also accepts UTF-8 text and LF record endings:

- Records end with CRLF or LF. The final record may have one ending or none.
- Cells containing a comma, quote or line break must be quoted.
- Inside a quoted cell, a quote is doubled: `""`. Literal embedded line endings are preserved.
- A quote cannot appear in an unquoted field. After a closing quote, only a comma, record ending or end of file is accepted.
- Bare CR between records, unclosed quotes, extra blank records, and unequal field counts are refused.
- One optional initial UTF-8 byte-order mark is accepted. It is not part of the first header name.
- Browser file reads use fatal UTF-8 decoding. Invalid encoded bytes are refused instead of silently replacing characters.

Errors identify the source CSV record when possible. Record 1 is the header; record 2 is the first question. A multiline quoted cell can make a record span several physical lines, so diagnostics also identify its starting line.

## Native limits

The input CSV must be no larger than 256 KiB of UTF-8. The exact JSON prepared for download must independently pass the existing 256 KiB JSON-deck limit. Escaping and JSON structure can make the output larger than the CSV.

The current [deck contract](deck-format.md) remains authoritative, including:

- 1–100 questions and 1–32 distinct concepts.
- At most 160 characters in the title; 2,000 in attribution or license.
- At most 80 characters in IDs or concept names.
- At most 2,000 characters in a prompt or transfer text; 4,000 in an explanation.
- 2–6 distinct nonempty choices of at most 1,000 characters each.
- Unique question IDs and valid acyclic prerequisite links.

The native validator measures these text-length limits using JavaScript string length. A later invalid record refuses the whole conversion; it does not create a partial completed deck. Keep unfinished questions in the source CSV or use Deck studio's existing draft workflow.

The converter does not change the learner's adaptive selector, answer shuffling, mastery parameters or scoring assumptions.

## Native API and reproducible build

The standalone preparation page is built only from its own template/UI/converter and the unchanged `src/deck.mjs`:

```sh
node tools/build_csv_course.mjs
node tools/build_csv_course.mjs --check
node --test tests/course-csv.test.mjs
```

The build writes `csv-course.html` and the exact downloadable `examples/course-question-bank.csv`. `--check` refuses stale generated bytes. Existing learner and studio builders are unchanged.

The module accepts already-decoded JavaScript text and explicit metadata:

```js
import { convertCourseCsv } from './src/course-csv.mjs';

const { deck, json } = convertCourseCsv(csvText, {
  title: 'A recorded sequence',
  attribution: 'The actual author or source',
  license: 'The actual permission for this content'
});
```

The return object and admitted deck are frozen. `json` is the exact `serializeDeck` output, including its final LF, and has passed `parseDeck` before return. Browser download uses those same bytes.

The optional native browser receiver uses an already installed Puppeteer module and Chrome. It creates synthetic local fixtures, uses a new isolated profile, refuses nonlocal requests, and retains actual download bytes. Its output directory must not exist:

```sh
node tools/check_csv_course_browser.cjs \
  --output /tmp/recallweave-csv-browser \
  --puppeteer /absolute/path/to/an/installed/puppeteer/module \
  --chrome /absolute/path/to/installed/chrome
```

Use `--control-dir` to select an independently pinned checkout containing the unchanged `author.html` and `demo.html`. The browser receiver also exercises those actual receiving applications. Neither its fixtures nor this converter open or modify an existing learner session.
