# Focused lesson receiving on the current save/resume learner

Accepted current learner source: e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7, tree 2a9cfa00c9a3f18ffa834335abb609c1cd7cc989. The focused-lesson PR61 head remains 257f8c395bdd214f1533f6a0228767355cd4cfc2; this packet is receiving evidence only and changes no product source.

## Why this distinct receiving exists

After the earlier actual 27bcd1f9 reflection receiving and successful ca9ab2 hosted composition, current main merged the unfinished-lesson feature with the notebook. That changes the learner path consuming a focused file. The earlier core/model, focus UI, and historical browser evidence remain labeled at their actual sources.

This receiver uses the same actual 3,285-byte focused JSON downloaded in the original author browser run: SHA-256 544dced1fc8c909dd2a8353fe28bb7235effb5e871a38eebcdf377b3cd505475. It does not regenerate that file through the focus implementation. All 17 current learner/source-builder files were independently checked against their exact Git blobs and SHA-256 values before native execution and remained unchanged after every run.

## Actual native result

The final unchanged-product run is r3/receiving.json: two groups passed on macOS Node v26.3.0, Chromium 151.0.7922.34; native process completed with exit 0. Both the modular loopback page and the standalone file at 390 pixels executed the same bounded consumer interaction. Eight actual browser downloads and one phone screenshot are retained. No page errors, external requests, or horizontal overflow occurred. Browser contexts, browser process and private temporary profile were closed and removed by the receiver. No browser or dependency installation was performed.

The actual sequence:
1. A progressed bundled lesson survives focused-file preview and cancellation. Explicit Start admits the focused course.
2. Two canonical first answers reach feedback; the actual downloaded unfinished file retains the complete focused source, first-answer prefix, native mastery and all answer permutations.
3. The learner completes the course, writes distinct multiline literal reflections for every question and an application reflection, and completes both missed-question retries.
4. Saved-file and course previews, then cancellation, leave that current notebook and completed practice unchanged.
5. Explicit resume of the actual downloaded file restores the exact two-answer feedback. A real resave differs only in savedAt; canonical prefix, mastery and all permutations match exactly. Continuing produces the same canonical adaptive question/answer sequence.
6. Existing current-tab reflections survive resume. Old separate practice choices are reset, with two explicit “Practice answer: not recorded.” markers in the actual notes, and the first-session results remain 3 of 5.
7. Explicit Start of the same focused course retires a pending resume preview and starts at 0 of 5. The bundled-course action first previews; its explicit Start then changes the source. The focused unfinished file is refused against that other source, with an actionable instruction to load its course, leaving the current lesson unchanged.
8. Explicit focused-file reimport clears the notebook as a fresh course start. The same saved prefix can then be resumed and finished, without recreating any previous reflection text.

The unfinished file does not contain the reflections. The checks distinguish retention of writing already in the current tab from restoration of the saved first-answer state.

The 390-pixel screenshot was visually inspected: source/title and saved progress are readable, replacement and reflection-retention copy is explicit, the Resume and Cancel controls fit, and the preview heading receives focus.

## Preserved receiving corrections

No product source was changed.
- r1 stopped after successful state resume and notebook retention because the receiver incorrectly forbade the text “Practice answer:”. The existing exporter deliberately retains “Practice answer: not recorded.” for each missed item without a retry. The corrected receiver requires precisely those two lines plus the explicit Not started status. The original receiver, actual failed receipt and three preceding downloads remain unchanged.
- r2 progressed further, then incorrectly expected Use bundled lesson to replace the current source immediately. The existing importer correctly opens a preview and requires Start this deck. The corrected sequence first asserts that preview preserves the current session, then presses the real Start control before the source-mismatch check. That receiver, failed receipt and three downloads are preserved unchanged.

These are receiver expectation/action corrections, not product failures. r3 is the final source-qualified result.

## Reproduction

Use an existing Node and Playwright installation with an existing Chromium executable:

~~~sh
node receive-focused-resume.mjs --root source --output another-run --manifest runtime-source.json --input actual-focused-lesson.json --playwright /absolute/path/to/playwright --browser /absolute/path/to/chromium
~~~

runtime-source.json binds all source bytes. The exact native command and tool-returned completion transcript are in execution-record.json. The receiver uses only its loopback server and local file/blob/data URLs, with the standalone browser context offline. No model, importer, save/resume codec or reflection implementation is stubbed.

The tiny finalized file/source audit additionally reopens every actual download, checks all recorded hashes, compares each saved/resaved JSON with only savedAt removed, and compares the two mode-specific notes with only their Saved timestamp removed. These measurements complement the browser assertions; they are not another browser execution.

## Ownership and limits

Receiving: estate 6e5752b49b6f/github_integration. Current learner source includes the independently owned importer, notebook, and issue21 unfinished-lesson implementation. This packet adds no changes to those owners' code or to the accepted focused-lesson core/UI.

This qualifies the exact current learner source and actual focused-file boundary on the stated Mac browser/runtime. It is not a learning-effectiveness claim, an operating-system file-chooser test, a general codec requalification, or evidence that future main changes preserve this result. Root performs the separate exact final merge/hosted-checkout admission.
