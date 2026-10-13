# MinHash: the first label tells the story

Open **minhash-explorer.html** directly in a modern browser. It is a
self-contained teaching page: no server, package installation, account or
network is required. The page compares two small sets under every ordering
of their union. It displays the exact calculation and an inspectable proof.

## Use the companion

1. Enter each set as a JSON array, for example `["a","b"]` and `["b","c"]`.
2. Select **Compare all permutations**. Inspect the distinct sets, their union
   and intersection, and both exact fractions.
3. Use **Previous**, **Next**, the permutation selector, or a row's **Inspect**
   button to inspect one complete ordering. The colored rank cards label
   membership as A only, B only, or A and B; color is supplementary.
4. Expand the complete-order table to see every minimum label and collision.
   On a narrow screen, that table has its own horizontal scrolling region.
5. Download the observation to keep the applied input text, all rows and the
   selected permutation. Editing either input retires the displayed result and
   disables its download until a successful new comparison.

Example buttons fill the inputs but do not apply them. The existing result is
retired immediately so a draft cannot be mistaken for an applied calculation.
Invalid input produces an explicit error and no current downloadable result.
Previous and Next stop at the first and last row. Nothing is automatically saved.

## What the model means

Both sets are nonempty. A label is a literal string; exact duplicates contribute
only one set member. Case, leading and trailing spaces, and distinct Unicode
forms remain distinct. For example, `"a"`, `" a"` and `"A"` are different.
The quoted display makes those differences inspectable. This is a set model,
not a multiset or frequency-weighted similarity measure.

The union contains at most five distinct labels, so the page can enumerate
all of its at most 120 permutations. The union's displayed order is first-seen
Set A followed by previously unseen labels in Set B. That determines the table
order, not any probability weighting. Reordering the inputs changes the row
order but not the collection of orders or the collision fraction.

Read a permutation from left to right, with ranks starting at 1. The ideal
MinHash signature of A in this order is the rank of A's first member; B uses
the same order. The page shows both the literal first label and its rank.
Distinct labels have distinct ranks, so matching minimum labels and matching
minimum ranks are equivalent here.

A collision is 1 when the two minima match and 0 otherwise. This term describes
the two set signatures, not a collision between two distinct labels assigned
the same hash value: this model uses permutations, whose ranks are unique.

## The exact count

Write n = |A union B| and k = |A intersection B|. The Jaccard similarity is k/n.

There are n! orderings of n distinct labels. If one particular label is fixed
first, the remaining n−1 labels can be ordered in (n−1)! ways. Thus every
union label appears first equally often.

The two minima match **if and only if the first union label belongs to both
sets**:

- If that first label is shared, each set already has its first member at
  rank 1. The minima match.
- If it belongs to only one set, that set starts at rank 1 and the other starts
  later. Their minima differ.

Each of the k shared labels therefore starts (n−1)! matching orders:

```text
matching orders / all orders = k × (n−1)! / n! = k/n
```

Under a uniformly chosen permutation, this same fraction is the probability
of a collision. The page enumerates the complete space; it does not generate
random samples. A table prefix, one manually selected row, or a reordered
prefix is not presented as an unbiased estimate.

The argument also covers n=1: 0!=1, and the only possible nonempty sets both
contain the same single label. The one order matches. Empty sets are refused
because their minimum member is undefined; the page does not silently choose
a convention for two empty sets.

## Worked examples

### Partial overlap

A = {a,b}, B = {b,c}. The union is {a,b,c}, the intersection is {b}, so J = 1/3.

| Order | Minimum A | Minimum B | Match |
| --- | --- | --- | --- |
| a b c | a, rank 1 | b, rank 2 | 0 |
| a c b | a, rank 1 | c, rank 2 | 0 |
| b a c | b, rank 1 | b, rank 1 | 1 |
| b c a | b, rank 1 | b, rank 1 | 1 |
| c a b | a, rank 2 | c, rank 1 | 0 |
| c b a | b, rank 2 | c, rank 1 | 0 |

There are two matches among six orders: 2/6 = 1/3. Selecting the first row
shows 0, while selecting the third shows 1. Neither selected row changes the
exact set similarity. A single collision does not prove identical sets, and
a single noncollision does not prove disjoint sets.

### Identical and disjoint sets

A = B = {a,b} gives two matching orders out of two, so J = 1.
A = {a}, B = {b,c} gives no matching order out of six, so J = 0.

