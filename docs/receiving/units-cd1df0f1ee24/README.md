# Unit conversion explorer and original lesson

This contribution lets a learner change a quantity's units, inspect each exact scale factor, compare dimension powers and continue into an original twelve-question lesson. The generated explorer opens directly as a local HTML file. Its calculation and lesson downloads require no server, account or network connection.

- [Open the explorer source artifact](../../../courses/unit-conversion-explorer.html).
- [Read the worked guide and transfer solutions](../../../courses/units-and-dimensions.md).
- [Use the original lesson JSON](../../../courses/units-and-dimensions.json).

The new paths contain the explorer, its native JavaScript model/UI/build command, the lesson and its guide, and two maintained test files. Existing learner, importer, review/model, catalog, README, dependencies and workflow files are inherited from the integration parent. Catalog curation belongs to the existing #39 and #40 owners.

## What the learner receives

The explorer supports an explicit list of metre/kilogram/second units and common prefixes, minute/hour, litre/millilitre, force, pressure, energy and power. Case remains significant: `MJ` and `mJ` differ. Unit expressions accept explicit multiplication/division, parentheses and whole powers; the guide explains how its conventional written notation maps to that input grammar.

Entered decimal/scientific values and conversion factors use reduced BigInt rational arithmetic. Exact numerators and denominators stay available in the displayed calculation and downloaded JSON. A separate decimal display rounds to at most twelve significant digits and labels a rounded result. This display limit is not a measurement-uncertainty estimate or an inferred experimental precision.

Every edit clears the prior result before validation. Incompatible dimensions leave a comparison table and refuse a numeric conversion. The calculation download re-reads all three current raw inputs, including changes made without an input event. User expressions enter textContent. The standalone build embeds the original admitted lesson bytes and has no automatic external resource dependency.

The lesson has four concepts, three questions per concept, twelve open transfer tasks, complete worked solutions and a rationale for all thirty-six distractors. It covers conversion-factor orientation, case and mass prefixes, squared/cubed scales, denominator conversions, density, derived dimensions, and the limits of dimensional checks. A blind independent reviewer solved the original questions and transfers before receiving the key, then checked the final wording amendment and guide. These are original practice materials, not a calibrated assessment or a demonstrated learning-effectiveness result.

## Verified source and native behavior

| Gate | Exact boundary | Result |
| --- | --- | --- |
| Maintained Node checks | Final core v4, explorer v2, guide v3 and exact lesson | 15 test groups pass, including the checked-in standalone build guard. |
| Independent mathematical receiving | Core Git blob `4c867b858a03f92c93a171ec0de6adcad1158229` | 48 numerical/refusal checks, 4 normalization checks and 12 independent rounding checks pass. |
| Independent arithmetic source review | Same core v4 | Grouping repair, exact arithmetic, bounded admission, immutable JSON and display behavior accepted. |
| Independent UI/build review | Final UI/build sources and color-only v2 template derivation | 11 frozen build/embedding assertions pass; the input-boundary contrast defect is repaired. Actual browser behavior is a separate gate below. |
| Actual offline explorer and learner | Explorer v2 plus learner `169b618ce71d2d4702a0d2ef740821df53581ad2` | 18 receiving groups pass, five real downloads, four inspected viewport captures, no page network dependency or runtime error. |
| Newer learner composition | Exact learner `e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7` | The unchanged learner journey passes with the new unfinished-lesson integration, using the original explorer-downloaded JSON. |

The native browser was Chrome 154.0.8037.98 with Node 26.3.0 on macOS arm64. Both actual learner journeys use the native file chooser, preview/cancel preserving an existing first answer, explicit start, twelve first answers with two intentional misses, two correct practice retries and actual study-note downloads. First answers and displayed model estimates remain unchanged after practice. The later run receives sixteen current learner source files and preserves its own exact input manifest; the earlier eighteen-group result is not relabeled as a run on that later source.

The course file is exactly 13,008 bytes, SHA256 `df0c8c8ba1f0061bbc73bcad0e9a62b257341b4bd5d6a7adbd6824820a02128e`. Final explorer HTML is 48,980 bytes, SHA256 `7a0d130b04449b1bdc7aa4852fddc7f2ed3c21ea51d7bbdd199ae96d306a06cd`. The [source manifest](source-manifest.json) pins all nine production/test files. Native source and driver manifests remain inside their exact receiving packets.

