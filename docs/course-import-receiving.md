# Receive a selected course through the learner

The selected-course receiver imports one course JSON through RecallWeave's real browser file picker, answers its questions, checks feedback and first-session review, types a reflection, practices deliberately missed questions, and verifies the actual downloaded study notes. It runs the modular app over a private loopback server and the standalone `demo.html` directly from disk at a 390-pixel viewport.

Use it when a course's content has already been reviewed and you need to verify that this learner can actually use it. Its expected answers come from the selected course's own answer key. It does not independently validate subject matter or measure learning effectiveness.

## Requirements and scope

- Node.js 22 or later with the global WebSocket API.
- A locally installed Chromium-based browser executable (Chromium, Chrome or Microsoft Edge) that supports the DevTools protocol and headless mode.
- A complete RecallWeave source checkout with the maintained learner files and a matching standalone `demo.html`.
- An existing UTF-8 course accepted by `src/deck.mjs`'s `parseDeck`. Every question prompt must be unique, because the receiver identifies visible questions by prompt and visible options by text.
- A new output-directory path with a writable parent. Browser profile, temporary-file, source and output locations must be accessible under the selected browser's normal operating rules.

The receiver creates its own browser profile, loopback HTTP server, tabs and output files. It requests browser shutdown when the run ends and verifies that the actual browser process has exited and its debugging connection has closed before removing the profile. A successful launcher exit alone is insufficient: the receiver follows a launcher handoff through its fresh profile's own debugging endpoint. Cleanup has a bounded 30-second process/connection observation period after the close request; protocol calls have separate bounded timeouts, and inability to verify it fails the run and preserves the profile for investigation. It does not attach to an existing browser profile or alter the learner source.

The current receiver checks this repository's maintained DOM and study-notes format. A future intentional UI change may require a reviewed receiver update. A receiver failure is evidence to investigate, rather than an automatic diagnosis of a content or learner defect.

## Run

From the source checkout, regenerate the standalone artifact using the maintained builder and then run the receiver:

```sh
python3 -B -S tools/make_demo.py
node tools/check_course_import_browser.mjs \
  . \
  /absolute/path/to/selected-course.json \
  /absolute/path/to/new-receiving-output \
  /absolute/path/to/chrome
```

Building can update `demo.html`; review that change before receiving and record the source revision being qualified. The receiver itself only reads the learner and selected course. Its receipt records their exact SHA-256 and Git blob identities before the run and verifies that their bytes remain unchanged.

The browser argument can instead be supplied through `RECALL_COURSE_BROWSER`. The default is `/snap/bin/chromium`. An optional `RECALL_COURSE_PROFILE_ROOT` selects an existing or creatable parent for the receiver's fresh private browser profile. Use the browser's supported writable directories; do not disable its sandbox or change a user's home to accommodate a test. Temporary-directory variables depend on the operating system and browser launcher: `TMPDIR` on POSIX, and `TMP`/`TEMP` on Windows, can select a private directory when the default temporary filesystem has insufficient space. A launcher may ignore or transform these values. Verify actual downloads and retain failures; setting a variable alone does not establish that the browser used it.

The output path must not already exist. Retain failed attempts and choose a fresh output path for a subsequent run. The receiver makes no source or publishing changes.

## What it exercises

For both desktop HTTP and mobile-width standalone file entry points, the receiver:

1. Opens the native course file chooser, selects the supplied file, and checks title, question count, concepts, attribution and license before explicitly starting it.
2. Covers every authored question once, comparing visible answer text to that question's supplied key despite shuffled choices. It deliberately misses the first one or two authored items so the review and retry paths have actual work.
3. Checks feedback, explanations, transfer text and first-session answers against the supplied course. It records the learner's displayed mastery estimates without interpreting them as measured learning.
4. Types a synthetic reflection into the first review question and checks that the actual saved notes retain it with that question.
5. Downloads study notes through the browser before and after retry practice, verifying ordered prompts, first answers, correct answers, explanations, attribution and practice results.
6. Pauses and resumes practice when at least two questions were missed, while checking that first-session answers and mastery remain unchanged.
7. Checks question content for horizontal overflow, then switches back to the bundled lesson and verifies that its new session does not change the notes already saved.
8. Verifies the actual delivered learner response bodies against the local source hashes, checks for JavaScript exceptions and unexpected page requests, and closes its own resources.

Option shuffle counts are observations. An identity permutation is valid and is not a reason to fail.

## Read the result

The process exits zero only when its required checks and cleanup succeed. It prints a compact JSON outcome and writes `browser-receipt.json` with the exact source and course identities, browser and Node versions, passed/failed observations, downloaded-file hashes, navigation and request evidence, and cleanup status.

The output also contains screenshots, the real study-notes text files, intermediate observations, the HTTP self-check and Chromium diagnostics. These files are useful for independent receiving review. Screenshots and notes include the course's content and the receiver's synthetic reflection; apply the course's own distribution terms when sharing them.

A canceled or incomplete download fails receiving even if the questions worked. Keep the failed receipt and determine whether the cause is the application, browser behavior, filesystem capacity or an operating-environment restriction. A successful parser, builder or question-only pass does not establish successful downloaded notes.

The tool has no GitHub Actions, deployment, network publication or scheduling behavior. Publishing source and delivering its evidence remain explicit project work.

## Recorded receiving

The [receiving packet](receiving/course-import-dc7255e161d3/README.md) records the first complete run of the separately reviewed twelve-question expected-loss course on the verified MSI device, with Node 24.19.0 and Microsoft Edge 155.0.4283.45. It includes the exact source/course identities, successful browser receipt, four actual note downloads, representative screenshots, independent review and the earlier failed attempts. The screenshots and notes come from a synthetic receiving session that deliberately misses two questions; they are not a real learner assessment.

## Provenance

The receiver was adapted from the already received course consumer at `docs/receiving/reading-data-evidence-39c2b591/consumer/tools/course-receiver.mjs` (Git blob `a8463666af00e63ebeff757487438c90fafc3b0a`). It generalizes the selected course, removes a fixed twelve-question oracle, and adds exact source/course receipts, reflection binding and owned-resource cleanup.

Development and receiving ownership: [issue #315](https://github.com/Jacob-Met/RecallWeave/issues/315). The first intended consumer is the separately owned and content-reviewed [expected-loss decision lesson, issue #235](https://github.com/Jacob-Met/RecallWeave/issues/235). Content authorship and independent subject review remain with that lesson's existing owners.
