# Adversarial game trees: pre-implementation public contract v1

Status: source-only proposed learner capability, not an existing-product correctness defect. No implementation, generated course, or native campaign existed when this contract was frozen. Claim and native placement require root coordination. No source outside the additive fence is authorized.

## Beneficiary and exact beforeimage

RecallWeave learners can import original JSON courses using the maintained deck loader and can use an ordinary dependency-free Node CLI to inspect a finite adversarial decision. Current canonical main is 698902f9c9c1d5c5023092b85b3632a7cb7a01ed, tree d6d3707b691850af7928299242631534cff89aa8. The current 2915 source-tree blobs contain no game-tree/minimax/alpha-beta module, tool, or lesson. Own complete current 98 open issue/PR records and independent complete 222 all-state issue/PR records identify no matching owner; nearby finite optimal-stopping, coalition-power, and knapsack scopes remain separate. No AGENTS, HALT, or CONTINUE tree path is present. This discovery is bounded to the observed repository and ownership state.

## Strict input and admission

API: export function analyzeGameTree(input) from src/adversarial-game-trees.mjs. It returns JSON-safe data or throws a TypeError for unsupported input. It must not mutate its input, including when the caller freezes every nested object/array. The supported value is an ordinary JSON document, not executable objects, getters, cyclic graphs, shared-node DAGs, or arbitrary JavaScript instances.

Top-level object has exactly rootPlayer and tree. rootPlayer is exactly "MAX" or "MIN". A terminal node has exactly id and utility. An internal node has exactly id and children. A node must not have both utility and children. No extra fields are silently ignored. Every id matches /^[A-Za-z][A-Za-z0-9_-]{0,31}$/ and is unique across the tree. Utility is a finite integer in [-100,100] and is always from MAX's perspective. Signed zero has ordinary zero utility. children is a dense array of 1 through 4 nodes, whose order is meaningful. The complete input has 1 through 31 nodes and depth at most 6, with root depth 0. A terminal root and leaves at unequal depths are supported. Internal roles alternate by depth, beginning with rootPlayer. Terminal nodes have no player turn. Sparse arrays, duplicate IDs, repeated object identities, nonordinary objects, cycles, strings-as-numbers, nonintegers, nonfinite values, excessive size/depth, and malformed mixed nodes refuse.

## Exact reference result

The return object's stable schema is:
{
  profile: "recallweave.adversarial-game-trees.v1",
  rootPlayer: "MAX" | "MIN",
  nodeCount: integer,
  leafCount: integer,
  maxDepth: integer,
  minimax: {
    value: integer,
    chosenChild: string | null,
    principalVariation: string[],
    nodes: [{ id: string, role: "MAX" | "MIN" | "TERMINAL",
              value: integer, chosenChild: string | null }]
  },
  alphaBeta: {
    value: integer,
    visitedNodeIds: string[],
    visitedLeafIds: string[],
    prunedNodeIds: string[],
    visitedNodeCount: integer,
    visitedLeafCount: integer,
    prunedNodeCount: integer,
    cutoffs: [{ nodeId: string, role: "MAX" | "MIN",
                bound: "lower" | "upper", boundValue: integer,
                alpha: integer, beta: integer,
                skippedChildIds: string[] }]
  }
}

minimax.nodes uses input preorder, including every node. Terminal values equal admitted utilities. MAX backs up the largest child value; MIN the smallest. When several children have equal optimal value, chosenChild is the first in declared order. Each terminal chosenChild is null. minimax.chosenChild is the root's chosenChild. principalVariation starts with the root ID and follows these exact reference choices to a terminal, so a terminal root has a one-ID principal variation. The reference is an exhaustive finite-tree calculation: it makes no claims about uncertain outcomes, opponent mistakes, probabilities, or larger unmodeled games.

## Separate alpha-beta traversal

Alpha-beta is a separate depth-first, declared-child-order search with an initially unbounded window. Its final root value must equal the exact minimax root value. visitedNodeIds and visitedLeafIds record actual entry order in this search only. prunedNodeIds lists every never-entered node in original input preorder. Counts are the lengths of those arrays, and visitedNodeCount + prunedNodeCount equals nodeCount. Full minimax reference work is deliberately excluded from these traversal counts. No wall-clock speedup or optimal ordering is claimed.

