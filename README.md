# RecallWeave

**ForgeHacks 2026 · AI + Education** — an original, static, browser-only learning experience whose bundled lesson connects ideas in cellular energy. Learners can also bring a local JSON lesson deck. The official track framing on ForgeHacks is “Reimagining how people learn and teach.” This demo responds to that brief by helping a learner retrieve concepts, see links, and apply them—not by generating chat answers.

## Run it

Open `demo.html` directly in a browser—no server, install, build step, internet, login, API key, or user data storage is required. It is a single self-contained file with embedded CSS, JavaScript and deck. The modular source is in `index.html`, `src/`, and `data/`; to test that version locally, serve this directory with `python3 -m http.server 8080` and visit `http://localhost:8080`. Rebuild the direct-open demo with `python3 tools/make_demo.py` after source changes. No hosted endpoint is called by either version.

## Interactive binary-search companion

Open [the binary-search explorer](courses/binary-search-explorer.html) to step through the exact lower-bound loop from the existing **Binary search: precise boundaries** course. The file works directly in a browser without a server or connection. Enter up to 32 sorted integers, choose a target, and inspect each comparison, the classified prefix/suffix, unresolved element indices `[lo, hi)`, and possible answer boundaries `[lo, hi]`. Repeated values, absent targets, empty arrays and the boundary after the last element have explicit examples.

**Build trace**, then use **Next**, **Back**, **First** or **Finish**. Editing either input retires the previous displayed trace until you build again. The final insertion boundary is separate from the equality check for membership. Ordering-comparison counts exclude input validation, rendering, sorting, insertion and that final equality check.

The companion downloads the complete trace with its entered text, plus the original unchanged course JSON and worked guide. To study the course, open RecallWeave, choose the downloaded JSON under **Bring your own lesson**, inspect the preview, then choose **Start this deck**. Downloads do not change an existing learner session. Rebuild the standalone page with `node tools/build-binary-search-explorer.mjs`; verify exact source/course parity with `--check`.

## Follow recursive calls and returns

Open **[Calls go down. Answers come back.](courses/recursion-call-stack-explorer.html)** directly in a browser to step through factorial, Fibonacci, and memoized Fibonacci. Inspect each caller’s suspended calculation, saved child values, actual return order, and a fresh cache. Previous, Next, and the event selector revisit exact snapshots; the completed-run comparison separates total invocations, computed calls, cache hits, and maximum active depth.

Inputs are whole numbers from 0 to 10. Every invocation counts, including base cases and cache hits; factorial uses only the zero base case, and Fibonacci uses F(0) = 0 and F(1) = 1. The memoized algorithm starts with an empty cache and stores base results too. Download the full exact trace with its selected inspection step, or download the original [twelve-question course](courses/recursion-call-stack.json) and open it through **Bring your own lesson**. The [worked guide](courses/recursion-call-stack.md) includes the shared conventions, answer explanations, and transfer prompts.

The explorer needs no server or account and keeps no automatic browser storage. Its trace is an algorithm inspection record, separate from learner-answer archives. Rebuild it with `node tools/build_recursion_call_stack.mjs`; add `--check` to verify that the checked-in page matches its exact sources and validated deck.

## Explore coherent waves

Open **[Coherent waves: from phasors to interference](courses/phasor-interference-lab.html)** for an offline lab that connects two rotating complex amplitudes to their real cosine signals. Predict cancellation, vary relative and common phase, and compare the arrow diagram with the time trace and downloadable values. The [worked guide](courses/phasor-interference.md) explains the assumptions and original examples; save the [sixteen-question course](courses/phasor-interference.json) and open it through **Bring your own lesson** to practice the connections.

## Explore grouped rates

Open **[When groups and totals disagree](courses/grouped-data-explorer.html)** for a separate offline lesson about group rates, pooled samples and a chosen common mix. Edit the recorded counts, inspect exact fractions and download the current comparison. The worked examples explain why both groups can favor one option while the pooled sample favors the other, and why this alone does not establish a causal effect.

The [worked guide](courses/grouped-data.md) includes the assumptions, missing-rate behavior and derivations. To study its original [twelve-question course](courses/grouped-data.json), save the JSON file and open it through **Bring your own lesson** in RecallWeave. The explorer itself opens directly without a server or account.

### Make a course handout

