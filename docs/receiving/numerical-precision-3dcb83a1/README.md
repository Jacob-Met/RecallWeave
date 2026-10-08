# Numerical precision: source and receiving

The lesson helps a learner identify **where a numerical difference enters**. Its offline explorer compares two written decimal values with the exact stored JavaScript Number operands and result. Signed conversion and operation-rounding contributions add exactly to the total discrepancy. Twelve original questions, explanations and worked transfer answers connect the examples to representation, comparisons, order of operations and integer guarantees.

Eight additive product files provide the course, guide, directly openable HTML, native model/UI, builder and maintained tests. Existing RecallWeave source and other courses stay intact. The explorer's actual downloaded course has now been received through the existing current learner: file preview, explicit start, twelve shuffled questions, review and missed-question practice.

## Source and qualification boundaries

| Stage | Source and result |
| --- | --- |
| Original author source | Base `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4`, tree `9e4e37af18a0c9c2868b62710473ac7bd458768d`. Native Node 22.22.1 build and all 12 focused tests pass, without source mutation. |
| Independent arithmetic/content/native learner | Before seeing the key or model, the reviewer froze its twelve answers and ten exact Fraction/actual-Number cases. All match. The actual unchanged parser, selector, option-order, BKT and review receive twelve questions: eight planned first-correct, four misses, then four correct practice answers. All fourteen original source files and earlier states remain exact. |
| Current importer and usage wording, v2 | Importer PR33 merged while receiving was underway. Current `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3` retains the six inherited native modules. Only two obsolete usage paragraphs changed, followed by one standalone rebuild. |
| First actual browser receiver, v2 | The downloaded HTML opens through `file://` in sandbox-enabled Chromium 153. Six keyboard, invalid-input/recovery, safe-integer, phone-layout and download-recovery gates pass. The subsequent exact course-download check fails; this is retained as a failed overall receiver. |
| Exact source-string correction, v3 | One line in the builder encodes the complete deck source as a JSON string, and one UI line decodes it before parsing/downloading. A new selected native regression executes the actual built script and download handlers with minimal DOM/URL ports and native Blob bytes: it fails on v2 and passes on v3. Model and lesson contents stay unchanged. |
| Actual browser continuation, v3 | Root's direct native report records five gates passed, exit 0 in 10.68 seconds: byte-exact downloaded HTML, actual local-file opening, exact course and guide downloads, downloaded JSON through the current importer, and completed twelve-question/review/practice flow. Eight first-correct and four misses remain unchanged after four practice corrections. The thirteen importer source files remain exact; there are no page exceptions or external requests. The [independent browser acceptance](browser-evidence/ACCEPTANCE.md), both original scripts/reports and three inspected final screenshots are included. Root found the captured desktop and phone controls/review legible, with no horizontal overflow in the exercised phone paths. |
| Hosted current project suite | The normal PR workflow supplies the current complete Node suite and existing demo parity gate after publication. No hosted result is asserted by this native preparation record. |

The first browser's six passing gates belong to v2. The later five passing gates belong to v3. They are separate runs, and the original byte-identity failure remains visible.

[Source boundaries](source-boundaries.json) pins the eight final product files. [The current importer manifest](importer-current-manifest.json) identifies the unchanged thirteen-file primary closure; it is not copied or modified as product source. A later complete current-main read at `003ce06c72fb3c7924a4414cd34053d87ae46d2f`, tree `7ae4800657652f213a22a459e6e0fff35591909c`, preserved that complete closure. Its 400 leaves contain no numerical-precision collision or AGENTS.md. Those project scopes and 338 coordination comments precede the [public source record](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6060989168). [Source admission](source-admission.json) also preserves the earlier failed 422 keyword queries as failures.

Final publication admission is main `98d43c30b3e0d8cc488339b6979867cb93f9586f`, actual tree `a5bbf78bc3faba7be3787e94c7b1a9271cd4dde2`, with 491 complete leaves. All thirteen browser/importer files retain their exact received bytes and modes; all new contribution paths remain absent. All 24 current open issues/PRs and 355 central comments were checked. The only numerical-precision claim is this contribution's existing public source record. Catalog issues #39/#40 and PR51, along with the current course, learner and worksheet owners, retain their source.

