# Local lesson deck format

RecallWeave can run a lesson supplied as a local JSON file. Start with **Download
example deck** in the app: it exports the existing six-question lesson with its
source attribution and the version field `"format": "recallweave-deck/1"`.
The original [`data/deck.json`](../data/deck.json) also imports directly; omitting
`format` is supported for compatibility with that bundled file. An explicitly
different version is rejected.

Edit a separate copy and choose it in the app. A valid preview does not change the
current session. **Start this deck** replaces the session; **Cancel preview** keeps
the current answers, progress, review and practice. Failed imports do the same.
The importer never overwrites your file. A fresh local session retains the selected
deck, while a page reload returns to the bundled example.

## Top-level fields

The top-level JSON value is an object. Text fields must be nonempty after checking
for whitespace, and their original text is retained. Names and IDs match exactly;
the importer does not trim, translate or combine them.

| Field | Required content |
|---|---|
| `format` | Optional; if present, exactly `"recallweave-deck/1"` |
| `title` | Lesson title, up to 160 characters |
| `attribution` | Who supplied the content and its sources, up to 2,000 characters |
| `license` | Reuse terms that apply to the content, up to 2,000 characters |
| `concepts` | 1–32 distinct concept names, each up to 80 characters |
| `items` | 1–100 question objects, described below |

Every declared concept must have at least one question. Concept names are also the
labels shown during the lesson. For example, `"Observation"` and `"observation"`
are different names. Use consistent spelling in questions and prerequisite lists.

## Question fields

| Field | Required content |
|---|---|
| `id` | Unique question ID within the deck, up to 80 characters |
| `concept` | One exact name from `concepts` |
| `prerequisites` | An array of other concept names; use `[]` when none apply |
| `prompt` | The question, up to 2,000 characters |
| `options` | 2–6 distinct nonempty strings, each up to 1,000 characters |
| `answer` | Integer index of the correct option, starting at zero |
| `explanation` | Feedback shown after the answer, up to 4,000 characters |
| `transfer` | A prompt for applying the idea, up to 2,000 characters |

For example, `"answer": 2` identifies the third option. The option count may vary
between questions. The importer rejects a missing answer, a string such as `"2"`,
a fractional index, and an index outside the options array.

Prerequisites describe concept relationships used by the existing adaptive
selector. They are not hard gates that prevent a question from appearing. The
selector favors an unanswered question in a weak concept when it supports other
unanswered questions. A concept cannot require itself, a prerequisite cannot be
repeated, and the combined links across questions must not form a cycle.

Here is a small structural example. Replace the attribution and license placeholders
with the actual source and terms for your material:

```json
{
  "format": "recallweave-deck/1",
  "title": "Observation and interpretation",
  "attribution": "State who authored the lesson and which sources it uses",
  "license": "State the reuse terms that apply to this content",
  "concepts": ["observation"],
  "items": [
    {
      "id": "observe-1",
      "concept": "observation",
      "prerequisites": [],
      "prompt": "Which sentence records an observation?",
      "options": [
        "The meeting will probably be delayed.",
        "The log records a start at 09:00."
      ],
      "answer": 1,
      "explanation": "The log entry is the observation in this example; the other sentence is a prediction.",
      "transfer": "Write one observation and a separate interpretation of it."
    }
  ]
}
```

## File limits and behavior

The file is read as UTF-8 JSON and may be at most 262,144 bytes (256 KiB), including
whitespace. Field length limits use JavaScript's UTF-16 string length. The importer
checks every question before offering a start, so a malformed later question cannot
produce a partly usable lesson. Error messages identify the relevant field or rule.

All lesson text is displayed literally, including angle brackets and quotation
marks. HTML, Markdown, links and script text are not rendered as active content.
Extra fields are ignored and excluded from the session copy; they cannot change
model parameters or seed prior answers. The validated deck and its nested arrays
are immutable snapshots, so selecting or reading another file does not modify the
active deck.

The fixed Bayesian model and its illustrative guess, slip and learning assumptions
are unchanged. Changing the number of options does not refit those assumptions.
The importer checks structure and consistency, not subject correctness, attribution
accuracy, reuse permissions or assessment validity. Explanations are shown after
each answer; practice remains separate from the learner's first-answer trace.

The file picker, lesson, review and practice stay on this device, in the current tab.
No account, network upload, persistent browser storage, hosted model call or external
content fetch is involved. Keep the JSON file if you want to use the lesson again
after a reload.
