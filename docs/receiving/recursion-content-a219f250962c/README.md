# Recursion / Call Stack content receiving

## Accepted content

This packet receives three original additions for RecallWeave: the twelve-question course, its worked guide, and its content-only native controls. The separate explorer owner receives the JavaScript trace engine and UI. No existing importer, authoring implementation, learner model, archive, or catalog was edited by this content worker.

Source checkout: `/Users/me/recallweave-recursion-content-a219f250962c/source`.

Content commit: `66a3fbc3ae444a121830b0333eb380e24b374671`; tree `d93815f49f941d97025aeae6dfbfe46ff88279ae`. This is explicitly a partial consumer checkout, containing seven exact canonical consumer files and the three new files. It is not a full canonical-main checkout or an installed/deployed claim.

Canonical consumer parent: `e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7`, full tree `2a9cfa00c9a3f18ffa834335abb609c1cd7cc989`, https://github.com/Jacob-Met/RecallWeave .

Frozen course JSON: 16,099 UTF-8 bytes; SHA256 `7a59b4a76f24307e223798bc20006f4f02f755c4163350535fad93aff1002c88`; Git blob `45a2eb91788cc7955840913bdb1a92b23cb2b551`. The explorer builder should embed these exact bytes.

## Content and arithmetic contract

The course has three questions in each of four concepts: reachable base cases, suspended parent work and returns, total calls versus simultaneous depth, and memoized reuse. Each question carries its own relevant conventions because the adaptive selector can change study order. The guide supplies complete worked transfer responses rather than leaving their answers implicit.

Factorial stops only at zero; factorial(5) therefore makes six invocations at depth six. Fibonacci uses F0=0 and F1=1, evaluates the left child before the right, and fresh memoized runs begin with an empty cache. Every completed result, including bases, is stored. A hit is one invocation and has an active frame. Computed calls exclude hits. Fresh memoized F5 returns5 with9 calls,6 computed,3 hits,depth5. A warm-cache counterfactual is labeled separately.

Native controls use a separate finite-product factorial and a binomial-sum Fibonacci reference, plus derived call-count formulas. They do not reproduce the explorer event tracer. All eleven n = 0..10 Fibonacci table rows and all twelve answer/transfer calculations were checked. Base 0/1 exceptions and a stored zero are explicit.

The questions are original AI-assisted content for Jacob's project. NIST recursion and memoization background are linked in the guide. The course grants no additional reuse license. Structural import success does not establish learning efficacy or psychometric validity.

## Actual verification

`/opt/homebrew/bin/node --test tests/recursion-call-stack-course.test.mjs` ran on Node 26.3.0 and exited 0: **9 tests passed, 0 failed**. The original stdout/stderr and exit receipt are retained. These tests exercised the unchanged parse/serialize, editable-draft conversion, adaptive selection, review, practice, and study-note functions.

The actual unchanged canonical `demo.html` and `author.html` were loaded as local files in **Google Chrome 154.0.8037.98**, using an existing Playwright installation read-only. No code was injected into either application and no debug hooks or external network requests were used.

Five browser groups passed:

1. Import preview shows the exact title, 12 questions and 4 concepts; preview/cancel leaves the original lesson unchanged.
2. A complete mixed first session answers all 12 unique imported questions (8 correct / 4 missed); canonical option content, explanation and transfer text agree with the file despite shuffled display positions.
3. Four real practice corrections preserve the original first-answer result and model estimates. A genuine study-note download retains every question, correct option, explanation, transfer, attribution, license and two explicit fixture reflections.
4. The 390px phone view imports the course without horizontal overflow. A refused recursion-trace-format file preserves the active imported question and feedback.
5. Actual Deck Studio preview, replacement and check succeed. Its real downloaded checked JSON is byte-identical to the 16,099-byte source course.

Browser source and download hashes are in `browser-import/receipt.json`. All five captured screenshots remain in the native receiving directory and are pinned by `native-artifacts.json`; binary copies are not embedded as text here. The phone screenshot was visually inspected for readable wrapped options, feedback and concept estimates. Browser contexts and the owned browser were closed. There were no page errors or attempted HTTP(S) requests.

The native/browser count is specific to this content receiving source. Explorer numeric/UI tests, a final integrated repository test run, publication, and any installed or hosted delivery belong to the receiving owner and are not inferred from this packet.

## Preserved setup refusal

The first attempt to transfer all source inside one large RDC inline Node command returned `INVALID_ARGUMENT` / `Command not allowed` before execution. It had no PID or test result. It was not an ENOSPC failure or a failing course test. The plain source was subsequently transferred using the purpose-built structured file-write API, followed by short ordinary Node commands. The raw rejected tool result and attempted script are retained as native artifacts, pinned separately. No command was encoded to evade the rejection and no dependency was installed.

The small native work ran only after a >=1GiB available-space check. This packet preserves source, script, exit, actual-browser, and download evidence. It does not claim the other workers' capacity cleanup.

## Reproduction

In a normal current RecallWeave checkout with these three content files and the native consumers:

~~~sh
node --test tests/recursion-call-stack-course.test.mjs
~~~

Open `demo.html`, choose `courses/recursion-call-stack.json`, review the preview, and start the deck. Open `author.html` to preview/open/check/download the same course. The exact executed browser and native setup scripts are included as receiving evidence with their original native paths; they are not project runtime dependencies.

`SHA256SUMS.json` enumerates every file in this text packet except itself. `source-freeze.json` pins all three additions and all seven unchanged native consumers. `native-artifacts.json` pins retained screenshots, consumer pages and the original command-admission refusal outside the compact packet.
