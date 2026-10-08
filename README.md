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

Review and practice stay in this tab's memory. Refreshing the page or starting a fresh local session clears them. The modular app and the direct-open `demo.html` provide the same flow.

### Keep your study notes

After the first session, choose **Download study notes (.txt)** to save a readable copy of the complete learning trace. The file includes the question order, actual first answers, corrections, explanations, transfer prompts, the first-session model estimates, and deck attribution. Any recorded practice answers appear separately; a paused round reports how many questions are still unanswered.

The download works offline in both the modular app and `demo.html`. It saves a UTF-8 text file through the browser's normal download flow. It does not upload the session or restore it after a refresh. Model estimates remain labeled as model state rather than grades, and practice never replaces the original answers.

## Demo deck provenance

Question text and distractors are newly authored for this demo. Scientific concepts are adapted from OpenStax, *Biology 2e*, Chapters 7–8, Rice University, CC BY 4.0: <https://openstax.org/details/books/biology-2e>. Deck attribution and license are also embedded in `data/deck.json` and shown at completion. This work does not copy an existing hackathon entry or project.

## Tests

Run the dependency-free unit/property tests with Node 18+: `node --test tests/*.test.mjs`. Tests cover bounded probabilities over repeated updates, directional evidence behavior, invalid parameter rejection, entropy/information-gain bounds, prerequisite selection, exhaustion, and initialization.

Review tests also cover immutable first-answer snapshots, missed-question order, separate correct/incorrect retries, resumption, duplicate/out-of-order refusal, and all-correct sessions. The existing knowledge model and deck are unchanged.

The optional rendered acceptance runner uses Node 22+ and an already-installed Chrome or Chromium executable:

```bash
node tools/check_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-browser-check
```

It starts a temporary localhost server and a separate temporary browser profile, drives the actual page with Enter and Tab, and checks review, practice, resumption, unchanged first-try estimates, a 390px layout, and the standalone file. The report and desktop/phone captures go to the selected output directory. It closes its own browser and removes its temporary profile afterward; it does not use an existing browser session. The runner is an optional system-browser check; the default test command and app require no browser automation package.

## Accessibility and constraints

Semantic landmarks, skip link, visible keyboard focus, labeled progress bar, live session region, labeled answer group, text feedback, and responsive small-screen layout are included. No external images or data requests are needed. The default font stack remains usable offline. The app is a local demo, not a production assessment.

## AI-tool disclosure

AI assistance was used to develop and test the implementation and to draft original question wording. The implementation does not make AI/provider calls at runtime. ForgeHacks submission disclosure requirements have not been checked against a readable Devpost submission form; include this disclosure if required and confirm the platform's current rules before any submission.

## Status and unresolved gates

This public source repository supports the ForgeHacks 2026 demo. The Devpost account and join status for jacobsmetoyer@gmail.com are not verified; no contest join, terms acceptance, upload, or submission was made. Before submitting, confirm eligibility and the live entry form’s required fields, disclosure format, and deadline; this offline demo is not evidence of learning efficacy.
