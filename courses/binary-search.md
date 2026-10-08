# Binary search: precise boundaries

An optional twelve-question RecallWeave course for an introductory programming learner who can read an array and use zero-based indices. The course follows one precise algorithm throughout: **lower bound**, which finds where values stop being less than a target. It covers sorted input, repeated values, missing targets, interval decisions, empty input, strict progress and comparison counts.

The original questions, options, explanations and transfer prompts are in [binary-search.json](binary-search.json). They use the existing `recallweave-deck/1` question and feedback format, and the existing adaptive selection, review and practice functions. The course adds no executable lesson content or model parameters.

## Open, inspect and study

In RecallWeave's **Deck studio**, choose **Open a deck to edit**, select `binary-search.json`, review the incoming title/count, and choose **Replace draft**. **Check and preview** shows all twelve questions and their answer key. **Download deck (.json)** saves the checked course using the existing authoring flow. Canceling an incoming preview leaves the current draft in place.

To study the course, use a RecallWeave version with the existing local-course importer: select the JSON file, inspect its preview, then explicitly start the lesson. That importer is tracked in [issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7). This course does not install or replace it. Current-base authoring acceptance and actual importer/learner acceptance are recorded separately in the course's receiving packet; an archived importer run is not a claim that a later importer release has been integrated.

After the first session, use the usual learning trace to review the original answers, practice missed connections, and download study notes. Practice remains separate from the original responses and model state. No account, provider, automatic persistence or additional build step is introduced by the course.

## The convention that makes the examples agree

Let `a` be a nondecreasing array, and let `target` be the value being sought. “Nondecreasing” permits equal neighbors and negative values. The desired result is the first index `p` for which `a[p] >= target`; when every value is smaller, the result is `a.length`.

That result is an **insertion boundary**, so it ranges from 0 through the length, inclusive. It is not always an existing element index. For example:

| Array | Target | Boundary | Present? | What the boundary means |
|---|---:|---:|---|---|
| `[1, 3, 5, 5, 9]` | 5 | 2 | Yes | Before the first existing 5 |
| `[-3, 1, 4, 8]` | 6 | 3 | No | Between 4 and 8 |
| `[-5, 0, 8]` | -9 | 0 | No | Before the first element |
| `[-2, 0, 6]` | 8 | 3 | No | After the final element |
| `[]` | 7 | 0 | No | The empty array's only insertion boundary |

The following pseudocode is the complete search used by the questions:

```text
lo = 0
hi = a.length
while lo < hi:
    mid = lo + floor((hi - lo) / 2)
    if a[mid] < target:
        lo = mid + 1
    else:
        hi = mid
return lo
```

There are two related intervals:

- **Unresolved element indices** are in `[lo, hi)`: `lo` is included and `hi` is excluded.
- **Possible answer boundaries** are in `[lo, hi]`: either endpoint can still be the answer.

Everything before `lo` is already known to be less than the target. Everything at or after `hi` is already known to be at least the target. These facts justify the next discard. They also explain why `hi = mid` is correct after an equal comparison: the middle element becomes known to qualify, while the boundary before it remains possible.

When `lo == hi`, no unresolved element remains and the single remaining boundary is the result. Membership then requires a separate check: `p < a.length` and `a[p] == target`. The course's comparison counts exclude that later equality check.

## Work one complete trace

Search `[2, 4, 6, 8, 10, 12, 14, 16]` for `7`.

| Comparison | Bounds before | Middle index | Compared value | Decision | Bounds after |
|---:|---|---:|---:|---|---|
| 1 | `[0, 8)` | 4 | 10 | 10 is at least 7; move `hi` to 4 | `[0, 4)` |
| 2 | `[0, 4)` | 2 | 6 | 6 is below 7; move `lo` past index 2 | `[3, 4)` |
| 3 | `[3, 4)` | 3 | 8 | 8 is at least 7; move `hi` to 3 | `[3, 3)` |

The insertion boundary is 3, and the target is absent. Inserting 7 there would put it between 6 and 8. The course searches without changing the array.

An equally long array can take a different number of comparisons for another target. With target 2, this same array compares indices 4, 2, 1 and 0. That path needs four comparisons. Search cost depends on the path as well as the length.

