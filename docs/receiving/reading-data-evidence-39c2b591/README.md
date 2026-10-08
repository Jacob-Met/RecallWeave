# Reading data and evaluating evidence — source receiving

This contribution adds one optional 12-question course and its worked guide. It changes no learner, importer, authoring, trace, default-deck or other-course implementation.

## Accepted content

The unchanged final JSON has SHA256 `cd59656da5e8e426f553bdda0b0ab7912232551a6dea3ab21727e73b70ca9411`. A separate reviewer froze all twelve answer texts and derivations before reading any author key or explanations. Every authored answer agrees with that blind review.

The final JSON removes the original answer-position cycle, specifies arithmetic means, distinguishes assignment variation from population sampling, and scopes one transfer to an unweighted voluntary poll. The reviewer checked every explanation and transfer boundary, including unequal-size group means, the 50/50 experience mix, and offer-versus-joining effects. Original questions, answer order, key, reviewer freeze and subsequent comparison remain in `content/`.

The final guide changes only two loading instructions from the independently accepted v2 guide: choosing a file opens a preview; **Start this deck** starts or replaces a lesson. The worked mathematics, source references and transfer guidance are unchanged. This clarification follows the actual browser observation described below; it does not change a served app or the course JSON.

## Actual app consumption

The separate native consumer passed **20/20 groups** in Chromium 153.0.8010.47 / Node 22.22.1. Both the modular HTTP app and generated standalone HTML consumed the exact JSON through their real file chooser, displayed all twelve shuffled questions, retained two deliberate first-attempt misses, and recorded two practice corrections separately. Four real study-note downloads retained question order, original choices, explanations, transfer prompts, course attribution and license. The 390px standalone layout stayed within the viewport; switching back to the bundled lesson required explicit Start.

This run used the already-received **main a64369f plus issue #7 importer** composition. Its 20 source files and generated standalone are exactly pinned in `consumer/source-manifest.json`; no app source was changed for this course. The actual public-main 4775af91 standalone was also launched as a capability control: it starts the bundled lesson and has no local deck picker. Later trace-archive/authoring integration is not being credited to that older importer composition.

The current importer remains with [issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7), its existing source owner and current-main receiver. This contribution supplies compatible course content; it does not claim that importing it is already enabled on the deployed application. The guide explicitly requires a version with the local picker.

See `consumer/RECEIVING.md` for all twenty groups, the true preview/start behavior, native source hashes, note hashes, and the retained Mac transport/capacity and ThinkPad chooser-adapter setup failures. The original full app/source/failure/capture packet is retained in native Git at `/home/jacob/hamon-recallweave-course-consumer-39c2b591-v1`, receiving `ce0a4a98b993726790fe1009175191606f3e0bbf`. Its complete no-prerequisite bundle is 3,331,109 bytes, SHA256 `466055467e674658567b587e12d354d3e2e68bead0a6849a377584906e1b5a01`.

The native content-review packets are at `/Users/me/hamon-reading-data-independent-39c2b591-_fuznk8w`. The untouched blind archive hash is `73546e2ca1c0eeb51dd143ca28590835df0dcdc3f14d254897b0cba9b5d683ef`; the accepted revised-content archive is `19277baaf2b8ab5e86ced78329f7677f91970e69069bc9559d10a6049b9ecbac`.

## Current-source preservation

The course was added to native main `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4`, retaining the newer dependency-graphs course, trace archive and authoring source. The current main deck validator separately admits the delivered JSON; its source hash and actual result are in `schema-validation.json`. These source-correspondence and content gates do not extend the older browser receipt to unexecuted current-importer integration.

Source author: estate-39c2b591d7e5/root. Blind/content review: estate_coordination. Native app consumer: runtime_review, adapting the existing probability-lane browser receiver with its provenance retained. This is illustrative course material; no validated learning-model or educational-efficacy claim is made.
