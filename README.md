# RecallWeave

**ForgeHacks 2026 · AI + Education** — an original, static, browser-only learning experience about connecting ideas in cellular energy. The official track framing on ForgeHacks is “Reimagining how people learn and teach.” This demo responds to that brief by helping a learner retrieve concepts, see links, and apply them—not by generating chat answers.

## Run it

Open `demo.html` directly in a browser—no server, install, build step, internet, login, API key, or user data storage is required. It is a single self-contained file with embedded CSS, JavaScript and deck. The modular source is in `index.html`, `src/`, and `data/`; to test that version locally, serve this directory with `python3 -m http.server 8080` and visit `http://localhost:8080`. Rebuild the direct-open demo with `python3 tools/make_demo.py` after source changes. No hosted endpoint is called by either version.

## Core and interaction

- `src/knowledge.mjs` implements a transparent BKT update: initial knowledge, learning transition, guess, and slip are explicit probabilities. It also computes binary entropy and expected information gain.
- The adaptive selector picks an unanswered item with highest expected information gain, plus a small bonus for weak concepts that unlock unanswered downstream ideas; ties are stable by item ID. There is no LLM or hidden personalization.
- `src/app.mjs` records the current session only in memory, gives item-level explanations/transfer prompts, and shows estimated mastery as a model state, never a grade or validated diagnosis.
- The welcome panel includes a clearly labeled, deterministic synthetic learner simulation comparing adaptive selection with fixed deck order using the same toy learner assumptions and random seed. Its tiny run is demonstrative, not empirical evidence or an efficacy claim. Test coverage separately evaluates model invariants, not learning outcomes.

## Demo deck provenance

Question text and distractors are newly authored for this demo. Scientific concepts are adapted from OpenStax, *Biology 2e*, Chapters 7–8, Rice University, CC BY 4.0: <https://openstax.org/details/books/biology-2e>. Deck attribution and license are also embedded in `data/deck.json` and shown at completion. This work does not copy an existing hackathon entry or project.

## Tests

Run the dependency-free unit/property tests with Node 18+: `node --test tests/*.test.mjs`. Tests cover bounded probabilities over repeated updates, directional evidence behavior, invalid parameter rejection, entropy/information-gain bounds, prerequisite selection, exhaustion, and initialization.

## Accessibility and constraints

Semantic landmarks, skip link, visible keyboard focus, labeled progress bar, live session region, labeled answer group, text feedback, and responsive small-screen layout are included. No external images or data requests are needed. The default font stack remains usable offline. The app is a local demo, not a production assessment.

## AI-tool disclosure

AI assistance was used to develop and test the implementation and to draft original question wording. The implementation does not make AI/provider calls at runtime. ForgeHacks submission disclosure requirements have not been checked against a readable Devpost submission form; include this disclosure if required and confirm the platform's current rules before any submission.

## Status and unresolved gates

Local project only. ForgeHacks/Devpost account and join status remain unverified. Nothing was logged into, joined, registered, published, pushed, uploaded, submitted, or messaged. Before any future submission, confirm current entry/join eligibility and deadline, disclosure requirements, and whether the hackathon accepts this local browser-only work. This task deliberately does not perform those actions.
