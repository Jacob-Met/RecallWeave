# SQL course and explorer: independent receiving

**Disposition: APPROVE the exact frozen V3 standalone SQL contribution for coordinated publication.** The twelve-question course, real SQLite result catalog and bounded explorer have no remaining source, pedagogical or native-browser blocker within this review. The final learner app file-picker integration remains pending with its separate owner.

Subject manifest: `bf206f0e57730ef563b40d041e38dc24f587885e888ac55d64581c9d11b58f69`. Reviewed source root: `estate-runtime/recallweave-sql/frozen-v3/repo`. The eight contribution paths are new; the five published deck/knowledge/review/answer-order/session-export dependencies are unchanged from main `4775af91ba6a5d4df787669f39b44364dd1e37ba`. Final current-tree preservation and publication remain root/author responsibilities.

| Exact input | SHA256 |
| --- | --- |
| Original course source | `f9237bb99138e9da94c0a1149605ef3b19987899594d6742d0261ade68f5b6f3` |
| Generated course JSON | `e5fbe1589409876871d1358e6287eb95d2cdd624a5d8da1e1a0a2871801f4512` |
| Standalone explorer | `65b208cd4b80eb0df87d64e2e493f47a14e07174ecdece0beeafb2d960a5c454` |
| SQLite builder | `e8767a3dbaa32a78c6e10e091e36eb2967bc0d823102641ce5a796899463f6b8` |
| Final browser receiver | `8c4f898b80b971b828ef193cc2e1562ac661f875d8ffba6d15975fd622b9ec92` |

## Independent content and contract review

I read the complete question source, generated course, builder, template, shared deck validator, native learner/review/notes functions and the published learner's loading path. Each question gives the complete fictional tables, query, output-column order and typed result alternatives. Duplicate readings remain visible; multirow answers have an explicit order. The course identifies SQLite behavior where that matters, including NULL ordering, and does not turn equivalent numeric displays into a distractor.

The main distinctions are correct:

- `value = NULL` produces no qualifying WHERE rows; `value IS NULL` selects the missing measurement. Zero remains a known value.
- The six readings have five known measurements and average 16. The zero contributes to the denominator; the NULL does not.
- Grouping preserves duplicate values. The unassigned reading forms the NULL station group in a readings-only aggregate.
- An inner join has five reading matches. The left join has seven output rows but five non-NULL reading IDs; its two unmatched station placeholders are not measurements.
- Moving the value predicate from WHERE to ON changes which unmatched left rows survive. At threshold 30, ON retains four station placeholders while WHERE returns none. The reading with unknown station ID cannot become a match merely because its value is 30.

These interpretations were also checked against SQLite's primary [aggregate](https://sqlite.org/lang_aggfunc.html) and [SELECT](https://sqlite.org/lang_select.html) documentation. The answer options, explanations and transfer prompts are consistent with the actual query result and the misconception each item targets.

My separate in-memory SQLite probe executed six controls that expose intermediate facts: per-row NULL/zero truth values; all-NULL versus empty aggregate input; per-station joined-row, reading and measurement counts; and ON/WHERE behavior at threshold 30. All six passed on SQLite 3.53.1. The raw observations, exact SQL and probe source are retained here. These are separate from the author's twenty-two catalog checks and are not added to its test count.

One teaching defect was corrected during review. Question 4 referred to the “next example,” although adaptive selection does not guarantee that question 5 follows. It now names “Find the missing measurement.” A structural comparison confirms this is the only changed source value; the schema, fixture, queries, answers and rationale remain unchanged. The earlier six-control receipt remains pinned to its original source and unchanged setup SQL, so no rerun was needed for that wording correction.

## Actual native receiving

I verified all thirteen frozen source hashes and Git blob identities, all forty-eight payload hashes in the author's sealed native packet, the final controller/browser source maps, all three completed download bytes and the three native screenshots. The author packet manifest is `a6edc75ac08d020b76c1309e5604444788878881674863a9d716288e2b93a911`.

The retained Mac stages executed all twenty-two prepared queries with SQLite 3.50.4 and passed five focused native-module tests. The later Mac browser stage failed before product assertions; its overall receipt correctly remains failed. That failure is not counted as browser acceptance.

Final ThinkPad receiving used Chromium 153.0.8010.47. The exact frozen V3 checker completed eight groups, printed `SQL_BROWSER_OK checks=8 failures=0`, exited 0 and left empty stderr. It exercised all twenty-two SQL/result bindings, prediction reset and aggregate row counts, native keyboard controls, 390 px layout and keyboard table scrolling, and real downloads. A fresh direct-file page remained functional after the loopback server closed. Both course downloads equal the generated JSON exactly; the practice download equals the complete saved SQL. All thirteen source hashes agree before and after execution.

I inspected all three final images. The desktop frame clearly separates data, controls, read-only SQL and five ON-result rows. Mobile controls and wrapped SQL remain readable. The mobile group table shows an intentional horizontal scroll with focus and scrollbar; its leading column is partially outside that scroll position, while the complete result was independently checked in the browser assertions.

The checker-only V2/V3 changes address existing-browser startup and owned-profile cleanup. The prior run that passed product assertions but failed cleanup remains a failed run. The final checker waits for browser exit, retries removal only of its own temporary profile, and sets failure status if cleanup cannot complete. Final profile removal succeeded. All twelve other source inputs are unchanged across the three freezes.

## Delivery and ownership boundaries

The SQL display is read-only. Controls select explicit prepared queries whose results were executed by SQLite at build time; there is no pretend editable SQL engine. Downloads let users take the actual SQL to SQLite for their own edits. The generator verifies the manually selected answers and refuses invalid/stale output before replacing artifacts.

The course is received by the published deck validator and native learning, review, practice and notes functions. Published main's learner still loads its default deck; the final file-picker composition belongs to issue 7 and has not been received with this course. This approval does not claim final importer adoption, deployment or measured learning efficacy. No shared app, default deck, schema, authoring module or another owner's course was changed.

The final review performed source/diff reading, artifact parsing/hashing and screenshot inspection only. It did not repeat the author's SQL, native-module or browser runs. The copied initial static receipts remain historical observations; `receipt.json` and this disposition record the now-completed standalone receiving boundary.
