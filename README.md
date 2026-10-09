# RecallWeave

**ForgeHacks 2026 · AI + Education** — an original, static, browser-only learning experience whose bundled lesson connects ideas in cellular energy. Learners can also bring a local JSON lesson deck. The official track framing on ForgeHacks is “Reimagining how people learn and teach.” This demo responds to that brief by helping a learner retrieve concepts, see links, and apply them—not by generating chat answers.

## Run it

Open `demo.html` directly in a browser—no server, install, build step, internet, login, API key, or user data storage is required. It is a single self-contained file with embedded CSS, JavaScript and deck. The modular source is in `index.html`, `src/`, and `data/`; to test that version locally, serve this directory with `python3 -m http.server 8080` and visit `http://localhost:8080`. Rebuild the direct-open demo with `python3 tools/make_demo.py` after source changes. No hosted endpoint is called by either version.

## Explore RC transients

Open **[RC transients: where the energy goes](courses/rc-transients-lab.html)** directly in a browser to follow the response of one resistor and capacitor after an ideal source step. Compare charging, discharge, reversed polarity, a precharged capacitor returning energy to the source, resistance scaling and equilibrium. Voltage, signed current, charge, stored energy, resistor heat and source work share the same applied circuit and time cursor.

Edit the resistance, capacitance, source voltage and initial capacitor voltage, then select **Apply circuit**. Draft edits retire the previous result. Inspect 161 samples from 0 to 8 time constants and download the full observation with physical units and assumptions. The finite horizon is not an exact steady-state endpoint.

The original [sixteen-question course](courses/rc-transients.json) and [worked guide](courses/rc-transients.md) connect the lab to voltage continuity, time constants and energy balance. Download the course and choose it under **Bring your own lesson** for the existing preview, review, practice and notes flow. The standalone lab needs no server or connection and uses no automatic browser storage. Rebuild it with `node tools/build-rc-transients.mjs`, or verify exact source and embedded-download parity with `--check`.

## Trace a maximum flow

Open **[More flow needs a way through](courses/network-flow-explorer.html)** directly in a browser to follow a small directed capacity network from zero assignment to a matching flow-and-cut certificate. Inspect each breadth-first residual path, including cancellation of an earlier edge assignment, and keep independently supplied opposite edges distinct. The original-edge, residual and conservation tables expose every integer value.

Load a worked example or enter 2–8 named vertices and capacities from 0 to 99, then select **Build the trace**. Back, Next and the step selector inspect retained snapshots. Editing retires the displayed result until another successful build. Download the exact applied observation, the original [fourteen-question course](courses/network-flow.json) or its [worked guide](courses/network-flow.md). Import the course through **Bring your own lesson** to use the existing feedback, review, practice and notes flow.

The self-contained page needs no server, account, connection or automatic browser storage. Its observation is a mathematical teaching trace, separate from learner-answer archives. Rebuild with `node tools/build-network-flow.mjs`; add `--check` to verify exact model, UI, template, course and guide parity.

## Interactive binary-search companion

Open [the binary-search explorer](courses/binary-search-explorer.html) to step through the exact lower-bound loop from the existing **Binary search: precise boundaries** course. The file works directly in a browser without a server or connection. Enter up to 32 sorted integers, choose a target, and inspect each comparison, the classified prefix/suffix, unresolved element indices `[lo, hi)`, and possible answer boundaries `[lo, hi]`. Repeated values, absent targets, empty arrays and the boundary after the last element have explicit examples.

**Build trace**, then use **Next**, **Back**, **First** or **Finish**. Editing either input retires the previous displayed trace until you build again. The final insertion boundary is separate from the equality check for membership. Ordering-comparison counts exclude input validation, rendering, sorting, insertion and that final equality check.