## Reproduce and inspect

From the repository root with Node available:

```sh
node --test tests/unit-conversion*.test.mjs
node tools/build-unit-conversion-explorer.mjs --check
```

After changing the source or lesson, rebuild with `node tools/build-unit-conversion-explorer.mjs`. The maintained build test is discovered by the existing `node --test tests/*.test.mjs` workflow. It prevents shipping a stale checked-in HTML artifact.

Open `courses/unit-conversion-explorer.html` directly in a browser. Use the lesson download, then open the supplied learner and select the downloaded file. The guide/learner navigation links depend on the repository folder structure; the calculation and both downloads work from the explorer HTML alone.

Complete original packets are preserved intact in the archives below. Extract an archive to retain its README links, source fixtures, original manifests, exact commands, raw logs, screenshots and downloads. Root read every regular file back from each new archive and matched its complete bytes to the sealed packet.

| Archive | Contents |
| --- | --- |
| [Mathematical receiving](mathematical-packet-v4.tar.gz) | 37 files: independent oracles/drivers, passing controls, v3 normalization failures and unchanged v4 reruns. |
| [Course receiving](course-packet-v3.tar.gz) | 17 files: blind questions/solutions, key comparison, final wording/guide acceptance and source provenance. |
| [Original native receiving](native-packet-v2.tar.gz) | 28 files: complete native input archive, source/driver pins, 18-group trace, real downloads and four captures. |
| [Current learner receiving](current-learner-packet-e49.tar.gz) | 18 files: bounded newer-consumer diff, complete input archive, unchanged learner driver, actual notes and capture. |
| [Independent UI/build review](ui-build-review.tar.gz) | 19 files: original contrast failure, corrected contrast, literal script-sentinel embedding probe and intentional stale-build refusal. |
| [Authored history](authored-history.tar.gz) | Original model/editor versions, raw authored test results and root corrections. |

Readable [root acceptance](root-acceptance.json), [converter review](converter-source-review.json), [UI/build review](ui-build-source-review.json), [native acceptance](native-acceptance.json), [current learner acceptance](current-learner-acceptance.json) and [publication manifest](publication-manifest.json) provide direct entry points. [Desktop calculation](images/explorer-rounded-desktop.png) and [phone result](images/explorer-phone-result.png) are actual native viewport captures.

## Corrections and limits retained

The first authored model run passed nine groups and failed four because negative zero was not canonical in the public JSON representation. The correction canonicalizes zero. Core v3 passed the independent numerical checks but lost nested-power grouping in its normalized display: the frozen normalization probe passed one case and failed three. Core v4 preserves the admitted grouping, aliases and input-length bound; the same four probes now pass. These failures remain separate from the final fifteen-group maintained run.

The first template's input border measured 2.5609:1 against white. Its sole color correction measures 4.3645:1, following the [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). This is a checked component boundary, not a claim of full accessibility conformance. The independent build review also retains its intentionally stale output and expected refusing exit.

Local source/evidence transfers encountered ENOSPC before native execution; the original transport receipts remain intact. A root build-test creation similarly left an empty new test file before capacity was recovered; the completed file and subsequent actual fifteen-group result are separately recorded. Only completed root-owned caches with exact published Git byte/mode matches were reclaimed. These are environment/export failures, not hidden browser or course failures.

The model is bounded teaching arithmetic for listed units. It does not support affine temperature scales, logarithmic units, arbitrary formulas or inferred prefixes. Equal dimensions do not establish a physical law, coefficient, or quantity interpretation. No school deployment, catalog registration, physical-device evaluation, learner study or hosted test result is inferred from the native receiving. Hosted CI and exact merged-source custody are recorded on the PR when they occur.

The unit definitions and conventions are grounded in the [BIPM SI Brochure](https://www.bipm.org/en/publications/si-brochure), [NIST prefix reference](https://www.nist.gov/pml/owm/metric-si-prefixes) and [NIST time/volume relations](https://www.nist.gov/pml/special-publication-330/sp-330-section-4). The lesson's guide includes precise references, authorship and reuse terms. No source exercise wording is copied and no institutional endorsement is claimed.
