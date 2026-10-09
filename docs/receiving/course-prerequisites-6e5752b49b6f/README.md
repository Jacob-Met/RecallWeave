# Course prerequisite review — qualified receiving

This contribution adds a separate read-only review of a saved RecallWeave course. Open the committed `prerequisites.html` directly in the browser, choose the course JSON, and select a concept. The review preserves original concept and question order, shows every declaring question for each direct prerequisite link, distinguishes direct links from longer chains, and shows deterministic shortest chains in both directions. It does not edit the course. The user guide is [course-prerequisites.md](../../course-prerequisites.md).

The pure API is `inspectCoursePrerequisites(text, selectedConceptIndex = 0)`. It uses the unchanged course parser, returns deeply frozen JSON-safe data, and preserves literal identities, question numbers, prerequisite order and all original edge witnesses. The standalone page records the exact selected filename, byte length and SHA-256. An explicit download contains a structural review report with prompts; it is not a lesson or restore file. Graph depth is structural, not an estimate of teaching time or mastery.

## Exact source and authority

The preimplementation [public contract](public-contract.json) is blob `551e3833b6439e475d8566e6727206dcd3e35493`. Original main `698902f9c9c1d5c5023092b85b3632a7cb7a01ed` has 2,915 leaves. Author commit `1bbbc9007d29247c765965bbf1717088167c1cfb` adds nine files and preserves every original leaf/mode. The separately reviewed README-only successor `0a4bac3ee9877f248af1bc9ceb90117b363ebfe2` is the qualified source, tree `e0c0e47fc402acdcfba56e656c61a96806dd9c92`.

The [source fence](source-fence.json) proves that all 2,914 original non-README leaves and their modes are exact, the old README is an exact prefix of the 954-byte addition, and all eleven admitted product/dependency/build files remain unchanged. Native receipts correctly retain the earlier immutable author commit they actually executed. The standalone is 33,089 bytes, Git blob `f74a117d657c43aac37c5c3e0c6a492dadcb41b7`, SHA-256 `ecc9357a63b359c1bd9c84e29a84f485a78ca1086a09a01b48a9f178e6cfa543`.

## Actual qualified behavior

| Gate | Original result and exact scope |
| --- | --- |
| Author native | Nine core tests and one bundle test passed on Node 24.14.0, with actual build, generated standalone parity, VM API parity and UI syntax. No author browser claim. |
| Independent native API | Nine groups, 99 API calls and 25 complete frozen manual reports passed on Node 22.22.1. This includes 15 invalid indices, 27 inherited validator refusals, 32 concepts, 100 questions, 262144-byte boundary, deep freezing, literal identities, all question witnesses and shortest-chain direction/ties. All 13 source/receiver and 25 runtime records remained exact. Actual outer PID 3799198 exited 0 in 0.82s. |
| Root actual browser R1 | Seventeen groups, 20 completed physical JSON downloads, 67 DOM observations, 100 original artifacts and 11 sensitivity controls passed on installed Chrome 154.0.8037.97. Twelve selected reports from four manually frozen course fixtures agree exactly with the visible projection and downloaded envelopes. Actual outer PID 70184 exited 0 in 13.44s; inner 13,088.2953ms stayed within the frozen 150-second budget. |
| File and async lifecycle | Exact 262144-byte intake succeeds; six strict replacement refusals preserve the admitted report. Same-name changed bytes receive a fresh digest. Eight original read/digest resolve/reject outcomes across replacement and Clear cannot resurrect stale state. A failed URL preparation retains the report and a retry produces the actual download. |
| Browser lifecycle and visible output | All 13 original viewport PNGs were reviewed. Desktop and 390 CSS px text, source ordinals, provenance, witness prompts and chains are legible. Every required element remains in whole-page geometry admission. Actual browser 88572 was observed through its retained native handle, then Browser.close completed; target, observer and launcher exited 0 and the owned profile was removed. All 36 admitted records stayed exact; one own file GET, zero unexpected requests/errors and zero storage writes were observed, and all timing hooks were restored. |
| Archive custody | All four original archives are complete. Separate transported-byte checks verify 251 members: author 32, independent API 23, failed browser R0 51 and successful browser R1 145. No archive receiving step reruns the product or regenerates screenshots/downloads. |