The companion downloads the complete trace with its entered text, plus the original unchanged course JSON and worked guide. To study the course, open RecallWeave, choose the downloaded JSON under **Bring your own lesson**, inspect the preview, then choose **Start this deck**. Downloads do not change an existing learner session. Rebuild the standalone page with `node tools/build-binary-search-explorer.mjs`; verify exact source/course parity with `--check`.

## Follow recursive calls and returns

Open **[Calls go down. Answers come back.](courses/recursion-call-stack-explorer.html)** directly in a browser to step through factorial, Fibonacci, and memoized Fibonacci. Inspect each caller’s suspended calculation, saved child values, actual return order, and a fresh cache. Previous, Next, and the event selector revisit exact snapshots; the completed-run comparison separates total invocations, computed calls, cache hits, and maximum active depth.

Inputs are whole numbers from 0 to 10. Every invocation counts, including base cases and cache hits; factorial uses only the zero base case, and Fibonacci uses F(0) = 0 and F(1) = 1. The memoized algorithm starts with an empty cache and stores base results too. Download the full exact trace with its selected inspection step, or download the original [twelve-question course](courses/recursion-call-stack.json) and open it through **Bring your own lesson**. The [worked guide](courses/recursion-call-stack.md) includes the shared conventions, answer explanations, and transfer prompts.

The explorer needs no server or account and keeps no automatic browser storage. Its trace is an algorithm inspection record, separate from learner-answer archives. Rebuild it with `node tools/build_recursion_call_stack.mjs`; add `--check` to verify that the checked-in page matches its exact sources and validated deck.

## Explore coupled motion

Open **[Coupled motion: two patterns inside one system](courses/normal-modes-lab.html)** directly in a browser. Set the masses, spring stiffnesses and initial motion, then inspect how two independent normal modes combine into the motion of two coupled masses. Compare in-phase, opposite, localized and uncoupled motion; the exact values and energy decomposition accompany the schematic and time traces.

The original **[sixteen-question course](courses/normal-modes.json)** and **[worked guide](courses/normal-modes.md)** develop the force balance, initial-value solution, conserved modal energies and zero-coupling limit. Download the course from the lab and open it through **Bring your own lesson**, preview it and choose **Start this deck** in RecallWeave. The separate observation download retains the applied parameters, inspection time and full analytical trajectory.

The lab works offline and saves only explicit downloads. Rebuild with `node tools/build-normal-modes.mjs`; `--check` verifies exact source, course and guide parity. Run its focused native controls with `node --test tests/normal-modes.test.mjs`.

## Explore coherent waves

Open **[Coherent waves: from phasors to interference](courses/phasor-interference-lab.html)** for an offline lab that connects two rotating complex amplitudes to their real cosine signals. Predict cancellation, vary relative and common phase, and compare the arrow diagram with the time trace and downloadable values. The [worked guide](courses/phasor-interference.md) explains the assumptions and original examples; save the [sixteen-question course](courses/phasor-interference.json) and open it through **Bring your own lesson** to practice the connections.

## Discrete Fourier: coefficients and reconstruction

Open the **[offline Fourier lab](courses/discrete-fourier-lab.html)** to enter 4, 8 or 16 real samples, inspect every complex coefficient, and reconstruct the finite sample grid from selected conjugate pairs. Compare the original and reconstructed points, residuals and normalization-aware energy values. DC and Nyquist remain single-bin selections; unresolved phase is labeled rather than assigned a confident angle.

The **[worked guide](courses/discrete-fourier.md)** connects the existing sampling and phasor lessons to four experiments. Download the original **[twelve-question course](courses/discrete-fourier.json)** from the lab, then use **Bring your own lesson**, preview it and select **Start this deck** in the unchanged learner. A separate analysis JSON records the numerical inputs, pair selection and raw calculations. The lab runs from a local file with no network requests or automatic saving; it does not infer a continuous signal between samples.

Rebuild only this lab with `node tools/build-discrete-fourier.mjs`, or verify its committed artifact with `--check`. Run its focused regression checks with `node --test tests/discrete-fourier.test.mjs tests/discrete-fourier-course.test.mjs`.

