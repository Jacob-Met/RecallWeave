# Weighted intervals: choose, compare, reconstruct

A twelve-question RecallWeave course and an offline explorer for a concrete dynamic programming problem: choose fixed-time activities for one shared resource so that their total value is as large as possible.

The [explorer](weighted-intervals-explorer.html) lets a learner edit the activities, inspect each table row, follow the actual take/skip backtracking path, and compare the result with earliest finish. The [course JSON](weighted-interval-scheduling.json) goes through RecallWeave's existing deck picker, adaptive lesson, worked review, practice, study notes and session trace. It requires no new learner code or model configuration.

## Use the lesson

1. Open [weighted-intervals-explorer.html](weighted-intervals-explorer.html) directly in a browser. It is a self-contained file: no server, package installation or network connection is required.
2. Keep the six-activity example for the first pass. Move from **Row 0** to **Next row**, explaining the take and skip values before revealing each decision. **Show result** jumps to the complete table.
3. Select **Trace choices** and then **Next choice** to reconstruct the inspected prefix. A predecessor jump matters: selecting every table row marked “take” would produce an invalid answer.
4. Change D's value from 10 to 0. The old result disappears. Select **Solve activities**, then inspect the new table and compare its full schedule with the original.
5. Select **Download course**. Open the repository's unchanged [demo.html](../demo.html), choose that JSON file with its deck picker, review the preview, and start the lesson.
6. After the twelve questions, read the worked explanations, try a missed connection again, and download study notes or the learner's session trace. First answers remain separate from retries.

The explorer can be moved and opened on its own. Its inline solver, diagram, styles and embedded course travel with it. The guide and learner links need the surrounding repository files; the page explains that distinction. Reference links open external material only when selected.

## What the learner should be able to explain

The four concepts each have three original questions:

| Concept | Practical outcome |
| --- | --- |
| Compatible intervals | Decide which activities can coexist, distinguish value from count, and identify a constraint the model does not express. |
| Prefix subproblems | Find a compatible predecessor and explain why a best prefix can omit its last activity. |
| Take or skip | Compute both alternatives, use the empty base case, and apply a declared tie rule. |
| Reconstruct and check | Follow predecessor jumps, distinguish an optimum from a unique optimum, and account for the algorithm's work. |

The prerequisites form a simple acyclic progression. RecallWeave uses them as question-selection priorities, not as hard learning gates. Its mastery values are the existing demo's model state, not a grade or evidence that this course improves learning.

## The exact problem being solved

Each activity has a fixed start, a fixed end and a nonnegative additive value. Only one activity may occupy the resource at a time. Leaving time unused is allowed, and selecting nothing is a valid schedule.

Intervals are **half-open**, written `[start, end)`: the start is occupied and the end is excluded. Thus `[0, 3)` and `[3, 5)` are compatible. There is no travel time, setup gap, dependency between selected activities, capacity greater than one, flexible start time or calendar/time-zone interpretation.

The explorer admits zero to eight activities. Times are integer abstract units from 0 through 24, with start strictly before end. Values are integers from 0 through 99. These bounds keep the table and drawing inspectable; they are not a limit of the general algorithm.

The pure solver accepts an array of numeric activity objects. IDs must be unique strings matching `/^[A-Z][A-Z0-9_-]{0,7}$/`; it does not trim or coerce values. The page assigns A through H and validates its text fields before calling the solver. Blank fields, fractions, negative values, out-of-range values and nonpositive durations produce no result. Editing, adding or removing any activity invalidates the previously displayed result and trace download until the draft is solved again.

### Order, predecessors and ties

Activities are sorted by increasing end, then increasing start, then ID in JavaScript code-unit order. The table uses one-based row numbers; row 0 is the empty prefix.

For row j, p(j) is the last **earlier** row whose end is less than or equal to j's start, or 0 if none fits. Since the rows are finish-sorted, every candidate that can precede j belongs to that prefix. p(j) is not necessarily the preceding row, the best-valued activity or an activity that the chosen prefix actually includes.

OPT(j) is the greatest value of any compatible subset of rows 1 through j. The recurrence is:

```text
OPT(0) = 0
take(j) = value(j) + OPT(p(j))
skip(j) = OPT(j - 1)
OPT(j) = max(take(j), skip(j))
```

A best schedule either omits j, leaving the skip problem, or includes j, leaving a compatible subset of the prefix through p(j). Those alternatives exhaust the feasible possibilities. Reusing an optimal smaller prefix therefore gives an optimal value for this prefix.

