# Substring search: matches, borders and fallback

Open the [offline explorer](substring-search-explorer.html) to follow the complete calculations. Save the [original twelve-question deck](substring-search.json), then choose **Bring your own lesson** in [RecallWeave](../demo.html), preview it and select **Start this deck**. The explorer also includes the exact deck bytes in its course download.

The explorer is a separate page. It does not replace a learning session. Its input and traces remain in memory until you close it; keep an explicit calculation download if you want the complete trace later. A downloaded calculation is a record for inspection, not a RecallWeave learning-session archive or an input format the explorer imports.

## What counts as a match?

A pattern occurs at a start position when the entire pattern equals the text slice of the same length at that position. This lesson reports **every** start, including overlapping occurrences. It uses literal, case-sensitive equality and zero-based **Unicode code-point positions**.

For text `AAAA` and pattern `AA`, starts `0`, `1` and `2` all match. Start `3` cannot hold a length-two pattern. Choosing only `0` and `2` would impose a different rule that forbids overlap.

For `😀A😀A😀`, the code-point sequence is:

| Index | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Token | 😀 | A | 😀 | A | 😀 |

Pattern `😀A` starts at `0` and `2`. JavaScript UTF-16 offsets for those starts would be `0` and `3`. Neither numbering is inherently wrong; mixing them without a conversion is wrong. A code point is also not necessarily a whole user-perceived character: an accented letter can consist of more than one code point.

The sequence `[U+0065, U+0301, U+00E9]` contains an ordinary `e`, a combining acute accent and then a single precomposed `é`. The one-code-point pattern `U+00E9` matches only at `2`. This explorer does not normalize or case-fold input. Spaces, line breaks and control characters participate in equality; their cells show explicit names or `U+` labels. Calculation JSON retains the original strings.

Text may contain 0–64 code points; the pattern must contain 1–16. An empty pattern is refused because this lesson does not adopt a convention for matching at every boundary. An unpaired UTF-16 surrogate is refused instead of being replaced silently. Invalid drafts remain in their fields so they can be corrected.

## The ordinary left-to-right baseline

The naive algorithm visits every start at which the whole pattern could fit. At each start it compares tokens from left to right and stops at the first mismatch. After a full match it still tries the next start, preserving overlaps.

For `ABABABABA` and `ABABA`:

| Start | Outcome | Equality comparisons |
|---|---|---:|
| 0 | full match | 5 |
| 1 | first token differs | 1 |
| 2 | full match | 5 |
| 3 | first token differs | 1 |
| 4 | full match | 5 |
| **Total** | starts **[0, 2, 4]** | **17** |

Repeated text can cause this algorithm to compare many tokens it has already seen in earlier alignments. The prefix-function approach keeps information about a matched suffix instead of always starting the pattern over.

## A border is a reusable piece

A **border** is both a prefix and a suffix of a string. A **proper** border is shorter than the whole string. The empty border has length zero.

`ABABA` begins and ends with `ABA`, so its longest proper border has length `3`. The entire string is excluded; `ABAB` is not a suffix. The prefix table records this value separately for every growing pattern prefix:

| i | Prefix through i | Longest proper border | pi[i] |
|---:|---|---|---:|
| 0 | A | empty | 0 |
| 1 | AB | empty | 0 |
| 2 | ABA | A | 1 |
| 3 | ABAB | AB | 2 |
| 4 | ABABA | ABA | 3 |

Thus `pi = [0, 0, 1, 2, 3]`. These are **lengths**, not ending indices. For `AAAA`, the table is `[0, 1, 2, 3]`; for `ABABAC`, it is `[0, 0, 1, 2, 3, 0]`.

### Building the table without enumerating every border

Start with `pi[0] = 0`, unresolved pattern index `i = 1` and candidate matched-prefix length `q = 0`.

1. Compare `pattern[i]` with `pattern[q]` once.
2. If equal, extend the candidate length, record that length in `pi[i]`, and advance `i`.
3. If different and `q > 0`, set `q = pi[q − 1]` and retry the **same** unresolved pattern token.
4. If different and `q = 0`, record zero and advance `i`.

