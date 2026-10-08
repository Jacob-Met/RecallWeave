# Strongly connected components: author receiving

## Source and product result

Runtime source is commit a93e7861b4febc2b991276bddec2fa0afcb6fbd5 on base 3a3704c352f8a12e20c208445c2c5ade412b365d. The following packet is a documentation-only child of that source. The manifest pins every changed source file and the existing importer files exercised by the installed browser.

The contribution adds an original twelve-question course, a companion guide, and a standalone offline explorer. The explorer exposes both DFS passes, finishing and root order, the reversed edges, immutable intermediate states, the final mutually reachable groups, and the original edge witnesses behind the condensation graph. It admits at most twelve named nodes and thirty-six unique directed edges. Self-loops are allowed. Edited or invalid input retires any earlier trace before another result can be used.

## Author qualification

- The final native Node run passed all sixteen tests at the exact source commit. The independent reachability oracle in the core tests checks all **4,096 four-node directed graphs without self-loops**. Separate controls cover self-loops, isolated nodes, bounds, invalid input, deterministic order, immutable snapshots, and two examinations per edge. This is not a claim to enumerate all 65,536 four-node directed graphs when self-loops are included.
- Course tests use the unchanged deck parser and serialization contract, compute the worked answers, compare the embedded course and guide bytes, and refuse stale output or malformed course generation.
- Installed Chromium 153 on the native ThinkPad passed ten browser receiving groups. The raw receipt records the browser build, exact hashes, action mechanisms, actual downloads, screenshots, and cleanup.
- Browser receiving followed both DFS passes and real reversed SVG arrows; navigated immutable snapshots; checked prediction without moving the trace; retired stale output after edits; refused an unknown endpoint; recovered with different examples; and admitted the twelve-node/thirty-six-edge boundary at a 390-pixel viewport.
- The three real download types match the committed course/guide or full trace. A single injected Blob-URL preparation error allowed a later identical actual trace download. The downloaded course was selected in the unchanged existing learner, previewed without replacing an active session, canceled safely, then explicitly started and completed through all twelve authored questions.
- The two offline pages emitted no JavaScript exceptions or HTTP requests in this run. Reload restored the original graph, browser storage stayed empty, source bytes stayed unchanged, and the owned temporary browser profile was removed after a zero exit.

This is author qualification. Independent receiving, fresh hosted PR/head/base checks, and exact-head CI remain integration gates. No deployment or resident-worker lease is claimed.

## Visual inspection

The five retained captures were opened and inspected after the run. The desktop transpose capture displays each reversed edge alongside original editable input and the DFS state. The condensation capture displays group membership and original cross-group edge witnesses. At 390 pixels the controls wrap and the page stays within the viewport; the twelve-node boundary graph is dense, with the adjacent text and state table retaining the precise labels and state. The compact three-component result remains readable, and the existing learner shows the completed twelve-question course and its review panel. This inspection does not claim physical touch, assistive-technology, or printer receiving.

## Reproduction

From the repository root on Node 22 or later:

    node --test tests/strongly-connected-components.test.mjs tests/strongly-connected-components-course.test.mjs
    node tools/build-strongly-connected-components.mjs --check
    node tools/check_strongly_connected_components_browser.mjs --browser /path/to/chromium --output /outside/the/repository/receiving-output

The browser checker uses native Node WebSocket and an installed Chromium browser in its own temporary profile. Its output directory must be new. The existing learner entrypoint is demo.html; the explorer entrypoint is courses/strongly-connected-components-explorer.html. Raw receipts retain their original native paths; the files in this packet are the durable copies.
