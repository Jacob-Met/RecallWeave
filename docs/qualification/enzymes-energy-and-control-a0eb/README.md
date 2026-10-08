# Enzyme unit: receiving qualification

## Contribution and learner

This contribution adds a twelve-question optional unit for introductory biology learners who have finished RecallWeave's cellular-energy lesson. The current six-question deck covers photosynthesis, glucose, respiration and ATP; it has no question about activation barriers, catalysis, saturation or feedback regulation.

The only product additions are `courses/enzymes-energy-and-control.json` and its worked guide. All existing learner, authoring, model, review, trace, validator, builder and default-deck source remains inherited from the receiving commit.

- Repository: `Jacob-Met/RecallWeave`
- Receiving commit: `4775af91ba6a5d4df787669f39b44364dd1e37ba`
- Receiving tree: `fb9d1abd96fdbee9a05a88776b204a9f02ed612f`
- Default-deck evidence: `data/deck.json`, blob `f1d4eb431c073b7bda268a2008e733b254a115fc`
- Final course: 14,472 UTF-8 bytes; SHA-256 `f8539cc5ba82cdae6f128986cdec2d09b62d846c2cf3bc9bc221d406264ff64a`
- External contributor: `chatgpt-a0eb505c4971/estate_products`
- Native scope claim: Conscience 3958, `cev_12257b9d337646c89595ebe7`

## Publication against fresh current source

Main advanced to `5ce520a778da04605f5fa610fb1ad110ffe52b99` (tree `3da3cc7da0005c9e703548057a2e60642f144f37`) before publication, incorporating the separately reviewed default-course wording and attribution correction in PR #20. The contribution preserves all 239 current leaves. All eight files used by the qualified native/module/browser receiving checks retain their exact Git blobs. The current default deck still has six questions in the same four concepts and the enzyme curriculum gap remains. The [current-source binding](receipts/current-source-binding.json) records this comparison; unchanged receiving checks were not repeated.

## Content review

All twelve prompts, keys, explanations, transfer prompts and worked distractor rationales received a separate content review. Two bounded findings were applied before final receiving:

1. The fictional saturation data now use one internally consistent simple example: `v = 10S / (1 + S)`, rounded to one decimal. Concentrations 1, 4 and 16 give rates 5.0, 8.0 and 9.4. Learners only need to recognize diminishing increases; the question does not require fitting parameters.
2. The second numerical energy profile begins “For an invented reaction.” Its energy endpoints differ from the first profile, so “the same reaction” was an incorrect cross-question reference.

The guide's options are ordinary Markdown bullets. No option, key, explanation, transfer prompt or concept dependency changed in those corrections. Original wording and the exact before/after patch are preserved.

The [independent content review](receipts/content-review.json) binds the final JSON and guide hashes, reports no remaining content blocker, and records the primary-source access limits. Browser and model tests are separate software evidence and do not establish measured learning effectiveness.

## Current product receiving

The final course passed six native Node controls against exact current source bytes:

- Shared validator admission and serialization; twelve unique IDs, four concepts and balanced canonical answer positions.
- Independent energy-barrier and proportional arithmetic, plus the fictional saturation data.
- Exact author-draft conversion and round trip, including Unicode quantities.
- Actual adaptive selection, first-answer model updates, missed-answer practice, study-note export and learning-trace restore for all-correct, all-missed and mixed answer patterns.

The final browser check uses the current self-contained `author.html` file unchanged in a fresh private Mac Chrome 154 profile. Page networking is disabled. At a 390 × 844 viewport it proves native file selection and preview, keyboard cancellation preserving an existing draft, explicit replacement, all twelve fully rendered prompts/keys/explanations/transfer prompts, a physical exact-byte JSON download, and reopening that actual downloaded file in a fresh author page. No page exception, HTTP request or horizontal overflow occurred. The test closes its own browser and removes only its own temporary profile.

This is successful **current Deck Studio receiving**. The separately owned learner importer in [issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7) is not yet published in this receiving commit. This contribution does not claim imported-course lesson start or deployed learner adoption. It does not publish a substitute importer or replace the bundled deck. The worked guide is usable independently and the JSON is ready for that owner's final receiving composition.

## Preserved negative evidence

The original saturation data fail the added independent simple-model arithmetic control. The corrected final course passes. This records a content correction; it is not an application defect.

The first browser driver sent an incomplete Enter event and stopped at cancellation with zero completed groups. Its source and failed receipt remain preserved. Correcting only the driver to include the Enter text, then using the identical original course and identical author bytes, completed the browser flow. A later successful run binds the final corrected course. No failed run is counted as qualified.

## Repeat the bounded checks

From this source tree:

```sh
node --test docs/qualification/enzymes-energy-and-control-a0eb/check-course.mjs
```

The browser driver requires an installed Chrome, a separate receiving checkout or exact source directory, and an evidence directory that does not already exist. It installs no packages.

```sh
RECALLWEAVE_RECEIVING_ROOT=/absolute/path/to/RecallWeave \
RECALLWEAVE_EVIDENCE_DIR=/absolute/path/to/new-evidence-directory \
node docs/qualification/enzymes-energy-and-control-a0eb/check-author-browser.mjs
```

Set `RECALLWEAVE_CHROME` if Chrome is not at the native Mac application path. These commands use only private fixture state and the original fictional course.

## Ownership boundary

Importer #7, default-deck wording #9, authoring/reopening #10, probability #13, membrane transport #15 and vector geometry #17 retain their scopes. The membrane-transport course retains permeability, osmosis, gradients and active/coupled transport. No live learner record, account, goal or deployed service is changed by this course contribution.