For `ABABAC`, the final unresolved `C` is first compared with `B` at candidate length `3`. The candidate becomes `pi[2] = 1`, so `C` is compared with `B` again, then the candidate becomes `0` and `C` is compared with `A`. All fail. The four earlier comparisons plus these three give **7 preparation comparisons**. The fallback assignments themselves add none.

The table exists solely for that exact pattern sequence. Editing the pattern requires a new calculation.

## Searching with the table

In this lesson's prefix-function KMP variant, `i` is the next text index and `q` is the number of pattern tokens already matched immediately before `i`.

| Result of the next equality test | Next action |
|---|---|
| Equal | Advance both `i` and `q`. |
| Different, `q > 0` | Set `q = pi[q − 1]`; keep `i` fixed and retry that text token. |
| Different, `q = 0` | Advance `i`; no prefix is retained. |
| An equality makes `q` equal pattern length | Emit start `i − pattern length`, then set `q = pi[q − 1]` before another comparison. |

The last row preserves overlaps. For text `ABABABABA` and pattern `ABABA`, a full match at start `0` leaves `i = 5`. Keeping its border `ABA` means `q = 3`, so only the following `B` and `A` are needed to complete start `2`. The same rule then finds start `4`.

### A mismatch with a stationary text cursor

Use text `ABABACABABABAC` and pattern `ABABAC`. At a later point, `i = 11` points to text token `B`, and `q = 5` says that `ABABA` has already matched. The expected pattern token is `C`, so this comparison fails.

The matched suffix `ABA` is still useful: set `q = pi[4] = 3` and leave `i = 11`. Compare that same `B` with `pattern[3] = B`, then continue. The complete search reports starts `[0, 8]`. Its text search makes `15` equality comparisons, with `7` additional preparation comparisons; the naive variant makes `28`.

The text cursor never moves backward. A fallback changes the amount of already matched prefix that remains usable; it does not discard the unresolved text token.

## Read the counts honestly

One **compare** trace state represents one actual token equality test. Advance, record, match, fallback and completion states add no comparisons. The comparison state shows the predecision positions; the next transition state shows their update.

| Text / pattern | Naive | Prefix preparation | KMP text search | KMP total |
|---|---:|---:|---:|---:|
| ABABABABA / ABABA | 17 | 4 | 9 | 13 |
| ABABACABABABAC / ABABAC | 28 | 7 | 15 | 22 |
| AAAAAAAAAC / AAAAAB | 30 | 9 | 19 | 28 |
| AAAA / AA | 6 | 1 | 4 | 5 |
| XYZXYZ / AB | 5 | 1 | 6 | 7 |
| AB / ABAB | 0 | 3 | 2 | 5 |
| empty / AB | 0 | 1 | 0 | 1 |

This declared KMP variant prepares the pattern even for an empty text and scans the text even when the pattern is longer. The naive variant considers only feasible complete alignments, so it can do less work on small inputs. Other implementations can adopt additional early exits; these counts describe the explicit variants shown here.

KMP's combined preparation/search bound is linear in pattern plus text length. That does not guarantee fewer comparisons on every input or establish a wall-clock performance ranking. If a prefix table is reused, report that assumption and keep its construction cost distinguishable. The explorer's complete retained teaching snapshots take more space than a search that stores only its working state and prefix table.

## Use the explorer deliberately

Choose an example or edit both fields, then select **Build traces**. The accepted input identity, all occurrence starts, final prefix table and total comparison summary remain visible. Each of the three panels has an independent step selector. Previous and Next inspect retained snapshots; they do not execute more search work.

Compared token cells are marked as well as named in the written event description. The token regions can scroll horizontally and receive keyboard focus. Pattern alignment can change after a fallback while the text row stays in place. Prefix preparation shows unknown table entries as `—` until they are recorded.

An input edit retires the accepted trace and disables its calculation download. Rebuild explicitly after fixing an invalid input. A download requests the entire captured calculation regardless of which steps are showing. If the request fails, the accepted result is retained for a retry. The status describes a request; it cannot certify that a browser saved a file.