## Explore rates and accumulation

Open **[Rates become change](courses/rates-accumulation-explorer.html)** for an offline motion explorer. Edit a continuous velocity curve, inspect a moment, and compare signed displacement with total distance. Exact fractions expose a sign crossing between recorded points; the display also distinguishes instantaneous velocity, interval average velocity and an undefined acceleration at a corner.

The [worked guide](courses/rates-accumulation.md) develops the examples from slopes and signed areas. Download the original [twelve-question course](courses/rates-accumulation.json) from the explorer, then choose it under **Bring your own lesson** in RecallWeave. The lesson, guide and current calculation download without a server or account. Rebuild the standalone explorer with `node tools/build-rates-accumulation.mjs`, or verify the checked-in file with `--check`.

## Explore complex multiplication

Open **[Turn, scale, repeat](courses/complex-plane-lab.html)** to multiply a starting complex point by a fixed multiplier, inspect equal-scale coordinates and follow up to eight repeated products. The offline explorer shows the zero cases explicitly and downloads the current experiment with its numeric values and conventions. Its [worked guide](courses/complex-plane.md) connects the algebra and geometry. Download the original [twelve-question lesson](courses/complex-plane.json), then choose it under **Bring your own lesson** in RecallWeave to study it with the existing review, practice and notes flow.

## Explore grouped rates

Open **[When groups and totals disagree](courses/grouped-data-explorer.html)** for a separate offline lesson about group rates, pooled samples and a chosen common mix. Edit the recorded counts, inspect exact fractions and download the current comparison. The worked examples explain why both groups can favor one option while the pooled sample favors the other, and why this alone does not establish a causal effect.

The [worked guide](courses/grouped-data.md) includes the assumptions, missing-rate behavior and derivations. To study its original [twelve-question course](courses/grouped-data.json), save the JSON file and open it through **Bring your own lesson** in RecallWeave. The explorer itself opens directly without a server or account.

### Make a course handout

Open [Course handouts](handout.html), choose a checked local deck JSON, review its title and source credit, then select **Use this deck**. Print or save an unanswered worksheet for learners and an explicitly separate answer key with the correct choices and authored explanations. Both keep the original question and option order, literal wording, attribution and permission; transfer prompts leave room for a written response because the deck supplies no separate transfer answer.

Each saved HTML file opens and prints offline on its own. The worksheet file contains questions only; the teacher’s builder and the separate key receive the full checked deck. Cancelling a selection or choosing an invalid file leaves the current handout in place. This is a separate preparation flow; it does not start or change a learning session. Modular source lives in `handout/` and `src/course-handout*.mjs`; rebuild `handout.html` with `python3 tools/make_handout.py`, or verify it with `--check`.

## Explore Boolean logic

Open the [Boolean explorer](courses/boolean-logic-explorer.html) directly from your files to compare expressions, inspect complete truth tables, and find a counterexample when two expressions differ. Download the current full table as CSV or the original twelve-question course as JSON. Import that course through the learner’s existing preview and explicit start flow, then review, practice and save your notes. The [course guide](courses/boolean-logic.md) explains the supported grammar, worked answers and content sources.

## Explore Euclid's algorithm

Open the **[Euclidean algorithm explorer](courses/euclidean-algorithm-explorer.html)** directly from your files. Enter two nonnegative integers, inspect every exact division and remainder, and see the gcd expressed as an integer combination of the original pair. Previous, Next and Last division controls walk the full trace; an explicit download keeps the computed steps. The page explains zero inputs and distinguishes exact arithmetic from approximate diagram widths.

The **[worked companion](courses/euclidean-algorithm.md)** includes proofs, examples and transfer responses. Download its original **[twelve-question course](courses/euclidean-algorithm.json)** and select it under **Bring your own lesson** to use RecallWeave's existing review, separate practice and saved-note flows. The explorer requires no server, account or dependency.

