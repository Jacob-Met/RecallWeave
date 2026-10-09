# Majority vote: propose, then verify

Open `majority-vote-explorer.html` in a modern browser. Everything needed by the explorer is inside that file. It makes no network requests and does not save browser state.

Enter one literal label per line and choose **Apply sequence**. Exactly empty input is allowed; a blank row inside a nonempty sequence is not. Labels are never trimmed, case-folded or normalized. The limits are 40 entries and 48 UTF-16 code units per label. A trailing newline introduces a blank row and is refused. Quoted label displays expose spaces and control characters without changing the values.

## Follow two different passes

**Cancellation proposes a candidate.** Begin with balance zero. At zero, choose the next value and set balance to one. Otherwise increment for an equal value, or decrement for a different value. When balance reaches zero, the register still displays its last label, but it has no active residue. The next value will replace it.

**Verification decides strict majority.** Count the proposed label throughout the original input. It is a strict majority only if its count is greater than half the number of entries. Exactly half is insufficient. An empty sequence has no candidate and no majority.

The phase control moves through cancellation first, then verification. At the end of cancellation, the candidate is explicitly unverified. The final majority decision appears only after the complete verification pass. Navigation only changes what you inspect. Editing the input or loading a preset retires the old applied trace; press Apply again.

Try these original examples:

- `cedar, cedar, birch, cedar, birch` has candidate cedar, cancellation balance 1 and verified count 3 out of 5.
- `red, blue, green` leaves a candidate but no strict majority.
- `m, M, m ` contains three distinct literal labels, including a trailing space on the last one.

These comma-separated examples describe sequences; use a separate line for each label in the explorer.

## Why cancellation helps, and what it does not prove

Canceling a pair of different values removes either one occurrence of an existing strict majority and one other occurrence, or no majority occurrence and two other occurrences. It cannot allow the other values, taken together, to eliminate a value that originally outnumbered them. If a strict majority exists, it must therefore be the final candidate.

That statement has a direction: it does not say every final candidate is a majority. Three distinct labels supply an immediate counterexample. The second pass is needed when the existence of a majority was not guaranteed beforehand. The final balance is not the candidate's frequency.

The underlying scan keeps a candidate and counters, followed by a verification count: linear scans and constant working state. This explorer deliberately stores input and every snapshot, so its teaching trace uses linear storage. It does not demonstrate a one-pass exact decision for an unreplayable stream, measure performance, or confer authority over an election or other external record.

## Keep a particular observation

**Download observation** writes `majority-vote-observation.json` with the exact applied textarea string, selected phase and complete immutable trace. It contains no timestamps or inferred source identity. Editing a draft disables that download until another successful Apply.

**Download lesson** writes the original `majority-vote.json` course. Open the unchanged RecallWeave learner supplied beside this explorer, choose the lesson file, inspect the preview and explicitly start it. The twelve questions cover strict majority, cancellation, verification and the invariant. Learner answers and study notes are separate from the explorer's trace.

**Download guide** writes this exact document. Closing the page loses its current draft and applied trace unless you explicitly downloaded an observation. There is no observation importer.

## References and scope

Algorithm: Boyer–Moore majority vote, distinct from their string-search algorithm.

- Robert S. Boyer and J Strother Moore, algorithm overview: https://www.cs.utexas.edu/~moore/best-ideas/mjrty/index.html
- Boyer and Moore, *A Fast Majority Vote Algorithm*, technical report: https://www.cs.utexas.edu/~boyer/ftp/ics-reports/cmp32.pdf

This lesson uses original prose, questions, examples and code. The references supply the algorithm and proof basis; their examples and text are not reproduced.
