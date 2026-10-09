# A sample as the stream grows

This lab follows **Algorithm R**, a reservoir method credited to Alan Waterman in Jeffrey S. Vitter's 1985 paper. Its job is to retain a fixed-size sample while arrivals continue, without first learning the stream's final length.

The lab makes no random draws. You supply a legal sequence of integer draws and inspect that deterministic run. A separate exact count considers every possible history under the assumption that each draw is independent and uniform in its stated range.

## Positions are the identities

A record's position identifies its occurrence. Two records may both be called “oak”; position 1 and position 2 remain different records. The displayed labels are literal text and never merge occurrences.

With capacity k, first retain positions 1 through k in slots 1 through k. For each later arrival at position i, consider a draw j from 1 through i:

- If j is at most k, replace reservoir slot j with the new occurrence.
- Otherwise, skip this arrival.

The number on a draw selects a **slot**, not a record with that stream position. No later decision needs to revisit a skipped record.

## A chosen history

Use labels A, B, C, D, E; capacity 2; draws 2,4,1.

| Arrival | Draw | Action | Slots afterward |
|---|---:|---|---|
| Initial fill | — | Keep positions 1 and 2 | [1,2] |
| Position 3 | 2 | Replace slot 2, removing position 2 | [1,3] |
| Position 4 | 4 | Skip because 4 exceeds capacity 2 | [1,3] |
| Position 5 | 1 | Replace slot 1, removing position 1 | [5,3] |

The final slot order is [5,3]. Its unordered positional subset is {3,5}. These are two presentations of the same selected occurrences; the uniform-subset claim does not assert that every slot permutation has equal probability.

Previous/Next inspect this already computed history. They do not make another draw. Editing any input retires the applied trace and its observation download until Apply succeeds again.

## Why the complete subset matters

For n=4 and k=2, there are 3×4=12 equally likely histories under the stated draw assumption. Every one of the six unordered pairs occurs in two histories, so each has probability 1/6. A specified position occurs in six histories, giving inclusion probability 1/2.

Equal individual inclusion chances alone are insufficient. A procedure that selects {1,2} half the time and {3,4} otherwise gives every position probability 1/2, yet never selects four of the six pairs. The lab therefore shows complete subset counts as well as marginals.

A subset-level induction explains Algorithm R beyond the displayed finite examples. Suppose every k-subset of the first i−1 positions is equally likely. For a target k-subset omitting the new position i, the preceding subset must already be that target and the incoming record must be skipped. Its probability is:

    (1 / C(i−1,k)) × ((i−k) / i) = 1 / C(i,k).

For a target containing i, its other k−1 members must already be present together with exactly one outside member. There are i−k possible outside members. Each preceding subset has probability 1/C(i−1,k), and the single draw naming that outside member's reservoir slot has probability 1/i. Summing gives the same 1/C(i,k). The initial k positions form the sole k-subset, starting the induction. This argument concerns unordered positional subsets and uses independent uniform draws.

## What the tables count

The bounded interface admits 1–8 records and capacity 1–3, no larger than the record count. It enumerates at most 40,320 histories. Every history has the same probability 1 divided by the product (k+1)×…×n. If n=k, the product is empty and equals 1: there is one empty history and one final subset, not zero possibilities.

For every unordered subset, “Histories” is the number of legal draw sequences that produce it. Its exact probability is that count divided by the total, reduced to a fraction. A marginal count adds all histories whose final subset contains that position. Counts and fractions in the lab are exact bounded integers; they are not measured frequencies or rounded estimates.

The distribution tables always describe the result after **all** input records arrive. The selected step above them describes one chosen history at its own current prefix. Neither display changes the other.

## A tempting biased alternative

For capacity 1, start with A and replace on a fresh fair coin at each of B and C. A survives both coins with probability 1/4; B is final with probability 1/4; C is final with probability 1/2. Constant replacement probability favors the latest arrival here. Algorithm R instead makes the incoming i-th record eligible with probability 1/i for capacity 1.

A uniform sample can still miss a category or contain an unusual combination. Sampling positions does not repair biased collection, missing data, malicious ordering or a faulty random generator. The lab proves its finite mathematical counts under explicit assumptions, not the quality of a deployed data pipeline or the effectiveness of a lesson.

## Use the lab and lesson

Open courses/reservoir-sampling-lab.html directly in a browser. Labels are one per line; preserve intended spaces, and omit blank or trailing empty lines. Capacity is a canonical positive decimal integer. Draws are comma-separated canonical positive integers; spaces or tabs around each draw are accepted. Use no draws when capacity equals the number of records.

Apply produces the trace and tables. Download observation records the literal applied input text, selected step, complete trace and complete distribution. It does not import data or reopen an untrusted computation.

Download lesson produces reservoir-sampling.json, containing twelve original questions. Open the unchanged RecallWeave learner in demo.html, choose that JSON, inspect its preview and explicitly start. Download guide preserves this document. No account, network, storage or installation is needed for these local interactions.

## References and attribution

- Jeffrey S. Vitter, [Random Sampling with a Reservoir](https://www.ittc.ku.edu/~jsv/Papers/Vit85.Reservoir.pdf), ACM Transactions on Mathematical Software 11(1),37–57 (1985), section 2. The paper credits Algorithm R to Alan Waterman and develops faster reservoir algorithms.
- Tim Roughgarden and Gregory Valiant, [CS168 lecture 13: Reservoir Sampling](https://timroughgarden.org/s17/l/l13.pdf). Its inclusion-probability argument is useful for marginals; the separate subset induction above supplies the stronger joint-distribution claim.

All questions, worked examples and explanatory text in this companion are original and offered under CC0-1.0. Referenced publications keep their own rights.
