# Compare two course revisions in the browser

Open `course-compare.html` directly, or serve `course-compare/index.html`. Choose an earlier and a revised checked course JSON. Both files stay local. Each accepted file shows its literal name, title, question/concept counts, captured byte length and SHA-256.

Choose **Compare loaded courses** to review the loaded pair. The page uses the existing course-comparison helper from issue177 unchanged. Metadata, concepts, original question numbers, exact IDs, added/removed records and retained content/order changes remain distinct. Correct-answer position and correct-option text changes are reported separately. An ID rename remains a removal and an addition; no fuzzy matching or learner-record remapping is attempted.

The page compares admitted content. Formatting, JSON key order and ignored extension fields may change raw bytes without changing the validated course. The byte and content statements are shown separately. Literal differences do not establish scientific correctness, pedagogical equivalence or compatibility with saved learning records.

A new file selection retires the report immediately. Cancelled selection preserves the current pair/report. A refused replacement retains the prior accepted copy but requires another explicit Compare; the error names that retained-copy behavior. Clearing a role retires any pending read for it. Newer selections cannot be overwritten by an older completion.

**Download comparison JSON** saves the captured pair identities and complete native comparison, including full question records and answer keys. Unchanged title, attribution and license fields are not included in this report; keep the original course files for their complete metadata. Keep it private where appropriate. It is a review record, not a revised course or a learner archive. No file, editor, course or learner record is changed, and nothing is saved automatically.

Files must satisfy the unchanged local-deck validator, including its256KiB UTF-8 limit. The page refuses oversized files before reading, checks the captured size, decodes UTF-8 strictly and keeps a BOM visible to the native parser. Questions, options, prerequisites, metadata and whitespace retain their original meaning under that validator.

The self-contained file is generated deterministically from the same modules and stylesheet with `node tools/build-course-compare.mjs`; `--check` verifies exact parity. The owner comparator is a required read-only source dependency. Dependency admission and actual native/browser receiving must complete against its frozen offer before this consumer is qualified. No substitute comparator is part of this contribution.
