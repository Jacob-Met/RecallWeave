# RecallWeave

**ForgeHacks 2026 · AI + Education** — an original, static, browser-only learning experience about connecting ideas in cellular energy. The official track framing on ForgeHacks is “Reimagining how people learn and teach.” This demo responds to that brief by helping a learner retrieve concepts, see links, and apply them—not by generating chat answers.

## Run it

Open `demo.html` directly in a browser—no server, install, build step, internet, login, API key, or user data storage is required. It is a single self-contained file with embedded CSS, JavaScript and deck. The modular source is in `index.html`, `src/`, and `data/`; to test that version locally, serve this directory with `python3 -m http.server 8080` and visit `http://localhost:8080`. Rebuild the direct-open demo with `python3 tools/make_demo.py` after source changes. No hosted endpoint is called by either version.

## Core and interaction

- `src/knowledge.mjs` implements a transparent BKT update: initial knowledge, learning transition, guess, and slip are explicit probabilities. It also computes binary entropy and expected information gain.
- The adaptive selector picks an unanswered item with highest expected information gain, plus a small bonus for weak concepts that unlock unanswered downstream ideas; ties are stable by item ID. There is no LLM or hidden personalization.
- Answer choices are shuffled once for each question when a local session starts. A question keeps that display order during its practice retry. The visible A–D labels follow the displayed order; correctness, review and study notes use the original option identity. Question content and adaptive item selection remain unchanged.
- `src/app.mjs` records the current session only in memory, gives item-level explanations/transfer prompts, and shows estimated mastery as a model state, never a grade or validated diagnosis.
- The completed learning trace keeps every question, the learner's first answer, its correct answer, explanation, and transfer prompt available in keyboard-operable review panels. `src/review.mjs` takes an immutable snapshot and keeps a bounded practice round separate from the first session.
- The welcome panel includes a clearly labeled, deterministic synthetic learner simulation comparing adaptive selection with fixed deck order using the same toy learner assumptions and random seed. Its tiny run is demonstrative, not empirical evidence or an efficacy claim. Test coverage separately evaluates model invariants, not learning outcomes.

## Review and practice

After finishing the six challenges, open any question under **Review the connections** to revisit the original answer and explanation. **Practice missed connections** gives each initially missed question one retry in the same order it appeared during the session. A session with every answer correct still offers all six review panels.

**Back to learning trace** pauses practice. **Resume practice** returns to the next unanswered prompt, including when the learner left before choosing an answer. The completed review displays first-try and practice answers separately. Correcting a retry does not rewrite the initial trace or update the initial mastery estimates: the explanations have already been shown, so practice is an opportunity for recall, not a new assessment.

Review and practice stay in this tab's memory. Refreshing the page or starting a fresh local session clears the active state; an explicitly downloaded learning trace can restore the recorded answers later. The modular app and the direct-open `demo.html` provide the same flow.

### Keep your study notes

After the first session, choose **Download study notes (.txt)** to save a readable copy of the complete learning trace. The file includes the question order, actual first answers, corrections, explanations, transfer prompts, the first-session model estimates, and deck attribution. Any recorded practice answers appear separately; a paused round reports how many questions are still unanswered.

The download works offline in both the modular app and `demo.html`. It saves a UTF-8 text file through the browser's normal download flow. It does not upload the session or restore it after a refresh. Model estimates remain labeled as model state rather than grades, and practice never replaces the original answers.

### Save and restore a learning trace

After completing the first session, open **Keep or restore a learning trace** and choose **Download trace (.json)**. This separate file keeps the original answer order, canonical answer choices, full precision first-session model estimates, and any recorded practice progress.

To return later, open the same course, choose the saved trace, and inspect the preview before selecting **Restore these answers**. Restoration replaces the current first answers and practice progress. Canceling, choosing an invalid file, or continuing the current lesson while a preview is pending leaves the current lesson in place. Resume a restored practice round from the next unanswered item.

A trace must match the exact loaded course content and learning model. The app checks the archived course against the already loaded deck, then reconstructs the trace with the existing review and practice functions. It refuses incomplete first sessions, unknown or duplicate answers, invalid retry order, incompatible versions, and files larger than 2 MiB. First-session estimates are checked at their original precision; practice cannot change them.

Trace files contain answers and practice progress. They do not include personal reflections or replace reflections already in the tab. The current session supplies the displayed option order; saved answers always identify the original option, regardless of its A–D position. Saving and restoring work offline in the standalone demo. There is no automatic browser persistence, account, or upload.

## Build a course deck

Open **[Deck studio](author.html)** directly from your files, or visit `author/` when serving the modular app. Write a title, author/source and permission statement; name the concepts; then add questions, answer options, explanations and transfer prompts. A complete lesson needs a question for every concept. Optional prerequisite choices connect an earlier concept to a later one and must not form a loop in the checked lesson.

