## Teacher outcome and ownership

Owner: `estate-234cae4aee53 / project_production`, with independent boundary receiving by the separate `repo_delivery` worker and root review, under Jacob's continuing execution mandate.

The integrated [Lesson focus #44](https://github.com/Jacob-Met/RecallWeave/issues/44) lets a teacher prepare a prerequisite-complete lesson in a browser. Add a native Node stdin/stdout consumer of that exact accepted model so a teacher can inspect concept IDs and repeat an explicitly selected lesson preparation from the terminal. This is not another course, selection algorithm or learner interface.

Inspected current main is `4438eb6ecf8bc83a6559e9c8a73129707a7618f4`, a complete 2,806-leaf tree with no AGENTS/HALT/WORKSTREAMS/CONTINUE instruction file. The unchanged dependencies are `src/course-focus.mjs` blob `337b90d667170f19e5c75f5aaf4898e3410630b9` and `src/deck.mjs` blob `f0f8a4b234489c2388f427633f548d56c6ed4c03`. Existing #44 is closed; no follow-up comments, current matching terminal consumer or matching source path were found in the bounded issue/PR/current-tree/central review.

## Frozen command contract

```sh
node tools/focus-course.mjs --list < course.json
node tools/focus-course.mjs --title "Focused lesson" --concept "Exact concept" < course.json
```

- `--help` alone prints usage without reading stdin. `--list` alone reads one checked course and emits a JSON inspection containing its exact title/attribution/license and source-ordered concept IDs, question counts and prerequisite concepts returned by the unchanged planner.
- Production mode requires one `--title VALUE` and 1–32 repeated `--concept VALUE` arguments, in any flag order. Values are the next literal argv string, including leading hyphens. There are no positional, equals-sign or end-marker aliases. Missing values, repeated title, unknown flags or mixed help/list modes refuse with exit2 and empty stdout before input consumption.
- Read at most the existing 262,144-byte raw input allowance from stdin. Decode UTF-8 strictly; a BOM is accepted and counted in the raw allowance, while malformed byte sequences refuse. Valid Unicode and a literal replacement character remain intact.
- Use the unchanged `parseDeck`, `planCourseFocus` and `createFocusedLesson`. Unknown, empty or duplicate concept selections and invalid metadata refuse under those existing contracts. Successful focus output is the exact `createFocusedLesson(...).json`, preserving every retained question/answer/prerequisite/content field and original credit/license.
- Success exits0. Data/admission/output failures exit1 with a stderr diagnostic and no prepared JSON emitted for an input refusal. No output-file writer is introduced. Shell redirection itself may create or truncate its target before the command runs; the guide will state that boundary and recommend a new destination or explicit staging path.
- This changes no source deck, course content, learning session, filesystem input, automatic storage, provider or network state. Declared prerequisite closure is not a content-accuracy or teaching-order guarantee.

## Additive source fence

Only new `tools/focus-course.mjs`, `tests/focus-course-cli.test.mjs`, `docs/focus-course-cli.md`, and unique `docs/receiving/focus-course-cli-234cae4aee53/` evidence, plus a later small README discovery paragraph. Existing focus UI/model, validator, learner, authoring, catalog, handout, archive, courses, builders, dependencies and workflows remain with their owners.

## Receiving and current execution limits

Independent literal cases are frozen before implementation. Exercise actual child-Node argv/stdin/stdout/stderr, branching/shared/transitive prerequisite selection, exact source order and answer preservation, list output, UTF-8/BOM/byte limits, argument refusals, consumer refusals and broken-output behavior. Compare emitted bytes with the unchanged native focus consumer and retain the original source/evidence identities and any failures.

Cloud native storage currently has no free space. The permitted existing Node24.19.0 process can receive exact path-based module bytes through an explicitly recorded in-memory ESM loader without installs or filesystem source allocation. That establishes the executed module/process behavior, not an on-disk checkout or browser run. No browser UI is changed.

Jacob's no-Actions instruction is adopted. This issue/comment scope is allowed only after checking the current repositories' workflow events; no source push, PR, merge, dispatch, rerun or workflow change that would start Actions is authorized. Source custody can later use a separately checked non-triggering immutable Git object route. Required unrun gates will remain unrun, not represented as passes.
