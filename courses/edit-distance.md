# Edit distance: build and explain an optimal alignment

**What you will learn:** define the allowed edits, fill a table of prefix
distances, read an alignment, and explain why an answer is minimal. The companion
lesson contains 12 questions in six concepts.

Open [the edit-distance explorer](edit-distance-explorer.html) to try the
examples. It works as a self-contained offline page. To practise in the existing
RecallWeave learner, choose **Bring your own lesson**, select
[edit-distance.json](edit-distance.json), inspect the preview, and choose
**Start this deck**.

## 1. Agree on what one edit means

Here, inserting one symbol, deleting one symbol, or substituting one symbol for
another costs **1**. Keeping two equal symbols aligned costs **0**. Distance is
the lowest total cost among valid transformations. This is the three-operation
Levenshtein definition described by [NIST][nist].

For `cat → cut`, keep `c`, substitute `u` for `a`, and keep `t`. The cost is
1. Zero edits would leave the original string unchanged, so the answer is
exactly 1.

The operation set matters. For `ab → ba`, two substitutions cost 2. Deleting
the first `a` and inserting `a` at the end also costs 2. A swap is not a
one-step operation in this explorer. One insertion or deletion would change the
length; one substitution cannot fix both positions. That proves this pair's
distance is 2.

**Try it:** build traces for `cat → cut`, `cat → cats`, and `cats → cat`.
Identify a substitution, an insertion, and a deletion. Reversing a valid
transformation reverses each edit; with these equal unit costs, the distance is
the same in the reverse direction.

## 2. Solve smaller prefixes first

A prefix is the beginning of a sequence, possibly empty. Let **D[i,j]** mean
the distance from the first **i source symbols** to the first **j target
symbols**. Rows consume source symbols; columns consume target symbols.

Start with the empty prefixes:

- **D[0,0] = 0:** nothing needs changing.
- **D[i,0] = i:** delete the source prefix.
- **D[0,j] = j:** insert the target prefix.

At an interior cell, consider the last alignment column:

| Last action | Smaller prefixes | Candidate total |
|---|---|---|
| Delete the final source symbol | First i−1 source symbols, first j target symbols | D[i−1,j] + 1 |
| Insert the final target symbol | First i source symbols, first j−1 target symbols | D[i,j−1] + 1 |
| Match or substitute the final pair | First i−1 source symbols, first j−1 target symbols | D[i−1,j−1] + pair cost |

The **pair cost is 0 when the compared symbols are equal, otherwise 1**.
Take the minimum of the three candidate totals. Every candidate includes the
distance of its smaller prefixes; matching the final pair does not erase
earlier edits.

This gives an exact method because every valid alignment ends in one of those
three kinds of column. If the preceding part were needlessly expensive, a
cheaper alignment of those smaller prefixes would improve the whole result.
Store those smaller answers once and reuse them.

Here is the complete table for source `car` and target `ca`. The labels name
whole prefixes; `""` means empty.

| Source prefix | Target `""` | Target `c` | Target `ca` |
|---|---:|---:|---:|
| `""` | 0 | 1 | 2 |
| `c` | 1 | 0 | 1 |
| `ca` | 2 | 1 | 0 |
| `car` | 3 | 2 | 1 |

At the bottom-right cell, deletion gives **0 + 1 = 1**, insertion gives
**2 + 1 = 3**, and substitution gives **1 + 1 = 2**. Deleting the final
`r` wins.

**Try it:** use **First**, **Next**, and **Previous**, or **Inspect step**, to
follow the calculation. For `ab → cb`, predict the final value before choosing
**Finish**. The final `b/b` pair is free, but the earlier `a → c` substitution
still contributes 1.

## 3. Read the alignment as well as the number

An alignment preserves each input's symbol order and may place a gap on one
side of a column. Remove the gaps from its source row to recover the source;
remove them from its target row to recover the target.

For `pan → plan`:

| | Column 1 | Column 2 | Column 3 | Column 4 |
|---|---|---|---|---|
| Source | p | gap | a | n |
| Target | p | l | a | n |
| Action | match | insert l | match | match |
| Cost | 0 | 1 | 0 | 0 |

There are four columns but only one edit. A gap is an alignment marker,
not a literal character added to the input.

The matrix can be traced backward from the final cell through predecessors
that justify its cost. Reading that path forward gives an optimal alignment.
Ties can produce several correct alignments. This explorer selects one
reproducible path by preferring a diagonal predecessor, then deletion, then
insertion when candidate costs tie. Another optimal path can be equally valid.

**Try it:** inspect `ab → ba`. Compare the displayed alignment with the
delete-then-insert solution from section 1. Check the reconstructed strings and
the total cost before deciding whether two displays disagree.

Use **Download full trace JSON** to keep the full calculation and selected
alignment for later inspection. Moving the display slider does not change the
mathematical problem.