Open [Course handouts](handout.html), choose a checked local deck JSON, review its title and source credit, then select **Use this deck**. Print or save an unanswered worksheet for learners and an explicitly separate answer key with the correct choices and authored explanations. Both keep the original question and option order, literal wording, attribution and permission; transfer prompts leave room for a written response because the deck supplies no separate transfer answer.

Each saved HTML file opens and prints offline on its own. The worksheet file contains questions only; the teacher’s builder and the separate key receive the full checked deck. Cancelling a selection or choosing an invalid file leaves the current handout in place. This is a separate preparation flow; it does not start or change a learning session. Modular source lives in `handout/` and `src/course-handout*.mjs`; rebuild `handout.html` with `python3 tools/make_handout.py`, or verify it with `--check`.

## Explore Boolean logic

Open the [Boolean explorer](courses/boolean-logic-explorer.html) directly from your files to compare expressions, inspect complete truth tables, and find a counterexample when two expressions differ. Download the current full table as CSV or the original twelve-question course as JSON. Import that course through the learner’s existing preview and explicit start flow, then review, practice and save your notes. The [course guide](courses/boolean-logic.md) explains the supported grammar, worked answers and content sources.

## Core and interaction

- `src/knowledge.mjs` implements a transparent BKT update: initial knowledge, learning transition, guess, and slip are explicit probabilities. It also computes binary entropy and expected information gain.
- The adaptive selector picks an unanswered item with highest expected information gain, plus a small bonus for weak concepts that unlock unanswered downstream ideas; ties are stable by item ID. There is no LLM or hidden personalization.
- Answer choices are shuffled once for each question when a local session starts. A question keeps that display order during its practice retry. The visible letter labels follow the displayed order; correctness, review and study notes use the original option identity. Question content and adaptive item selection remain unchanged.
- `src/app.mjs` records the current session only in memory, gives item-level explanations/transfer prompts, and shows estimated mastery as a model state, never a grade or validated diagnosis.
- The completed learning trace keeps every question, the learner's first answer, its correct answer, explanation, and transfer prompt available in keyboard-operable review panels. `src/review.mjs` takes an immutable snapshot and keeps a bounded practice round separate from the first session.
- The welcome panel includes a clearly labeled, deterministic synthetic learner simulation comparing adaptive selection with fixed deck order using the same toy learner assumptions and random seed. Its tiny run is demonstrative, not empirical evidence or an efficacy claim. Test coverage separately evaluates model invariants, not learning outcomes.

## Bring your own lesson

Open the **[Course catalog](catalog.html)** to browse supplied courses, search their
titles and concepts, read source and permission statements, and download an original
course file. In the learner, choose that file under **Bring your own lesson**, inspect
the preview, then select **Start this deck**. The catalog also works directly from
your files without a server or internet connection.

Use **Download example deck** to get an editable JSON copy of the bundled lesson,
including its original attribution. Replace the lesson content using the
[deck format guide](docs/deck-format.md), then choose the file under **Bring your
own lesson**. Both the modular app and the double-clickable `demo.html` support
the same import flow.

The preview shows the title, question and concept counts, attribution, license,
and an expandable list of question prompts with their prerequisite links.
**Start this deck** begins a fresh session with that content and clears the previous
session's first answers, practice and reflections. Until then, the current lesson remains
usable. **Cancel preview**, malformed or unreadable files, and a superseded file
read preserve the current session. **Use bundled lesson** offers the same explicit
preview and start flow for returning to the original lesson.

Decks can contain 1–100 questions, 1–32 concepts, and 2–6 answer options per
question, within a 256 KiB JSON file. Every question supplies its correct answer,
explanation and transfer prompt. The importer checks complete structure, unique
identities, valid answer indices, known prerequisites and absence of prerequisite
cycles before offering a start. Text is displayed literally. An imported lesson
uses its own concept labels and attribution throughout learning, review, practice
and downloaded study notes. Its answer options are shuffled for each new session;
practice keeps that session’s display order and canonical answer identity.

The file and session stay in this tab's memory. Starting a fresh local session
keeps the selected deck but clears its answers and reflections; reloading the page returns to the
bundled lesson. No file is uploaded or written back, and no browser storage or
account is used. The downloaded example is a separate file saved by the browser.

The same illustrative model parameters apply to every deck, including decks with
different numbers of answer options. Imported material and its attribution are
supplied by the file's author; structural validation does not verify subject
accuracy, reuse rights or learning efficacy. The bundled synthetic learner
simulation remains available only with the original lesson because its toy
profile is specific to that content.