Select the correct answer explicitly. Moving an option keeps that selection attached to the same option; removing the selected option requires another choice. Concept renaming updates its question links. A used concept cannot be deleted accidentally, and the last removed question can be restored without discarding later edits elsewhere. If a concept was deliberately deleted while that question was removed, restoration keeps the question's writing and choices, clears its missing concept selection, and removes the missing prerequisite links. The status explains what needs to be selected again.

**Save draft (.json)** keeps the current editable work even when fields are empty, no correct answer is selected, concepts have duplicate names, or prerequisite links still need repair. The separate draft file supports up to 2 MiB, so a lesson that exceeds the checked deck's smaller limit can be saved and shortened later. Saving leaves the current editor and any checked lesson preview in place. A draft file is for continuing work in Deck studio; it is not a checked lesson.

Choose **Open draft or deck** to reopen either an editable draft or a checked lesson JSON file. The preview labels which kind was selected. Review it before **Replace draft**, which discards the current editor's work; choose **Save draft** first to keep that work. Cancellation, unreadable files, malformed editing data, unsupported formats and oversized files leave the current editor unchanged. Reopened drafts can be repaired through the same controls and checked when complete. Nothing is saved automatically: download a draft before refreshing or closing the page.

**Check and preview** validates the complete draft and shows its answer key. **Download checked deck (.json)** saves the exact checked lesson file, including the shared deck format's 256 KiB byte limit. Edits clear the previous lesson preview and require another check. The check verifies the deck's structure and links; the author remains responsible for its course content and attribution. Checked lesson files use the shared RecallWeave deck format; the separate local lesson importer is tracked in [issue 7](https://github.com/Jacob-Met/RecallWeave/issues/7).

The separate author page leaves ongoing learning sessions open. It has no account, upload, provider or persistence service. Rebuild its direct-file version with `python3 tools/make_author.py`; `python3 tools/make_author.py --check` verifies that it matches the modular sources. Authoring, reopening and standalone parity tests run with the existing `node --test tests/*.test.mjs` command.

## Demo deck provenance

Question text and distractors are newly authored for this demo. Scientific concepts are checked against [OpenStax, *Biology 2e*](https://openstax.org/books/biology-2e/pages/1-introduction), sections 6.4, 7.1, 7.4 and 8.1–8.3, by Mary Ann Clark, Matthew Douglas and Jung Choi (Rice University). The current linked reference textbook content is licensed CC BY-NC-SA 4.0. [The item-level content review](docs/deck-content-review-20261008.md) records the scientific distinctions and references. Attribution is embedded in `data/deck.json`, shown at completion and included in downloaded notes. This demo uses original wording and does not copy textbook passages, figures or an existing hackathon entry.

## Tests

Run the unit/property tests with Node 20+ and Python 3 (`python3` on your PATH): `node --test tests/*.test.mjs`. The local-file tests use Node's global [`File`](https://nodejs.org/api/globals.html#class-file), added in Node 20; Python verifies that the checked-in standalone author HTML matches its modular sources. No npm packages are required. Tests cover bounded probabilities over repeated updates, directional evidence behavior, invalid parameter rejection, entropy/information-gain bounds, prerequisite selection, exhaustion, and initialization.

Review tests also cover immutable first-answer snapshots, missed-question order, separate correct/incorrect retries, resumption, duplicate/out-of-order refusal, and all-correct sessions. Content revisions preserve item identities and the existing model/review contracts.

The optional rendered acceptance runner uses Node 22+ and an already-installed Chrome or Chromium executable:

```bash
node tools/check_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-browser-check
```

It starts a temporary localhost server and a separate temporary browser profile, drives the actual page with Enter and Tab, and checks review, practice, resumption, unchanged first-try estimates, a 390px layout, and the standalone file. The report and desktop/phone captures go to the selected output directory. It closes its own browser and removes its temporary profile afterward; it does not use an existing browser session. The runner is an optional system-browser check; the default test command and app require no browser automation package.

The trace archive has a separate browser receiver for real downloads, fresh documents, preview/cancel/restore, stale file reads, unchanged first answers, resumed practice, and standalone operation:

```bash
node tools/check_trace_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-trace-check
```

The [trace archive receiving packet](docs/receiving/trace-archive-49f845d0dece/README.md) records the exact source, native results, independent review, and actual saved-file examples.

## Accessibility and constraints

Semantic landmarks, skip link, visible keyboard focus, labeled progress bar, live session region, labeled answer group, text feedback, and responsive small-screen layout are included. No external images or data requests are needed. The default font stack remains usable offline. The app is a local demo, not a production assessment.

## AI-tool disclosure

AI assistance was used to develop and test the implementation and to draft original question wording. The implementation does not make AI/provider calls at runtime. ForgeHacks submission disclosure requirements have not been checked against a readable Devpost submission form; include this disclosure if required and confirm the platform's current rules before any submission.

## Status and unresolved gates

This public source repository supports the ForgeHacks 2026 demo. The Devpost account and join status for jacobsmetoyer@gmail.com are not verified; no contest join, terms acceptance, upload, or submission was made. Before submitting, confirm eligibility and the live entry form’s required fields, disclosure format, and deadline; this offline demo is not evidence of learning efficacy.
