# Explicit unfinished author drafts

## Qualified source and ownership

This packet receives the author workflow in issue [18](https://github.com/Jacob-Met/RecallWeave/issues/18). Its source is frozen at `d64565556a8a90bc08c8f6d4f9ab6763867b93e2`, tree `561474ab08f27d7cf21bbd18489dfcf92ce5582f`, on actual merged main `4775af91ba6a5d4df787669f39b44364dd1e37ba`. Subsequent publication may add evidence or compose newer main; the nine browser source hashes remain the execution identities.

`estate-6e5752b49b6f/root` authored the versioned draft module and its nine dedicated tests at `b5b905ca8d5363e5974aa96419cd51b256609f43`. They are included unchanged: module SHA-256 `47257b88ae5538b093987a8d5356fdfe3986dc9312695d27cd4e1f78cb903a66`, tests `de5a4a260a9a00c9789fd90dc0ffcdb7e0f78a335385f3e285c8c70afdc9f0f5`. The module's original focused receipts are preserved separately in `../draft-format-6e5752b49b6f/`.

`estate-6e5752b49b6f/github_integration` authored the UI/loader integration, standalone composition, reference repair and the receiving in this packet. It independently read the complete module and checked actual downloaded content against a separate semantic projection before using the module's canonical round-trip check. The UI's external receiving reviewer is root; this packet does not label the UI author's own browser execution as independent UI review.

The issue 7 shared lesson validator is unchanged at SHA-256 `621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`, credited to its existing contributor `estate-490fcd7c4056`. This follow-on does not change or publish the separately owned learner importer. It preserves current learner, trace, review, model, course and learner builder source. The [source manifest](source-manifest.json) verifies all 190 unrelated base leaves and modes; the nine changed base paths belong to the claimed author scope. The root module, two new test files and root receipts are additive.

## User contract

**Save draft (.json)** downloads editable work explicitly. Empty fields, absent correct-answer selection, duplicate names or choices, empty concept/question collections, and cyclic or self-linked known prerequisites can be kept for later repair. The file uses `recallweave-author-draft/1` and is distinct from a checked lesson deck.

The draft boundary admits only bounded editor fields, distinct typed editing keys and public question IDs, consistent answer/concept references, and a safe monotone counter. It limits actual UTF-8 file bytes to 2 MiB. Private keys and the counter are rebuilt densely in a copy; all user text, order, public IDs and answer/prerequisite relationships remain the same. Saving does not mutate the live editor. Save → parse → save is byte-stable. Reopening returns a frozen staged copy and makes a mutable editor copy only after **Replace draft**.

The existing lesson format still requires a complete valid lesson within 256 KiB. **Download checked deck (.json)** saves its exact checked bytes. The file preview identifies **EDITABLE DRAFT · MAY BE UNFINISHED** or **LESSON DECK · FORMAT CHECKED** from file content, never from the filename. Draft files cannot pass through the lesson validator, and a draft filename cannot bypass the lesson byte limit.

Saving a draft preserves both the current checked lesson and a staged incoming file. Cancelling, rejecting or failing to read an incoming file leaves current writing and checked state in place. New selections and native chooser cancellation invalidate older asynchronous reads. No automatic browser storage, upload or provider call is introduced.

When a removed question is restored after one of its formerly linked concepts was deliberately deleted, undo keeps its writing, options and correct choice. It clears the missing taught-concept selection and drops only missing prerequisite links, with a visible explanation. Existing self prerequisites are displayed with a removal control so an admitted unfinished draft can be repaired without discarding the question.

## Executed results

The [composition receipt](receiving.json) and raw [native output](composition-tests-r1.txt) record **65 passing tests**, zero failures, on Node `v24.19.0`. This includes the nine draft-format tests, eleven loader tests, two new undo tests, all existing project tests, and generated standalone parity. The unchanged learner builder was also run and produced byte-identical `demo.html`; it does not implement a `--check` mode, so identity was verified with Git afterward.

The same [undo receiver](baseline-undo-receiver.mjs) fails both new cases on main `4775af91…`, preserved in [baseline-undo-tests.txt](baseline-undo-tests.txt). The first failure restores a deleted concept key; the second retains a deleted prerequisite. After the three-line reference repair, the two new and eleven existing author tests pass in [fixed-undo-tests.txt](fixed-undo-tests.txt). Capacity and duplicate-undo guards still run before the repair mutates the removed item.

The actual Chromium `153.0.8010.0` [browser receipt](browser-r1/receiving.json) passes all seven groups and saves sixteen real browser downloads:

1. Unfinished literal writing and a missing answer save without clearing the existing lesson error. Repeated saves have identical bytes. Completely empty concept/question lists reopen and can be edited again.
2. The original PR 16 checked lesson reexports byte-identically before and after saving a draft, cancelling an incoming preview, and a simulated download preparation failure followed by retry. Save draft leaves an incoming draft preview intact.
3. Invalid JSON, malformed references, unsupported versions and a 2,097,153-byte file preserve checked work. The oversized file is rejected before `File.text` is called. Slow draft/deck reads cannot override a newer file of either format; a real DOM chooser-cancel event clears staged replacement.
4. A cyclic draft saves, reopens and repairs through the controls. Public question IDs and canonical correct-answer text survive. An admitted self prerequisite is visibly removable by keyboard, with focus returning to the concept control.
5. A checked lesson refused at 256 KiB saves as an actual **275,398-byte** draft, reopens with all 33 questions, and can be shortened to an **8,350-byte** checked lesson.
6. Remove question → delete its former concepts → undo preserves all question writing and choices, clears only missing links, saves a valid editable file, and can be repaired to a checked lesson. Deliberately removed concepts stay absent.
7. The self-contained file operates with network unavailable at **390 px**. Keyboard additions, removal focus, save, actual-file reopen and lesson completion pass. A 160-character unbroken title and a long filename wrap without horizontal overflow. Literal HTML-like text remains text. Both phone captures were visually inspected.

No page errors or external requests occurred. The browser harness checks all nine source hashes before and after execution. It compares actual file contents to an independent projection of ordered user text, public IDs, concept/prerequisite indices and correct-choice indices; private key spelling is intentionally excluded. All actual draft downloads additionally pass canonical parse/serialize byte equality.

The original checked lesson is 1,642 bytes, SHA-256 `6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9`. Both `browser-r1/existing-checked-deck.json` and `browser-r1/checked-deck-after-retry.json` match it exactly. Actual downloads, including the oversized editable lesson and repaired lesson files, remain in `browser-r1/`; they are original synthetic receiving content.

## Reproduce

The application has no added runtime dependency. From a checkout of the received source, Node 20+ and Python 3 run the existing project gate:

```bash
node --test tests/*.test.mjs
python3 tools/make_author.py --check
```

The browser receiver additionally requires an already installed Playwright module and Chromium executable. It starts only a temporary localhost server and a separate browser context, closes them afterward, and does not reuse a signed-in session:

```bash
node docs/qualification/author-drafts-6e5752b49b6f/receive-drafts-browser.mjs \
  --root "$PWD" \
  --output /tmp/recallweave-author-drafts-receiving \
  --playwright /absolute/path/to/playwright \
  --browser /absolute/path/to/chromium
```

By default it reads the preserved PR 16 actual lesson at `docs/qualification/deck-author-6e5752b49b6f/author-browser/authored-final.json`. `--deck-fixture /absolute/path/to/file.json` can point to the same hash-pinned bytes in a sparse checkout. The receiver imports the candidate module only for admission and the additional byte-stability check; expected user content and the browser interactions are authored separately.

To reproduce the undo failure, place `baseline-undo-receiver.mjs` in the `tests/` directory of a separate checkout of `4775af91ba6a5d4df787669f39b44364dd1e37ba` and run it with `node --test`. Its relative imports deliberately match the permanent test location. Do not run it directly from this evidence directory.

These results qualify software behavior and the exact source composition. They do not establish an educational efficacy result, deployment, or adoption by the separately owned learner importer. Hosted CI and the independent final UI/source review are recorded by the publication handoff, rather than being inferred from these local results.
