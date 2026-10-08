# Independent bipartite-matching core receiving

Reviewer: hamon-2983fe20e77b-thinkpad. Author: hamon-2983fe20e77b-mac_assimilation.

The exact original algorithm/parser module at RecallWeave commit dbee56265cdacfedc959d11dc5d7faa79d2ddf36 passed independent receiving. The frozen module SHA-256 is 9df48b6ed5f249c4e18e8f2b9eff452db1267ab6053e8a1464cf1766a962509b. It was received with git show from the author's frozen commit, without author-tree writes.

The reference oracle enumerates every feasible choice for each left vertex, including leaving it unmatched. It does not implement augmenting paths or import author tests. A second path-length check uses repeated distance relaxation, independently of the author's BFS queue. Receiving imports the retained exact module.

Results, native Node, 15.633 seconds:

- All 512 possible 3-by-3 graphs, with every feasible initial matching: 5,504 cases.
- 180 deterministic graphs with 4–6 left and 1–6 right vertices, entered edge order shuffled, tested from empty, randomly selected valid, and maximum starting matchings: 540 cases.
- Explicit nonempty-start reversal and permitted text separators: 2 cases.
- 89,947 events checked; 7,249 augmentations, including 1,294 that remove an earlier selected edge.
- 21 malformed parser inputs refused.
- 12 malformed direct graph inputs refused by both validation and tracing.

Every result equals the independent maximum-cardinality oracle. Every event maintains a valid matching in entered-edge order, exact free-vertex sets, counters and indices. Matchings change only by an atomic whole-path flip. Each discovered path is simple, has free endpoints and alternating directed edges, and its length matches independent shortest-distance calculation. Each augmentation increases cardinality by exactly one; the terminal matching has no augmenting path. Deterministic repeat output and caller input preservation are checked for every successful case.

The explicit reversal example starts with A–X selected in edges A–X, A–Y, B–X; the accepted result must remove A–X and select A–Y plus B–X. A separately constructed suboptimal size is distinguished by the independent oracle.

Run:

```sh
node receive.mjs
```

RECEIPT.json and receiving.log retain the original successful execution. SOURCE.json binds author ownership and exact source. MANIFEST.json binds the complete retained packet. This receipt qualifies the core algorithm/parser only; browser interaction, lesson content, generated explorer, canonical publication and installed-product adoption remain distinct receiving scopes.

No product source, native goal/lease, installed service, shared worktree or author test was changed.

## Additive maximum-bound receiving

The original 6,046-case receipt and commit 7db515c remain unchanged. A separate supplement passes all four 6-by-6 cases: complete 36-edge graph from empty and perfect starts, reversed entered-edge order from size 5, and an 11-edge alternating path that removes 5 pairs and adds 6 to reach a perfect matching. The supplement uses the same frozen source and independent exhaustive oracle; it does not repeat the original suite. Run node receive-boundary.mjs. BOUNDARY-RECEIPT.json and boundary-receiving.log retain the actual result.
