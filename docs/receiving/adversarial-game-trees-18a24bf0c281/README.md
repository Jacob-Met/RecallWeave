# Adversarial game trees: exact source draft and receiving boundary

The [standalone guide](../../../courses/adversarial-game-trees.md) explains adversarial choices, full minimax, deterministic ties and principal variations, alpha-beta pruning, cutoff bounds and move ordering. Its 12 questions, worked answers and transfer prompts were reviewed by the author and root. The matching checked-deck JSON, dependency-free JavaScript module, ordinary CLI, three examples and tests are published here as a **native-unqualified draft**.

This cohort owns [issue #224](https://github.com/Jacob-Met/RecallWeave/issues/224). The nine new source files total **60,768 bytes**. They are additions on current main6cd554c3be8d1094077e0a20c3c652e354c71795, preserving all2,930 existing file leaves and modes, including the15 retries/idempotency additions received since the original source freeze at698902f9. No catalog, learner, deck loader, shared source or workflow file changes.

## Implemented interface

The pure module exports analyzeGameTree({rootPlayer,tree}). Root player is MAX or MIN. Input is a finite ordinary JSON tree with dense one-to-four-child arrays, unique short ASCII IDs, one-to-31 nodes, depth at most six, and integer leaf utilities from -100 through100. The module validates and copies the whole input before evaluating it. Full minimax supplies exact reference values and first-child tie choices; a separate alpha-beta traversal records only its actual search work, pruned IDs and appropriate cutoff bounds. Reference work is not counted as pruning search. A last-child bound crossing does not invent a skipped child or a cutoff.

The CLI reads one capped, strict-UTF-8 regular nonsymlink JSON file, rejects an overflow byte and malformed/BOM input, checks opened-file identity, and emits a readable explanation or one JSON object. It performs no network, dependency installation or file publication. Its Node import, CLI behavior and filesystem contract have not yet been received natively.

The teaching guide is readable on its own. Its command lines and displayed calculations are interface examples and hand-derived explanations, not captured Node output.

## Actual verification

Exactly **two** separately frozen file-free V8 API evaluations were performed. The exact production source was transformed only by removing its single seven-byte export keyword for a strict in-memory wrapper. The inverse reconstructed the production module exactly. Inputs were deeply frozen; complete result objects were compared with independently hand-declared literals through strict finite JSON canonicalization, preserving array order and refusing unsupported values.

| Separate evaluation | Observed full-object comparison |
|---|---|
| Nine-node primary literal | Exact match: root3 / Harbor, five leaves visited, no pruning or cutoff. |
| Ten-node pruning literal | Exact match: root3 / Harbor, five of six leaves visited, abyss pruned; Cliff's MIN cutoff upper bound is -4 while its full exact value is -9. |

The complete [freeze](v8-two-literal-freeze.json) and [actual result](v8-two-literal-result.json) are retained. The result is18,861bytes/SHA256b970d38cd035b0b70ba68922f5c40cbbb004c1bf99a618a0824f0228b20cf051. The reported2ms is only the functions-runtime interval; it is not a native benchmark. There was no Node, CLI, filesystem, course import, learner, catalog or browser invocation in this phase.

The [root content review](root-content-review.json) records reading the complete guide, all12 answers and transfer prompts, and mechanically binding their prompts/options/answers/explanations to the exact course JSON. Zero-based correct-answer indices are [1,2,1,3,0,2,1,2,0,1,3,2]. This is a content review, not an assessment of a human learner or teaching efficacy.

## Frozen native receiving remains pending

The [author contract](author-contract.md), [independent acceptance](independent-acceptance.md), [independent literals](independent-literals.json), [interface literals](independent-interface.json), [independent driver](independent-driver.mjs) and [driver freeze](independent-driver-freeze.json) remain exact. The full independent driver contains59 API and20 CLI planned checks and is **UNRUN**. Author Node tests, CLI tests, all refusal and filesystem gates, course loader and direct learner receiving are also UNRUN. The two V8 observations neither replace these gates nor inflate their counts.

Our separate native resource admission refused before any new product placement or launch. New phases on that existing Snap parent remain held. Existing native controllers and the original source packet are preserved in [private exact custody](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6077116767); this public source receipt is not a resource release.

Guide V2 is the only source successor: three qualification labels changed, +251bytes, while every mathematical section and the other eight files remain exact. [Exact replacements and inverse](guide-v1-v2-replacements.json) preserve V1. The retained Linux controllers and original request still bind guide V1; any future whole-source receiving must explicitly bind this published V2 guide. Do not call an old-guide run receipt for the final source set.

A matching existing Node/ordinary-learner owner can adopt this exact draft through an explicitly current admitted route. Bind the selected source, executable and unchanged checked-deck loader, then receive ordinary CLI output and this exact course through the real existing learner file input, visible preview and explicit Start. Preserve actual output and course/notes identities. The historical #206 receiving campaign does not grant a new runtime window. The frozen independent driver uses actual symlink creation and SIGKILL; the Linux outer controller uses cgroup ancestry. A Windows recipient must explicitly map supported host semantics or label a narrower receiving scope and omitted groups.

## Publication and ownership

[manifest.json](manifest.json) binds all nine source paths and ten exact evidence files. This directory also includes its own root README, manifest and [workflow preflight](workflow-preflight.json). All22 additions are within the owned source and receiving scope; all unrelated inherited leaves are exact.

All five complete current workflow definitions were read and hash-bound. Every push trigger selects main only; other triggers are pull_request. No create, issue/comment, schedule or manual-dispatch subscriber exists. Creating this non-main draft branch matches no configured event; a PR or main update would select tests/catalog/offline gates and remains held by the no-Actions directive. No PR, merge or installed adoption is claimed. The acceptance comment must bind the actual sole-parent commit, complete tree, new ref and all-event exact-head Actions readback.

Catalog registration, offline composition and shared learner ownership remain with their existing owners. This draft supplies concrete source and receiving inputs; native adoption is the next outcome.
