# Independent recursion engine and standalone-source review

## Disposition

**ACCEPT** the frozen source at commit `e8846aa6b5815fa3f47b4905863fe6c51ee8b507`, tree `9380029da48cfab89ed17e1baf9e1d2685cfaf29`.

Owner checkout: `/Users/me/recallweave-recursion-a219f250962c/source`. Its manifest SHA256 is `a70aa9c61cdfee01c08105078d3132de35b1d08fac7c17e1f9b72b86e78fd342`. This is an explicit partial canonical-consumer checkout with the complete authored feature, not a deployed or full canonical-main source claim.

The reviewer authored the separate questions/guide/content controls, but did not author this engine, UI, template, or builder. This review does not repeat the content import/browser groups or run the author's tests. No product source was edited.

## Executed boundary

The independent script imported the native frozen engine through the existing Node 26.3.0 runtime. It constructed an activation ledger from the reported event history, then checked the snapshots against that ledger. Values were checked with iterative BigInt factorial/Fibonacci references, distinct from the content tests' binomial-sum reference.

Across **33 bounded algorithm/input combinations and 2,444 snapshots**, it verified:

- Every child belongs to the current top caller, uses the intended argument, and follows an explicit suspension. A right Fibonacci child enters only after the left child has returned.
- Only the top frame returns. Each value goes to the declared caller and correct left/right local. Base cases and cache hits create no children.
- A suspended ancestor's input, pending expression, status and saved values remain unchanged while a descendant runs.
- Every displayed stack exactly matches the independent live activation ledger. Calls equal returned calls plus active depth at every step. Computed calls, hits, maximum depth and completed-root state follow the event history.
- Cache hits require a previously recorded completed value in this run. Each write agrees with the independent result reference; every cache snapshot preserves exact values in numeric key order.
- All nested trace data is frozen. Reverse inspection returns the same saved snapshot objects without changing their serialized bytes. Separate runs produce deterministic content with distinct caches.

Hand-derived fixtures additionally pin factorial return order, factorial(4)'s two suspended multiplications, the root F(3) frame retaining left=1 while its right child runs, two distinct naive F(4) invocations of F(2), and the complete entry/return/cache-write orders for fresh memoized F(5).

Full-trace exports were challenged at start, middle, cache-hit and final positions. Their steps and final totals stay complete, while selectedStep and selectedState agree exactly after JSON round-trip. A start-position export correctly contains a pending selected state alongside the separately labeled complete trace. Invalid inputs/cursors and cloned or forged trace identities are refused.

**Six receiving groups passed.** RDC independently reported the process completed with **exit code 0 in 0.51 seconds**; its raw completion receipt is included. All 18 frozen source leaves and clean HEAD were verified before and after this gate.

## Standalone artifact binding

The receiver extracted the artifact's one course-data script and one executable module. Removing those blocks reproduced the exact full template. The executable bytes decomposed into the exact engine plus UI after its single approved local import seam. Reformatting the embedded JSON reproduced the canonical course byte for byte.

| Input | SHA256 |
| --- | --- |
| Core | `81abcc2c232e27e69410d51a2c004d6cc0ffe0f0fee82fbac715c2ab8bb0cf93` |
| UI | `a28999cf8539fc3cd19940d86c2671421d07d4e155cb1c465352dec610462db6` |
| Template | `b1ea9f86b27f9a3027d95260d2cd160122aa35322d00aeb680b2653adc035c63` |
| HTML | `dd1ff3cc963129e4412a223f7d2c17434a51bca2f86815c767d97c67d3bd8691` |
| Course | `7a59b4a76f24307e223798bc20006f4f02f755c4163350535fad93aff1002c88` |

Source inspection binds Previous, Next, Back to start, Run to end, slider/jump and download to the same immutable cursor. Editing the setup clears the trace and its download action. Returned-values lists are limited to the selected prefix; the completed-run comparison uses the same input and is labeled separately.

## Limits and preservation

This is actual pure-engine execution plus literal artifact and UI source review. It creates no browser, profile, server, dependency environment, or rendered-DOM claim. The owner's actual browser and final phone-layout receipts retain that qualification. The separate content packet retains the importer/learner/Deck Studio browser qualification.

Canonical main later advanced with unrelated course/handout additions. This receipt stays pinned to the source that ran. The receiving owner must preserve those current leaves and compose the README additively; no replay is inferred here.

Only tiny reviewer scripts/receipts were written, after an immediate 256 MiB available-space gate. No existing source, Git index, installed files, or another worker's dependencies were mutated. The packet's SHA256SUMS.json covers every file except itself. There were no failing product controls or requested corrections in this independent gate.
