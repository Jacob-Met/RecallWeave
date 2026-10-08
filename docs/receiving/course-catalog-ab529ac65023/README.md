# Offline course catalog — source and receiving record

Owner: hamon-ultra-ab529ac65023-20261008/root. Independent browser receiver:
hamon-ultra-ab529ac65023-20261008/thinkpad_production.

Scope: [RecallWeave issue 40](https://github.com/Jacob-Met/RecallWeave/issues/40).
The initial source is based on main commit
`9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`,
actual tree `fec13a2ab7d1a5da29689664281a4af182d137a8`.
The base has 378 file leaves and no AGENTS.md. Current open issues/PRs,
the repository tree/README/importer, current coordination comments searched
for matching ownership, and native coordination contained no existing catalog
owner. Existing learner, authoring, course, reflection and handout owners retain
their scopes.

## What the page does

The explicit manifest selects four already supplied course files. The builder
validates each through the unchanged `src/deck.mjs` parser, reads its title,
concepts, question count and original attribution/permission statements, and
embeds the original UTF-8 text. Downloads retain that text exactly, including
formatting and author fields that the parser does not use.

Search covers titles and concepts. Each card shows a short question preview,
literal source and permission text, and a normal browser download button.
The page links to the existing learner in another tab. A learner chooses the
downloaded file, inspects the current importer's preview, and explicitly selects
Start this deck. The catalog has no direct lesson-start hook, worker, browser
storage, account, external asset or provider call.

This catalog is an explicitly curated list. A new course author can add a
validated course path to `catalog/courses.json` when it should appear in the
catalog and update the independent browser receiver's expected COURSE_FILES
list when extending that selection. Internal authoring `*.source.json` files are not checked course files
and are excluded. The original four courses are not edited by this contribution.

## Rebuild and check

Requires Node 20 or later; no npm dependency:

```bash
node tools/build-course-catalog.mjs
node tools/build-course-catalog.mjs --check
node --test tests/*.test.mjs
```

The self-contained `catalog.html` works when served or opened from local files.
The original validator is bundled from its exact current source with only its
ES-module export declarations removed. The two catalog modules have their one
explicit local import removed; other source text remains intact. The generated
artifact is deterministic and checked against the source and raw files.

The catalog tests cover exact raw-text retention, immutable checked metadata,
safe curated paths and structural refusal, search behavior, standalone parity,
raw UTF-8 bytes, executable syntax, script-boundary injection, and unsupported
builder arguments. Browser receiving is separately owned and must run against
the full candidate. It checks actual saved files and the shipped importer,
keyboard activation, search/no-match, synchronous failure/retry, narrow layout,
and direct-file operation.

## Preserved source at the initial boundary

| Path | Git blob |
| --- | --- |
| courses/binary-search.json | 8254bb7770e1507e630b8c0dd6dbb64e4a1fc97e |
| courses/dependency-graphs.json | 6e36d7113308540eb923fe5f5c83f1ba0b0ac537 |
| courses/measurement-uncertainty.json | fe864eaa1230c57a3f6fdd44cd5c83f67bcdaa78 |
| courses/sql-query-foundations.json | e03736a410aed36404b1cb0cf251c6d91c93b64d |
| src/deck.mjs | f0f8a4b234489c2388f427633f548d56c6ed4c03 |
| src/deck-picker.mjs | 5e08062c2f810744d5b5fad014eaf785047bf6e7 |
| src/app.mjs | 19ea1e64b7a83c9943e3a7ebff887b6224bcba09 |
| demo.html | 223ee1a4452e01c0fea2194c6921f82f4a062f6e |
| .github/workflows/test.yml | a64c95e06e656a1875706bc013c13b82ccf8ca83 |

## Current execution boundary

The initial source was prepared and Git-backed through the repository API
because scratch was full and both native receivers remained below the 1 GiB
build/browser floor. No native build or browser run is claimed. The generated
inline script was parsed by the orchestration V8 runtime; that is only a syntax
check, not Node execution or browser acceptance.

Actual Node/build and browser outcomes, exact checkout identities, complete
raw log/download/screenshot receipts and independent review will be recorded
here after execution. Source publication alone is not acceptance or deployment.

## First actual hosted Node qualification

Existing test workflow run 37787925762 / node-test job 113347385606 passed all
143 tests, with no failures or skipped tests, and passed existing standalone
demo parity. It ran Node 20.20.2 on actual temporary merge checkout
`4d630b63d878844005925b5457abd15f24e0708e`,
tree `1c844a163670851b6c2cab25c87316d55a00d498`,
combining source head 3490a7fc with actual main 98d43c30.

All six catalog tests executed and passed. This includes an actual Node build
comparison with catalog.html, every embedded original course byte, and a
malicious script-boundary fixture. Root independently read the complete
decoded job log, exact checkout, actual commit tree/parents and every job step.

The complete log is `hosted-node-3490a7fc.log`; its exact identities
and source pins are in `hosted-node-3490a7fc.json`.
Real Chrome downloads, layout and learner-file admission remain a separate
pending acceptance gate.
