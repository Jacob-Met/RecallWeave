# Adversarial game trees: best replies, minimax and sound pruning

This is an original 12-question lesson and a small executable model for choices against an opponent's best reply. All terminal utilities are measured from MAX's perspective. MAX prefers larger values, MIN prefers smaller values, and internal turns alternate. Outcomes are explicit: no probability, hidden information, horizon estimate, or simulated real-world strategy is inferred.

This Markdown is a standalone teaching draft: the explanations, worked trees and all 12 questions can be read without running software. The worked values and traversal counts below are hand-derived expectations, not captured CLI output. The companion JSON deck is prepared for the existing RecallWeave deck-file picker, but this deck's import and learner flow have not yet been received. It is not registered in the separately owned course catalog or offline pack, and no installed adoption is claimed.

## Companion command interface (native qualification pending)

From the repository root, using Node 20 or later:

```sh
node tools/adversarial-game-trees.mjs --tree examples/adversarial-game-trees/worst-reply.json
node tools/adversarial-game-trees.mjs --tree examples/adversarial-game-trees/reordered-replies.json --json
node tools/adversarial-game-trees.mjs --stdin --json < examples/adversarial-game-trees/min-root-and-ties.json
node tools/adversarial-game-trees.mjs --help
```

The program reads one file or stdin and writes only stdout/stderr. It uses no network or dependency. JSON output is an exact reference plus a separate alpha-beta traversal; readable output labels cutoff bounds explicitly. A valid input exits 0. Unsupported input or CLI syntax exits 2 without a successful analysis or output file. These are interface examples, not records of executed commands. Native Node, CLI, filesystem and deck-loader qualification remain pending; they are not required to read this lesson.

Input is exactly `{"rootPlayer":"MAX"|"MIN","tree":node}`. A terminal node has `id` and `utility`; an internal node has `id` and `children`. IDs begin with an ASCII letter and contain at most 32 ASCII letters/digits/underscores/hyphens. IDs are unique. Utilities are integers from −100 through 100. Children keep their given order; there are 1–4 per internal node. The whole tree has at most 31 nodes and depth 6 (root depth 0). A terminal root and unequal terminal depths are supported. Extra fields, mixed terminal/internal nodes, shared/cyclic objects, nonintegers, and unsupported values refuse. File/stdin input is strict UTF-8 JSON, at most 32,768 bytes; a file must be an ordinary nonsymlink regular file.

## Three original worked inputs

In `worst-reply.json`, MAX root R lists Oak before Pine. Oak is MIN with leaves O4 = 4 then O7 = 7; Pine is MIN with P1 = 1 then Pm6 = −6. Exact values are Oak = 4, Pine = −6 and R = 4. The chosen move is Oak and the principal variation is R → Oak → O4. The full reference includes all seven nodes and four leaves.

The separate alpha-beta traversal enters R, Oak, O4, O7, Pine and P1. It skips Pm6. At Pine, alpha = 4 and beta = 1 close the window; the returned 1 is an **upper bound**, not Pine's exact −6. The traversal visits six nodes and three leaves. Its exact final root value remains 4.

In `reordered-replies.json`, only the root's child order changes: Pine is visited first. The exact choices and root value remain the same, but the separate search now visits all seven nodes and four leaves. This is an ordering effect on traversal work, not a timing benchmark.

In `min-root-and-ties.json`, MIN root R lists MAX First (Fm2 = −2, F0 = 0) before MAX Second (S0 = 0, Sm3 = −3). Both children have exact value 0, so the first-child tie policy chooses First. The principal variation is R → First → F0. The separate search sees Second's S0 = 0 with beta = 0 and skips Sm3; that return is a lower bound of 0. Bounds may equal the reference value, but a cutoff alone is not a proof that they do.

## Reading the result

`minimax.nodes` is the complete exact reference, in input preorder. Each internal node chooses the first optimal child; a terminal chooses none. `minimax.principalVariation` follows these deterministic exact choices, starting at the root.

`alphaBeta.value` is the exact root result from a separate full-window search. Its visited node/leaf arrays use actual traversal order; its pruned array uses the original preorder of every never-entered node. The counts exclude the reference calculation. A MAX cutoff reports a lower bound and a MIN cutoff reports an upper bound. Cutoffs are recorded only when at least one child subtree remains unvisited. The tool does not claim that every search return is exact or that the two-pass teaching calculation is faster than exhaustive minimax alone.

## Questions, answers and transfer

Every prompt below is also present verbatim in the JSON deck. Each tree needed for a question is stated in that question; card order is not required.

### 1. agt-perspective

A MIN root R chooses between terminal A with utility −3 and terminal B with utility 5. Every utility is measured from MAX’s perspective. Which move and value does minimax assign to R?

1. Choose B; R has value 5 because each player maximizes the displayed utility
2. Choose A; R has value −3 because MIN minimizes MAX’s utility
3. Choose A; R has value 3 after changing the utility’s sign
4. Choose neither; negative terminal utilities are unsupported