## Review and practice

After finishing a deck's challenges, open any question under **Review the connections** to revisit the original answer and explanation. **Practice missed connections** gives each initially missed question one retry in the same order it appeared during the session. A session with every answer correct still offers every review panel.

**Back to learning trace** pauses practice. **Resume practice** returns to the next unanswered prompt, including when the learner left before choosing an answer. The completed review displays first-try and practice answers separately. Correcting a retry does not rewrite the initial trace or update the initial mastery estimates: the explanations have already been shown, so practice is an opportunity for recall, not a new assessment.

Review and practice stay in this tab's memory. Refreshing the page or starting a fresh local session clears the active state; an explicitly downloaded learning trace can restore the recorded answers later. The modular app and the direct-open `demo.html` provide the same flow.

### Write your own explanations

Each completed review panel has a **Your explanation** field beside the existing transfer prompt. Write or revise how you would connect the idea, including for questions you answered correctly. **Apply it in your own words** provides a separate place to respond to the current lesson's application prompt: the energy pathway for the bundled example, or a connection between ideas for an imported deck.

Writing stays attached to its question while you open other panels or pause and resume practice. Edits take effect as you type; clearing a field clears that reflection. Your writing is not scored and does not change your first answers, practice results, or model estimates. Starting another deck or a fresh local session clears the writing; a fresh session keeps the selected deck. Reloading also clears writing and returns to the bundled lesson. Download study notes to keep a readable copy.

### Keep your study notes

After the first session, choose **Download study notes (.txt)** to save a readable copy of the complete learning trace. The file includes the question order, actual first answers, corrections, explanations, transfer prompts, the first-session model estimates, and deck attribution. Any recorded practice answers appear separately; a paused round reports how many questions are still unanswered.

The file also includes the latest question reflections and application response, explicitly labeled as the learner's writing rather than scored answers. Blank fields are marked as unwritten. Multiline writing is indented with `>` so it stays distinguishable from the original questions and explanations.

The download works offline in both the modular app and `demo.html`. It saves a UTF-8 text file through the browser's normal download flow. It does not upload the session or restore it after a refresh. Model estimates remain labeled as model state rather than grades, and practice never replaces the original answers.

### Save and resume an unfinished lesson

Open **Save or resume an unfinished lesson** to download your current question or feedback, first answers, model estimates, and answer display order. You can save immediately after starting, before answering anything. Saving leaves the lesson open.

On another visit, open the same course and choose the saved lesson file. For a local course, first choose its deck file and select **Start this deck**. Previewing a saved lesson does not load course content or change your current answers; **Resume this lesson** explicitly replaces the current lesson and practice progress. A resumed feedback screen keeps the original answer and estimate, then continues with the next unanswered question. Starting any deck, restarting the current course, answering, or moving to the next question cancels an outdated pending restore.

The bounded JSON file includes course content and a consistent first-answer history. It is not proof of identity, effort, or learning. A changed course or learning model is refused. After the last first answer, use the completed learning trace below, which also preserves practice answers.

### Save and restore a learning trace

After completing the first session, open **Keep or restore a learning trace** and choose **Download trace (.json)**. This separate file keeps the original answer order, canonical answer choices, full precision first-session model estimates, and any recorded practice progress.

To return later, open the same course, choose the saved trace, and inspect the preview before selecting **Restore these answers**. Restoration replaces the current first answers and practice progress. Canceling, choosing an invalid file, or continuing the current lesson while a preview is pending leaves the current lesson in place. Resume a restored practice round from the next unanswered item.

A trace must match the exact loaded course content and learning model. For an imported course, start the same deck before choosing its trace. Traces saved by an earlier app remain compatible when the bundled course content is unchanged. The app checks the archived course against the already loaded deck, then reconstructs the trace with the existing review and practice functions. It refuses incomplete first sessions, unknown or duplicate answers, invalid retry order, incompatible versions, and files larger than 2 MiB. First-session estimates are checked at their original precision; practice cannot change them.

Trace files contain answers and practice progress. They do not include personal reflections or replace reflections already in the tab. The current session supplies the displayed option order; saved answers always identify the original option, regardless of its A–D position. Saving and restoring work offline in the standalone demo. There is no automatic browser persistence, account, or upload.

## Compare two saved learning traces