The [root receiving disposition](root-receiving.json), original raw receipts, manual references, source review, screenshots inside the original browser archives, and independent transport checks distinguish each scope. The final contribution commit is a source/evidence composition; its separate publication receipt determines the actual ref state. This packet does not claim main adoption or deployment.

## Preserved failures and corrections

The original [R0 browser receipt](browser-r0/original-receiving.json) is a real failed attempt, with one passed group and no downloads. The receiver sent trusted Enter keyDown/keyUp without text, so the browser did not receive keypress and the native disclosure did not toggle. The unchanged-product R1 records both that negative control and the corrected trusted keyDown/keypress/keyup sequence; native close/reopen then passed. R0 closed its actual browser successfully and removed its own profile. Its 51-member archive remains separate and is accepted for preservation only.

The independent source review retains earlier receiving-helper findings about hidden-element filtering and ancestor opacity/clipping. Its corrections keep all required elements in the geometry checks and leave manual semantics and the one CSS pixel rounding allowance unchanged. The API archive preserves the prefreeze shared-frozen-reference checker correction. The browser transport record preserves the initial oversized diagnostic response and bounded-output successor; original bytes remain unchanged. A refused initial host admission due to an absent environment variable was corrected using actual Windows identity, without an account/security change.

## Recovering the exact original packets

| Packet | Compressed bytes | SHA-256 | Members |
| --- | ---: | --- | ---: |
| [Author](author/native-evidence.tar.gz) |45,821|266de7cc3d2579c043bcc055e2b5d8311730c38bfbef1c62f389696a884175f5|32|
| [Independent API](native-api/native-evidence.tar.gz) |50,682|9c13ebb46f26ab1ad01eaf2cb810044d1b2d6029189ca58651f8e497ad0a772a|23|
| [Browser R0, original failure](browser-r0/native-evidence.tar.gz) |280,775|5e378c30438b0146656e89a490f4acd14dd6f01b26efdf927fce8ffc4b0a32e3|51|
| [Browser R1, accepted](browser-r1/native-evidence.tar.gz) |1,649,256|6d9d841d4992dd8ec71456e3cfa03b05c872009f6c3d268fa0c34079440b1c3f|145|

The supported UTF8 mirrors for author, API and browser R0 are adjacent `native-evidence.base64` files. For browser R1, concatenate `archive.base64.part-0`, `archive.base64.part-1`, and `archive.base64.part-2` in exactly that order, retaining their existing newlines, then Base64-decode. Verify compressed size/SHA and every manifest member before consuming the originals. All three R1 parts were fully read back; the separately created full mirror is not offered as a full-readback proof. Binary raw fetch is unsupported and is not claimed.

[artifact-index.json](artifact-index.json) binds every separate evidence path to its immutable Git blob. Native archives retain exact source, runtime admission, controllers, original receivers and failures, output logs, DOM records, original PNGs and all physical downloads. Their manifests preserve source provenance and the original inventory. Root's author transport check ran independently and in memory on cloud Node 24.19.0; it makes no new native runtime or browser claim.

## Practical limits and continuation

The review describes declared graph structure. It does not validate factual/pedagogical quality or demonstrate teaching benefit. The actual browser gate covers the direct-open standalone in the installed Windows Chrome runtime at desktop and 390 CSS px. It covers the explicit no-file input change transition, not a physical operating-system file-dialog cancellation. There is no other-browser, modular-browser, PDF or usability-study claim.

Issue #196 retains this contribution's ownership. Existing #177/#180 comparison work, #190 repetition, #10 question-copy ownership, author/loader/draft/learner/focus/catalog/handout code and all five workflows remain unchanged. The original workflows permit main pushes and pull requests; no new Actions run, PR, main update, runtime installation or deployment is part of this packet. A fresh read-only admission is required immediately before publishing the new owned contribution branch. Any later main adoption must use the estate's established integration authority and its then-current execution restrictions.
