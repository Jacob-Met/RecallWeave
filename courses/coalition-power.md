# Coalition power: when a weight changes the result

This is an original finite lesson about weighted yes/no rules. It is a mathematical model, not a forecast or a judgment about a real committee.

## Start here

Open `coalition-power-explorer.html` directly in a browser. No server, account or dependency is needed to use the generated page.

1. Explore the applied example: weights **6, 4, 2**, explicit quota **7**.
2. Change the weights or quota, then choose **Apply game**. Editing retires the previous result and its observation download.
3. Select a player. Compare its swing witnesses with the complete coalition table; the critical-only filter changes the displayed rows, never the calculation.
4. Download **Course JSON**. Open the bundled learner (`../demo.html`), use its local course chooser, inspect the preview and choose **Start this deck**.
5. Download an observation separately if you want the exact applied calculation and current player/filter choice. An observation is not a learner course.

There is no automatic saving. Page state stays in memory until you explicitly download a file. The explorer does not upload anything. The unchanged learner initially opens its bundled lesson; downloading a course does not silently install or start it.

## The exact rule

There are n distinct players, identified by their original position. Equal weights do not merge identities. A yes coalition is a subset S of these players, including the empty set and the complete set.

A coalition wins exactly when the sum of its weights is **at least the explicit quota q**. Reaching q is enough. A strict-majority rule can be represented by choosing the corresponding integer quota; this explorer never substitutes one automatically.

The bounded API accepts 1–6 integer weights from 0 through 20, with positive total, and an integer quota from 1 through that total. There are at most 64 coalitions. It refuses missing values, strings, booleans, fractions, negative zero and nonfinite numbers instead of coercing or rounding them.

## Critical members and swings

A member i is critical in a winning coalition S when removing it makes the coalition lose:

    weight(S) >= q, but weight(S) - weight(i) < q.

Equivalently, a swing for i is an other-player coalition T that loses without i and wins with it:

    weight(T) < q <= weight(T) + weight(i).

Each T is counted once. These are the same witnesses described with or without player i. A losing coalition has no critical members. A player may belong to many winners without being critical in them.

For weights [6,4,2] and quota 7:

| Yes coalition | Weight | Result | Critical members |
| --- | ---: | --- | --- |
| none | 0 | loses | none |
| A | 6 | loses | none |
| B | 4 | loses | none |
| A, B | 10 | wins | A, B |
| C | 2 | loses | none |
| A, C | 8 | wins | A, C |
| B, C | 6 | loses | none |
| A, B, C | 12 | wins | A |

The swing counts are [3,1,1]. A's other-player witnesses are {B}, {C} and {B,C}. The all-player coalition has only A critical: removing B leaves 8, and removing C leaves 10.

## Two different denominators

Let b_i be player i's swing count.

**Absolute swing probability** is b_i / 2^(n-1). The denominator counts all other-player coalitions. It has a probability interpretation when those other players independently choose yes or no with equal probability. This is not the probability that player i votes yes, that a proposal passes, or that a real committee follows the model.

**Normalized Banzhaf share** is b_i / (sum of all players' swing counts). It describes a share of all counted swings. For the allowed nonconstant rules, this denominator is positive. The shares sum to one.

In the example, A has absolute probability 3/4 and normalized share 3/5. B and C each have 1/4 and 1/5. The absolute probabilities sum to 5/4; that is valid because their events are not an exclusive partition. The normalized shares sum to one by their different definition.

The page always retains reduced exact fractions. Any displayed percentage is a labeled decimal approximation. No simulation, sampling or floating-point estimate is used to count coalitions.

## Weight is not the same as power

- **Unequal weights, equal counts:** [4,3,2] at quota 5 has every pair winning and every singleton losing. Each player has two swings, so each normalized share is 1/3.
- **Positive weight, zero swings:** [5,3,1] at quota 7 wins exactly when A and B are both present. C has no swing despite weight 1.
- **One deciding player:** [6,2,1] at quota 6 gives A four swings among four other-player coalitions. A has both measures 1; B and C have zero.
- **A zero-weight addition:** adding a distinct zero-weight player doubles every old player's raw swing count and doubles the number of other-player coalitions. The reduced absolute probabilities and normalized shares stay unchanged; the added player has zero swings.

Changing the quota can change these conclusions even when every weight stays fixed. The explorer asks for both explicitly.

## Twelve transfer checks

These answer the short transfer prompts in the original course; attempt each before reading its answer.

1. At quota 6, B+C=6 passes.
2. Set one of four players aside: the other three have 2^3=8 coalitions.
3. For total weight 9, strict majority is represented by quota 5.
4. In {A,B} at [6,4,2], quota 7, both A and B are critical: the respective remaining weights are 4 and 6.
5. At [5,3,1], quota 6, T={A} has weight 5; adding C raises it to 6.
6. At [4,3,2], quota 8, only {A,B,C} wins. Every player belongs to every winner and is critical there.
7. B's absolute probability is 1/4.
8. The normalized shares are 3/5, 1/5, 1/5, whose sum is 1.
9. Three equal nonzero swing counts give normalized shares 1/3 each.
10. Adding weight zero doubles A's count from 4 to 8 and the denominator from 4 to 8. Both of A's reduced measures remain 1/1.
11. [1], quota 1 has raw count 1 and absolute 1/1. [1,0], quota 1 has raw count 2 and absolute 2/2, reduced to 1/1.
12. A behavioral interpretation needs evidence about preferences or joint voting/coalition likelihoods and a suitable model. Those data are not present here.

## Limits and provenance

This model fixes weights and a binary yes/no threshold. It supplies no abstention, preferences, coordination, unequal coalition likelihoods, arrival order, population evidence or calibrated real-world behavior. Its Banzhaf counts must not be relabeled as arrival-order pivot probabilities. A normalized sum of one is not a fairness certificate.

The observation contains the complete finite analysis, its assumptions and a view choice. It is a local record, not a signed attestation or an authenticated external report. The course JSON contains twelve original questions across four concepts. Neither download records personal learner answers.

Original wording, examples, questions and implementation: HAMON estate contribution estate-81ba1ed0179c, with AI assistance. Original lesson wording and worked examples are CC BY 4.0. Mathematical definitions were checked against:

- Jean-Luc Marichal and Pierre Mathonet, [Weighted Banzhaf power and interaction indexes](https://arxiv.org/abs/1001.3052), especially equation 3 for the average finite difference over other-player coalitions.
- Julie Zelenski, Stanford CS106B, [Voting Power](https://web.stanford.edu/class/archive/cs/cs106b/cs106b.1262/assignments/4-backtracking-voting/), for critical-coalition counts and their normalization.

No source passages, questions or figures are copied. Linked references retain their own terms.

## Maintainer reproduction

From the repository root, using its existing Node runtime:

    node --test tests/coalition-power.test.mjs
    node tools/build-coalition-power.mjs --check

To regenerate the standalone HTML after an intentional source edit:

    node tools/build-coalition-power.mjs

The generated HTML embeds this guide, the exact course JSON, the pure core and the UI. It needs no network at runtime. The existing learner, course parser, catalog, workflows and other topics are unchanged.