## The download defect and correction

The authored deck is 14,090 bytes, SHA256 `7593052ae2eaf3434397d8e733bc0b3538dbfa30b8d274cfd7dd38ff5e48cb09`. The first real download was 14,095 bytes, SHA256 `00ed062daaec4316a20db198a9137f8498516fa804ebc47d7daaf55717533481`. The only changed text was one `<` in the tolerance prompt, retained as the literal JSON escape `\u003c`. Applying that precise HTML-safe escape to the source reproduces the full actual-download hash; the parsed objects agree.

The correction keeps HTML-safe escaping and restores the complete original source string before the UI parses or downloads it, matching the guide's existing approach. The final HTML is 62,717 bytes, SHA256 `8c9c710a767d7bd322edc465956183715ba0d6aac6ba02edd365b9af9cf91920`. The actual corrected course and guide download hashes match their authored files. [The native regression receipt](author-download-receiving.json) retains the original one-case failure and corrected one-case pass, including exact commands, source preservation and raw-receipt pins. This small native DOM/URL receiver is distinct from the actual Chromium continuation.

## Retained evidence and replay

The [original native receipt](author-native-qualification.json) is byte-identical to the retained 23,962-byte file, SHA256 `386765cb6bb2532834022f1b4d2bb3ef6771e4b8946416873bb2e75248dc0a84`. [The usage-update build receipt](importer-wording-build.json) preserves its own exact 7,951-byte source-bound record. Historical staging wrappers are retained as text snapshots; their native paths/commands remain in the receipts. Use the normal checkout entrypoints below rather than executing a snapshot against its original native directory.

The independent [REVIEW](independent/REVIEW.md), [compact result](independent/independent-results.json), frozen oracle, blind sheet/solution and complete replay inputs remain together. No author-source copy or duplicated raw receiver output is included. The independent receipt still qualifies the original arithmetic/content/native-learner boundary; it does not acquire the later UI/download/browser execution.

From a checkout:

```sh
node --test tests/numerical-precision.test.mjs
node tools/build-numerical-precision.mjs --check
```

To replay the **original** independent receipt exactly, make a separate source copy containing the fourteen paths in `independent/source-pins.json`. Reverse [download-transition.json](download-transition.json) first: remove the exact appended regression suffix and replace each exact `after` string with `before` once. Then reverse the two usage paragraphs in [importer-wording-transition.json](importer-wording-transition.json). Run the restored builder once. All fourteen original hashes must match before running the original receiver. This combined reversal was checked against every original input and the original generated HTML without relabeling the check as another native test run.

Copy the independent packet into its own writable receiving directory and run `python3 -B receive_precision.py /path/to/the/reconstructed/source` there. Its source checks precede real Node module execution. Retain its 768 MiB free-space reserve and 16 MiB owned-data cap, and preserve the frozen original receiver directory.

## Resources and interpretation

Initial home-filesystem source admission refused the ThinkPad at 404,889,600 free bytes and the Mac at 259,702,784 bytes against the unchanged 512 MiB floor. Those were resource refusals before source creation. Ordinary authorized tmpfs staging later met that floor, with a 16 MiB owned-data cap and 45-second subprocess limit. Source copies and evidence remain isolated; no dependency installation, machine reconfiguration or shared cleanup was used for this lesson.

Inputs are signed plain decimal strings with at most 18 whole and 18 fractional digits; operations are addition/subtraction. Exact decimal text is an arithmetic reference, not measurement truth. Negative zero, fractional results, format limits and individual representable integers outside the safe-integer interval are explicit. The work makes no empirical learning-effect or deployed-service claim.

Questions and examples are original. Language behavior was checked against the primary [ECMAScript Number type and operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type) and [Number.isSafeInteger](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.issafeinteger) definitions, then qualified by native execution and an independent exact arithmetic oracle. The frozen source repository contained no license grant; the course attribution does not invent one.
