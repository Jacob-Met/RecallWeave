# Edit distance: original lesson and offline explorer

This contribution adds an original twelve-question RecallWeave lesson and a standalone explorer for weighted edit distance. Learners can inspect every prefix cell and all minimum-cost predecessors, follow one declared deterministic alignment, replay its exact source-to-target witness, and download the fixed lesson through the unchanged learner's explicit local-file preview/start flow. Inputs are literal Unicode scalars, at most16 per string; insertion, deletion and substitution cost1–9, matches cost0. There is no normalization, transposition, semantic-similarity or learning-efficacy claim.

Coordination is RecallWeave issue140. The captured baseline is main567425f209cdf8e8cf9767faac9bfd3003af3e65, treea877e5d5eb1953aa2389ea75ef7cad96da321c1a. Final source tree9ba427709e1dab7396eaee21fe9beb2ffbf2d64f has2,331 leaves and preserves all2,321 unowned baseline leaves. The nine new paths and additive README section leave the catalog, importer, learner and other lessons unchanged. A future fresh-parent composition must apply the README addition and preserve later unrelated work.

| Boundary | Actual evidence |
| --- | --- |
| Baseline learner |26/26 maintained deck/knowledge/review methods; actual12-item review and separate practice exercised before candidate implementation. |
| Authored model/course |10 focused methods, including900 predeclared exhaustive alignment cases. The complete corrected-course native suite passed571/571, with zero skips/failures, on tree7b087777a243d25c5ff6e5b3e2b9d14e91a8fac5. |
| Link-only successor |Treeeb5ab352400a643bd85768b46b81921820a5f233 changes only the guide's malformed MIT URL and its bundled copy. Deterministic build/check passed; other2,329 tree entries are exact. |
| Independent receiving |A separate reviewer froze controls before candidate exposure, then passed3 native groups covering675 input/cost combinations and7,203 prefix cells. Its2 real offline browser groups passed on exacteb5, including genuine downloads, preview/cancel/start, all12 questions, separate practice and notes. Its twelve-file packet and original receiver correction remain separately attributed. |
| Authored browser |The original receiver passed4 of5 groups, including table/ties/witness, invalidation, literal scalars/keyboard/390px layout and direct-file downloads. Its fifth group wrongly compared the entire native review list before/after practice, despite intentionally appended retry blocks. That original4/5 failure is retained. |
| Final receiver correction |Final9ba changes only tools/check-edit-distance-browser.mjs fromeb5. It compares a detached clone excluding exactly .review-practice-answer and separately requires three correct retry blocks, retaining first-summary/mastery equality. Syntax passed. Its rerun failed during Chromium startup before a page or product group; the corrected fifth group is **not counted as passed**. |
| Hosted/public delivery |Unrun and unclaimed. No Actions or publication-triggering step was taken by this worker; those steps are held under the current no-more-Actions instruction. |

Native receiving used existing ThinkPad Node22.22.1, which satisfies the repository's Node20+ contract, and Python3.14.4. Browser receiving used existing Chromium153.0.8010.47 Snap and the existing Puppeteer module, with isolated home directories for temporary files, profiles and downloads. No dependency, provider, payment or shared-profile changes were made.

The packet retains four distinct kinds of negative evidence: the initial sparse-checkout command error; six full-suite failures from omitted pre-existing test inputs, repaired only by materializing ten exact primary files; the blind review's ambiguous final distractor and malformed reference; and authored browser startup/oracle failures. The corrected distractor changes only two options in item12; all other course items and keys are preserved. The official MIT landing page was read successfully; the malformed link was not labeled an observed HTTP404. The independent review also retains its own unsupported Control+A transport failure and versioned correction.

The native evidence archive contains47 exact UTF-8 files, including the pre-correction source snapshot, predeclared reference, source pins and complete original/final logs. The author receiving archive contains all declared raw setup/browser receipts, original and corrected receiving code, actual downloaded bytes and the narrow oracle diff. Profiles, duplicate offline source copies and dependencies are excluded; their source identities remain in the receipts. The two PNGs are the actual authored4/5 run's390px and desktop captures, both visually inspected. Do not relabel them as a later corrected-receiver run.

To restore either archive into a new directory, use the supplied verifier. It checks the archive hash and every file's byte count, SHA256 and Git blob before writing:

```sh
python3 unpack-evidence.py native-evidence.json.gz.b64 native-evidence-manifest.json /absolute/new-native-evidence
python3 unpack-evidence.py author-receiving.json.gz.b64 author-receiving-manifest.json /absolute/new-author-evidence
```

At the exact source boundary, the native commands need no dependency installation:

```sh
node tools/build-edit-distance.mjs --check
node --test tests/*.test.mjs
```

The optional browser tool takes an absolute source directory and a new output directory. PUPPETEER_MODULE and BROWSER_BIN must point to existing installed runtimes; TMPDIR/TMP/TEMP should point to a fresh owned directory visible to the browser. Its exact historical command environments and launch limits are preserved. A future successful run of the corrected tool must be recorded separately; this packet does not substitute independent coverage for an unrun authored gate.