This explorer records **take only when take is strictly greater than skip**. Equal values skip the current row. With the declared sort order, that rule returns one deterministic optimum. Another schedule can have the same optimal value.

## Work through the default example

The six activities are already in finish order:

| Row | ID | Interval | Value | p(j) | Take | Skip | OPT(j) | Recorded choice |
| ---: | :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| 0 | Empty | — | — | 0 | 0 | 0 | 0 | base |
| 1 | A | [0, 3) | 4 | 0 | 4 | 0 | 4 | take |
| 2 | B | [1, 4) | 5 | 0 | 5 | 4 | 5 | take |
| 3 | C | [3, 5) | 4 | 1 | 8 | 5 | 8 | take |
| 4 | D | [0, 6) | 10 | 0 | 10 | 8 | 10 | take |
| 5 | E | [5, 7) | 4 | 3 | 12 | 10 | 12 | take |
| 6 | F | [6, 8) | 5 | 4 | 15 | 12 | 15 | take |

At D, taking gives 10 and skipping keeps A + C at value 8. Adding D to that earlier schedule would count overlapping activities, so 18 is not a feasible alternative.

At F, taking uses OPT(4): 5 + 10 = 15. Backtracking starts at row 6, takes F and jumps to row 4. It takes D and jumps to row 0. Reversing the collected IDs yields **D + F, value 15**.

Every nonempty row happens to record take in this example. That does not mean all six activities belong to the final schedule. Table decisions describe different prefix problems; only the visited backtracking path reconstructs the requested prefix.

At row 5, the best schedule is **A + C + E, value 12**. It is valid for that smaller prefix, even though the full optimum replaces it with D + F. The explorer's selected schedule, best-value display, diagram highlight, greedy comparison and backtracking all follow the inspected prefix. Later rows keep their values hidden until inspected.

The earliest-finish comparison greedily accepts A, then C, then E, reaching 12. It misses the value-15 alternative. Earliest finish solves a different unweighted objective; this counterexample shows why it cannot be relied on to maximize these values.

### Three useful changes

- **D becomes 0:** row 4 skips D and keeps 8. F takes 5 + 8 = 13. Backtracking goes from F to row 4, skips D, then selects C and A. The complete result is A + C + F, value 13.
- **Touching endpoints preset:** A [0,2) value 3, B [2,4) value 4, C [0,4) value 6. A + B yields 7. Moving B's start to 1 creates an overlap, so C alone becomes best at 6.
- **Equal alternatives preset:** A [0,2) value 2, B [2,4) value 2, C [0,4) value 4. The sorted order is A, C, B. At B, take and skip both give 4, so the result retains C. A + B is another optimum.

With no activities, row 0 is the entire problem and the result is empty with value 0. With all values zero, the tie rule skips every row; the empty schedule is still optimal. The greedy comparison may include zero-valued activities, so equal values do not imply equal selected IDs.

## Answer derivations

The JSON records a canonical zero-based answer index. The learner may present options in its maintained display order; use the correct answer's meaning rather than a memorized position.

| Item | Canonical index | Correct answer and derivation |
| --- | ---: | --- |
| wis-compatible-1 | 0 | [4,6) can follow [1,4). Equality at the boundary is permitted; the other options occupy time before 4. |
| wis-compatible-2 | 1 | C alone gives 7. A + B is feasible but gives only 4; C overlaps both. |
| wis-compatible-3 | 2 | Requiring D to imply selection of A adds a dependency absent from interval compatibility and additive values. |
| wis-prefix-1 | 3 | p(4)=1. D begins at 2; A ends at 2, while B and C end later. |
| wis-prefix-2 | 0 | OPT(j) is the best value of any compatible subset of the first j rows. It need not include j. |
| wis-prefix-3 | 1 | Taking j permits a compatible subset of rows 1 through p(j). It reuses OPT(p(j)), not necessarily activity p(j) itself. |
| wis-decision-1 | 2 | Take gives 4+7=11 and skip gives 9. Taking wins; adding to OPT(j−1) is not justified. |
| wis-decision-2 | 3 | D gives max(10+0,8)=10. It cannot be added to A + C because their occupied times overlap. |
| wis-decision-3 | 0 | All alternatives have value 0. Every tie skips, so backtracking returns the empty schedule with value 0. |
| wis-trace-1 | 1 | F jumps to D, which jumps to row 0. The schedule is D + F, value 15, rather than every row marked take. |
| wis-trace-2 | 2 | Equal A and B each give 5. A comes first; skipping tied B retains A. B alone is another optimum. |
| wis-trace-3 | 3 | Given sorted activities and all predecessors, the table takes O(n) work and backtracking visits at most n rows. |

