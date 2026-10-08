# Lesson focus: actual-current learner and hosted receiving

This supplement qualifies the actual PR 61 merge checkout after main incorporated the independent learner-reflections work. It preserves the earlier focused-lesson source/browser evidence at its original pins and adds only the changed-consumer boundary. No product or owner source is modified.

## Exact source and hosted checkout

- Focus source head: `a9c811d4e59f122ef51f3700e918129d50b4fbc8`, tree `fa885b70002b2e718f74da66d30406bad4503626`, declared publication parent `8b82cf5bb95fc7faa5e835e2979df703e6e91a7b`.
- Actual hosted checkout: `27bcd1f9b56ad15c19a399d8a5e173fcfdb74d8c`, tree `63532bcb79de1100e5a246a175b02f7258a7ad79`.
- Actual checkout parents, in order: main `3cdebd86e69506709bcaeaeff4026deb3d1fc208`, then the focus head above.
- Actual main tree: `4d8cfac84b84818af1a7e13cfa4d569fdbbef2d6`.

`current-tree-admission.json` and the full compact inventories verify all **870 non-README current-main leaves and modes** unchanged in the 891-leaf proposed merge. All 20 planned non-README focus/evidence blobs match the published head. The README is exactly the current-main README plus the already accepted focus section; neither owner's text is lost. The eight product files retain the accepted R2 hashes. The newer main adds reflection and numerical-precision work under its existing ownership.

The existing hosted workflow **37793509107**, job **113366815870**, completed successfully on the actual checkout above. The raw log explicitly records its checkout hash and both merge parents. The test process used **Node 20.20.2** and reports **220 tests passed, zero failures and zero skips**; the existing standalone demo parity step also passed. `job-113366815870.log` is 90,696 UTF-8 bytes, SHA-256 `b2de9a41f47d6cc1b115776f8963dfc203747906cb45a82bdf776ab5be1f445c`. Workflow/job snapshots and `hosted-receiving.json` preserve the separate metadata and raw-output claims. This does not relabel that run as execution of any subsequent evidence-only head or newer merge parent.

## Why this additional browser check was necessary

After the declared source publication, actual main changed `app.mjs`, study-note export, styles, the standalone demo and its builder, and added the session-reflections module. Those are real inputs to the earlier imported-lesson evidence. The original UI/core matrices remain useful at their exact source pins; their unchanged consumer claim cannot simply be carried across these new inputs.

The receiving snapshot therefore includes both actual learner entry points, their data and stylesheet, and every recursively imported module reachable from the current app entry: **14 Git-blob-verified files**, recorded in `runtime-source.json`. The snapshot is copied from the actual merge tree, including the new reflection implementation. All 14 SHA-256 values are checked before and after the browser run. Existing trace-archive dependencies are included; this check does not claim a separate trace-restore workflow test.

## Actual-file interaction result

`receive-current-learner.mjs` passes two groups in actual Chromium **153.0.8010.0** and Node **24.19.0**: the modular learner and the standalone learner with network offline at **390 px**. It uses the unchanged **actual browser-produced focused JSON**, 3,285 bytes, SHA-256 `544dced1fc8c909dd2a8353fe28bb7235effb5e871a38eebcdf377b3cd505475`, copied here as `actual-focused-lesson.json`. It does not regenerate the source projection or invoke the focus model.

Each group performs these actual controls and downloads:

1. Answer one question in the bundled lesson. Preview and cancel the real focused file, confirming the existing session markup is unchanged. Then explicitly start that focused lesson.
2. Complete its five questions with three first-correct answers and two misses. Match displayed prompts and canonical choice indexes to the actual JSON, independently of the display shuffle. Verify the review's first and correct answer text.
3. Write distinct multiline, Unicode and HTML-like literal reflections for all five question IDs, plus an application reflection. Confirm the imported lesson uses the owner's generic application prompt. Preview/cancel another import without losing any writing, first-answer summary or model display.
4. Correct both misses in practice. Confirm every reflection, application text, original first-answer summary and mastery display survives unchanged.
5. Capture the actual notes download. Independently locate each question block and verify original first/correct answers, explanations, transfer text, that question's reflection and any separate retry. Other questions' reflections must not appear in that block. Confirm exact attribution/license and application text.
6. Preview the actual file again, then explicitly start it as a fresh lesson. Complete all five answers correctly and confirm all question/application writing is empty, the first-session count is fresh, and a second real notes file contains no prior reflections or retries.

All four actual note downloads are retained. Corresponding modular/standalone files have equal content except for their actual Saved timestamp; the receiver does not replace or normalize the saved bytes. The populated files are 3,622 bytes each; fresh-session files are 3,027 bytes each. Their exact hashes are in the browser receipt. No page errors, external requests, source mutations or horizontal overflow occurred. The 390 px screenshot was visually inspected: application text, literal permission content, download control, fresh-session action and existing trace panel remain readable. The frame is a scrolled viewport, not a claim that every control fits simultaneously on a phone screen.

The browser receipt is `browser/receiving.json`, SHA-256 `e762d6372a8279cd7660e67beb001950bd37f82deeebd42ffa950f9ceb64610e`. Both groups passed on their first execution. There are no injected file/URL failures or provider calls in this supplement; the earlier controlled-error tests remain in the original R1 packet.

## Reproduction and limits

With an existing Playwright/Chromium installation, extract this packet and run into a new output directory:

```sh
node receive-current-learner.mjs --root /path/to/packet/source --manifest /path/to/packet/runtime-source.json --input /path/to/packet/actual-focused-lesson.json --output /tmp/focus-current-new --browser /path/to/chromium --playwright /path/to/node_modules/playwright
```

The receiver starts its own loopback server, creates and removes an isolated browser profile, and permits only its owned local/file/data/blob requests. It imports the actual file and uses the application's controls and normal download mechanism. Source manifests and exact input bytes are checked; the absolute paths in the historical receipt identify the original run. The receiving source can be relocated using the arguments above.

This is bounded integration evidence for the exact reflection consumer and focus output. It does not repeat the core graph/byte matrix, the original nine focus UI groups, the peer's accessibility receiver, or unrelated course/explorer tests. The existing hosted workflow supplies the complete current suite gate. Root owns final ready/merge operations and must account separately for any newer actual merge parent.
