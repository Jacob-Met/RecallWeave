# Normal-modes course and offline lab receiving

This packet records the original **Coupled motion: two patterns inside one system** contribution for [RecallWeave issue #129](https://github.com/Jacob-Met/RecallWeave/issues/129). The product is a sixteen-question checked course, worked guide, analytical two-mass lab, deterministic standalone builder and focused native tests. Source qualification and source publication are separate states: the manifests bind the qualified bytes, and the issue/PR records bind their eventual Git tree and integration.

## What a learner can do

Open `courses/normal-modes-lab.html` directly in a browser. Apply any of five complete presets or edit the mass, two spring stiffnesses, initial positions and velocities, and time window. Inspect a time with the keyboard slider or an exact numeric entry. The lab presents physical coordinates and half-sum normal coordinates on common axes, the original three-spring schematic, instantaneous force/velocity/acceleration values, the physical and modal energy decompositions, and the zero-coupling degeneracy.

Parameter drafts retain a visibly labelled last-applied view. Invalid or pending inputs cannot produce an observation; successful Apply updates all values together and resets time. Course and guide downloads always preserve their canonical source strings. The observation is a calculated experiment record, separate from a learner-answer archive. The downloaded course uses the existing learner's explicit preview and Start this deck flow.

## Exact source boundary

[Source manifest](source-manifest.json) records SHA256 and Git blob identities for the nine proposed product paths, including the sole additive README section. The authoring base was `f42ad22e069b5ed3b2d85ea0573b84fef121d254`. Browser receiving used the later learner from `567425f209cdf8e8cf9767faac9bfd3003af3e65`; its unchanged `demo.html` blob is `42f991e0ceab6144e24b667f59905777d9659246`, and parser blob is `f0f8a4b234489c2388f427633f548d56c6ed4c03`.

README preparation then incorporated main `992080948d3464d52270001308b0e2e3e257c962`. [The composition receipt](readme-integration-99208.json) verifies that removing only the new section restores every byte of that main README. Its newer lessons are retained. Browser/core source did not change when main added unrelated courses.

Only the nine listed product paths and the two unique normal-modes receiving prefixes are publication inputs. Existing learner, parser, catalog, course-pack, service and workflow files are receiving dependencies or separately owned work. No native goal/lease or live-service adoption is claimed.

## Qualification results

| Receiving work | Outcome and evidence |
| --- | --- |
| Independent physics | [Sealed physics packet](physics/) retains nine pre-frozen groups, independent Cartesian RK4 and force/energy/restart/exchange/zero-state checks, wrong-model controls, source pins and diagnostics. The analytical implementation passed the declared tolerances. |
| Blind course review | All sixteen correct choices were derived before the answer key was read. The reviewed choices exactly matched the checked deck; explanations, assumptions, units and transfer prompts were examined. The same sealed physics packet retains the original questions and blind answers. |
| Builder and literal text | [Independent final review](builder/FINAL-REVIEW.md) retains seven pre-frozen groups plus two concrete marker-text regressions. All nine pass with the minimal single-pass substitution repair. Exact serialization checks include script-ending text, HTML, Unicode separators, CRLF and marker-shaped prose. |
| Production binding | The independent review passed seven final groups on the actual template/UI. Its 77,052-byte output matches repeated builds and independent assembly. Actual course/guide handlers preserve all 16,553 and 11,259 UTF-8 bytes respectively. Relocated replay and static label/reference checks also passed. |
| Native commands | [Final native receipt](native/receipt.json): build, `--check`, and all six focused Node tests exited 0 on Node 22.22.1. All source bytes were identical before and after. The tests include invalid-input handling, exact observation semantics, maximum-domain sampling, failed-publication preservation and literal-payload regression. |
| Actual browser and learner | [Independent browser packet](../normal-modes-runtime-3e50c5ad22c5/README.md): ten groups passed in Chromium 153, with twelve completed downloads and ten screenshots. The actual downloaded course completed all sixteen questions/four concepts, with one deliberate miss and fifteen correct first answers. Feedback, complete review, downloaded study notes and completed trace were checked. All eight consumed inputs stayed unchanged. |
| Layout and interaction | Keyboard slider and exact time entry, pending/invalid drafts, presets, 390px/360px contained layouts and the subnormal schematic regression were exercised. [Lead visual review](lead-visual-review.json) records the actual desktop and narrow invalid-state captures inspected. |

The qualified standalone SHA256 is `5378b02dbaa102e26d172b3777dd1e7f5590e8152690b16973f041b473e6e760`, Git blob `120f4c357aa2a0a2abcb59ccbb1ac06f7f3f4422`. The browser passing receipt SHA256 is `8d6fef6e5ebd880535fc0305226f67ff3c79183a086da68b076cf34a3431bcdf`.

## Retained corrections and failures

- Two initial writes on the full native root filesystem produced zero-byte files. [Preparation failures](preparation-failures.json) records this failure and the recovery of only this contribution's working set into `/tmp`. No other worker's files were cleaned.
- The original builder interpreted inserted marker-shaped lesson prose as template syntax. Both failing inputs and the bounded patch are retained in the independent builder packet; the checked-in regression exercises exact decoded text.
- The first interface version had one missing accessible heading ID and computed a reciprocal scale that overflowed for accepted displacement `1e-320`. The original source, negative controls and exact bounded repairs are retained in the builder packet and [author receipt](production-ui-source.json). The original successful native packet and generated HTML are retained in [native-before-ui-fixes](native-before-ui-fixes/) and are explicitly superseded by the final native receipt.
- The guide was refined to state unstrained equilibrium/no preload and to distinguish immediate preset application from edited-field Apply. The old reviewed guide and exact acceptance of the bounded change remain preserved.
- Browser attempt v1 timed out during installed Chromium startup before any product page opened. The browser packet retains its complete failure. V2 passed after a bounded receiver startup allowance change; the product source was unchanged.
- A reviewer initially prohibited the `type="module"` attribute, exceeding the offline/no-import requirement. The original expectation and disposition remain preserved. The actual script has no imported dependencies and passed real direct-file browser receiving.

## Reproduce

From the repository root, run:

```sh
node tools/build-normal-modes.mjs --check
node --test tests/normal-modes.test.mjs
```

The independent physics, builder and browser packets contain their own replay entrypoints, frozen controls, source pins and exact run instructions. They are verification tools; the application itself needs no server, installed package or network. Retained raw failures should be read alongside the final receipts rather than silently discarded.

## Interpretation

The mechanical model is ideal, linear, undamped and unforced, with two equal positive masses. Its numbers are floating-point analytical evaluations and its schematic is scaled for display. Normal-mode energy conservation is a model property; the observation download is not a physical measurement. The course's original wording/examples have their own CC0-1.0 statement; linked MIT material retains its license. No external passages or exercises were copied.

The receiving demonstrates the stated source and observed Chromium behavior. It does not establish human learning efficacy, physical-phone or full screen-reader coverage, deployment of any estate service, contest submission, or adoption by another owner's catalog/pack. Those states need their own evidence.