## Explore counting principles

Open **[Same labels. Different counts.](courses/counting-principles-explorer.html)** directly in a browser. Choose 0–8 label types and 0–6 items, then compare all four models: order matters or not, with or without reuse. Inspect every outcome through direct page controls; unordered selections appear once in canonical order. Exact counts and ordered-representation multiplicities explain why distinct unordered outcomes need not be equally likely.

The explorer distinguishes one empty selection from an impossible selection. Editing the inputs retires the old result until you apply the new settings. Download the applied page of at most 24 outcomes, or save the original **[twelve-question course](courses/counting-principles.json)** and open it through **Bring your own lesson**, preview and **Start this deck**. The **[worked guide](courses/counting-principles.md)** develops the formulas, examples and transfer answers.

This separate page works offline without dependencies or automatic storage. Rebuild it with `node tools/build-counting-principles.mjs`; `--check` verifies exact generated-source and embedded-course parity.

## Core and interaction

- `src/knowledge.mjs` implements a transparent BKT update: initial knowledge, learning transition, guess, and slip are explicit probabilities. It also computes binary entropy and expected information gain.
- The adaptive selector picks an unanswered item with highest expected information gain, plus a small bonus for weak concepts that unlock unanswered downstream ideas; ties are stable by item ID. There is no LLM or hidden personalization.
- Answer choices are shuffled once for each question when a local session starts. A question keeps that display order during its practice retry. The visible letter labels follow the displayed order; correctness, review and study notes use the original option identity. Question content and adaptive item selection remain unchanged.
- `src/app.mjs` records the current session only in memory, gives item-level explanations/transfer prompts, and shows estimated mastery as a model state, never a grade or validated diagnosis.
- The completed learning trace keeps every question, the learner's first answer, its correct answer, explanation, and transfer prompt available in keyboard-operable review panels. `src/review.mjs` takes an immutable snapshot and keeps a bounded practice round separate from the first session.
- The welcome panel includes a clearly labeled, deterministic synthetic learner simulation comparing adaptive selection with fixed deck order using the same toy learner assumptions and random seed. Its tiny run is demonstrative, not empirical evidence or an efficacy claim. Test coverage separately evaluates model invariants, not learning outcomes.

## Download the complete offline course pack

Save [the offline course pack](offline/) as one ZIP, extract the entire
RecallWeave folder, and open its catalog.html. The matching demo.html and original
registered course files are included. Choose a course from the courses folder
under **Bring your own lesson**, inspect its preview, then explicitly start it.

After changing the learner, rebuild it with `python3 tools/make_demo.py`.
After catalog or registered-course changes, run `node tools/build-course-catalog.mjs`.
Then run `python3 tools/build-offline-pack.py` to update the ZIP;
`python3 tools/build-offline-pack.py --check` checks exact bytes without writing.
The pack uses the explicit catalog/courses.json registration list. Its
SHA256SUMS.json records every other included file's byte length and content hash.

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

## Explore hash-table probes

Open **[Hash tables: follow the probe](courses/hash-tables-explorer.html)** for an original offline integer-set explorer. Edit insert, find and delete operations, inspect exact slot visits, and compare collisions, wraparound, tombstones, duplicate checks and full-table results. The [worked guide](courses/hash-tables.md) explains the fixed-capacity model. Download its [twelve-question lesson](courses/hash-tables.json) and start it through **Bring your own lesson** to use the existing learner, review and study notes.

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

## Weighted interval scheduling

The [weighted-intervals explorer](courses/weighted-intervals-explorer.html) is a self-contained offline lab for choosing compatible activities by total value. Edit a small schedule, inspect take/skip decisions, reconstruct the chosen prefix, and compare it with earliest finish. Download its [twelve-question course](courses/weighted-interval-scheduling.json) into the existing learner, or use the [course guide](courses/weighted-interval-scheduling.md) for the worked table, answer derivations, assumptions and build/check commands.