Open **[Compare learning traces](compare-traces.html)** directly from your files.
Choose two completed learning-trace JSON files to inspect both sets of answers.
The reader accepts only the exact same course content and current model, using the
existing archive checks; it does not replace a learner session or modify the files.

Questions appear in course order and match by canonical question identity, even
when the two sessions answered them in different orders. Each side keeps its
original first answer and question position. Practice is separate: initially
correct questions, an unstarted round, a pending retry and a recorded retry have
distinct labels. Filter to differing first answers or practice records, filter by
concept, or print the current filtered comparison. Course answers, explanations,
transfer prompts, attribution and permission stay available beside the records.

A and B are the selected file positions, not an inferred chronology. Save times
are file metadata; two files may be different snapshots of the same session.
Correctness counts and answer differences do not establish learning improvement,
grades or the validity of the illustrative model. Files are editable records,
not authenticated observations. The reader does not compare model estimates.

Finish a first session in the learner and choose **Download trace (.json)** under
**Keep or restore a learning trace** to obtain a compatible file. Completed traces
with no practice, partial practice or completed practice are supported. Decks,
author drafts and unfinished-lesson files are separate formats. Each trace must
be at most 2 MiB of valid UTF-8 JSON. Replacing or clearing either selection
immediately retires the old paired view; canceled file selection preserves the
accepted files, and rejected or superseded reads cannot restore a stale pair.

This separate page works offline with no dependencies, upload or browser storage.
Rebuild it by running: node tools/build-trace-comparison.mjs.
The existing learner and author builders and generated pages are unchanged.

## Build a course deck

Open **[Deck studio](author.html)** directly from your files, or visit `author/` when serving the modular app. Write a title, author/source and permission statement; name the concepts; then add questions, answer options, explanations and transfer prompts. A complete lesson needs a question for every concept. Optional prerequisite choices connect an earlier concept to a later one and must not form a loop in the checked lesson.

Select the correct answer explicitly. Moving an option keeps that selection attached to the same option; removing the selected option requires another choice. Concept renaming updates its question links. A used concept cannot be deleted accidentally, and the last removed question can be restored without discarding later edits elsewhere. If a concept was deliberately deleted while that question was removed, restoration keeps the question's writing and choices, clears its missing concept selection, and removes the missing prerequisite links. The status explains what needs to be selected again.

**Save draft (.json)** keeps the current editable work even when fields are empty, no correct answer is selected, concepts have duplicate names, or prerequisite links still need repair. The separate draft file supports up to 2 MiB, so a lesson that exceeds the checked deck's smaller limit can be saved and shortened later. Saving leaves the current editor and any checked lesson preview in place. A draft file is for continuing work in Deck studio; it is not a checked lesson.

Choose **Open draft or deck** to reopen either an editable draft or a checked lesson JSON file. The preview labels which kind was selected. Review it before **Replace draft**, which discards the current editor's work; choose **Save draft** first to keep that work. Cancellation, unreadable files, malformed editing data, unsupported formats and oversized files leave the current editor unchanged. Reopened drafts can be repaired through the same controls and checked when complete. Nothing is saved automatically: download a draft before refreshing or closing the page.

**Check and preview** validates the complete draft and shows its answer key. **Download checked deck (.json)** saves the exact checked lesson file, including the shared deck format's 256 KiB byte limit. Edits clear the previous lesson preview and require another check. The check verifies the deck's structure and links; the author remains responsible for its course content and attribution. Checked lesson files use the shared RecallWeave deck format. Return to the lesson, choose the downloaded checked deck under **Bring your own lesson**, inspect its preview, and select **Start this deck**. Editable draft files must first be repaired and downloaded as checked decks in the studio.

The separate author page leaves ongoing learning sessions open. It has no account, upload, provider or persistence service. Rebuild its direct-file version with `python3 tools/make_author.py`; `python3 tools/make_author.py --check` verifies that it matches the modular sources. Authoring, reopening and standalone parity tests run with the existing `node --test tests/*.test.mjs` command.

## Focus a lesson

Open **[Lesson focus](focus.html)** directly from your files, or visit `focus/`
when serving the modular app. Choose a checked lesson JSON file, inspect its
source/permission preview, and select **Use this deck**. A cancelled, unreadable,
malformed or oversized file leaves your current source and selection intact.
Continuing to edit the current selection cancels a pending file read or preview.