## Why it finishes

Write the unresolved length as `m = hi - lo`. While the loop runs, `m > 0` and `lo <= mid < hi`.

If the middle value is too small, the new length is `hi - (mid + 1)`. If it qualifies, the new length is `mid - lo`. Both are nonnegative and strictly smaller than `m`; neither branch can repeat an unchanged interval. The largest remaining length is at most `floor(m / 2)`.

For 31 elements, a worst-case sequence of unresolved lengths is `31, 15, 7, 3, 1, 0`: five comparisons. For 32 elements, a worst-case path can be `32, 16, 8, 4, 2, 1, 0`: six comparisons. This version's bound is `ceil(log2(n + 1))`, including zero when `n = 0`.

Those counts concern the search on an already sorted, directly indexed array. They exclude sorting, reading or validating the input, rendering a lesson, shifting elements during insertion, and the optional membership check. A logarithmic search does not make all of those surrounding operations logarithmic.

## Answer derivations and distractors

The answer indices below refer to the JSON's canonical option order, beginning at zero. The learner may display the options in a different order; its existing choice-identity handling determines correctness.

| Question ID | Canonical answer | Reason | Main misconception tested |
|---|---:|---|---|
| `bs-contract-order` | 2 | Sorted order connects the middle comparison to every value on either side. | Unique values, positive values or even length can replace ordering. |
| `bs-contract-duplicates` | 1 | The first qualifying index in `[1, 3, 5, 5, 9]` is 2. | Any equal element satisfies the first-occurrence contract. |
| `bs-contract-absent` | 3 | For target 6, the first larger value is 8 at index 3, with no equal value. | An absent target has no useful insertion boundary. |
| `bs-interval-midpoint` | 0 | `2 + floor((9 - 2) / 2) = 5`. | The excluded upper boundary is an included element. |
| `bs-interval-less` | 3 | Index 3 is already too small, so the next `lo` is 4. | The failing middle element should remain unresolved. |
| `bs-interval-equality` | 1 | The declared loop sets `hi = 2` and continues; reducing `hi` to 1 would lose the true boundary 2. | Equality permits an arbitrary update or an early return under this loop. |
| `bs-boundary-empty` | 0 | Initial equality of bounds prevents all array reads and returns boundary 0. | Empty input requires a comparison or a negative insertion index. |
| `bs-boundary-after` | 2 | Boundary 3 is the length, so it is after the final element and target 8 is absent. | Every returned boundary is an existing element index. |
| `bs-boundary-before` | 2 | Boundary 0 is valid, but `-5 != -9`, so membership is false. | A valid in-range boundary proves equality. |
| `bs-progress-single` | 3 | Moving `lo` from 5 to 6 removes the final failing value. | `lo = mid` always makes progress. |
| `bs-progress-trace` | 0 | The exact middle indices are 4, 2 and 3; the final boundary is 3. | Every length-8 search must use four comparisons. |
| `bs-progress-bound` | 1 | Five halving steps take an unresolved length of 31 to zero. | Being below 32 guarantees only four comparisons. |

The key uses each of the four canonical positions three times. Each item has one correct response under the stated convention. Distractors target specific misconceptions or incorrect updates. This balancing is a content check, not evidence that the course prevents guessing or improves learning.

## Source and content provenance

The questions, numerical examples, worked trace and explanations were written for this course. They do not reproduce a textbook's questions, figures or explanatory prose.

- [NIST Dictionary of Algorithms and Data Structures: binary search](https://xlinux.nist.gov/dads/HTML/binarySearch.html), Paul E. Black, entry updated 21 April 2022; consulted 8 October 2026. Supports the sorted-array and interval-halving background.
- [Python documentation: `bisect_left`](https://docs.python.org/3/library/bisect.html), consulted 8 October 2026. Defines the left insertion boundary: values before it are smaller, while values from it onward are at least the target; distinguishes lookup from insertion cost.

The step counts, examples, boundary reasoning and distractor analysis above are derived explicitly from the displayed algorithm. The course makes no claim of measured learning effectiveness, assessment validity or runtime AI generation. This original course content is released under CC0-1.0. That statement applies to these course files and does not change the license of the application or the referenced materials.
