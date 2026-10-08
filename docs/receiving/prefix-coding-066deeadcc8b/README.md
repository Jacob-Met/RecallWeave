# Prefix-coding explorer receiving

## Contribution and present state

Issue [#67](https://github.com/Jacob-Met/RecallWeave/issues/67) adds a self-contained offline Huffman explorer, an original twelve-question lesson and worked guide. The explorer follows the priority queue and forest through every merge, displays the complete tree and codebook, explains exact weighted payload costs, decodes strict bit streams, and downloads the current worked example and the exact lesson.

The accepted production sources are frozen. The original independent packet is fully attached. Current-learner and author custody were accepted and cold-verified on the native Mac before it went offline; their receipts, manifests, verifiers and preparation history are attached, but their two binary archives are **pending transfer**. This source contribution remains a **draft, not integrated or deployed**. Do not treat a missing archive as a passing portable verification.

The pending artifacts are:

| Destination | Bytes | SHA-256 |
| --- | ---: | --- |
| current-consumer/native-packet.tar.xz | 1,417,284 | cfea306e9bc4933c90be3ae28e7dde148127f1569e0ffb22cbbc1ac312917e58 |
| author/native-packet.tar.xz | 1,375,888 | 41c4975c4936a6e5126dcc533d8c94f0ae9e4a42858cfa9fe5eb7ed3efa2357a |

Their native locations are `/Users/me/recall-prefix-current-review-066deeadcc8b-frozen/native-packet.tar.xz` and `/Users/me/recall-prefix-author-review-066deeadcc8b/native-packet.tar.xz`. The device is the already-authorized Mac `0e3d582f-e25b-44b2-8418-9639fc4e4e33`; device-health reported it offline. Timed-out operations without a process receipt remain unconfirmed.

## Evidence and attribution

- [Original independent receiving](independent/README.md) contains the pre-candidate model oracle and actual browser observations. It includes the complete archive, receipt, manifest and portable verifier.
- [Current learner supplement](current-consumer/README.md) records the unchanged downloaded lesson in the actual current learner at `aa057fe7eaf3a152ae44c8e3816f76adf20a11f7`, including its twelve runtime modules. Its metadata is attached; archive transfer is pending.
- [Author custody](author/README.md) binds all 117 original author input files, actual runs and negative attempts, both generated HTML versions, the accepted ten-file freeze, and the separate later CI parity test. Its metadata is attached; archive transfer is pending.
- [Publication manifest](publication.json) records the exact source and receiving Git objects, native SHA-256 values, the current canonical parent, and the attachment state of each evidence file.

The root authored the model, explorer, builder and browser receiving tool. The product worker authored the course, guide and course tests. The research worker independently checked arithmetic, original lesson content, actual browser behavior, the current learner composition and the author packet custody. Native and independent execution results are separate.

## Actual verification

The independent model receiver exercised 1,101 cohorts, including all 1,089 count combinations for two through six symbols with counts one through three, plus Unicode, ties, default and limit cases. Its separate full binary partition oracle checked optimal weighted cost, exact exported JSON and decoding; 6,779 checks passed per model version. The first version failed three sparse-array admission cases. The two own-index guards in the accepted model reject all three with unchanged dense results. An intentionally nonoptimal code was rejected by the oracle.

The twelve course answers were independently solved with answer keys masked. Author course tests passed eight methods. Original learner receiving completed twelve first answers (nine correct, three wrong), three practice attempts and two actual notes downloads. The independent current-learner supplement passed 131 checks on the same downloaded course and preserved first-pass results through practice.

The author's first 375-pixel explorer run found a real horizontal-overflow defect. Adding `.layout>*{min-width:0}` to the template fixed that defect; generated HTML changed only with that rule. The accepted author browser run passed eight groups with five completed downloads and seven screenshots. The focused native test gate passed 44 methods, and the later generated-page CI parity guard separately passed one method.

Independent explorer receiving completed eleven cohorts and twelve actual downloads across its original run and a bounded supplement. Its first observer attempted to click Restart after Previous had already reached the initial state; the disabled button was correct. Only the unfinished two-symbol cohort was continued after fixing that observer step. The original two observer failures remain preserved. Saved-state recomputation checked 116 browser states, 654 SVG nodes and 364 edges; intentionally wrong edges and tied-label swaps were refused. No completed broad cohort was silently rerun or relabelled.

The browser author’s initial filename assumption for the dated notes download was corrected before that learner section ran. It is an observer preparation correction, not a product failure. No raw author v1 model gate log exists, and none is claimed.

## Source and operational boundaries

The original source parent was `6f920f177ae90a09958146d41612a0e83f52702f`. The current learner supplement qualified `aa057fe7eaf3a152ae44c8e3816f76adf20a11f7`, actual tree `82c88ef5729646ddad2c6d6917f82dea89a5e35e`. This publication is composed against `b1b8a0b0e304694040e0965ad0eff2e8cab306a2`, actual tree `9aa46c55a730e12be8e95ef9ef96d56f76b41049`. Existing learner runtime files, the generated learner, and its generator are unchanged between the receiving parent and this publication parent. The README addition preserves every existing byte; catalog ownership and other course contributions remain intact.

Run `node --test tests/prefix-coding*.test.mjs` for the contribution gates. The existing repository workflow runs `node --test tests/*.test.mjs`, including the new exact generated-page check, and separately reconstructs `demo.html`. These commands are instructions; their hosted results must be recorded after execution.

The model admits two to eight distinct literal labels and positive bounded integer counts, uses a documented deterministic tie rule, and treats all costs as payload bits over the stated alphabet. It excludes codebook and framing costs and does not claim measured file compression or demonstrated learning effectiveness. The explorer works directly from a local file and makes no service calls. The lesson uses the existing learner without changing its archive, review or trace systems.
