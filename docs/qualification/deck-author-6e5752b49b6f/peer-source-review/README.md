# Independent receiving of the final RecallWeave authoring composition

Reviewer: `estate-6e5752b49b6f/production_slice`, at the root coordinator's request. This review covers the new integration risk in the final composition. It does not repeat the six loader browser groups or reimplement the authoring owner's product.

## Accepted source

- Source commit: `75ef7e31bb1a780e4a58ea5e54ea132185b36c5c`.
- Source tree: `1dcdafde1246de73b5b4b29333bc7f36c3121911`.
- Independently fetched current main: `a64369f84fae4cfd0b81aa3878cc11e2fa8d298c`.
- Repository: [Jacob-Met/RecallWeave](https://github.com/Jacob-Met/RecallWeave).
- Product ownership: [issue 10](https://github.com/Jacob-Met/RecallWeave/issues/10); loader sub-slice [comment 6057459630](https://github.com/Jacob-Met/RecallWeave/issues/10#issuecomment-6057459630).

`final-composition-receipt.json` contains the eight passing source gates. Any later packaging commit is qualified separately by `evidence-successor-receipt.json`, which records its exact commit/tree and checks the changes since this accepted source.

## What was independently checked

**Existing learner behavior is preserved.** The complete tree was fetched independently from the connected GitHub repository. All 105 existing non-README main leaves have identical blob hashes and modes in the candidate. This includes the learner app, answer presentation, notes export, review/practice, knowledge model, bundled deck, styles, workflows, native tests, learner builders and the existing generated demo. The current-main commit remains an ancestor of the candidate. Only the agreed authoring paths and qualification evidence were added.

**The tested author runtime is retained.** The frozen loader receiving archive was verified against its SHA-256, then the candidate was compared directly with the source bytes inside that archive. The validator, editor state model, loader controller, author CSS and author builder are byte-identical. The editor UI differs by exactly one success-status sentence. The author template differs by exactly two instruction sentences. The generated standalone file contains those two replacements plus the updated success status; no additional runtime difference was accepted.

The resulting status says: “Deck download started. Keep the JSON file to share or reopen it here.” The static page explains saving/sharing JSON and reopening it in the author editor. The README correctly identifies the separate learner importer as work tracked in issue 7. The current main tree does not yet contain `src/deck-picker.mjs`, and neither the accepted instructions nor the new status promises that learners can already import their authored files into this main-version demo.

**Standalone HTML has exact parity.** The current builder's read-only `--check` command passed against the frozen worktree source. The generated page contains one inline script and no external script, stylesheet or module dependency. The existing learner `demo.html` and its builder are unchanged from current main.

**README changes are bounded.** Removing the new authoring section and restoring only the corrected opening test-prerequisite paragraph produces the original main README exactly. All other existing README sections remain byte-identical.

**Earlier evidence remains intact.** The first evidence-only successor, `8b82395c1730380e8c2cd08933f22d787df66ae6`, added only qualification files. The original loader receiving archive is still byte-identical: `0b4aca067f262e3a455f83714d42031c424bfdbea5f74cc2f590c84c8cc8e5e6`.

## Additional finding resolved during this review

The inherited README said the entire default test command worked with Node 18+. The added loader tests use the global `File` constructor, which [Node's official documentation identifies as added in Node 20](https://nodejs.org/api/globals.html#class-file). The added standalone-parity test also invokes `python3` from within that default Node test command.

The receiving control confirmed that the unqualified constructor fails with `ReferenceError: File is not defined` when that global is absent. This diagnostic ran on Node `v24.19.0`; it is a missing-capability control, **not an execution claim for Node 18**. No alternate Node installation was performed.

The authoring owner corrected the test instructions to require **Node 20+ and Python 3**, explaining that Python verifies the generated standalone HTML. This matches the existing Node 20 CI configuration. No app logic or test behavior changed, and the directly opened browser app still requires neither runtime.

The root coordinator separately found the outdated download-status instruction pointing to the absent importer. The authoring owner corrected that one string and ran a focused actual-download/status check. The final successor check verifies that this receipt refers to the same eight accepted program/template hashes and that its actual downloaded file has the recorded 1,642 bytes and SHA-256 `6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9`. That focused browser run belongs to the authoring owner; this reviewer independently checks its byte association instead of claiming a duplicate browser execution.

## Evidence and reproduction

`independent-current-main.json` records the independently fetched GitHub main leaves. `receive-final-composition.mjs` compares those leaves and the accepted loader archive with an exact candidate commit, checks the permitted prose differences and runs the read-only author parity check. `receive-evidence-successor.mjs` checks that the final successor changes qualification evidence only, preserves the accepted program hashes, and includes the exact focused download evidence and original loader archive.

From this directory, with the verified loader archive at `../recallweave-author-loader-receiving.tar.gz`:

```sh
node receive-final-composition.mjs /path/to/RecallWeave 75ef7e31bb1a780e4a58ea5e54ea132185b36c5c
node receive-evidence-successor.mjs /path/to/RecallWeave FINAL_EVIDENCE_COMMIT
```

The review scripts write their receipts only in this review directory. They do not modify the author's checkout, install dependencies or run a browser suite. No source change remains requested by this reviewer at the accepted source pin.