Every question includes its own worked explanation and an open transfer prompt. The transfer prompts are for discussion or the learner's reflection; they are not automatically scored by the explorer.

For discussion: a one-unit setup gap changes compatibility to earlier.end + 1 <= later.start; lowering the value-7 C to 3 in question 2 makes A + B at 4 best; moving D's start from 2 to 3 in question 4 changes its predecessor to B's row 2. In question 7, lowering the new value to 2 makes take and skip tie at 9, so this explorer skips. Renaming identical A and B to X and C retains C by the declared ID order, without changing the optimal value.

## Implementation and saved artifacts

[weighted-intervals-core.mjs](weighted-intervals-core.mjs) exports `solveSchedule`, `EXAMPLES` and `LIMITS`. The solver validates and copies the admitted fields, sorts once, finds each predecessor with binary search, computes the table, reconstructs one optimum, and separately computes the earliest-finish comparison. The algorithm takes O(n log n) time including sorting and predecessor searches, and O(n) additional space. Backtracking strictly decreases its row index.

The UI recomputes the small inspected prefix to present its schedule consistently; that presentation step is separate from the full problem's algorithmic work. No storage, account, provider call, random source or clock is used by the solver. The page has no persistence: editing or reloading affects its current in-memory activity draft only.

**Download trace** writes `weighted-interval-trace.json`. Its format is `recallweave-weighted-interval-trace/1`, with:

- `conventions`: half-open intervals, one resource, abstract time, the exact sort and skip-current tie rule.
- `activities`: the admitted numeric activities in the original input order.
- `solution`: the complete sorted activities, every table row, optimal value and selected IDs, backtracking path and greedy comparison.
- `view`: the currently inspected row, number of backtracking steps revealed, and that prefix's optimum, path and greedy comparison.

A trace always contains the full solved table, including rows not yet revealed on screen. It is an inspectable algorithm artifact, not a learner score or a restorable session. It contains no timestamp; unchanged state produces the same bytes. Invalid or unsolved drafts cannot download a trace.

**Download course** writes the canonical JSON bytes embedded in the page. This is the supported importer boundary. The course retains its title, original attribution, license, concept prerequisites, answers, explanations and transfer prompts.

### Maintain and verify

Edit the maintained core, UI, template or course, then rebuild the standalone page:

```bash
node tools/build_weighted_intervals_explorer.mjs
node tools/build_weighted_intervals_explorer.mjs --check
node --test tests/weighted-intervals.test.mjs
```

The builder uses the existing deck parser and canonical serializer, embeds the local course, and combines the new core/UI into one module script. It does not fetch dependencies. `--check` compares the exact generated bytes and fails on drift.

The focused tests cover the six-row worked example, edited values, endpoint compatibility, prefix reconstruction, equal alternatives, predecessor semantics, empty and zero-value cases, input refusal and nonmutation, and the actual existing deck/lesson/review/practice/notes modules. They do not replace the repository's normal gates.

For an optional real-browser check with Node 22 or newer and an installed Chromium-family browser:

```bash
node tools/check_weighted_intervals_browser.mjs \
  --browser /path/to/chromium \
  --output /tmp/recallweave-weighted-intervals-check
```

Use a new empty output directory. The check opens the generated file in its own browser profile, exercises visible controls and keyboard activation, records source hashes and screenshots, and closes its own browser. It needs no npm package or live service.

## Source and authorship

The question wording, distractors, examples, explanations, transfer prompts, page layout and diagrams are original to HAMON contribution `406d0fb04c43`, developed with AI assistance. Original course wording and examples are offered under **CC BY 4.0**. Retain the course attribution and source note when sharing or adapting them. Linked references retain their own terms.

The mathematical background was checked against these primary teaching sources:

1. Lalla Mouatadid, University of Toronto CSC373, Summer 2016, [Dynamic Programming: Weighted Interval Scheduling](https://www.cs.toronto.edu/~lalla/373s16/notes/WIS.pdf). It supports the weighted objective, finish-sorted predecessor prefix, base case, recurrence and optimal-substructure argument.
2. Vijay K. Garg, University of Texas at Austin, [A Systematic Approach to Algorithms, Chapter 10 companion](https://users.ece.utexas.edu/~garg/publicCompanion/chapter10.html). It supports the same recurrence and O(n log n) algorithm with binary predecessor search.

The source exercises, prose, diagrams and code were not copied. The exact tie rule, bounded ID/time/value contract, six-activity numbers, explorer interactions and all twelve answer derivations are stated here so the authored lesson can be checked directly.
