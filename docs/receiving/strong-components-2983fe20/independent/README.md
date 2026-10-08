# Independent receiving: RecallWeave strongly connected components

**Verdict: PASS, 11 / 11 independent actual-browser groups.**

Reviewer: `hamon-2983fe20e77b-mac_assimilation`.
Implementation owner: `hamon-2983fe20e77b-estate_production`.
Receiving source: `e39f27d90239b790ae99005cbc8ec48e6809f55d`.
Runtime source: `a93e7861b4febc2b991276bddec2fa0afcb6fbd5`.
Base: `3a3704c352f8a12e20c208445c2c5ade412b365d`.

This independently authored receiver uses the actual Chromium UI, downloaded
files and unchanged existing RecallWeave importer. It imports neither author
tests nor the new algorithm module. Its graph expectations were derived by the
reviewer. The author’s exhaustive graph oracle is a separate qualification.

## What the run proved

The six-node graph uses `B b C1 constructor N0 N00`, with eight declared edges.
It includes distinct case-sensitive labels, a prototype-like label, a self-loop,
two nontrivial components, and two direct witnesses for one condensation edge.
The expected component discovery order is:

| Component | Members |
| --- | --- |
| C1 | constructor |
| C2 | b |
| C3 | B, C1 |
| C4 | N0, N00 |

The first-pass finish order is N00, N0, C1, B, b, constructor. Reversing that list
produces the actual second-pass root order. The selected transpose event is
zero-based index 37: B → b; b is already assigned. At that event, the original
pass has inspected all eight edges, and the transpose has inspected two.

The condensation has exactly C2 → C3 and C3 → C4. The first edge is witnessed by
b → B. The second retains both C1 → N0 and B → N00. The receiver checks that
the graph does not add a transitive C2 → C4 edge. The user-authored label C1
remains distinct from the component called C1 and is assigned to component C3.

Additional groups verify the finished call leaves the active path, all arrows
reverse in the displayed transpose, fresh second-pass marks are present, edits
retire trace exports, invalid graphs cannot revive stale traces, fractional
predictions are refused without moving the selected event, and twelve
maximum-length labels remain exactly identified at a 375-pixel viewport.

The actual downloaded JSON and Markdown match their authored byte digests.
The downloaded algorithm trace contains the full event sequence, exact entered
graph, component partition, original-edge witnesses and selected event index.

The downloaded course was selected using Chromium’s real file-input mechanism
in the existing direct-file `demo.html`. Preview preserved an already started
bundled lesson. Explicit Start this deck began the downloaded course. All twelve
distinct questions completed, with one deliberately wrong first answer and
eleven correct answers; every explanation and transfer prompt appeared. The
finished learner recorded eleven correct and one needs-review entry. Importing
the algorithm trace as a lesson then failed without changing that result.

No page HTTP(S) request or JavaScript exception was observed. All nine consumed
source-file hashes and the clean source checkout were unchanged after execution.
The fresh test browser was closed after the run. Native RDC duration: 58.66s.

## Evidence and reproduction

- `receive_scc.mjs`: independently authored receiver.
- `evidence/native-r1/receipt.json`: complete per-group assertions and source pins.
- `evidence/native-r1/downloads/`: actual browser downloads.
- `evidence/native-r1/*.png`: six inspected screenshots.
- `VISUAL-AND-CONTENT-REVIEW.md`: editorial and visual findings.
- `SOURCE.json`: native Git-bundle custody and source pins.
- `MANIFEST.json`: exact portable receiving-packet digests.

Clone the complete source bundle at the recorded revision into
`.runtime/source`, then run `node receive_scc.mjs --run-id another-unique-run`.
Node 22 with built-in WebSocket and `/snap/bin/chromium` were used. The receiver
requires a fresh run id and a clean, exact source checkout. It creates only its
own browser profile, downloads, receipts and screenshots.

This result qualifies the tested source and user paths. The current-main merge,
source publication and any later composition remain implementation-owner/root
obligations; a changed source requires an appropriate new receiving decision.
