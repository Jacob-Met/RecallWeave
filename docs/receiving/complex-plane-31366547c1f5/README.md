# Complex multiplication: receiving record

This contribution adds an original twelve-question lesson, a worked guide and a standalone offline explorer for complex multiplication. The exact lesson JSON enters the existing RecallWeave chooser; the learner, adaptive scheduling, review, practice and notes implementations remain unchanged.

The scope is [RecallWeave #80](https://github.com/Jacob-Met/RecallWeave/issues/80). It preserves the separate phasor-interference work in #75, including coherent-signal addition and time traces. All ten implementation, course, build and test files are new. Their exact Git blobs, SHA256 values and modes are in [source-manifest.json](source-manifest.json).

## Use and maintenance

Open [the lab](../../../courses/complex-plane-lab.html) directly as a local file, calculate and download an experiment or the exact lesson. Import the lesson through the existing [learner](../../../demo.html) and explicitly start it. The [worked guide](../../../courses/complex-plane.md) explains the mathematics and course assumptions.

The explorer defines `P0 = z` and `P(k+1) = Pk * w`. N multiplications yield N+1 indexed rows, including N=0; repeated coordinates retain every index. The separately displayed product is always `z * w`. Components are plain decimal strings in [-10,10], with at most three fractional digits; N is an integer in [0,8]. Arithmetic is JavaScript binary64, with rounded display and full floating-point numbers in experiment JSON.

Arguments use degrees in [-180,180), with positive angles counterclockwise and no argument for zero. The multiplier modulus remains defined when the initial point is zero; a zero multiplier is a collapse. Horizontal and vertical pixel scales are equal. Connecting segments represent discrete steps, without claiming a continuous winding or time signal. Every edit or preset retires the accepted result and experiment export. Export also rechecks the accepted raw input identity.

The maintained checks are:

```sh
node tools/build-complex-plane.mjs --check
node --test tests/complex-plane.test.mjs tests/complex-plane-course.test.mjs
```

Rebuild with `node tools/build-complex-plane.mjs`. The optional browser receiver documents explicit Chrome/source/output arguments and requires an existing browser and Node with built-in WebSocket; it is separate from the ordinary Node20 test workflow.

## Observed receiving

[qualification.json](qualification.json) binds the gates and physical files to exact receipts.

| Gate | Observed result |
| --- | --- |
| Native model/course/build | Eleven focused tests passed on Mac Node26. The two later copy-only corrections were rebuilt and byte reviewed. |
| Author integration | Eight groups passed: one baseline missing-flow control and seven actual offline browser groups, including physical downloads and invalid/stale-state recovery. |
| Independent content | All twelve answers were derived and frozen before the authored keys/model were read. Prompt-only clarifications retained every independent answer. |
| Independent lab | Eleven groups passed on ThinkPad Node22 using pre-result integer/rational oracles, actual downloads, branch/zero/axis/repeated-index cases, N=0, equal-scale geometry and ordinary desktop/mobile viewports. |
| Existing learner | Ninety-four checks passed: twelve adaptive questions, two deliberate first mistakes, two separate retries and two physical notes downloads. All39 learner inputs and four receiving inputs were preserved; browser exit was zero. |

The independent primary sequence used `z = 1 + 2i`, `w = -2 + i`, N=4, and received (1,2), (-4,-3), (11,2), (-24,7), (41,-38), with squared moduli 5,25,125,625,3125. Separate controls covered quarter-turn cycles, real-axis half turns, zero initial value, zero multiplier and repeated halving. Nine physical experiment downloads retained full numbers rather than rounded table text. The physical lesson download was exactly11,912 bytes, SHA256 `68bffc725b2409447650ac25bc0940508b930992036eca199860831be9d6c5a3`.

The learner kept the original10/12 session separate from two practice attempts with one correct answer. Both physical notes retained the first attempts, separate practice and learner-authored reflections, along with the existing model-state/not-validated-assessment wording. Root directly reviewed the phone preview, notes status/action and actual after-practice file. Independent and root visual receiving accepted the ordinary desktop and390×844 mobile captures: a square plot with coincident indexed labels, all nine rows and the horizontally reachable argument column, without tiling or page overflow.

The qualified upstream input is `67b5fd0381fd8cbd843952ca2cb26434dba3b594`, tree `d2c128b2433847a6d064597fb19630f343cffc49`. The receiving layout contains39 exact selected upstream inputs plus ten additions. Native source commit `41e621592e165e9434ea76e169854a202b735815`, tree `b1e67e257df4205db72b34ef26bedb1f4ed05a6e`, is a complete standalone partial-source history, without a full-upstream-ancestry claim. The original learner inputs and model/course source remained unchanged. After the two reviewed copy corrections and rebuild, all ten final source files stayed frozen through author browser and independent receiving. Current-parent composition and hosted CI are separate integration gates.

## Durable routes and retained limits

The complete source bundle and original source payload are received under `/srv/hamon-estate/custody/chatgpt-31366547c1f5/recallweave-complex-plane-41e62159/recovered-source-v1/handoff/`. The162,096-byte bundle has SHA256 `a1a06d6740546ed1397d25be45e89b87c50637b374d00e0a3e410a4c9a4bfca6`. A fresh publication mirror independently verified all49 leaf blobs, sizes, SHA256 values and Git modes.

Original author receipts/downloads/captures remain at `/Users/me/recallweave-complex-plane-31366547c1f5/qa/`. The attempted ThinkPad author-evidence aggregate is a preserved458,752-byte prefix after two read-only Mac transfer timeouts; it is not a complete archive. Complete-file recovery separately verified the source bundle and all five source handoff files. The qualification distinguishes these routes.

The complete independent Linux lab archive is `/home/jacob/recallweave-complex-plane-independent-linux-31366547c1f5/independent-linux-evidence.tar.gz`,1,439,570 bytes, SHA256 `32a5acc051576465ba8c727c76efa7ac618997ba6ea1486c2a30d09885b8e00d`. Its independent receiver freshly extracted and verified131 declared files,2,433,948 bytes. It explicitly distinguishes complete Linux artifacts from earlier Mac provenance whose raw artifacts were not all replicated.

The learner archive is `/home/jacob/recallweave-complex-plane-learner-31366547c1f5/handoff-v1/learner-receiving-evidence.tar.gz`,660,980 bytes, SHA256 `9bb2bb79fbb0fd9adc41f58c8ac3878241af48ad1ff28f6d813d50fa7d0e612c`. Its declared contents are79 regular files,2,540,773 expanded bytes, including unchanged source, the exact physical deck, original blind map, refused/successful receipts, all five captures and both GUID-bound notes files. The synthetic private profile is retained separately; the browser has exited.

The author manifest-field refusal occurred before Chrome launched. Independent input/display-oracle/download transport attempts and the defective tiled author mobile capture remain separate evidence. The learner's original prelaunch Git-mode refusal is retained: its successor correctly maps native non-executable0664 to Git100644 while preserving complete before/after native modes. A later exclusive preparation refused an existing completed V2 output, which was reconciled read-only without replay. The sole observed learner page request was the original local Document; raw Chromium background GCM stderr remains evidence and is not conflated with page requests.

No browser installation, shared runtime installation, provider request, deployment or participant collection was part of this receiving. Native passes do not substitute for current hosted Node20/current-parent gates.