## Fit a line and inspect its residuals

Open the **[least-squares lab](courses/least-squares-lab.html)** directly in a browser. Edit paired points, try a line, and compare exact fitted coefficients, signed vertical residuals, every squared residual, the mean point and total squared error. Six original fictional examples cover a noisy trend, a perfect line, a curved pattern, ordinary repeated x, all-equal x and an influential distant row.

The fit minimizes equal-weight squared vertical errors for the entered rows. Repeated rows count separately. If all x values are equal, the lab shows the family of minimizing lines and the one observed fitted value; it does not invent unique coefficients or a prediction elsewhere. Query values distinguish the observed x range from extrapolation. A minimum SSE does not establish linearity, predictive accuracy or causation.

Download the fixed **[sixteen-question course](courses/least-squares.json)** from the lab or this link, then use **Bring your own lesson**, preview it and choose **Start this deck** in the existing learner. The **[worked guide](courses/least-squares.md)** derives the six examples, the minimum identity and all sixteen transfer answers. Editing the lab never changes the course download; tab changes are not automatically saved or uploaded.

Build with `node tools/build_least_squares.mjs`; `--check` verifies the generated standalone file. Run the focused native tests with `node --test tests/least-squares.test.mjs`. The [receiving packet](docs/receiving/least-squares-db371a37f4c8/README.md) records the separate independent mathematical review, actual course download/import/review flow and responsive browser checks. The shared learner, importer and catalog are unchanged.

## Mathematical induction: a base, a bridge, every integer

[Open the offline proof lab](courses/mathematical-induction-lab.html), download the [twelve-question lesson](courses/mathematical-induction.json), or read the [worked guide](courses/mathematical-induction.md). Compare an arithmetic sum with a proposed formula, inspect the exact base and symbolic successor step, and see why a few matching values do not prove every case. The lab keeps its finite examples separate from the induction argument and saves an explicit proof record. Import its lesson JSON through the existing learner preview and Start this deck controls.


## Inspect rounding and stored geometry

Open the offline [Floating-point lab](courses/floating-point-lab.html) to inspect binary32 input rounding, neighbors, halfway cases, subnormal values, overflow, and a triangle whose stored coordinates change after translation. Compare the exact source and stored signed areas, change the origin and power-of-two unit, and download the current experiment.

The [worked guide](courses/floating-point.md) explains the numerical boundaries and the separate-origin alternative. Download the original [fourteen-question course](courses/floating-point.json), then use the existing **Bring your own lesson** preview and explicit **Start this deck** flow. The lesson complements the existing [Numerical precision guide](courses/numerical-precision.md).

## Momentum and collisions

[Open the offline explorer](courses/momentum-collisions-explorer.html) to compare signed momentum and kinetic energy in ideal one-dimensional elastic and completely inelastic encounters. Enter two positive masses and signed incoming velocities, inspect exact fraction results on a shared velocity scale, and download the complete analysis. Equal or growing initial gaps explicitly produce no future collision endpoints.

The [original twelve-question course](courses/momentum-collisions.json) imports through the existing learner's preview and **Start this deck** flow, including feedback, separate missed-item practice and study-note downloads. The [worked guide](courses/momentum-collisions.md) derives the formulas, explains the physical assumptions and provides build/check commands. Open the explorer directly from disk; it requires no server or network and saves nothing automatically.

## Build a curve from repeated interpolation

Open **[Straight steps. Curved paths.](courses/bezier-curves-explorer.html)** directly in a browser to construct a linear, quadratic or cubic Bézier curve from exact fractions. Inspect each interpolation level, split the curve into two exact subcurves, and compare derivatives with parameter-dependent travel. The tables preserve signed rational coordinates, including stationary and coincident-control cases.

