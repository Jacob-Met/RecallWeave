# Minimum-spanning-forest course and explorer receiving

This packet accompanies the original twelve-question course and standalone offline Kruskal explorer in RecallWeave issue123.

Native final source: e8706c8509dfe1d14e75ba53710ec961711eec32, tree 2b8ba16e31f7bcf52388fe96c13af8318720a97b, actual upstream76921e03cb9da8a3dd7162d128704185162eb380. The source consists of ten additions and one additive README entry. All seven received runtime/course/builder files remain exact. Removing only our README entry recreates the entire upstream README. The four learner dependencies exercised by the author tests are unchanged Git blobs.

## Independent gates

- Helper: root froze its subset-optimum oracle before implementation. Native Node22.22.1 passed4,165 exhaustive graphs,96 seeded larger graphs,10 hand graphs,28 helper refusals,7 parser accepts/32 refusals, detached/frozen caller checks and23,465 enumerated subsets. Root read and accepted helper7073e219. See helper/REVIEW.md. The original manifest is unchanged; two executable control filenames gain inert .txt suffixes, mapped in helper/archive-map.json.
- Course content: github_estate read every question and the guide, checked worked examples, and accepted final deck1dfd5a1b / guidefd316452. The disconnected-forest distinction and already-included-edge proof case were corrected before the final freeze. The content directory retains both findings, historical hashes and reversible source patches.
- Actual browser: remote_estate independently authored and executed the maintained direct-file Chromium153 receiver. The exact corrected page passed13 groups/371 assertions,10 actual saved files and three captures inspected by the receiver. Controls cover graph decisions, replay, input retirement/refusal, native keyboard actions, exact course/guide/trace downloads, download failure/retry and390px containment.
- Author consumer checks: nine native Node22 tests passed, including existing deck import, all-question adaptive selection, separate practice, study notes, exact rebuild and literal-content preservation. These are separate from the peer/helper/browser gates.

## Preserved negative evidence

The original browser layout forced a730px history track into a390px page, producing767px document width. The successor changes only the history grid column minimum from1fr to minmax(0,1fr), then rebuilds. Original failure1c9b1f9f and focused diagnosis616e3ae8 remain separate from final success804ab0db.

The browser packet also retains the original startup timeout, capacity refusal and two receiver-only expectation corrections. They are not product passes or hidden product changes. No completed gate was inferred from a lost process session.

## Complete browser archive

browser/receiving.tar.gz preserves all78 original packet files byte-for-byte, including saved text files, original/final captures, receipts and inert historical source mappings. SHA-256:8a816211b06bd19936cca047561a18c0f38c238f38588537a7ad1ccb6719c979.

The copied browser README, REVIEW and original packet manifest are immediate entry points. browser/archive-custody.json records an independent archive/member comparison before publication. Extract into a separate directory to inspect all evidence.

## Reproduce the current workflow

From the repository, run node --test tests/minimum-spanning-forest.test.mjs tests/minimum-spanning-forest-course.test.mjs and node tools/build-minimum-spanning-forest.mjs --check. The maintained tools/check-minimum-spanning-forest.mjs documents its explicit browser/root/output arguments. Native Snap Chromium used an exclusive permitted profile; no dependency installation or shared cache change was used.

Open courses/minimum-spanning-forest-explorer.html directly. It requires no server, account, automatic storage or network request. Optional references load only when selected. The objective is minimum total connection weight, not every shortest route. The lesson's learning estimates are model state, not efficacy or grades.

Archived runs qualify the stated bounded source. They do not claim another device/browser, hosted deployment or source integration before normal review/CI gates. Native source history and Git bundle custody are retained separately.
