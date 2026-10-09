# Exact source recovery for the RecallFirst layout episode

This addendum makes three historical text artifacts available as exact bytes: the original HTML, its original stylesheet and the long-input fixture used by browser group G6. They were recovered from the published final source and complete original fixture generators. Every recovered file matches the historical byte count and SHA-256; both original source files also match their recorded Git blob identities.

Recovery was performed on 2026-10-09 by the original source cohort, estate-f3d1a0c556df. This is source and fixture custody. The original product, browser, tests and research analyzer were not run during recovery.

## Artifacts

| File | Historical bytes | SHA-256 |
|---|---:|---|
| [Original stylesheet](candidate-v1/styles.css) | 3,722 | `b3c4b23983f73a1e71c0337da4997e74286bd2ba91a2743c53221cf3e8780ab0` |
| [Original HTML](candidate-v1/recall-first.html) | 29,574 | `0e65d874074bb7525d3193193db2cb3495f09762ff01a6318efd178250e9170e` |
| [G6 long-input fixture](fixtures/long-unbroken-concept80.json) | 14,508 | `42430128d09d69a58e2fc9906fc196b5c63d816ca68ace6b8385fbd447af081d` |

The HTML and stylesheet are the historical version that failed the recorded narrow-screen width criterion. The current product source remains unchanged. The fixture has a terminal CRLF; changing it to LF changes its historical identity. [recovery.json](recovery.json) retains the complete derivations, source pins, reviews and remaining custody limits.

## Original HTML and stylesheet

The [original freeze](../author-evidence/CANDIDATE_FREEZE.json) binds the original HTML and CSS, and the [later freeze](../author-evidence/CANDIDATE_FREEZE_v2.json) binds the corrected versions. Their Git identities are `78d32ae90c3b5223f7b672f825c3bb765ac4a121` and `2eb09c8b343d2719e59970fd223303f97a5d7062`.

The published final [stylesheet](https://github.com/Jacob-Met/RecallWeave/blob/7757dc13f1bdc38edfbf329bc7575d8b683104ee/recall-first/styles.css), blob `2f608d60cb7ce2fd7e0762cf9465a8bffc5b9816`, is ASCII. Its first 3,722 bytes reproduce the original stylesheet. The remaining 60 bytes are exactly this rule and its final LF:

```css
.preview,.prompt-card,.course-title{overflow-wrap:anywhere}
```

The published final [HTML](https://github.com/Jacob-Met/RecallWeave/blob/7757dc13f1bdc38edfbf329bc7575d8b683104ee/recall-first.html), blob `b3d2b4dc5ca74ad130b56e53407a24bbfbd42ab6`, contains one style element whose entire body equals the final stylesheet. Replacing that body with the recovered original stylesheet reproduces the frozen original HTML. Removing the same unique 60-byte rule gives the identical result. Both forward transformations return the published finals byte for byte.

Root and two independent reviewers reproduced these identity checks. The initial Git fetches for both freeze-listed original blob IDs returned 404/NOT_FOUND. Recovery does not change that retrieval history: these original bytes were reconstructed and then republished, rather than retrieved successfully from those initial requests. This exact source comparison now supports the previously reported stylesheet-only HTML change in the [historical intake](../independent-browser/candidate-v2-intake.json).

## Exact G6 fixture

The complete literal in [freeze-oracles.py](../independent-browser/freeze-oracles.py) specifies every original field, value and field order. Compact JSON plus LF reproduces the original 14,355-byte `long-unbroken.json` and its manifest SHA-256. [add-concept-oracle.py](../independent-browser/add-concept-oracle.py) replaces the two four-character `edge` values with 80 `K` characters and writes through the recorded Windows text path.

Transcribing those exact assignments and preserving compact JSON plus terminal CRLF reproduces all 14,508 target bytes. The two replacements add 152 bytes; the LF-to-CRLF change adds one. The resulting full SHA-256 matches both the [separate concept addendum](../independent-browser/blind-concept-addendum.json) and [full native manifest](../independent-browser/FULL_NATIVE_MANIFEST.json). The literal intentionally has no `format` field. Root and the independent fixture reviewer each reproduced both the original and target hashes without executing the Python generators.

The concept fixture belongs to its separate additive freeze. The earlier blind-freeze hash alone does not bind it. Recovery provides exact input bytes; it does not replay native fixture admission or browser use.

## Receiving boundaries

The existing [AIResearch study](https://github.com/Jacob-Met/AIResearch/commit/91822a65b266c8e802d80b977a3b1d2cf605bb98) received 12 original text records totaling 73,593 bytes. Its fixed corpus, analysis and validation remain intact. This addendum is held in the original product's receiving archive. Its owner can separately receive the additional bytes under the research repository's sanitization, per-file provenance and validation requirements; the earlier validation does not cover a future supplement.

The original author/state checks remain 8/8 each. The browser record remains G1 interrupted during capture, G2–G5 passed and G6 failed its width assertion. The later original-source G1 and corrected-source G6 checks remain separate targeted follow-ups. There was no final all-six-group rerun. Source recovery adds no execution, timing, causal, prevalence, learning-benefit or general accessibility result.

The G1-only [follow-up driver](../independent-browser/browser-receive-bundled-followup.py) is already published as `44ff1bafbde0484288d339cf3260f1071ce6b027`; its 15,785 bytes and SHA-256 `400d81cd02f113f23f67018e61f13a795564631312a1a40f4ea8c1c6aa828b68` can be received separately. It was outside the study's original twelve records.

The six G6 screenshots remain represented only by their existing native-manifest path, size and SHA-256 records in this recovery. No screenshot bytes were retrieved, recreated or visually inspected. No native filesystem was accessed. No source branch, tag, PR, canonical study registry, installed product or Actions run is changed by this detached addendum. An unattached commit does not provide a branch or tag retention guarantee.