**Answer: 2.** MIN chooses the smaller MAX-perspective utility: −3 rather than 5. The perspective does not flip when the player changes. R therefore chooses A and has value −3; no sign conversion is applied.

**Transfer:** If R were MAX with the same two terminal children, which move would it choose?

### 2. agt-alternation

The entire tree is a chain R → A → B → T, where T is terminal with utility 4 and R is MAX. Internal roles alternate after every edge. What roles do A and B have?

1. A is MAX and B is MIN
2. A and B are both MIN
3. A is MIN and B is MAX
4. A and B are both MAX

**Answer: 3.** R is at depth 0 and is MAX. A at depth 1 is MIN; B at depth 2 is MAX. T is a terminal outcome, not another player turn. Every internal value is 4 in this one-choice chain.

**Transfer:** Add one internal node C between B and terminal T. What role does C have?

### 3. agt-unequal-depth

MAX root R has two children: terminal L with utility 2, and internal M whose terminal children are U with utility 4 and V with utility 1. Roles alternate, so M is MIN. What does R choose?

1. M, because its best-looking leaf has utility 4
2. L, with value 2; M’s exact value is 1
3. M, with value 5 after adding its leaves
4. The tree is invalid because its terminal leaves have unequal depths

**Answer: 2.** M is MIN, so it backs up min(4, 1) = 1. R compares its terminal option 2 with M’s value 1 and chooses L. Terminal outcomes may occur at different depths in the explicit finite tree.

**Transfer:** Change V’s utility from 1 to 3. Which root option becomes better?

### 4. agt-highest-leaf

MAX root R chooses Maple or Cedar. Both are MIN nodes. Maple’s terminal replies have utilities 10 and −5; Cedar’s have utilities 3 and 6. Which root decision is justified by an opponent who minimizes MAX’s utility?

1. Maple, because 10 is the largest leaf in the whole tree
2. Maple, because its two leaves sum to 5
3. Either move, because the opponent’s reply is random
4. Cedar, whose worst reply is 3 rather than Maple’s −5

**Answer: 4.** Maple backs up −5 and Cedar backs up 3. MAX chooses Cedar, guaranteeing 3 within this model. The attractive leaf 10 is not under MAX’s control after choosing Maple. Averaging or adding leaf utilities would answer a different question.

**Transfer:** Raise Maple’s −5 leaf to 4. Which root move now wins under the same opponent model?

### 5. agt-negative

MAX root R chooses A or B, both MIN nodes. A has terminal utilities −3 and −8. B has terminal utilities −4 and −6. Which exact values and root move are correct?

1. A = −8, B = −6; choose B with value −6
2. A = −3, B = −4; choose A with value −3
3. A = 8, B = 6; choose A with value 8
4. A = −11, B = −10; choose B with value −10

**Answer: 1.** MIN takes the smaller value at each child: A = −8 and B = −6. MAX then takes the larger of those values, −6, by choosing B. Negative utility does not reverse the meaning of maximum or minimum.

**Transfer:** Replace B’s −6 with −9. Which move should R choose now?

### 6. agt-first-tie

MIN root R lists First before Second. Both children are MAX nodes. First lists leaves Fm2 = −2, then F0 = 0. Second lists S0 = 0, then Sm3 = −3. Exact minimax chooses the first declared child when optimal values tie. What is R’s principal variation?

1. R → Second → Sm3, value −3
2. R → First → Fm2, value −2
3. R → First → F0, value 0
4. R → Second → S0, value 0, because later ties replace earlier choices

**Answer: 3.** First and Second each have exact MAX value 0. R is MIN, so these root options tie at 0; the declared first-child policy chooses First. Within First, MAX chooses F0. The principal variation is R → First → F0.

**Transfer:** Swap only the order of First and Second. Does the root value change, and which equal-value move is selected?

### 7. agt-min-bound

MAX root R visits Oak before Pine. Each is MIN. Oak lists leaves O4 = 4 then O7 = 7; Pine lists P1 = 1 then Pm6 = −6. After Oak establishes alpha = 4, alpha-beta visits Pine’s first leaf 1 and skips −6. How should Pine’s returned 1 be interpreted?

1. As Pine’s exact minimax value; skipped leaves cannot change it
2. As an upper bound; Pine’s separately computed exact value is −6
3. As a lower bound; Pine’s exact value must be at least 1
4. As the root’s exact value, replacing Oak’s 4

**Answer: 2.** At Pine, MIN has already seen 1, so its exact value is at most 1. Since that cannot beat the root’s available 4, the remaining reply can be skipped in this search. Pine returns the upper bound 1; a full reference calculation sees the other leaf and gives −6. The root’s exact value remains 4.

**Transfer:** Change the skipped Pine leaf from −6 to −9. Which exact node value changes, and does the root decision change?

### 8. agt-max-bound

MIN root R visits terminal L = 0 before internal Right, which is MAX. Right lists terminal A = 2 then B = 9. With beta = 0 from L, alpha-beta sees A = 2 and skips B. What does the returned 2 at Right establish?