## Course answer map and transfers

The course's canonical answer indices are balanced, three at each of `0`, `1`, `2`, and `3`. RecallWeave may shuffle displayed choices, so use the meaning of an answer, not its visible letter. The worked statements below summarize the reasoning, not an efficacy or assessment-validity claim.

| Question | Correct idea | Worked transfer |
|---|---|---|
| ss-matches-overlap | AA in AAAA starts at [0, 1, 2]. | AAA in AAAAA also starts at [0, 1, 2]. |
| ss-matches-units | 😀A starts at code-point positions [0, 2]. | 😀😀 in 😀😀😀 starts at [0, 1]. |
| ss-matches-literal | U+00E9 matches only its identical token at 2. | Aa in aAaA starts at [1]. |
| ss-prefix-proper | ABABA's longest proper border is ABA, length 3. | AAAA has length 3; ABC has length 0. |
| ss-prefix-table | ABABA has [0, 0, 1, 2, 3]. | AAAA has [0, 1, 2, 3]; ABABAC ends with 0. |
| ss-prefix-chain | At the final C, candidate length falls 3 → 1. | Preparing ABABAC takes 7 comparisons. |
| ss-fallback-stationary | Keep i = 11 and change q from 5 to 3. | AAAAAB can fall 5 → 4 while retaining the same unresolved text token. |
| ss-fallback-full-match | Keep i = 5 and q = 3 after the first ABABA match. | AA retains a one-A border to find all three starts in AAAA. |
| ss-fallback-empty | Empty text: no match, 1 preparation and 0 search comparisons for AB. | AB / ABAB still has no match despite a partial prefix. |
| ss-cost-counts | ABABABABA / ABABA costs naive 17, KMP 4 + 9. | AAAA / AA costs naive 6, KMP 1 + 4. |
| ss-cost-small | XYZXYZ / AB costs naive 5, KMP 1 + 6. | AB / ABAB costs naive 0, KMP 3 + 2. |
| ss-cost-bound | Advance text; use proper borders to reduce q. | Selecting a retained snapshot cannot change an equality count. |

## Build and native qualification

Run `python3 tools/make_substring_search.py` to rebuild the standalone file or add `--check` to verify exact source parity. The builder embeds the course's original UTF-8 text, style and both new modules; it refuses unexpected imports or unsafe raw closing delimiters. No existing demo builder or learner module is modified.

Run `node --test tests/substring-search*.test.mjs` for the scoped model, course, actual-handler and artifact checks. The finite exhaustive domain uses independent whole-slice occurrence and enumerated proper-border oracles. Hand-derived count cases were retained before implementation. Native UI tests explicitly use a simulated DOM and real Node Blob/object-URL operations; they do not establish browser rendering, completed download, file-picker, hosted or installed acceptance.

## Provenance and references

Questions, prose, worked examples and implementation are original to this contribution. **CC0-1.0 applies to the new course content only.** Referenced works retain their own terms; no excerpts, figures or exercises are included. This does not change licensing of the rest of RecallWeave.

- [NIST, Knuth–Morris–Pratt](https://xlinux.nist.gov/dads/HTML/knuthMorrisPratt.html), supports algorithm background and the linear combined bound.
- [Knuth, Morris and Pratt, *Fast Pattern Matching in Strings*](https://epubs.siam.org/doi/10.1137/0206024), SIAM Journal on Computing 6(2), 323–350, 1977. The publisher metadata and abstract were read; the paywalled full article was not reviewed for this contribution.
- [J Strother Moore's university-hosted explanation](https://www.cs.utexas.edu/~moore/best-ideas/string-searching/kpm-example.html), supports mismatch and pattern-structure intuition. Its worked text and pattern are not reproduced here.

The lesson teaches the declared prefix-function variant rather than claiming to reproduce every optimization in the original paper. Structural deck validation and correct finite examples do not validate teaching effectiveness or the learner model.
