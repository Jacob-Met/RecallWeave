# Recursion call-stack explorer — author receiving

This packet records the original offline explorer and the exact source used to receive it. The companion content packet records its twelve original questions and the unchanged RecallWeave importer, learner, practice, notes, and authoring consumers. Independent receiving is recorded separately from these author checks.

## Source and learner outcome

- Repository: Jacob-Met/RecallWeave.
- Claim: https://github.com/Jacob-Met/RecallWeave/issues/66.
- Canonical source observed for this work: e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7, complete tree 2a9cfa00c9a3f18ffa834335abb609c1cd7cc989.
- Frozen local source: e8846aa6b5815fa3f47b4905863fe6c51ee8b507, tree 9380029da48cfab89ed17e1baf9e1d2685cfaf29. This is an explicitly partial canonical checkout containing eighteen source leaves: ten feature leaves and eight exact canonical consumer leaves. It is not the full canonical repository tree.
- Final standalone page: 58,378 bytes, SHA256 dd1ff3cc963129e4412a223f7d2c17434a51bca2f86815c767d97c67d3bd8691.
- Original course source: estate_artifacts commit 66a3fbc3ae444a121830b0333eb380e24b374671. Its JSON is 16,099 bytes, SHA256 7a59b4a76f24307e223798bc20006f4f02f755c4163350535fad93aff1002c88.
- Native source: /Users/me/recallweave-recursion-a219f250962c/source.

A learner can open courses/recursion-call-stack-explorer.html directly, enter a bounded input, and inspect the current frame, each suspended caller's saved values and remaining expression, actual return order, and the memoized cache. Previous, Next, Back to start, the slider, and Jump to event select exact saved snapshots. Input edits clear the previous trace until Run trace. Explicit downloads retain the real inspected algorithm trace and the original course; course study uses the existing preview/start learner flow.

The only existing production path changed is a narrow additive README section. New paths are the core, UI, template, generated standalone page, builder, two content files and two scoped tests. The importer, learner/model, schema, author, archive and all other course paths are preserved.

## Exact conventions

| Quantity | Definition |
| --- | --- |
| Input | Integer from 0 through 10; text input uses digits only, with outer whitespace permitted |
| Factorial | Only n = 0 is a base case, returning 1; every positive n invokes factorial(n − 1) |
| Fibonacci | F(0) = 0 and F(1) = 1; the left child completes before the right child begins |
| Memoization | Fresh empty cache per run; lookup precedes base handling; every completed result is cached, including bases |
| Calls | All entered invocations, including base cases and cache hits |
| Computed calls | Entered invocations not served from cache, including base cases; this is not an operation or timing count |
| Cache hits | Entered invocations served from a previously computed cache value |
| Active / maximum depth | Current / largest simultaneous stack-frame count through the selected step, including root and bases |
| Return event | The returning frame has been removed, and its value is already delivered to its caller or the final result |
| Exact values | Result arithmetic uses BigInt; public snapshots and JSON encode results as decimal strings |
| Download | Full deterministic trace plus selectedStep and selectedState, under recallweave-recursion-trace/1 |

These are logical events for the displayed teaching algorithms. They do not measure an optimizing engine's physical stack or elapsed time. The full trace is bounded to at most 708 snapshots. Comparison totals are explicitly labeled as complete runs at the same input; selected-step counters remain separate. The exported algorithm trace has no import/restore path and is separate from RecallWeave learner-answer archives.

## Native and browser receiving

Node 26.3.0 ran the eight engine/artifact groups in engine-build-r1.json. Numeric references use iterative factorial/Fibonacci values and the independent closed-form invocation counts, across all thirty-three supported runs. Prefix checks establish call/return conservation, active frame identity, caller ownership and exact return delivery. The controls also check fixed entry/return orders, cached bases, fresh caches, immutable backward/forward inspection, exact cursor export and malformed input refusal.

The initial prebuild receipt retains seven passing engine groups and a failed artifact check because the content worker's course file was not delivered yet. That setup failure was resolved by composing the exact frozen course. No early standalone success is claimed.

The actual direct-file Chromium run in browser-r1/receipt.json passed four groups:

1. Factorial suspended work, keyboard stepping, backward/forward state identity and a real completed-trace download.
2. Memoized Fibonacci F(5): 9 calls, 6 computed calls, 3 hits, depth 5; the 15-call naive comparison; an active cache-hit frame; partial-cursor and fresh-cursor downloads.
3. Seven invalid inputs clear the trace and disable stale navigation/export; factorial/Fibonacci base boundaries and naive F(10) = 55 with 177 calls, depth 10 and 708 snapshots.
4. A 390-pixel view, the actual course download byte-identical to the frozen JSON, and a fresh page reload returning to the default zero-call view.

There were no page errors or HTTP(S) requests. The browser had a private temporary profile and no existing session. Each profile was removed after the browser closed.

Visual inspection found that the word "pending" wrapped in the narrow result box. The final successor changes only two CSS rules, keeps the exact core/UI/course bytes from the four-group run, and regenerates the standalone HTML. The final phone check in phone-r2/receipt.json verifies the single-line value, contained width, unchanged visible counters, no page errors or network, and final artifact hashes. The final builder and --check both exit 0. Desktop, original phone and corrected phone screenshots were visually inspected. The pre-CSS template/page are retained as exact hash-verified reconstructions under the native browser-r1/source directory.

The separate content packet retains nine native content/consumer controls and five actual-browser groups: preview/cancel custody; all twelve questions and exact feedback; practice and first-answer preservation; study-note download; phone import/refusal; and checked-deck authoring/export. Those checks belong to the content worker and do not stand in for independent engine receiving.

## Replay and retained artifacts

Run the dependency-free scoped tests from a complete repository checkout:

~~~sh
node --test tests/recursion-call-stack-engine.test.mjs tests/recursion-call-stack-course.test.mjs
node tools/build_recursion_call_stack.mjs --check
~~~

The optional actual-browser script accepts an existing Playwright module and browser executable. It installs nothing:

~~~sh
node check_browser.mjs --source /path/to/RecallWeave --output /new/owned/output --playwright /existing/playwright/index.mjs --browser /existing/chromium
~~~

The exact script and all textual receipts are in this packet. Native-only screenshots, actual larger trace downloads and the prior page are listed with bytes and hashes in native-artifacts.json. The full native receiver root is /Users/me/recallweave-recursion-a219f250962c. Source, history and native receipts remain retained.

Mac capacity fell below the original 1 GiB gate before a final checkpoint attempt, so that attempt stopped before test execution or Git writes. Root authorized only a subsequent tiny checkpoint budget of 2 MiB with a fresh 256 MiB minimum before each batch. No additional browser, install, bulk clone, or new test environment was started under that refinement. The exact source checkpoint and compact packet fit that budget.

## Scope qualifications

This is source and direct-file browser receiving, not a hosted deployment, contest submission, installed service or learning-efficacy claim. Hosted full-repository CI and complete public tree preservation are separate publication receipts. Current shared consumers were not modified.

The native source-only coordination claim is /srv/hamon-estate/coord/estate-a219f250962c/recallweave-recursion.json. Readable coordination and targeted current issues/PRs showed no recursion owner. Nine coordination records were permission-denied; the complete paths and visibility qualification remain in that record. No access-control workaround, runtime activation, native goal/lease claim, provider effect or automatic browser storage was used.
