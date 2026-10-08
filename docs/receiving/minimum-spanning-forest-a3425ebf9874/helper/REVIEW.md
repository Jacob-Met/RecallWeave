# Independent receiving: minimum-spanning-forest helper

Status: ACCEPT for the frozen bounded helper contract. This review does not qualify the unfinished explorer UI, course prose, build integration, or deployment.

## Source and independence

The received production module is `src/minimum-spanning-forest.mjs`, 4,655 bytes, SHA256 `7073e2193bf44724a082a05a8b7684cb173ad0d62808fab8b095fea60dff5df1`, Git blob `1a2f07eabac905adc70fbc0f8f36471a281a8165`. The producer froze v1 at 17:37:31 UTC on 2026-10-08. Root froze both independent controls at 17:26:51.969595 UTC before any production implementation was authored or received. The producer confirmed that chronology and did not receive the oracle source before freezing its helper.

The independent oracle recomputes connectivity with adjacency traversal rather than the implementation's disjoint-set structure. It independently enumerates rank-sized edge subsets to establish minimum total weight while spanning every component of the input graph. Trace checks inspect every edge decision, including rejections after a spanning tree is already complete. The original oracle self-check has ten hand optima, one fully specified trace, and ten deliberately invalid trace controls. Those are checker sanity checks; no failing production baseline is claimed for this new module.

## Actual first execution

The unchanged candidate passed the original native-v1 run on Node v22.22.1 on hamon-thinkpad, starting 2026-10-08T17:40:05.289Z and completing at 17:40:12.187Z. The surrounding command exited 0, produced no stderr, and verified the candidate plus both control source hashes unchanged after execution.

- 4,165 exhaustive simple graphs on one through four vertices, varying edge absence, negative / zero / positive weights, input order, and edge orientation.
- 96 deterministic larger graphs on five through eight vertices.
- 10 hand cases, including isolates, disconnected graphs, required positive edges, negative cycles, and the complete eight-vertex equal-negative-weight graph.
- 23,465 enumerated rank-sized subsets across the actual graph cases.
- 28 helper refusal cases.
- 7 accepted parser cases and 32 refused parser cases.
- One caller-detachment and one already-frozen-caller witness.

The helper's exact numeric trace, stable weight/index ordering, before/after component partitions, cumulative edge IDs and totals, forest rank, full edge-decision count, input preservation, and deeply frozen detached output all matched the independent checks.

The transient process session was absent on later polling. Root read the existing saved command receipt, driver receipt, stdout, stderr, and candidate copy at 17:46:56 UTC. This was recovery of the original completed result; no second execution or reconstructed pass was substituted.

## Source review

After receiving the first result, root read the frozen production module. The graph admission is bounded to 1–8 vertices, rejects sparse arrays, invalid endpoints and weights, loops, and repeated unordered endpoint pairs. It copies only numeric fields and never freezes or mutates caller objects, including ignored extra values. The weight-then-original-index ordering is explicit. Each accepted edge joins distinct current components, and all input edges receive a decision. Component snapshots include isolates and have deterministic vertex and group order.

The parser's count syntax, one-edge-per-line grammar, case-insensitive vertex labels, integer range admission, whitespace boundary, and repeated-edge checks agree with the frozen contract. No helper change is requested.

## Evidence

Original files under this review root remain unchanged. `native-v1/receipt.json` SHA256 is `59dd5ff11f1979425e547904f39e83e80c255e4ed88c7e3e5149734342d458ad`; `native-v1/command-receipt.json` SHA256 is `dcb2d5e42df859128aca92c5e7ac09b07977276a700857c956fefea1eb0779bf`. The sibling manifest maps every received source and receipt byte. A future published review must bind this result to the exact public helper blob and separately account for source composition.
