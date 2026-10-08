# Stable matching: a worked field guide

This lesson asks three concrete questions: Why can a held proposal change? What makes a pair block a complete matching? How can the proposing side affect a stable outcome?

## Open and use

Open **stable-matching-explorer.html** directly in a browser. Choose a preset or enter complete best-first preference rows, choose the proposing side, and press **Apply preferences**. Use **First**, **Back**, **Next** and **Finish**, or select an exact step. The completed result is shown separately from the currently inspected partial state.

Every edit retires the applied result and observation download until you apply again. Changing the group size explicitly resets all rows to the displayed label order. An invalid row stays visible and is refused; no missing or repeated label is repaired.

Download **stable-matching.json**, open RecallWeave's unchanged **demo.html** learner, choose the course file, inspect its preview, and explicitly start the lesson. The course has 12 original questions. Answers, worked explanations, review, retry and practice use the learner's existing behavior; this lesson makes no learning-efficacy claim.

## The model

There are equally many participants on each side, from one to four. Left labels are A, B, C, D; right labels are W, X, Y, Z. Each participant lists every participant on the opposite side exactly once, best first. There are no ties or unacceptable partners.

A matching pairs each left participant with one right participant and vice versa. A complete matching has no unpaired participant. A partial trace state can have free participants, shown explicitly.

A rank is an ordinal position: 1 means first choice for that participant. Rank differences and sums do not, by themselves, measure satisfaction or welfare.

## A blocking pair is a two-sided witness

For a complete matching, an unmatched-to-each-other pair blocks if **both** participants strictly prefer each other to their current partners.

Use these preferences:

| Participant | Best → worst |
| --- | --- |
| A | W X |
| B | W X |
| W | B A |
| X | A B |

In A–W / B–X, B has rank 2 and would prefer W at rank 1. W has A at rank 2 and would prefer B at rank 1. B–W blocks.

In A–X / B–W, A would prefer W, but W prefers the current partner B. One participant's wish is insufficient. B already has the first choice. No pair blocks, so this matching is stable.

The explorer enumerates **every** complete matching in lexicographic left-to-right order: 1, 2, 6 or 24 possibilities for group sizes 1, 2, 3 or 4. Select any matching to inspect its partner ranks and all blocking witnesses. The absence of a witness is checked against every possible left/right pair.

## Deferred acceptance, one proposal at a time

A free proposer goes to the next untried receiver in that proposer's row.

- A receiver with no held proposal holds the new proposer.
- A receiver replaces the incumbent if the new proposer ranks higher in the receiver's own row. The displaced proposer becomes free.
- Otherwise the receiver rejects the new proposal and keeps the incumbent.

Held pairs are provisional until the process completes. A receiver always holds the best proposer received so far. A proposer never repeats a receiver. This explorer chooses the lowest-index free proposer to make each trace deterministic.

### Worked three-person trace

| Left | Best → worst | Right | Best → worst |
| --- | --- | --- | --- |
| A | W X Y | W | B A C |
| B | W X Y | X | A C B |
| C | X W Y | Y | A B C |

With left proposing:

| Proposal | Decision | Held pairs after the decision |
| --- | --- | --- |
| A → W | Hold A | A–W |
| B → W | Replace A with B | B–W |
| A → X | Hold A | A–X, B–W |
| C → X | Reject C; X prefers A | A–X, B–W |
| C → W | Reject C; W prefers B | A–X, B–W |
| C → Y | Hold C | A–X, B–W, C–Y |

The result has six proposals. Left ranks are [2, 1, 3]; right ranks, in W/X/Y order, are [1, 1, 3]. A lower rank number is a more preferred position for that participant. Check the result in the complete-matching inspector: no pair blocks.

The trace retains every next-choice cursor and the complete list of free proposers at each step. Replacement changes who is free; rejection consumes a choice without adding a pair.

## The proposing side can matter

Consider:

| Participant | Best → worst |
| --- | --- |
| A | W X |
| B | X W |
| W | B A |
| X | A B |

Left proposing finishes at A–W / B–X, with left ranks [1, 1] and right ranks [2, 2]. Right proposing finishes at A–X / B–W, with left ranks [2, 2] and right ranks [1, 1]. Both complete matchings have no blocking pair.

In the strict complete equal-size model, deferred acceptance produces a stable matching. Each proposer obtains the best partner that proposer can have in any stable matching for the same preferences. This is **proposer optimality**. It does not say every proposer gets the first choice, every receiver does well, the stable matching is unique, or the outcome is fair.

The explorer compares each final proposer rank with the best rank available to that proposer among all enumerated stable matchings. Changing which side proposes creates a newly applied problem observation; it does not silently rewrite the previous result.

## Counts that answer different questions

At size four there are at most 4 × 4 = 16 proposals because there are 16 possible proposer–receiver pairs and none repeats. There are 4! = 24 complete matchings.

In **Shared first choice**, every left participant prefers W X Y Z and every right participant prefers D C B A. Left proposing makes ten proposals and finishes A–Z, B–Y, C–X, D–W. This is one concrete trace, not a claim that all four-person profiles take ten proposals.

## Downloads and reproducibility

The course and this guide are fixed original UTF-8 files. Their buttons remain available while a preference draft is invalid.

An observation JSON contains the full applied profile, every atomic trace state, every complete-matching inspection, the selected step, the inspected matching, and SHA-256 identities for the embedded source inputs. The full completed trace remains distinct from the selected visible step. Labels are display names for the stored numeric indices.

The observation is an export, not an import format for trusted derived results. The explorer has no network calls, account, persistence or storage writes. Keep the downloaded JSON if you need to retain an observation.

## Limits and references

This is a bounded educational model. It excludes ties, incomplete lists, unequal group sizes, capacities, strategic reporting, policy constraints and real allocations. It does not compute a maximum-weight matching or claim a fairness measure.

Mathematical background:

1. D. Gale and L. S. Shapley, “College Admissions and the Stability of Marriage,” *The American Mathematical Monthly* 69(1), 9–15 (1962). [Original RAND paper](https://www.rand.org/content/dam/rand/pubs/papers/2012/P2240.pdf).
2. Princeton University, *Algorithm Design: Stable Matching*. [Official lecture](https://www.cs.princeton.edu/courses/archive/spring18/cos423/lectures/01StableMatching-2x2.pdf).

All examples, questions, explanations and diagrams in this contribution are original. References establish the mathematical background; no source exercises or figures are reproduced.