At a node, maintain the best examined child return so far and tighten alpha at MAX or beta at MIN. When alpha >= beta and there are remaining children, skip those remaining subtrees. Record one cutoff with the node's role, current window, best examined boundValue, and remaining child-root IDs in their original order. A MAX cutoff establishes a lower bound on that node's exact value; a MIN cutoff establishes an upper bound. These cutoff values must not be labelled exact; the separately computed minimax.nodes exposes the true reference values, which may differ. If the final child closes a window but no children remain, no cutoff is recorded. alpha and beta in a recorded actual cutoff are finite admitted-utility bounds. No per-node search return is otherwise presented as exact.

Tie policy belongs to the exact reference choices. Alpha-beta need not revisit a pruned equal branch to find all equally good actions. Reordering children can change visited/pruned counts and first-tie principal variation; it cannot change the minimax root value for the same game.

## Ordinary local CLI

Entry: node tools/adversarial-game-trees.mjs --tree PATH [--json], or node tools/adversarial-game-trees.mjs --stdin [--json]. --help is supported alone. Exactly one input selector is required. Duplicate/unknown flags, absent selector, both selectors, or missing path values refuse with exit 2 and a bounded diagnostic on stderr. No source/output file is written. No network, provider, subprocess, installer, browser, or dependency is used.

File input must be an ordinary nonsymlink regular file. Read at most 32768 bytes plus one overflow-detection byte; reject larger or malformed UTF-8/JSON inputs. Stdin has the same byte limit. Empty input and unsupported JSON values refuse. A valid analysis exits 0. With --json, stdout is exactly one JSON object following the API schema plus a final newline and stderr is empty. Without --json, stdout is a readable explanation naming the chosen move, exact minimax value, principal variation, separate traversal counts, and each cutoff as a lower/upper bound. It must explain that fewer inspected leaves is not a timing measurement. --help emits usage on stdout and exits 0. Refusals emit no successful analysis on stdout, leave input bytes unchanged, and create no output artifact.

## Course and source fence

Only new paths are proposed:
- src/adversarial-game-trees.mjs
- tools/adversarial-game-trees.mjs
- courses/adversarial-game-trees.json
- courses/adversarial-game-trees.md
- examples/adversarial-game-trees/worst-reply.json
- examples/adversarial-game-trees/reordered-replies.json
- examples/adversarial-game-trees/min-root-and-ties.json
- tests/adversarial-game-trees.test.mjs
- tests/adversarial-game-trees-cli.test.mjs
- uniquely prefixed receiving evidence after actual qualification.

The 12-question original course uses the unchanged maintained deck schema and loader, with four concepts: alternating choices, adversarial backup, sound pruning, and model limits. Every prompt is self-contained: the relevant full tree, root role, child order, utilities, and tie convention appear in that prompt whenever needed. Each question has exactly one correct answer and an explanation tied to its stated tree. The worked guide mirrors the exact prompts and identifies all invented examples as original. It explains utilities from MAX's perspective, negative values, unequal-depth terminals, terminal roots, a MIN root, first-tie behavior, misleading highest-leaf choice, exact backups, a cutoff bound that differs from the true value, and order-dependent pruning work. No exam question, figure, or prose is copied.

Source references for algorithmic background:
https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/resources/lecture-6-search-games-minimax-and-alpha-beta/
https://web.mit.edu/6.034/wwwbob/L4/node14.html

The original exercise text does not grant an additional reuse license to repository or linked material. The guide documents direct file import into the existing learner and ordinary CLI use. Catalog/offline pack registration remains owned and is not implied by adding a course file. No app, deck loader, catalog registry/builder, offline pack, existing course/module/test, dependency, package manifest, workflow, shared README, or peer evidence is changed.

## Qualification and resource boundary

Before implementation exposure, preserve this exact contract and independent literal oracle. Author qualification is bounded to actual Node module/CLI and unchanged deck-loader admission, with exact source/fixture/input hashes and a separately frozen command plan. Independent receiving must use its own asymmetric expectations rather than replay authored tests. Existing Node is a feasible route from recent qualified work, not automatic admission of a new fixture. Any native execution needs a separately authorized exclusive private child, fresh resource/identity checks, finite children and campaign, and bounded physical allocation. No browser run or installed-app adoption is claimed by source/module/CLI qualification.
