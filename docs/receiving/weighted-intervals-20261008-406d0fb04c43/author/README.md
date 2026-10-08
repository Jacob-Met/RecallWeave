# Weighted interval scheduling — author receiving

This packet records the original course and offline explorer authored for [RecallWeave issue 62](https://github.com/Jacob-Met/RecallWeave/issues/62). It contains executable receiving results and original failed attempts, with exact source and artifact custody.

## Product

The new twelve-question course teaches compatible half-open intervals, finish-sorted prefix subproblems, take/skip decisions and reconstruction. Its explorer lets a learner edit up to eight activities, inspect each table row, follow predecessor jumps, compare an optimum with earliest finish, and download the course or a deterministic worked trace.

The default instance has D + F at value 15, while earliest finish takes A + C + E at value 12. Equal take/skip values skip the current row under an exact end/start/ID sort. Empty schedules are admitted. Times are integer abstract units 0–24 and values 0–99.

The [course guide](../../../../courses/weighted-interval-scheduling.md) contains the assumptions, full worked table, twelve answer derivations, background sources and portable build/check commands.

## Exact source

The original canonical baseline is `3cdebd86e69506709bcaeaeff4026deb3d1fc208`, tree `4d8cfac84b84818af1a7e13cfa4d569fdbbef2d6`.

The first receiving freeze is projection commit `c1e774b77eec859e34f06a2b96f960ebaf6ff919`, tree `0c6604cd78e65ab0f966a13d6c4e5ee9c2a2aef4`. It contains 25 selected files: nine product changes, including the exact README append, and 16 untouched inherited runtime/contract files. This is a projection, not the full canonical repository.

Projection commit `93c7199a8e3da9ab1914d60f4aea1f87dd0f1bea`, tree `21b6dfbd93af79980541b686b41e377390d635e6`, adds only the optional native browser checker. All nine earlier product files remain byte-identical. [source-pins.json](source-pins.json) binds all 26 selected files with Git blob IDs, SHA256 and byte counts.

The runtime/course pins are:

| File | SHA256 |
| --- | --- |
| weighted-intervals-core.mjs | dc028ab8ce07e281ec1d49350cd97eaad00d4234a6d35ac7c332276d5453087c |
| weighted-intervals-ui.mjs | 085176b8fbbc5d1664c37efaf0a567ef4f6d9e36d19149faec764ed2e4918fdf |
| weighted-intervals-explorer.html | b8caae1aa4c7878705790e7ccbe54b09134d55215d428b1564881e80837510b0 |
| weighted-interval-scheduling.json | 31335096bc9f08241f9b228f53bdfb3a9284fdc857569f9b4a5128ce0f6e3edf |

## Native author results

Execution used native Node 26.3.0 and Chrome 154.0.8037.98 on the authorized Mac. The browser opened the actual generated file in an isolated profile. It used no npm dependency or application server.

| Gate | Outcome |
| --- | --- |
| Initial build | Passed. |
| Initial focused Node suite | 12 passed, 1 failed in the new test's notes return-field access. |
| Corrected focused Node suite | 13/13 passed, including the existing deck, adaptive selector, review, practice and study-notes modules. |
| Generated-file parity | Passed through the maintained builder's byte-for-byte check. |
| Native browser syntax | Passed. |
| Actual direct-file browser | 7/7 focused scenarios passed; no application runtime errors or external page requests. |
| Source custody | Every measured source remained unchanged during execution. |
| Visual inspection | All three preserved native PNGs were directly inspected; no clipping or page overflow was found in the inspected desktop and 390px result views. |

The seven browser scenarios cover keyboard result activation; endpoint edits and stale-result invalidation; tie reconstruction; empty schedules, eight-item admission, ID reuse and add/remove focus; blank-value refusal with draft retention and explicit recovery; exact 0–24 SVG geometry at 390px with local table scrolling; and fresh state after reload.

The maximum-time compact capture uses A [23,24), value 99. Its 336-unit viewBox places the interval at x=308.625 with width=10.375, matching the same linear scale used by the axis. Input fields remain 68×44 CSS pixels. The wider table scrolls inside its labeled region; the page itself does not overflow.

## Preserve the failure's meaning

The first failing test passed the complete `createStudyNotes` return object to `assert.match`. The maintained consumer returns `{filename, mediaType, text}`; its text already contained the correct 10/12 first-answer count, one of two retries, original answers and explanations. The correction reads only `.text`. The entire original test, stdout, generated page and course/template versions are retained. The correction receipt verifies that all test assertions are preserved and that this field access is the only test edit.

A source attribution was also corrected before the receiving freeze: the final course and footer cite the primary Toronto notes actually retrieved, alongside UT Austin, instead of describing an inaccessible Princeton PDF as checked. This is attribution provenance, not an algorithm or answer change.

Two source-transfer setup events preceded the native gates: an initial new-folder write returned ENOENT, and one builder write returned a path-validation timeout. The owned folders were created, and the builder was recovered by an exclusive writer that checked existing bytes. Neither event is represented as a product test failure or a successful uncertain operation.

## Current-main composition boundary

During receiving, canonical main advanced to `343d20e38fb619c5eea2ec588b61c5f26fea714b`, tree `a4dce90aebe38adecc6ee066e0f764dba53e02a4`. It retains the deck/model/review/notes contracts but has a newer learner containing lesson-resume controls. A separately materialized 19-file current consumer is retained with independently computed Git and SHA256 pins; its direct-open demo SHA256 is `c7f1877facf1c62c741373b6bd03b645ec351af3457da06c45988efde805701a`.

The independent receiving packet reports the exhaustive/reference solver result, twelve-answer review and actual downloaded-course learner gates. Historical original-consumer evidence remains bound to its recorded bytes. Canonical publication must preserve the current main tree and append the README pointer to current bytes; the old README is not a replacement for newer content.

## Artifact index

- [receiving-artifacts.tar.gz](receiving-artifacts.tar.gz) contains the exact original inputs, selected source snapshots, initial failure, correction provenance, successful native logs, receipts and screenshots.
- [artifact-members.json](artifact-members.json) records every original archived file's byte count and SHA256. The archive was listed and each file was read back and compared with its original bytes.
- [author-results.json](author-results.json) gives the compact source-bound result.
- [01-default-wide.png](01-default-wide.png), [02-tie-backtrack-wide.png](02-tie-backtrack-wide.png) and [03-boundary-compact.png](03-boundary-compact.png) expose the inspected native captures without extracting the archive.
- [visual-review.md](visual-review.md) records the direct image inspection and its limits.
- [manifest.json](manifest.json) seals the other nine publication leaves. It does not attempt to hash itself.

These are bounded functional and visual checks. They do not claim learning efficacy, a browser/platform support matrix, screen-reader certification or a general-purpose scheduling service. Existing repository gates remain in force.
