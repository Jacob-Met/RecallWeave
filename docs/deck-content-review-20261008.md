# Cellular-energy deck content review — 2026-10-08

Contribution: `chatgpt-astra-bd1abdb2f886-20261008`, RecallWeave #9.

## Product change

Every original correct option was uniquely longest. Choosing the longest text therefore answered all six items correctly, independently of the displayed order. The revision removes that uniform cue and replaces several unrelated distractors with misconceptions about the same biological process.

The six item IDs, concepts, prerequisites and canonical correct-answer indices are preserved. The question count, model, selector, review/practice state and notes export remain unchanged. Answer presentation belongs to the separate #5 contribution; local deck import belongs to #7. The generated demo must be rebuilt from the integrated application source.

The revised deck gives a longest-text strategy two correct answers out of six. This is a mechanical content check. It does not measure learning, establish assessment validity or calibrate question difficulty. The existing mastery values remain toy-model estimates.

## Content rationale and primary references

All wording in the revised questions and distractors is original. The links below support the scientific distinctions, rather than supply copied passages or textbook exercises.

| Item | Scientific distinction checked | Reason the other options do not answer the prompt | Reference |
| --- | --- | --- | --- |
| `p1` | Chlorophyll absorbs light that drives photosynthetic electron transfer. | Chlorophyll does not directly capture carbon dioxide; glucose breakdown does not replace light absorption in photosystems; water supplies the electrons, rather than oxygen being split. | OpenStax [8.2, light-dependent reactions](https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis) |
| `p2` | The Calvin cycle uses ATP and NADPH to support carbon fixation. | The alternatives describe light reactions, glycolysis or mitochondrial electron transport. The prompt asks specifically about the Calvin cycle. | OpenStax [8.3, organic molecule synthesis](https://openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules) |
| `g1` | Light supplies energy for sugar synthesis; carbon dioxide supplies carbon. | The alternatives confuse an energy source with carbon, water or mineral nutrients. Soil minerals are nutrients, rather than a substitute for captured light energy. | OpenStax [8.1, photosynthesis overview](https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis) |
| `r1` | Oxygen accepts electrons at the end of the mitochondrial respiratory chain. | Glucose supplies fuel rather than replacing oxygen as the final acceptor. This human-cell chain does not switch to carbon dioxide or make ATP directly from glucose without electron transfer. | OpenStax [7.4, oxidative phosphorylation](https://openstax.org/books/biology-2e/pages/7-4-oxidative-phosphorylation) |
| `a1` | ATP hydrolysis can be coupled to cellular work, and ATP must be regenerated. | ATP is not a bulk, permanent fuel reserve. Regenerating it from ADP requires energy; it does not hold more energy per molecule than glucose. | OpenStax [6.4, ATP](https://openstax.org/books/biology-2e/pages/6-4-atp-adenosine-triphosphate) and [7.1, energy in living systems](https://openstax.org/books/biology-2e/pages/7-1-energy-in-living-systems) |
| `x1` | Photosynthesis stores captured light energy in sugars; respiration transfers some of the fuel's energy to ATP. | The pathways are not the same reactions reversed in one compartment. Respiration does not capture light to synthesize sugar. | OpenStax [8.3, relationship to respiration](https://openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules) |

Reference authors: Mary Ann Clark, Matthew Douglas and Jung Choi; publisher: OpenStax, Rice University; *Biology 2e*. Links checked on 2026-10-08.

The current linked textbook pages display **CC BY-NC-SA 4.0** in their licensing footer (dated July 22, 2026). The earlier demo's source-reference label said CC BY 4.0. This revision corrects the description of the linked reference edition and distinguishes it from the originally authored questions. It does not add a license to the application code, copy textbook passages or figures, or change contest/submission status.

## Receiving record

The independent reviewer accepted the scientific content and original notes-integrated application at [issue #9, comment 6057637334](https://github.com/Jacob-Met/RecallWeave/issues/9#issuecomment-6057637334). The first review requested the oxygen-limitation clarification described above; it was applied before final receiving.

The frozen browser receiver is preserved in [the evidence packet](deck-content-evidence-20261008/README.md), with its original failing run, passing candidate run, actual downloaded notes, source hashes and replay command. On original notes-integrated main `3e3217959bdf277ae5ef61a7afe68142e2626486`, seven behavior controls pass and the receiver exits 1 solely because selecting the longest visible answer scores 6/6. The revised deck passes all eight checkpoints with that strategy scoring 2/6. Selecting each canonical correct answer through Tab/Enter still scores 6/6.

The browser checks cover correct and incorrect feedback, first-answer review and mastery preservation, practice pause/resume and separate retries, actual UTF-8 study-note downloads, a 390px viewport, and the standalone file with HTTP(S) blocked. No JavaScript exception was observed. All 69 source files retained their before/after hashes in the original candidate run. These counts describe that exact historical receiving tree, before the final review document and evidence files were added.

### Composition with answer presentation

Main advanced through answer-presentation PR #12 to `a64369f84fae4cfd0b81aa3878cc11e2fa8d298c` while this content was being received. A new isolated worktree applies only the qualified deck, the narrow README text, and the literal attribution removal to that source. It preserves PR #12's application behavior, choice helper, browser runner and builder, then regenerates `demo.html` from those integrated inputs.

All **23 native Node unit/property tests** pass on the composed source, with no skips. A second execution of the unchanged integrated builder produces identical demo bytes. The [composition record](deck-content-evidence-20261008/integrated-composition.json) and [raw test log](deck-content-evidence-20261008/integrated-node-tests.log) accompany the browser evidence.

The same unchanged frozen receiver then passed **all eight integrated browser groups**, exit 0, on 2026-10-08 from 10:45:39.977 through 10:45:57.268 UTC. Its recorded answer permutations are nonidentity, so this run exercises the actual shuffled presentation. The longest-visible strategy still scores 2/6 and canonical correct choices score 6/6. The three downloaded note files, separate retries, keyboard behavior, narrow viewport and offline standalone checks all pass. No JavaScript violation or changed source hash was observed across the 121 source/evidence files present for that run. [The separate integrated packet](deck-content-evidence-20261008/integrated/README.md) preserves raw receiving bytes; the final editorial record and additional evidence copies were added afterward.

The integrated browser report SHA-256 is `504555125a6483bb58d9e768756719677e65cb7b2438ac0bd20ec04da7d2480b`; its integrity receipt is `9c340acd19d066b54900bb368cf334fe7377ff86cdf49a4f497511d058c170f8`. Native receiving uses Node 22.22.1 and Chromium 153.0.8010.47 on Linux.

| Composed artifact | SHA-256 |
| --- | --- |
| `data/deck.json` | `28204e412703fb3f143ebcaf0770e0eb6116a2c8c09c9a68a1b0ef873f95cc16` |
| `src/app.mjs` | `27aaacf30788c83ddbb1741b6b28a7cd61d57c23946e6e7852fe01970ad28b38` |
| `README.md` | `f0fa59c178fe6da79e7f756624d6146435fe010d7629b498169ea9a784b894da` |
| `demo.html` | `53543fc800c2f70f319a0da4568088a03d2628decc69589f311abaf44c20186c` |
| Unchanged current `tools/make_demo.py` | `218b3f26df80b7ca1c6666f77c6e7d056a3ee3894ad98ac1ca12f36c150cf5b3` |

Exact published-source, ordinary CI and final integration dispositions are recorded on the source PR. This receiving record does not claim deployment, scientific assessment validity or learner outcomes.

## Final current-main receiving

Main subsequently integrated learning-trace restoration and offline authoring at `4775af91ba6a5d4df787669f39b44364dd1e37ba`. The final isolated composition preserves those additions, reapplies only the same three reviewed source-text edits, and regenerates the learner demo with the unchanged current builder. All **50 Node tests** pass with zero skips; the generated learner demo is byte-identical on a second build. The authoring page and its source remain unchanged.

The unchanged independent content receiver passes **8/8 browser checkpoints** on this final composition. The existing trace owner's `tools/check_trace_browser.mjs` then passes **12/12 actual browser checkpoints**: download, preview/cancel, fresh-page restoration, stale file reads, separate practice continuation, failed-download recovery, and standalone restoration at 390px. Three actual study-note files and five actual trace downloads retain the revised course and canonical answers. Both runs report no JavaScript exception. These are root-executed runs of the already published/frozen receivers, separate from the earlier independent reviewer execution.

[The final packet](deck-content-evidence-20261008/final/manifest.json) preserves exact reports, logs, downloaded files and source/build pins. Trace restoration intentionally requires the exact course version. A trace from an older course is refused by that existing contract; this revision does not silently reinterpret or migrate it. Readable study-note files remain independent copies.

| Final artifact | SHA-256 |
| --- | --- |
| `data/deck.json` | `28204e412703fb3f143ebcaf0770e0eb6116a2c8c09c9a68a1b0ef873f95cc16` |
| `src/app.mjs` | `8b2be3e7bc8822f3bf0b39452c17be06743c1080c3f04d199a4d16f8ca569473` |
| `README.md` | `4e18bea70bb578e5517a0515faa389e9989c6d034c56beb20733237902ca21dc` |
| `demo.html` | `d5c37bea2de846cd9038076ced1d09b1124b5246da3d035750e25fa8c4ab3512` |
| `tools/make_demo.py` | `8fae60c5f98bc470d9ec8fe7ddacb00b644a0acfbeba8d10885da0daaa4417fc` |
| `src/trace-archive.mjs` | `d9e6d4343563eac97a17f0e79ea9080d0cfe694fd74f5e0173b53a4af3d912c6` |
| `src/trace-archive-ui.mjs` | `c62d7d40460ca20e47dba22a4401aff6aa2afbb0c9b873a94944d140c5fba28e` |
| `author.html` | `898b32303c834f6539b49a54e6c86ab38d3dd2d3e88e981d8a3287d63f64295c` |