These endpoint examples differ from one selected result for partially
overlapping sets. In the endpoint cases, **every** row has the same result.

### A proper subset

A = {b}, B = {a,b,c} also gives J = 1/3 and two matches out of six. The
Jaccard fraction alone does not tell whether either set contains the other.
The distinct-set display retains that additional information.

### Five labels

A = {a,b,c}, B = {b,d,e}. There are five union labels and one shared label.
Each label starts 4! = 24 orders. Only the 24 orders starting with b match,
among 5! = 120 total orders. The fraction is 24/120 = 1/5.

### Literal labels and duplicate entries

A = ["a"," a","é"], B = ["a","A","é"] has four distinct union labels and two
shared labels. There are 12 matching orders among 24: 1/2. The leading space
and capital letter are retained, not normalized away.

Replacing A's first entry with two repeated "a" entries does not change the
set, although the exact original input entries remain in the observation.
An accented character and a visually similar combining-character sequence
also remain distinct strings. This page does not infer linguistic equivalence.

## Downloads and the existing learner

**Download observation** writes `recallweave.minhash-observation/1` JSON.
It includes:

- The exact applied textarea strings, including their spacing.
- Both original arrays, normalized distinct sets, union and intersection.
- Every complete permutation, 1-based index and minimum ranks, and collision.
- Exact totals, reduced Jaccard fraction and groups by first label.
- The selected 1-based permutation and explicit uniform-permutation assumptions.

The observation is a mathematical record, not a RecallWeave answer archive.
Do not import it as a lesson. It contains the labels you entered.

**Download probability course** returns the unchanged existing
`courses/probability-foundations.json`, Git identity
`82cc4bdd8bf22afc5ca84098a0b19c3d485d2f45`. Open the existing learner
(`demo.html`), choose **Bring your own lesson**, preview that file and choose
**Start this deck**. That existing course develops probability foundations;
it is not represented as a newly authored MinHash question set. Its original
content, attribution and permission remain intact.

**Download worked guide** returns this complete Markdown file. Neither course
nor guide download changes a learning session or marks a copy as saved.

## Input and source contracts

Each input is a JSON array with 1–20 strings. Each label contains 1–40 Unicode
code points, is not all whitespace, is well-formed Unicode and contains no C0
control character or DEL. The combined distinct union has at most five labels.
Each input text is bounded at 4096 JavaScript UTF-16 code units. Strings are
compared exactly; whitespace is inspected for the nonblank check but is not
trimmed from accepted labels.

The public module exports:

| Function | Result |
| --- | --- |
| `parseSetText(text, name)` | A fresh validated array; JSON errors have a readable input label |
| `validateLabels(array, name)` | A fresh validated copy, rejecting sparse holes and invalid labels |
| `analyzeMinHash(arrayA, arrayB)` | A deeply frozen `recallweave.minhash-analysis/1` record |

Indices and ranks are one-based. Neither caller array is mutated. The model
uses integer arithmetic bounded by five labels and 120 permutations. The
reduced fraction is exact; there is no floating-point probability decision,
random seed or statistical confidence interval.

Rebuild only this companion from the repository:

```sh
node tools/build-minhash.mjs
node tools/build-minhash.mjs --check
node --test tests/minhash.test.mjs
```

The builder reads its own repository-relative sources, validates the existing
probability deck and verifies its fixed byte identity, then embeds the exact
course and guide strings. It does not rebuild or modify the learner, catalog
or other labs. The standalone page is intended for direct local use; a
separate reviewed registry handoff can link it into a future directory build.

The maintained tests include all 961 ordered pairs of nonempty subsets of
a five-label universe, literal input and immutability checks. Their actual
execution and the separately frozen independent oracle are recorded with the
receiving evidence; source test presence alone is not an execution claim.

## Scope and reference

The equality is for the ideal uniform-permutation model. An arbitrary
practical hash function, a restricted or biased family of orders, or colliding
hash values need additional analysis. The page does not compare real documents,
implement a production sketch, estimate practical error or make a security
claim. Its small complete enumeration supports understanding of the theorem.

Background reference: Andrei Z. Broder, Moses Charikar, Alan M. Frieze and
Michael Mitzenmacher, *Min-Wise Independent Permutations*,
[author-hosted paper](https://www.math.cmu.edu/~af1p/Texfiles/mw0.pdf).
The displayed examples, finite counting argument, interface and wording are
original teaching material. No paper text or figures are copied.

AI assistance was used to develop the implementation and explanations.
The page itself makes no provider calls.