Choose one or more **target concepts** and give the focused lesson its own title.
The preview separates your selected targets from prerequisite concepts that are
included automatically. It retains every question belonging to those concepts,
then follows every prerequisite link from those questions until all required
concepts are present. A link on a concept's second question matters just as much
as a link on its first. Selecting a required concept explicitly marks it as a
target too; clearing a target does not remove it while another retained concept
still requires it.

Inspect the retained questions, including their expandable answer keys, then
choose **Download focused lesson (.json)**. The file preserves original question
IDs, question/concept/option order, correct answers, explanations, transfer prompts,
prerequisite links and the source's attribution and license. Its title is the one
you entered. The exact downloaded JSON passes the shared 256 KiB lesson limit;
compact formatting is used when necessary. Empty selections, invalid titles or
an output over that limit cannot leave an older file ready to download.

In the learning app, choose this checked JSON under **Bring your own lesson**,
inspect the preview, and select **Start this deck**. It starts a fresh lesson with
the existing question-selection behavior; no answers or mastery estimates are
transferred. You can also reopen the checked file in Deck studio. Keep the
original course file for its full content.

This separate page works offline and keeps everything in the current tab until
an explicit download. It does not alter the source file or an open learning or
authoring session. Its prerequisite closure follows the author's links; it does
not establish subject accuracy, reuse rights, learning efficacy or a required
teaching order. Rebuild it with `python3 tools/make_focus.py`, or verify its
standalone parity with `python3 tools/make_focus.py --check`. Its focused native
and builder tests are included in the existing Node test command.

## Optional Markov-chain course

Open the [Markov-chain explorer](courses/markov-chains-explorer.html) to edit a three-state transition table, follow probability flow, and compare mixing, alternation and absorbing states. It works as a single offline HTML file. Download its original fourteen-question course and import it through **Bring your own lesson**, or read the [course guide and worked checks](courses/markov-chains.md). The observation download keeps applied inputs and the complete computed trace; it is separate from a learner's answers.

## Demo deck provenance

