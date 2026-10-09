# Review repeated questions in your browser

Open [Repeated question review](../course-repetition.html) directly in a current browser. No server, account or connection is needed. Choose a local RecallWeave course JSON, then select **Review loaded course**. The original file is never changed.

The page groups exact repeated prompts so a teacher can inspect the original questions and their context. Repetition may be intentional. A disagreement between authored answer keys is a review cue, not a finding that any particular answer is correct.

## Choose, review, keep

1. Select **Choose course JSON** and choose one lesson of at most 262,144 captured bytes (256 KiB). The page shows the captured filename, byte count and SHA-256.
2. Select **Review loaded course**. File capture alone does not claim the course is valid. This explicit action invokes the existing checked-deck parser and unchanged repetition helper.
3. Inspect the summary and the full matching records. **Source question 3** means the third question in the original course, even when questions 1 or 2 have no repeated prompt.
4. Select **Download review JSON** if the report is useful. The page requests a download named `course-repetition-review.json`; your browser controls where it is saved. Keep the original course alongside it.

Choosing another file immediately clears the previous file, review and download, even before the chooser returns. Cancelling, clearing, unreadable or invalid files, and current hash failures cannot leave a previous report available. Replacing or clearing a pending read/hash also invalidates it; its later completion or error cannot restore a stale report. **Clear** returns focus to the chooser and permits selecting the same file again.

If download preparation fails, the current report is retired. Choose and review the course again before retrying. The page cannot confirm that the browser saved a requested download.

## Read a result carefully

The five counts retain the existing helper's meanings:

- **Questions in course:** all admitted questions, including unique prompts.
- **Repeated prompt groups:** exact prompt strings occurring at least twice.
- **Questions in those groups:** all original members of repeated prompts.
- **Repeated choice sets:** groups with at least two members having the same set of exact option strings.
- **Authored answer disagreements:** those choice groups with more than one selected answer text.

Prompt groups and members retain first-occurrence/source order. Choice order may differ while the selected answer text remains equal. Conversely, the same numeric answer index can select different text when options move. The page shows each question's authored choice position and selected text separately.

Every repeated-prompt member retains its complete validated record: exact ID, concept, prerequisites, prompt, options, zero-based answer index, explanation and transfer prompt. A member whose choice set does not repeat still appears in its full prompt group. Open record sections can be collapsed deliberately. Quoted JSON records make whitespace, control characters and escaped surrogate code units inspectable; they do not trim, normalize or rewrite the content.

The complete helper report is also available in an inspectable JSON section. Questions with unique prompts contribute to the total count but are not copied into the helper's `prompts` list. The report is therefore not a replacement lesson or an export of every original raw JSON property.

A zero-group result means only that no literal prompt repeats within this admitted course. It does not certify semantic uniqueness, factual accuracy, assessment quality or learning effectiveness. There is no comparison between different courses, automatic deduplication, preferred-answer selection, course editing or learner-state change.

## Download format and provenance

The browser uses its own wrapper, separate from the unchanged helper report:

```json
{
  "format": "recallweave-course-repetition-browser/1",
  "source": {
    "filename": "lesson.json",
    "bytes": 1234,
    "sha256": "64 lower-case hexadecimal characters"
  },
  "report": {
    "format": "recallweave-course-repetition/1",
    "course": {},
    "summary": {},
    "prompts": []
  }
}
```

The example abbreviates the report: an actual download includes every field and record returned by the existing helper. `source.sha256` hashes the complete originally captured file bytes, including whitespace and key order. It does not authenticate a teacher or establish who authored the course. The report compares the parser's validated fields; ignored extension fields and raw JSON formatting do not change its semantics.

The saved wrapper uses two-space JSON indentation and one final LF. It contains original repeated-question text, source credit and authored answer keys. Share it deliberately. The page keeps information in memory and writes only through your explicit browser download request. It uses no network, provider or browser-storage API.

## Admission and limits

The raw file cap is checked before reading and again after capture, so a file that grows beyond the cap is refused. UTF-8 decoding is fatal: malformed bytes are not replaced. A leading BOM is retained for the existing JSON parser and is refused as invalid JSON; no alternate admission rule is introduced.

The unchanged parser admits at most 100 questions and its existing metadata, choice, identity, concept and prerequisite limits. Parser-valid escaped surrogate strings remain admitted and preserved in the JSON report. A literal U+FFFD remains a different string. The CSV exporter's separate representability rules do not apply to this review.

The original helper [contract and developer guide](course-repetition.md) remain authoritative. This page consumes the accepted #190 helper and its unchanged native parser; it does not modify the helper, its command-line consumer, Deck studio, learner, saved work or learning model.

## Source and verification

The standalone page is generated from `course-repetition/index.html`, unchanged `src/deck.mjs`, unchanged `src/course-repetition.mjs`, and `src/course-repetition-ui.mjs`.

```sh
python3 tools/make_course_repetition.py
python3 tools/make_course_repetition.py --check
node --test tests/course-repetition-ui.test.mjs
```

The builder uses the existing standalone-page convention and no package dependency. The modular page can also be served from the repository normally. For builder regression tests, `PYTHON` may name an existing Python interpreter; otherwise the test uses `python3`. These are the new consumer's focused gates, not a request to repeat the helper's accepted semantic or CLI campaigns.
