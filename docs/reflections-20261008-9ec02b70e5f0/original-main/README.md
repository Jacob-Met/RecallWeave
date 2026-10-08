# Local learner reflections — original main qualification

This packet qualifies the reflection increment on RecallWeave main
`3e3217959bdf277ae5ef61a7afe68142e2626486`. Source is isolated under the
`estate-9ec02b70e5f0` contribution. It is implemented and locally verified;
this receipt does not claim publication, hosting, contest submission, or
learning effectiveness. The final receiving branch must preserve newer
contributions and carry its own composition result.

## Beneficiary and behavior

The existing lesson asks a learner to explain a connection and apply the
energy pathway, but the original review has no response control. The same
browser receiver completes the original native lesson with the expected
model estimates, then fails at **0 editable question reflections; expected 6**.
The original native suite passes all 19 tests. That is an absent capability,
not a failed knowledge model or a learning-outcome measurement.

The increment adds an editable explanation to each completed review panel and
an application response to the existing final prompt. Notes use canonical
question IDs, so adaptive order does not determine their association. Input
events retain the current writing without rerendering the field. Opening
panels and leaving/resuming practice preserve it. Clear means empty; a fresh
local session or refresh clears all writing through the existing reload.

The actual study-notes download includes the latest writing with the correct
question and labels it as unscored reflection. Every learner-authored line is
prefixed with `  > `; an empty field is explicitly unwritten. The application
prompt is the exact prior bundled-course wording, moved to one shared constant
so the page and saved response retain the same context. These files are readable
notes, not a restore format.

First-answer records, practice answers, the knowledge model, source deck,
science wording and grading are unchanged. Text is populated through textarea
`.value`; literal HTML-like writing is not inserted into the page's HTML.
There is no storage, account, upload, provider, synchronization or service
operation in this increment.

## Native source and API

`src/reflections.mjs` supplies immutable session state and explicit updates:
`createReflections(items)`, `itemReflection(state, id)`,
`updateReflection(state, id, text)`, `updateApplicationReflection(state, text)`
and `reflectionSnapshot(state, items)`. The export snapshot refuses missing,
duplicate or foreign question identities rather than matching by position.
`createStudyNotes` accepts an optional `reflections` argument; existing callers
that omit it keep their prior text contract.

`src/app.mjs` initializes the notebook and adds only completed-review,
application-field and download hooks. `styles.css` adds scoped field/focus
styles. The existing Python builder embeds the new native JavaScript module
in `demo.html`. `src/knowledge.mjs`, `src/review.mjs`, `data/deck.json`,
the first-answer handlers and the practice handlers keep their original bytes
at this qualification.

The recovered full Git tree has no `AGENTS.md`. The exact README/native build
and test workflow were read. All 18 original files outside the historical
`docs/` tree, including the complete native source/test/build set, were matched
to the Git tree; old receipt images and other historical documentation
are not needed to execute this receiver and are not new contribution files.

## Verification and evidence

| Receiving boundary | Result on this source |
|---|---|
| Existing native suite | 19 tests pass on original main |
| Native increment | 25 tests pass: 19 existing and 6 reflection/consumer tests; zero skips |
| Original browser counterexample | One successful original-lesson control, then the missing-field assertion fails |
| Reflection browser receiver | 10 checkpoints pass; 4 actual Chromium-saved UTF-8 files |
| Unchanged notes browser receiver | 15 checkpoints pass; 6 actual saved files |
| Native single-file builder | Regenerated `demo.html` matches the executed demo bytes |

The six new native cases include canonical association under reversed review
order; immutable earlier drafts; edit/clear/reset semantics; actual export
with a paused native practice round; original full-precision model-state and
answer preservation; and missing/duplicate/foreign notebook refusal.

The new browser receiver uses the existing CDP transport, with separately
authored reflection scenarios. It drives native keyboard/input events in a
fresh Chromium 153 profile. It types distinct multiline Unicode notes for all
six questions, preserves them after one answered retry and a later unanswered
practice visit, edits and clears writing, forces one download-preparation
failure and retries, and reads actual saved bytes. It also checks the real
reset button, an all-correct 390px session, labels/focus/no horizontal overflow,
and direct-file use with HTTP(S) blocked. Literal `</textarea><img ...>` writing
remains a value after rerender and produces no element or page request.

Source hashes before and after both new-browser executions match. The two
new desktop/mobile captures were inspected: labels, fields and focus are
readable without horizontal overflow. The available system font does not
display every emoji; the exact Unicode text remains in field values and saved
UTF-8 files. This is one Chromium-family receiving result, not cross-browser
or accessibility certification.

`qualification-on-main.json` retains the executed source identities and the
native demo rebuild. `base-source-pins.json` maps the native baseline to its
Git blobs. Raw native/browser logs, reports, the original failure capture, two
reflection captures and ten named saved files are included. The existing
notes runner's redundant four screenshots and six duplicate GUID-named
download copies are omitted; its exact native source and raw report remain
identified. The new runner renames its own completed GUID download to the
retained named file, preserving those bytes.

## Reproduction

From the original qualified reflection source:

```sh
node --test tests/*.test.mjs
python3 tools/make_demo.py
node tools/check_reflections_browser.mjs --browser /path/to/chromium --output /new/parent/reflection-run
node tools/check_notes_browser.mjs --browser /path/to/chromium --output /new/parent/notes-run
```

The new receiver requires Node 22+ and an existing Chrome/Chromium executable.
Its output directory must not exist; create its parent first. For the negative
control, run that same reflection receiver with `--root` pointing to a native
checkout of the pinned original main. It should fail at the missing-field
assertion after completing the original lesson. The dependency-free native
tests use the repository's Node 18+ contract.

## Shared receiving boundaries

The reflection scope is recorded in
[issue #5 comment 6057159375](https://github.com/Jacob-Met/RecallWeave/issues/5#issuecomment-6057159375).
The answer-order owner's [PR #12](https://github.com/Jacob-Met/RecallWeave/pull/12)
is published at `e68ac2f97fe89f74e7b39256db0778a4b98c6dad`; it changes the
question/practice renderer and shared builder. This original packet does not
claim that composition. A separate exact-source receiving run follows.

[Issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7) owns imported
decks. A receiving explicit new-deck start needs a fresh notebook for the
admitted questions; rejected or cancelled reads must preserve the current
one. Its course-specific final prompt also remains with that owner. This
packet exercises the current bundled course only.

[Issue #11](https://github.com/Jacob-Met/RecallWeave/issues/11) owns completed
trace save/preview/restore. That owner's stated initial scope excludes our
reflection fields and preserves the notebook/export hooks. Restoring a
different trace must not silently attach an old session's writing merely
because question IDs repeat. Exact preservation/reset behavior belongs in
that owner's explicit restore composition and receiving evidence. No competing
trace format, persistence or restore path is added here.
