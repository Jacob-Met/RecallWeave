# Amortized arrays: spikes, totals and stored credit

An original RecallWeave course and offline lab. Open `amortized-arrays-lab.html` directly in a browser. Its course download imports through RecallWeave's existing **Bring your own lesson → preview → Start this deck** flow. The lab never starts, saves or edits a learner session.

## What to try

Start with 12 appends and fixed increment 3. Select **Apply comparison**, then move to append 9: the doubling policy copies eight old elements in one operation. Step to 10: it now needs only one write. Change the count to 8 and the increment to 1 to compare a geometric copy sum with copying every prior element on every append. Try zero appends, then the maximum of 128.

The two policies share one inspection step. The slot diagrams show live numbered elements, empty spare slots, copies during this operation and the newly stored element. Full ledgers and an exact downloadable observation make every numeric result inspectable. The cumulative plot's horizontal axis is append count; its vertical axis is counted work, not time.

## The declared model

Begin with no elements and no slots. Each operation appends one distinct displayed identity to the end. One unit stores the new element; one unit copies each live old element during a resize. The model excludes allocation, zeroing, element byte size, cache effects and elapsed time. It demonstrates policies, not the actual growth factor of a particular language, runtime or container implementation.

When full, doubling chooses capacity 1 for the first append and twice its old capacity thereafter. Fixed growth adds its chosen integer increment, from 1 to 32, every time it is full. Both preserve all existing elements in order. The lab admits 0–128 appends; this is a teaching-display bound, not a mathematical limit.

Step zero is a genuine empty state: zero cost, zero capacity and no average per append. The display says “not defined,” rather than dividing by zero. Average actual cost for a nonempty prefix is its total divided by its count; decimal display is approximate, and exact totals remain alongside it.

## Derive the totals

Let N be a positive append count and P the least power of two at least N. Doubling copies old capacities 1, 2, 4, …, P/2. Their sum is P−1, so the exact total is **N + P−1**. At N=8 this gives15; at N=9 it gives24. The ninth operation itself costs9.

For fixed increment k, let r=floor((N−1)/k). The resize copies are 0, k, 2k, …, rk, so the exact total is **N + k*r*(r+1)/2**. Its final capacity is (r+1)k. At N=10,k=3 there are18 copies and10 writes:28 units. For fixed k, the arithmetic copy sum grows quadratically in N; it does not establish constant amortized append cost. Neither formula applies to N=0 without the separate empty case.

## Account with potential

For reachable append-only doubling states, define Phi=2*size−capacity. Phi starts at zero and stays nonnegative. An amortized charge is actual cost plus Phi-after minus Phi-before. The first append costs1 and increases Phi by1, so its charge is2. A later non-resizing append costs1 and increases Phi by2, making charge3. A resize from full capacity m costs m+1 and changes Phi from m to2, also making charge3.

Across a prefix, intermediate potential changes cancel. Thus total actual = total amortized − final Phi, since initial Phi is0. For N>0 the charges sum to3N−1, giving exact total3N−1−Phi and the upper bound3N. The charge is an accounting device, not a claim that a resize physically finishes in three units. Fixed growth deliberately has no Phi/charge columns in the comparison: this particular proof is for doubling only.

## Guarantees and limits

The result is deterministic over permitted prefixes; it assumes no random input distribution. It does not imply every operation is cheap, establish a wall-clock speedup, guarantee a real-time deadline or measure learning effectiveness. Doubling can keep more spare slots than a smaller fixed increment, while avoiding the latter's repeated arithmetic copy sum. Real allocation choices require a fuller model or measurement.

Removing elements without shrinking can invalidate the nonnegative-potential premise. Insertion in the middle can shift elements even without a resize. Those are different operation sets and need separate analysis.

## Questions and worked transfer responses

### 1. aa-units

The lab counts one unit to store a new element and one unit for each old element copied. What does a reported cost of 9 establish?

Correct answer: **The declared model counted 9 element writes/copies.**

The count belongs to an explicit abstract model. Allocation, zeroing, element byte sizes, cache behavior and elapsed time are excluded. The number is not a measured duration or instruction count.

Transfer: A resize copies six old elements and stores one new element. State its model cost and one excluded cost.

Worked response: The model cost is 6 + 1 = 7. Allocating the replacement block is one excluded cost; its actual time is not given.

### 2. aa-spare-slot

An array contains 3 elements in 4 slots. Under either policy, what does the next append cost?

Correct answer: **1 unit, because the new element fits without a resize.**

The array is not full, so it keeps its allocation and writes only the new element. Size becomes 4, capacity stays 4, and the cost is 1.