## 4. Explain why an answer is minimal

A valid edit script supplies an **upper bound**: the distance is no larger
than that script's cost. To establish an exact value, also rule out smaller
costs.

For `abc → bca`, three positions differ. Yet `abc → bc → bca` uses only two
edits. One substitution cannot fix all three differing positions, and one
insertion or deletion would leave unequal lengths. The distance is therefore
at least 2 and at most 2: exactly 2.

The length difference supplies a useful lower bound:

**distance ≥ absolute difference between the two sequence lengths.**

Each insertion or deletion changes the length by one; substitution does not
change it. A source of length 7 and target of length 3 therefore need at least
4 edits. That does not make every such pair distance 4: `aaaaaaa → aaa`
attains 4, while `abcdefg → xyz` requires 7.

Combining available scripts gives another upper bound. A two-edit route from
A to B followed by a three-edit route from B to C is a five-edit route from A
to C. A shorter direct route may exist; the detour does not prove distance 5.

**Try it:** write down a script and a lower-bound argument before revealing the
explorer's answer for `abc → bca`. Then explain why comparing only symbols at
the same positions misses the cheaper alignment.

## 5. Understand what the explorer counts

The symbol unit here is a **Unicode code point**. For example, `A😀 → A`
costs one deletion: `😀` is one code point, although JavaScript represents it
with two UTF-16 code units. [ECMAScript string iteration][ecma] keeps such a pair
together.

Code points need not correspond one for one with visible characters.
[Unicode's grapheme-cluster guidance][graphemes] describes text elements that
may contain several code points. This explorer consistently uses code points.

It also performs **no normalization or case folding**. Compare these exact
sequences:

| Input | Code points |
|---|---|
| Precomposed `é` | U+00E9 |
| `e` followed by a combining acute accent | U+0065, U+0301 |

Without preprocessing, replace U+00E9 with U+0065 and insert U+0301: distance 2.
The strings may look identical. Applying NFC normalization to both before
comparison would make this pair equal, yielding 0; that is a different input
policy described by [Unicode normalization][normalization]. Similarly,
`Cat → cat` costs 1 under the explorer's exact comparison.

**Try it:** use `A😀 → A`, then precomposed `é → é`. Inspect the sequence
lengths as well as the visible text. The lesson includes the exact code-point
spellings so the distinction does not depend on your font.

## 6. Keep the table's size in perspective

For source length **m** and target length **n**, the complete table has
**(m+1)(n+1) cells**, including its empty-prefix row and column. There are
**m × n interior cells**, each comparing three candidates. The numeric
calculation also initializes the boundary row and column. Keeping the complete
numeric matrix requires **(m+1)(n+1) stored values**, including when one input
is empty. For nonempty inputs, the calculation and matrix storage scale with
the product of the lengths.

The explorer accepts up to **24 code points per input** so the full table stays
inspectable. Two maximum-length inputs produce 25 × 25 = **625 cells**.
This is a display limit, not a mathematical limit on edit distance. Rendering
steps and retaining an exported trace are additional work beyond filling the
numeric matrix.

After exploring, use **Download lesson JSON** for the optional RecallWeave
questions and **Download worked guide** for a local copy of this guide.

## Lesson route

| Concept | What the questions check |
|---|---|
| Allowed edits | Unit costs and the absence of a primitive swap |
| Prefix boundaries | Empty prefixes and the length lower bound |
| Table recurrence | Comparing candidates and carrying earlier cost |
| Reading alignments | Gaps, zero-cost matches, and multiple optima |
| Checking minimality | Constructive upper bounds and proofs of optimality |
| Unicode sequences | Code points, visual characters, and normalization policy |

The first five concepts build toward explaining a shortest transformation.
The Unicode questions branch from the allowed-edit definition, because the
choice of symbol unit affects the problem before any matrix is filled.

## References and reuse

All questions, examples, tables, and explanatory prose in this lesson were
written for RecallWeave. This original course content is **CC0-1.0**. The
references below provide background definitions and retain their own terms;
their exercises, prose, and figures are not reproduced here. References were
checked on 2026-10-08.

- [NIST Dictionary of Algorithms and Data Structures: Levenshtein distance][nist]
  — the edit operations and standard matrix-computation cost.
- [ECMAScript: String.prototype[Symbol.iterator]][ecma]
  — string iteration and code-point boundaries.
- [Unicode Standard Annex #29: Unicode Text Segmentation][graphemes]
  — the distinction between code points and grapheme clusters.
- [Unicode Standard Annex #15: Unicode Normalization Forms][normalization]
  — canonical equivalence and normalization.

[nist]: https://xlinux.nist.gov/dads/HTML/Levenshtein.html
[ecma]: https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype-%symbol.iterator%
[graphemes]: https://www.unicode.org/reports/tr29/
[normalization]: https://www.unicode.org/reports/tr15/
