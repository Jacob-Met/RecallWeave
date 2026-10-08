# Mendelian inheritance course and cross lab receiving

This additive course connects gamete routes to genotype and phenotype probabilities, then uses the existing RecallWeave learner for first answers, explanations, separate retry practice and the learner's own notes.

Open [the direct-file lab](../../../courses/mendelian-inheritance-lab.html), download its course JSON, and choose that file in the existing learner. The [guide](../../../courses/mendelian-inheritance.md) supplies all 12 worked answers, 36 distractor rationales and 12 transfer solutions. The model covers hypothetical diploid plants with one or two autosomal loci; its equal segregation, random fertilization, complete-dominance and independent-assortment assumptions are explicit. Outcomes are probabilities, not guaranteed offspring counts.

## Exact source and ownership

The source fence is [issue #60](https://github.com/Jacob-Met/RecallWeave/issues/60). This packet composes 10 new course/model/UI/build/test files and a 966-byte README addition on commit 6f920f177ae90a09958146d41612a0e83f52702f, tree c2be5240d1ffa17c7e66b3fb8fe74aa334ec10b2. All 1,178 unowned current leaves, including the full current learner, importer, model, authoring tools and grouped-data/membrane additions, remain exact. No workflow or dependency manifest changes. The complete current tree contains no applicable AGENTS/CONTINUE/CODEOWNERS/CONTRIBUTING file.

[receipt.json](receipt.json) lists each executed source hash, before-image, runtime, raw log and qualification boundary. [evidence.tar.gz](evidence.tar.gz) contains the actual source snapshot, raw results, browser captures/downloads, preserved earlier probes and the immutable independent receiving capsule. Its own member manifest hashes every regular file.

## Qualification

- **14/14 new native tests** and **241/241 complete current tests**, zero failures/skips, on native Node 26.3.0. The existing make_demo.py output remains byte-identical, and the generated cross lab passes exact source/course parity.
- **Independent blind content receiving** froze all 12 answers, 48 option evaluations and 12 transfer solutions before seeing the author's key/model. An independent exact-rational dosage-polynomial oracle matched all 90 one/two-locus parent pairs and 272 weighted cells. Its one explanatory clarification is preserved: the familiar 9/16 event for AaBb × AaBb is both-dominant, while A-dominant and bb is 3/16. The asymmetric question's answer remains 1/2.
- **14 actual browser checkpoints**, using installed Chrome 154.0.8037.98 and the existing Playwright 1.63.0 runtime. The lab runs from both direct file and HTTP, produces exact real JSON downloads, responds to parent/preset edits, retires stale results, and remains usable at 390 px. The downloaded course is imported into both modular and standalone learners: 24 first answers, 6 separate retries, literal multiline notes, 5 actual downloads and 7 captures. First answers/model state stay unchanged by retry practice. No uncaught page/console exception or dialog occurred.

The biology definitions and scope were checked against the primary OpenStax and NHGRI pages linked in the guide. Scenarios, questions, calculations and explanations are original; no source exercise or figure is reproduced.

## Preserved corrections and limits

The original CLI invocation through an owned directory symlink silently exited zero with a stale generated file. Only this new builder's entry detector now resolves the invocation path; a maintained regression proves stale refusal and valid acceptance. The builder function and CLI body remain exact. This later CLI correction does not change the previously browser-executed HTML; the final parity check binds that same 40,531-byte artifact.

Earlier receiver probes are retained, not presented as successful gates. Sparse selection initially omitted exact current author HTML/CSS; those inputs were hydrated. Existing grouped-data tests require a canonical owned TMPDIR on this Mac because its default /var path is a symlink. No neighbor source/test was changed. Early custom-CDP HTTP navigation and Mac select-key probes exposed receiver/runtime assumptions; the established Playwright route passed the unchanged product inputs. The final helper also follows the existing immediate start behavior of “Start this deck.”

The independent capsule is unchanged, including its blind freeze and the item 11 correction. A later guide edit changes only native maintenance instructions to describe the established Playwright route. Historical native/browser scopes remain labeled by their actual source pins.

## Reproduce

From a complete checkout:

~~~sh
node --test tests/*.test.mjs
python3 tools/make_demo.py
node tools/build-mendelian-inheritance.mjs --check
~~~

The maintained CI additionally compares the generated demo to its before-image. On the recorded Mac, TMPDIR was an owned canonical directory; the receipt records it. The optional browser receiver uses an already installed Playwright and Chromium:

~~~sh
node tools/check-mendelian-inheritance-browser.mjs --playwright /path/to/playwright/index.mjs --browser /path/to/chromium --output /path/to/fresh-output
~~~

These are recorded native results, not a claim of a hosted Node 20 gate or deployed release. Root receiving owns publication and any newer-main composition.
