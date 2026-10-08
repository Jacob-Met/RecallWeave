# Independent convex hull model receiving

Exact product source: src/convex-hull.mjs, Git blob fc90571541ee46587d59903fc941d50b5c4a38f0, 5,564 UTF-8 bytes, SHA256 0b1f9edeb1d490f3b7961b6f24d7ca87bbbfcaaaa0e1a1bb7a962f226b6bffa9. The author already preserved it in detached tree 876bd6cf82fbf37352ffcb7bb9e56d7f39e17f68. No product source changed for this receiving.

## Actual outcome and boundary

Native Node v24.19.0 on Linux x64 ran the exact source through a data URL, with no import rewriting. The successful second execution ran from 2026-10-08T21:28:17.251Z through 21:28:17.429Z and exited 0. Seven groups, 1,131 API calls and 1,204,920 assertions passed. This is model execution; it does not qualify physical source-file loading, a browser, the UI, or GitHub Actions.

The mathematical oracle constructs oriented supporting edges using all-point half-plane and collinear endpoint projection checks, then walks the boundary. It does not implement the authored lower/upper chain algorithm. It checks the exact boundary, original first-occurrence identity, duplicate roles, area and degeneracies independently. Trace checks use local transition identities and a literal square trace.

Coverage includes 12 literal cases, all 512 subsets of a 3 by 3 lattice, 180 seeded 16-input samples with two permutations each (540 cases), frozen inputs and repetition, 26 malformed array inputs, JSON and the 4,096-byte limit, and complete serialized records with valid/invalid selected steps. Group case counts describe their named controls; the authoritative total API invocation count is 1,131.

## Freeze and correction history

Receiver v1 was frozen from the contract before implementation exposure: 12,305 bytes, SHA256 98c85836972d6ecfef442ff0ac9c577c86d4a99900760a133c393e796fe95fcc. A native syntax/import-only check passed without calling any model.

The first model execution, 21:27:22.624Z through 21:27:22.631Z, stopped after four API calls with exit 1. Its expected unique[] array used first-occurrence order, an ordering the supplied field contract had not explicitly specified. The actual model sorts unique representatives lexicographically while correctly preserving the representative IDs. This was a receiver expectation error, not a geometric finding.

Receiver v2 changes only the expected unique[] field to the already computed lexicographic array. Its independent geometry, cases and mathematical checks are unchanged. V2 was frozen after inspecting that source: 12,312 bytes, SHA256 71f1cc4a218382f65c8e35568a95fd1751e6ef1bd38246bd1f227df11ed59cb4. The exact unchanged product passed v2.

The first driver included data URLs in its error stack. The command tool reported 12,832 original output tokens and truncated the returned stdout. actual-v1-tool-result.json preserves exactly the returned tool object, including its explicit truncation notice and metadata. It is not a complete raw stdout record; the omitted bytes cannot be recovered from this packet. The visible result contains the assertion, actual/expected arrays, last input and source pins.

Driver v2 replaces data-URL bodies only in error-stack display with a named marker to bound diagnostics. It changes no API calls or assertions. actual-v2.json preserves its complete successful stdout exactly, including the final LF. process-receipt.json records the actual tool result and source/receiver hashes. Both drivers, receivers, freezes and the syntax receipt are retained separately.

No native host probes, filesystem allocation, Actions, commit, ref, PR or main update were used for this packet. Its detached tree is immutable readable custody; no branch anchoring or indefinite retention is asserted.
