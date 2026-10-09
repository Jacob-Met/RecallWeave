# Fenwick trees: which totals change?

This original RecallWeave lesson connects a one-based array to the partial sums stored in a Fenwick tree. Open [the standalone explorer](fenwick-trees-explorer.html) directly in a browser, or import [the original lesson JSON](fenwick-trees.json) through RecallWeave's existing course importer. The explorer needs no network, package installation, account, or browser storage.

The lesson teaches point **addition**, prefix sums, and inclusive range sums. It does not implement assignment, range updates, cumulative-frequency rank search, or an imported-trace interpreter.

## Start with positions, not implementation offsets

A prefix ending at position 3 includes positions 1, 2, and 3. For the values `[3, -1, 4, 0, 2]`, that prefix is `3 - 1 + 4 = 6`.

All positions displayed here start at 1. The exported `values` and `tree` arrays each have exactly `n` entries; array offset `i - 1` represents displayed position `i`. There is no stored entry for index 0. `prefix(0)` is the empty sum: zero, with no tree reads.

Negative values are ordinary inputs. For `[5, -7, 4]`, the prefix totals are `5, -2, 2`. Exact sums remain valid even though those totals do not increase. Do not apply a search algorithm that assumes nonnegative cumulative frequencies to this signed example.

## Each tree entry is responsible for a block

For a positive index `i`, `lowbit(i)` is the largest power of two dividing `i`. For example, `lowbit(6) = 2`, `lowbit(7) = 1`, and `lowbit(8) = 8`.

Entry `tree[i]` stores the sum of the inclusive interval:

`[i - lowbit(i) + 1, i]`

For `[4, 1, -2, 3, 6]`, the initial tree is:

| Index | Value | Responsibility interval | Stored total |
| --- | ---: | --- | ---: |
| 1 | 4 | [1, 1] | 4 |
| 2 | 1 | [1, 2] | 5 |
| 3 | -2 | [3, 3] | -2 |
| 4 | 3 | [1, 4] | 6 |
| 5 | 6 | [5, 5] | 6 |

The array length need not be a power of two. These five positions need exactly five stored entries.

The explorer constructs the initial entries from their responsibility blocks. It labels that result as the initial state; it does not pretend that construction was one of your point-update operations.

## Prefix queries move downward

To compute a prefix ending at `i`:

1. Read `tree[i]` into a running sum.
2. Replace `i` by `i - lowbit(i)`.
3. Repeat while `i` is positive.

For the five-position example, `prefix(5)` reads `tree[5] = 6` and then `tree[4] = 6`, for a total of `12`. Their intervals `[5, 5]` and `[1, 4]` cover the requested prefix exactly, without overlap.

For a larger array, the path for `prefix(7)` is `7 → 6 → 4 → 0`. Zero is the stopping index, not another stored entry. Each subtraction removes the lowest set bit of the current positive index, so the number of reads is bounded by the number of binary digits in the index.

The explorer records each visited interval, its stored total, the running sum before and after the read, and the next index. Queries leave all values and stored totals unchanged.

## Point additions move upward

To add a delta at position `i`:

1. Add the delta to the represented value at position `i`.
2. Add the same delta to `tree[i]`.
3. Replace `i` by `i + lowbit(i)` and repeat while it is at most `n`.

These are exactly the tree entries whose responsibility blocks contain the changed position. The direction differs from a query because the operation is finding containing blocks rather than partitioning a prefix.

Starting from the table above, `add 3 5` changes value 3 from `-2` to `3`. It visits tree entries 3 and 4:

| Entry | Interval | Before | Addition | After | Next index |
| --- | --- | ---: | ---: | ---: | ---: |
| 3 | [3, 3] | -2 | 5 | 3 | 4 |
| 4 | [1, 4] | 6 | 5 | 11 | 8 |

The next index 8 exceeds the length 5, so the operation stops. It does not allocate `tree[8]`. The final values are `[4, 1, 3, 3, 6]`, and the stored totals are `[4, 5, 3, 11, 6]`.

An addition is not an assignment. `add 2 -3` subtracts three from value 2; it does not replace value 2 with `-3`. A zero addition still follows and records the update path, with equal before and after totals.

## Inclusive ranges use two actual prefix traversals

For `start ≤ end`:

`range(start, end) = prefix(end) - prefix(start - 1)`

After the addition above, `range(2, 5)` is `prefix(5) - prefix(1) = 17 - 4 = 13`. The included values `1 + 3 + 3 + 6` also sum to `13`.