Transfer: Repeat the reasoning for size 7 and capacity 10.

Worked response: There are three spare slots before the append. One write costs 1; afterwards size is 8 and capacity is still 10.

### 3. aa-full-array

Before an append, a doubling array has size 4 and capacity 4. Which description matches the append?

Correct answer: **Copy 4 old elements into capacity 8, then store the new element: cost 5.**

The full array grows to eight slots. Only the four live elements are copied; unused replacement slots are not counted. Storing element 5 adds one unit, for a total of 5.

Transfer: What changes when the full doubling array has size and capacity 8?

Worked response: It grows to capacity 16, copies 8 live elements and stores the ninth. Its cost is 9, not 17.

### 4. aa-first-append

Both policies begin with size 0 and capacity 0. What are the copies and actual cost of the first append?

Correct answer: **0 copies and cost 1.**

A replacement allocation is needed, but there is no old element to copy. One new-element write costs 1. Doubling starts with capacity 1; fixed-increment growth starts with its chosen increment.

Transfer: For increment 5, state the size, capacity and spare slots after the first append.

Worked response: Size is 1, capacity is 5, and four slots are spare. Copies are 0 and the model cost remains 1.

### 5. aa-prefix-total

Starting empty, what is the total actual cost of the first 6 appends under doubling?

Correct answer: **13**

The six costs are 1, 2, 3, 1, 5, 1. Their sum is 13: six new writes and 1 + 2 + 4 = 7 copies. The expensive fifth operation is part of this same sequence.

Transfer: Find the total through append 7 without recomputing every step.

Worked response: After six appends capacity is 8, so append 7 needs one write and no copies. Total cost becomes 14.

### 6. aa-boundary-spike

After 8 doubling appends, total actual cost is 15. What happens at append 9?

Correct answer: **The total becomes 24 because this append copies 8 and writes 1.**

Append 9 is a full-array boundary. Its actual cost is 9, so the cumulative cost becomes 15 + 9 = 24. A constant amortized bound does not remove this spike.

Transfer: How much does append 10 add, and why?

Worked response: The ninth append made capacity 16. The tenth fits, adds 1, and raises total actual cost to 25.

### 7. aa-geometric-sum

A doubling trace ends after 13 appends with capacity 16. Which total follows from the earlier capacities that were copied?

Correct answer: **13 + (1 + 2 + 4 + 8) = 28.**

Before reaching capacity 16, the trace copies full arrays of sizes 1, 2, 4 and 8. Those copies sum to 15. The 13 new-element writes make the total 28.

Transfer: For a nonempty prefix ending at capacity P, express the total in terms of its append count N.

Worked response: The copied geometric sum is P - 1, so total actual cost is N + P - 1. This applies to the declared initially-empty doubling model.

### 8. aa-unit-growth

If capacity grows by exactly 1 whenever full, what is the total actual cost of the first 6 appends?

Correct answer: **21**

Every append resizes: actual costs are 1, 2, 3, 4, 5 and 6. The total is 21, not the doubling total of 13. More generally this policy costs N(N + 1)/2 for N appends in this model.

Transfer: Compare the two policies at 8 appends.

Worked response: Fixed increment 1 costs 8*9/2 = 36. Doubling costs 8 + 8 - 1 = 15. These are model counts, not a measured speed ratio.

### 9. aa-potential-value

For doubling only, the potential is Phi = 2*size - capacity. What is Phi at size 5 and capacity 8?

Correct answer: **2**

Phi is 2*5 - 8 = 2. It is an accounting quantity, not unused capacity (which is 3) and not a clock measurement. Reachable append-only doubling states have nonnegative potential.

Transfer: Compute potential and spare capacity at size 7 and capacity 8.

Worked response: Potential is 14 - 8 = 6. Spare capacity is 8 - 7 = 1. They are different quantities.

### 10. aa-potential-resize

A doubling append changes (size, capacity) from (4,4) to (5,8) and has actual cost 5. What is actual cost plus the change in potential?

Correct answer: **3**

Potential changes from 2*4 - 4 = 4 to 2*5 - 8 = 2. The amortized charge is 5 + (2 - 4) = 3. A negative potential change accounts for part of the costly resize.

Transfer: Find the charge for a non-resizing append from size 5 to 6 at capacity 8.

Worked response: Actual cost is 1. Potential increases from 2 to 4, so the charge is 1 + 2 = 3.

### 11. aa-initial-charge

The first doubling append goes from (0,0) to (1,1), costs 1, and changes potential from 0 to 1. What is its amortized charge?