1. An exact value of 2 for Right and a new root value of 2
2. An upper bound of 2 for Right, whose exact value is 9
3. A lower bound of 2 for Right; its exact value is 9 and R still chooses L = 0
4. That B has utility 2 without visiting it

**Answer: 3.** MAX at Right can already achieve 2, so Right’s exact value is at least 2. MIN at the root already has 0 and will not prefer this branch. The search returns a lower bound of 2; the full reference value is max(2, 9) = 9. R’s exact choice remains L with value 0.

**Transfer:** Change B from 9 to 20. Does the bound 2 remain valid, and does R’s choice change?

### 9. agt-order

MAX root R chooses between MIN nodes Oak (leaves 4 then 7) and Pine (leaves 1 then −6). Compare two depth-first alpha-beta runs: Oak-first versus Pine-first, with each node’s leaf order unchanged. Which statement is correct?

1. Both return root value 4; Oak-first visits 3 terminal leaves, while Pine-first visits all 4
2. Oak-first changes the game’s root value to 1 by skipping −6
3. Pine-first changes the game’s root value to −6
4. Both must visit the same leaves because the root value is the same

**Answer: 1.** Oak-first establishes a root alternative of 4 before Pine, allowing Pine’s −6 leaf to be pruned after seeing 1. Pine-first must inspect both Pine leaves to establish −6; Oak then needs both of its leaves. The exact root value stays 4. The leaf-count difference is a search-work observation, not a measured timing result.

**Transfer:** Keep Oak first but swap Pine’s leaf order to −6 then 1. Which Pine leaf is skipped, and is the root value unchanged?

### 10. agt-terminal-root

The complete tree is one terminal node R with utility −7; rootPlayer is MIN. What should an exact finite-tree analysis report?

1. Value 7, after converting to MIN’s perspective
2. Value −7, no chosen move, principal variation [R], and one visited terminal leaf
3. No result because every root must have at least two children
4. Value 0 because no move has been played

**Answer: 2.** A terminal outcome already supplies its MAX-perspective utility. No player chooses a child, so chosenChild is null and the principal variation contains only R. The reference and the separate alpha-beta traversal each inspect this one terminal node.

**Transfer:** Change rootPlayer to MAX without changing the terminal utility. Which reported value should remain unchanged?

### 11. agt-counts

For the seven-node tree MAX R → MIN Oak(4, 7), MIN Pine(1, −6), with Oak visited first, the tool computes a full minimax reference and then a separate alpha-beta search. The reference evaluates all 4 leaves. The search visits 4, 7 and 1 and prunes −6. What is the alphaBeta.visitedLeafCount field?

1. 7, because it must add the reference and search leaf evaluations
2. 4, because every leaf was evaluated somewhere in the program
3. 1, because only the root choice matters
4. 3, counting only leaves entered by the separate alpha-beta traversal

**Answer: 4.** The field is 3. The full reference calculation is separate work and is not included in the alpha-beta traversal count. Together these two calculations evaluate 7 terminal occurrences, so this teaching tool does not claim to have saved total work versus running only exhaustive minimax. It exposes which branches alpha-beta can avoid.

**Transfer:** If the same tool reports no pruned nodes on a different four-leaf tree, what alphaBeta.visitedLeafCount should it report?

### 12. agt-model

A decision has a chance event after choosing A: utility 8 with probability 0.9 or −4 with probability 0.1. B gives utility 2 for certain. There is no opponent choosing the outcome. Can the alternating MAX/MIN tree tool interpret these probability-bearing branches as its stated model?

1. Yes; a MIN node automatically computes the probability-weighted average
2. Yes; it should silently discard the probabilities and call that the same decision
3. No; chance probabilities require a different model, so probability fields must be refused rather than silently interpreted as MIN choices
4. No; positive utilities are invalid

**Answer: 3.** This tool models an adversary who selects replies, not a random event. A chance model would use the stated probabilities and asks a different question. Unsupported probability fields are refused. The lesson’s guarantees apply only to the explicit finite, alternating, perfect-information, two-player zero-sum tree.

**Transfer:** What additional modeling choice would be needed if an opponent’s private information changed which actions were available?

## Sources and permissions

Original game trees, questions, distractors, worked explanations and transfer prompts for RecallWeave. Algorithm background: MIT OpenCourseWare, 6.034 Artificial Intelligence (Fall 2010), Patrick H. Winston, Lecture 6: https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/resources/lecture-6-search-games-minimax-and-alpha-beta/; MIT 6.034 recitation on alpha-beta pruning: https://web.mit.edu/6.034/wwwbob/L4/node14.html. No reference exercise, figure or passage is copied. AI assistance was used in drafting and implementation.

Original course content authored for Jacob’s RecallWeave project; no additional reuse license is granted here. Linked reference material retains its published terms.

The examples, prompts and distractors above are newly authored. The linked MIT materials supply algorithmic background; their examples and prose are not reproduced. These exercises do not implement chance nodes, general-sum payoffs, hidden information, repeated-state graphs, heuristic evaluation or game-engine integration.