Subtracting `prefix(start)` would incorrectly remove the value at `start`. The `start - 1` boundary is why a range starting at 1 uses the empty prefix 0.

The explorer keeps both traversals and their signs in the trace, including the empty second traversal. A negative prefix total is subtracted as a negative number; no nonnegative-frequency assumption is made.

## Use the explorer

Enter 1–16 comma-separated initial integers, each from -99 through 99. The operations box accepts up to 64 nonblank lines:

| Command | Meaning | Bounds |
| --- | --- | --- |
| `add INDEX DELTA` | Add a delta to one position | `1 ≤ INDEX ≤ n`, `-99 ≤ DELTA ≤ 99` |
| `prefix END` | Sum positions 1 through END | `0 ≤ END ≤ n` |
| `range START END` | Sum an inclusive interval | `1 ≤ START ≤ END ≤ n` |

Both inputs use signed ASCII decimal integers. An optional `+` or `-` and leading decimal zeros are accepted; `+02` means two, not an octal value. Surrounding whitespace and blank operation lines are allowed. Commands are lowercase. Fractions, exponents, hexadecimal notation, comments, empty comma-separated values, and trailing tokens are refused. The initial text is limited to 512 characters and the operations text to 4,096 characters.

Choose **Build trace** to validate the entire draft and create the complete result. An invalid later operation prevents the whole trace from being published. The empty script is valid and lets you inspect initial blocks.

**Previous operation**, **Next operation**, and **Final state** inspect snapshots. They do not run an update again. Changing either input, or loading an example, immediately retires the previous result and disables its trace export until a new build succeeds.

**Download complete trace** saves every operation and snapshot, regardless of the selected view. **Download lesson JSON** saves the exact original course file and remains available when the draft is invalid. The JSON lesson can be previewed and started through the existing RecallWeave importer, then used with its existing lesson, practice, review, and notes features. This contribution does not modify those features.

Use the native buttons with Tab and Enter or Space. The tables expose exact numbers and intervals as text; color is not needed to understand a traversal.

## Exactness and the source interface

All arithmetic is integer arithmetic. At most 16 initial values of magnitude 99 contribute 1,584 in total magnitude. At most 64 additions of magnitude 99 contribute another 6,336. Therefore every stored block or prefix sum stays within absolute 7,920, safely within JavaScript's exact integer range. A range result has the same bound because it represents a subset of the updated values.

`src/fenwick-trees.mjs` exposes:

- `parseFenwickDraft(initialText, operationsText)`: validates the text grammar and returns a copied, recursively frozen numeric specification.
- `buildFenwickTrace(spec)`: admits the complete plain-data specification before building; returns a copied, recursively frozen `recallweave-fenwick-trace/1` trace.
- `serializeFenwickTrace(trace)`: exports a trace returned by this model as pretty JSON with a final newline.

Structured input requires ordinary dense arrays, plain data objects with exactly the documented fields, and finite integer Numbers. It does not coerce strings, execute accessor fields, or mutate the caller's specification. Export is not a validation API for arbitrary imported JSON.

Each trace includes the admitted input, responsibility blocks, initial state, one snapshot pair per operation, actual traversal records, and final state. Query records contain running sums; update records contain before/after totals. This intentionally favors a small inspectable teaching trace over a compact production data structure.

## Rebuild and verify locally

No new dependencies are required:

`node --test tests/fenwick-trees.test.mjs`

`node tools/build-fenwick-trees.mjs`

`node tools/build-fenwick-trees.mjs --check`

The builder uses the existing course validator, retains the exact input bytes for its output, and embeds the original course text. The generated HTML has no external runtime assets. The file and its source can be inspected independently; current receiving evidence is kept in the contribution's scoped evidence folder.

The mathematical operations have logarithmic traversal paths. This small explorer does not benchmark throughput, compare implementations, measure learning gains, or establish an assessment's predictive validity.

## References and original-content boundary

- Peter M. Fenwick, “A new data structure for cumulative frequency tables,” *Software: Practice and Experience* 24(3), 1994. DOI: <https://doi.org/10.1002/spe.4380240306>.
- Rossano Venturini, “Dynamic Prefix Sums with Fenwick Tree,” University of Pisa notes, 2023: <https://pages.di.unipi.it/rossano/blog/2023/fenwick/>.

The references supply algorithmic background. This lesson's questions, explanations, examples, tables, interface, and code are original; no reference passages, exercises, or figures are reproduced. The original course text is offered under CC BY 4.0, with attribution carried in its JSON. Referenced publications retain their own terms.