Correct answer: **2, so the first operation is a small special case.**

The definition gives actual + change in potential = 1 + 1 = 2. Every later append has charge 3. The bound of at most 3 per append includes this initial exception.

Transfer: What is the sum of amortized charges for five appends?

Worked response: The first contributes 2 and the next four each contribute 3: 2 + 4*3 = 14.

### 12. aa-telescoping

After five doubling appends, the sum of amortized charges is 14 and final potential is 2. Initial potential was 0. What is the total actual cost?

Correct answer: **12**

Summing actual + potential-after - potential-before cancels all intermediate potentials. Thus total actual = total amortized - final potential + initial potential = 14 - 2 + 0 = 12.

Transfer: Why does nonnegative final potential make the sum of charges an upper bound here?

Worked response: Initial potential is zero. Subtracting a nonnegative final potential cannot increase the sum of charges, so total actual is at most total amortized, which is at most 3N.

### 13. aa-latency-guarantee

Which statement correctly interprets the constant amortized append bound for this doubling policy?

Correct answer: **Every prefix of N appends has at most 3N actual units, even though one append can cost much more than 3.**

The guarantee bounds accumulated work across any initially-empty append-only prefix. At full capacity m, the next append still costs m + 1. No probability model, allocation timing or real-time guarantee is part of this argument.

Transfer: At capacity 64, what can the next full-array append cost without contradicting the bound?

Worked response: It can cost 65 actual units: 64 copies plus one write. The prefix bound, not a per-operation maximum of 3, is what was proved.

### 14. aa-probability

Does this amortized analysis assume that append positions or array values are randomly chosen?

Correct answer: **No; it accounts deterministically for every permitted append-only sequence length.**

The costs depend on sizes and capacities, not the content values or a distribution over input sequences. Amortized analysis here is distinct from expected-case analysis over random inputs.

Transfer: All appended values happen to be equal. Does the model change?

Worked response: No. Each append still stores an element and each resize still copies the same number of live elements. Equal values are not deduplicated by this array model.

### 15. aa-fixed-three

For fixed increment 3, the first 10 appends resize at appends 1, 4, 7 and 10. What is their total actual cost?

Correct answer: **10 + (0 + 3 + 6 + 9) = 28.**

The copied sizes are the old full capacities: 0, 3, 6 and 9. Eighteen copies plus ten new writes cost 28. For a fixed positive increment, repeated copied capacities form an arithmetic sum, not a geometric sum.

Transfer: At the end of this trace, compare spare slots with doubling at 10 appends.

Worked response: Fixed increment 3 has capacity 12 and 2 spare slots. Doubling has capacity 16 and 6 spare slots. The different copy totals and space usage expose a tradeoff in this declared model.

### 16. aa-scope

Why must the lesson not reuse its append-only potential proof unchanged after arbitrary removals without shrinking?

Correct answer: **Removals can make 2*size - capacity negative, breaking the nonnegative-potential premise used here.**

For example, size 3 at capacity 8 gives potential -2. The lab does not model removals, shrink rules or their costs. A different operation set needs an appropriate proof rather than an unqualified reuse of this one.

Transfer: Name another omitted operation that would require separate cost analysis.

Worked response: Insertion in the middle can shift many elements even when capacity is available. A bound for append alone does not establish a constant bound for that operation.

## Keep or rebuild the materials

Editing either input immediately retires the old calculated result and disables its observation download. Apply validates both fields before rebuilding. A refused input remains available for correction. Inspection never reruns or changes the accepted trace. The fixed course and guide downloads remain available during editing because they are authored content, not the current calculation.

**Download observation** saves the complete accepted trace and the selected inspection step as JSON. It is a computed teaching record, not a timing receipt or a RecallWeave learner-answer archive. The page uses no automatic browser storage, network request, external font or provider. Reloading returns to its initial worked example.

Rebuild from the repository root with `node tools/build-amortized-arrays.mjs`; add `--check` to verify exact source/embedded-course/guide parity. Run `node --test tests/amortized-arrays*.test.mjs`. The course-only reuse grant follows the existing CC0-1.0 original-course convention; referenced materials are not relicensed.

## Background references

- Cornell CS3110 Lecture20, Amortized Analysis: https://www.cs.cornell.edu/courses/cs3110/2011sp/Lectures/lec20-amortized/amortized.htm
- MIT6.006 Lecture2, Data Structures and Dynamic Arrays: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-2-data-structures-and-dynamic-arrays/

The questions, displayed cases, derivations in this guide and implementation are newly authored. These references supply background, not copied questions or a claim of endorsed pedagogy.