Question text and distractors are newly authored for this demo. Scientific concepts are checked against [OpenStax, *Biology 2e*](https://openstax.org/books/biology-2e/pages/1-introduction), sections 6.4, 7.1, 7.4 and 8.1–8.3, by Mary Ann Clark, Matthew Douglas and Jung Choi (Rice University). The current linked reference textbook content is licensed CC BY-NC-SA 4.0. [The item-level content review](docs/deck-content-review-20261008.md) records the scientific distinctions and references. Attribution is embedded in `data/deck.json`, shown at completion and included in downloaded notes. This demo uses original wording and does not copy textbook passages, figures or an existing hackathon entry.

## Tests

Run the unit/property tests with Node 20+ and Python 3 (`python3` on your PATH): `node --test tests/*.test.mjs`. The local-file tests use Node's global [`File`](https://nodejs.org/api/globals.html#class-file), added in Node 20; Python verifies that the checked-in standalone author HTML matches its modular sources. No npm packages are required. Tests cover bounded probabilities over repeated updates, directional evidence behavior, invalid parameter rejection, entropy/information-gain bounds, prerequisite selection, exhaustion, and initialization.

Review tests also cover immutable first-answer snapshots, missed-question order, separate correct/incorrect retries, resumption, duplicate/out-of-order refusal, and all-correct sessions. Content revisions preserve item identities and the existing model/review contracts.

Deck tests cover the existing unversioned example, immutable content copies,
malformed and oversized JSON, metadata and collection bounds, duplicate identities,
unknown or cyclic prerequisites, answer indices, literal text, reserved object-key
names, complete 100-question selection and interoperability with the existing
review/practice model.

The optional rendered acceptance runner uses Node 22+ and an already-installed Chrome or Chromium executable:

```bash
node tools/check_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-browser-check
```

It starts a temporary localhost server and a separate temporary browser profile, drives the actual page with Enter and Tab, and checks review, practice, resumption, unchanged first-try estimates, a 390px layout, and the standalone file. The report and desktop/phone captures go to the selected output directory. It closes its own browser and removes its temporary profile afterward; it does not use an existing browser session. The runner is an optional system-browser check; the default test command and app require no browser automation package.

If Playwright is already available in the test environment, the additional local-deck
acceptance runner exercises real file inputs, failed/cancelled and out-of-order reads,
example downloads, imported learning/review/practice, literal text and 390px layouts
in both versions:

```bash
BROWSER_BIN=/path/to/chromium node tests/deck_browser_smoke.cjs
```

Set `TMPDIR` to an owned writable temporary directory when needed; optionally set
`RECALLWEAVE_EVIDENCE_DIR` to an existing directory for the receipt and screenshots.
The runner creates its own subdirectory, closes its browser/server, and makes no
provider requests. Playwright is only a qualification dependency, not an application
or default-test requirement.

The trace archive has a separate browser receiver for real downloads, fresh documents, preview/cancel/restore, stale file reads, unchanged first answers, resumed practice, and standalone operation:

```bash
node tools/check_trace_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-trace-check
```

The [trace archive receiving packet](docs/receiving/trace-archive-49f845d0dece/README.md) records the exact source, native results, independent review, and actual saved-file examples.

The reflection receiver also types into the actual fields, navigates practice, resets the session, and reads the files saved by the browser:

```bash
node tools/check_reflections_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-reflection-check
```

Its output directory must be new. The receiving evidence and scope are recorded in [the reflection receipt](docs/reflections-20261008-9ec02b70e5f0/README.md).

## Explore stable sorting

Open [Sorting with equal keys](stable-sorting.html) directly from disk to compare complete insertion and selection traces on the same 2–8 records. Numbered input identities make equal-key crossings visible; each panel shows declared comparisons and exchanges, with algorithm guarantees separate from the final tie order observed for that input. Edits retire the current run, and the complete-comparison JSON download includes both full traces.

The explorer also downloads the exact original [twelve-question sorting course](courses/stable-sorting.json). Import it through the learner’s course picker, inspect the preview and choose **Start this deck** to begin. The [course guide](courses/stable-sorting.md) explains the worked example, review/practice flow, study-notes downloads and primary conceptual references. The [modular explorer](stable-sorting/index.html) works under the existing static server; rebuild the standalone file with `node tools/make_stable_sorting.mjs`.

## Accessibility and constraints

Semantic landmarks, skip link, visible keyboard focus, labeled progress bar, live session region, labeled answer group, text feedback, and responsive small-screen layout are included. No external images or data requests are needed. The default font stack remains usable offline. The app is a local demo, not a production assessment.

## AI-tool disclosure

AI assistance was used to develop and test the implementation and to draft original question wording. The implementation does not make AI/provider calls at runtime. ForgeHacks submission disclosure requirements have not been checked against a readable Devpost submission form; include this disclosure if required and confirm the platform's current rules before any submission.

## Status and unresolved gates

This public source repository supports the ForgeHacks 2026 demo. The Devpost account and join status for jacobsmetoyer@gmail.com are not verified; no contest join, terms acceptance, upload, or submission was made. Before submitting, confirm eligibility and the live entry form’s required fields, disclosure format, and deadline; this offline demo is not evidence of learning efficacy.

## Mendelian inheritance course and gamete-cross lab

[Open the offline lab](courses/mendelian-inheritance-lab.html), [download the original course](courses/mendelian-inheritance.json), or [read the worked guide](courses/mendelian-inheritance.md). Twelve questions connect allele segregation, genotype and phenotype, one-locus crosses and independent two-locus crosses. The explorer follows each parental gamete route and shows exact genotype and phenotype fractions, with explicit complete-dominance and independent-assortment assumptions. Its downloads preserve the checked course and a worked cross record.

Import the course through the existing local-file preview and **Start this deck** flow, then use the learner's review, separate missed-item practice and study-note downloads. All traits are hypothetical plant examples; the model gives probabilities, not guaranteed finite offspring counts. Build and optional browser-receiving commands are in the guide.


## Explore cache decisions

Open **[Cache decisions: FIFO and LRU](courses/cache-replacement.html)** directly in a browser to inspect both policies on the same request sequence. Step through hits and evictions, compare complete-sequence misses across capacities, and download the accepted experiment. The worked examples include a trace where FIFO has fewer misses than LRU and the classic FIFO capacity anomaly; counts describe those inputs, not measured computer performance.

The [worked guide](courses/cache-replacement.md) explains the empty-start, equal-size model and original derivations. Download the [twelve-question course](courses/cache-replacement.json) from the explorer or this link, then use **Bring your own lesson**, preview it, and explicitly start it in the unchanged learner. This separate lab works offline and does not alter learner or archive state. Rebuild only its standalone file with `node tools/build-cache-replacement.mjs`; `--check` verifies the committed artifact. Native controls run with `node --test tests/cache-replacement.test.mjs`.