Download the original [sixteen-question lesson](courses/bezier-curves.json) and [worked guide](courses/bezier-curves.md), then use **Bring your own lesson** for the existing learner, review, practice and study-notes flow. The standalone page works offline without installation or automatic storage. Rebuild it with `node tools/build-bezier-curves.mjs`; use `--check` to verify parity with its exact sources and validated course.

## Newton’s method: follow the tangent, inspect the result

Open the **[Newton method explorer](courses/newton-method-explorer.html)** directly in a browser. Choose one of eight examples or enter a polynomial of degree at most three and an exact starting value. Follow each tangent intercept, inspect the exact residual and derivative, and compare an approaching square root, a horizontal tangent, an exact two-cycle and a repeated root. Every completed point is retained in a downloadable exact record.

An exact root, a zero slope away from a root, a repeated cycle, a chosen step limit and an arithmetic limit have separate outcomes. Rounded plotting coordinates never determine those outcomes. Editing any input retires the previous record until the next explicit run.

Download the **[twelve-question lesson](courses/newton-method.json)** from the explorer or this link, then use the existing learner’s file preview and **Start this deck** controls. The **[worked guide](courses/newton-method.md)** derives the tangent update and the original examples, with exact fractions and explicit limits. The explorer includes the exact lesson and guide download bytes and works as a standalone local file.

Build with node tools/build-newton-method.mjs; add --check to verify its generated page. Run the focused checks with node --test tests/newton-method.test.mjs tests/newton-method-course.test.mjs. The [receiving packet](docs/receiving/newton-method-c77045b4/README.md) contains independent mathematical and actual browser/course evidence.

## Connect a graph with minimum total weight

Open [the minimum-spanning-forest explorer](courses/minimum-spanning-forest-explorer.html) directly in a browser. Enter an undirected graph with up to eight vertices and integer weights, then inspect Kruskal's accepted edges, cycle rejections, component snapshots and running total. Equal weights follow the original input order; negative weights, disconnected graphs, isolated vertices and a single-vertex empty tree are explicit examples.

**Build forest trace**, then use **Next**, **Previous**, **First** or **Finish**. Editing either input retires the old trace. The page records a decision for every edge, including later cycle rejections; this count excludes sorting comparisons, component lookups, validation and rendering. A minimum spanning forest minimizes the total chosen connection weight, not every shortest route.

Download the full trace with its original entered text and selected frame, or save the original [twelve-question course](courses/minimum-spanning-forest.json) and [worked guide](courses/minimum-spanning-forest.md). Open the JSON through the learner's existing **Bring your own lesson** preview and **Start this deck** flow. No network, account, automatic storage or learner-session modification is involved. Rebuild the standalone page with `node tools/build-minimum-spanning-forest.mjs`; add `--check` to verify exact source parity.



## Exact absorbing random walks

Open [the offline absorbing-walk lab](courses/absorbing-walk-lab.html) to follow exact probability mass from an interior state to two absorbing endpoints. Separate first arrival from cumulative absorption and survival, compare finite-horizon observation time with eventual expected stopping time, and inspect every transition contribution. Inputs are bounded integer ratios; arithmetic and exported fractions are exact. These are hypothetical fixed-probability walks, not forecasts.

Read the [worked guide](courses/absorbing-walk.md), or download the original [twelve-question course](courses/absorbing-walk.json) from the lab. In the unchanged [standalone learner](demo.html), choose the actual course file, inspect the preview, select **Start this deck**, and use ordinary review, practice and study notes. The lab's course and guide downloads remain fixed when experiment controls change. The lab works when copied alone; its learner link requires the repository or companion package.

Rebuild with `node tools/build-absorbing-walk.mjs`. Check the model, conservation laws, boundary equations and embedded course bytes with `node --test tests/absorbing-walk.test.mjs tests/absorbing-walk-course.test.mjs`. The optional actual-browser driver uses Node 22+ and an installed Chromium-family browser; no npm dependency is required.
