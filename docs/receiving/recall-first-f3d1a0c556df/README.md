# Recall-first qualification

This contribution adds an offline retrieval-first practice page. Open `recall-first.html`, preview a checked course, and explicitly start it. Each original prompt comes before its reference answer. The learner writes or thinks through an answer, reveals the original answer/explanation/transfer, and chooses **Ready for now** or **Revisit**. One bounded revisit pass preserves both sets of attempts. These labels are self-reported study decisions, not correctness or mastery estimates.

Canonical source is Jacob-Met/RecallWeave commit `698902f9c9c1d5c5023092b85b3632a7cb7a01ed`, tree `d6d3707b691850af7928299242631534cff89aa8`. Claim: https://github.com/Jacob-Met/RecallWeave/issues/178. The native Git repository contains selected exact baseline leaves, not canonical ancestry. Its baseline with README is `e0c67317f4d7a23d6c4c359f0ca4ba9247ad1d34`.

Eight additive product/test/guide files and one README insertion form the product delta. The unchanged validator and bundled deck retain Git blobs `f0f8a4b234489c2388f427633f548d56c6ed4c03` and `8efc98fe278b436a47b245eadd419155ee7af2ad`. README retains every original byte and adds 1,015 bytes. No existing learner, importer, model, review, writing restore, archive, locale, catalog, handout, focus, course or workflow file is changed.

## Reproduce the source gates

From the repository root:

```sh
node tools/build-recall-first.mjs --check
node --test tests/recall-first.test.mjs
```

The eight author groups passed on native Node24.21.0, including all729 complete first/revisit judgment combinations for the bundled course. Root identified a test-only path portability issue; the corrected builder test then passed from an owned path containing a space and a non-ASCII character. A later CSS-only correction was rebuilt and checked for exact standalone parity. The original tests and output are preserved, and the unchanged core was not redundantly rerun.

The independent state receiver has eight separately authored groups, frozen before candidate intake. Run it against the current core with an absolute module path:

```sh
RECALL_FIRST_MODULE="$PWD/src/recall-first.mjs" node --test docs/receiving/recall-first-f3d1a0c556df/independent-state/receiver.mjs
```

PowerShell equivalent:

```powershell
$env:RECALL_FIRST_MODULE = (Resolve-Path src/recall-first.mjs).Path
node --test docs/receiving/recall-first-f3d1a0c556df/independent-state/receiver.mjs
```

The small fixture, exact baseline validator, contract, original receiver, logs and acceptance are included. All eight independent groups passed without assertion changes.

## Actual browser receiving

The browser receiver's generators, frozen oracles, three exact drivers, original failures and final receipts are in `independent-browser/`. Its README gives the native reproduction sequence and explains how to use a fresh receiving namespace. Python3.11.9, existing Playwright1.63.0 and Chrome154.0.8037.98 were used; no runtime or dependency installation was added to this project.

Six browser contracts are qualified by exact source composition. Five functional groups ran against the original JavaScript. The final HTML differs only by the stylesheet correction, and the sixth group received that exact final page. This does not claim a repeated full browser suite. The checks include actual keyboard/reveal controls, source-ordered first and bounded revisit passes with five retained attempts, UTF-16 answer limits, restart keep/clear, exact UTF-8 byte admission, and stale local-file completion guards.

The original valid long-token fixture overflowed a390px viewport: preview width1741px and prompt width24606px. Only inherited wrapping for preview, prompt-card and course-title was added. Final preview, prompt and revealed views each measure390px with no overflow. A screenshot capture transient was retained and only its interrupted group was repeated after receiver-only compositor synchronization.

Important limits are explicit in the original receipts: `started` records receipt emission, not actual process start; clearing the file input is not an OS-dialog cancellation test; controlled `File.arrayBuffer` completion is not a real disk-I/O failure test. References are hidden in the rendered prompt card, not secured against source inspection. No automatic scoring, learning-efficacy, full canonical CI or production claim is made.

## Original evidence and custody

Author logs remain byte-for-byte. The first source-admission attempt used a literal backslash-zero in a Git object header and refused before writing baseline source; corrected admission verified the exact blobs. The outer Python wrapper later failed to print a Node checkmark through cp1252 after build/tests returned0 and their logs were saved. The recovery receipt distinguishes this wrapper failure from passing subprocesses. Neither failure was hidden by rerunning the original author suite.

Full screenshots and large padding fixtures remain in the sealed native browser packet:
`C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df\sealed-final`.
Its full manifest SHA256 is `45a226cc04d9268f7264396cdc6abcf560f4db7f67efde6ee6fe541448b3bdd7`; the compact text selection is `81d9f9cfbe751a1866c3078d8ddf8ea1df53ffc189547540360cc5579efd7384`.
The independent state packet manifest is `5894a573562c84bcf816a3991bf52e29dde8c2c24d9de34fba624ef7dac59791`.

Root independently reviewed source, source custody, exact CSS-only composition, the README insertion, original/final receipts and actual screenshots. `root/recall-first-root-acceptance.json` supersedes the earlier pending review. Publication remains pending fresh API/current-main/workflow admission: the shared GitHub API rate limit returned403, and no retry, alternate authentication, source push, PR, merge, Actions run or deployment was performed by this contribution.
