# Recursion and the call stack: waiting, returning, reusing

Open **[recursion-call-stack-explorer.html](recursion-call-stack-explorer.html)** to inspect a factorial or Fibonacci execution. The checked-in explorer is a separate, self-contained offline page. The companion **[recursion-call-stack.json](recursion-call-stack.json)** is an original twelve-question RecallWeave course.

The useful habit is to ask two questions at every child call: **What is the parent still waiting to do? What value will let it continue?** Then count the work separately from the number of frames active at once.

The background concepts follow NIST's descriptions of [recursion](https://xlinux.nist.gov/dads/HTML/recursion.html) and [memoization](https://xlinux.nist.gov/dads/HTML/memoize.html). Recursion solves a case directly or combines results from smaller calls. Memoization keeps computed answers for reuse. All questions, distractors, examples, calculations and explanations here are newly authored for RecallWeave; no reference exercise or passage is reproduced.

## The rules used throughout this course

A **call** means one invocation. The initial call, a base-case call and a cache-hit call each count. Equal input values can belong to different invocations.

An **active frame** belongs to an invocation that has entered and has not returned. A suspended parent stays active while its child executes. **Maximum stack depth** is the greatest number of simultaneously active frames, including the root and base cases. A completed child's frame is removed before a later sibling starts.

For memoization, **computed calls** means non-hit invocations. A hit contributes to total calls and hits, but not computed calls. At an intermediate cursor, a non-hit invocation may still be active; this counter does not assert that every such computation has already returned.

These are logical counts for the displayed algorithms. They are not elapsed-time measurements or measurements of an optimizing JavaScript engine's physical stack.

### Exact algorithm conventions

Inputs are nonnegative integers. The explorer bounds n to **0–10** so the full naive Fibonacci trace remains readable. Factorial stops **only at zero**; it does not shortcut at one. Fibonacci uses **F(0) = 0** and **F(1) = 1**.

The following is pseudocode. Every Fibonacci call completely evaluates its left child before starting its right child.

~~~text
factorial(n):
    if n = 0:
        return 1
    child = factorial(n - 1)
    return n × child

fib(n):
    if n = 0 or n = 1:
        return n
    left = fib(n - 1)
    right = fib(n - 2)
    return left + right
~~~

Memoized Fibonacci starts with a **fresh, empty cache for every run**. It checks for the key before handling a base case and stores every newly computed answer, including F(0) and F(1).

~~~text
memoFib(n, cache):
    if cache contains n:
        return cache[n]
    if n = 0 or n = 1:
        value = n
    otherwise:
        left = memoFib(n - 1, cache)
        right = memoFib(n - 2, cache)
        value = left + right
    cache[n] = value
    return value
~~~

A stored zero is a valid answer. Key membership distinguishes an absent entry from an entry whose value is zero. The linked NIST memoization article starts its illustrative Fibonacci code at inputs 1 and 2; use the explicit rules above for this course's trace and counts.

## What to investigate

| Concept | Question IDs | What the explanation should identify |
| --- | --- | --- |
| Base cases and progress | rc-base-zero, rc-progress-reachable, rc-fib-bases | A reachable stopping case and its actual returned value |
| Suspended calls and returns | rc-suspended-parent, rc-return-order, rc-second-child | Each parent's saved input, child result and remaining expression |
| Calls and active depth | rc-chain-cost, rc-tree-cost, rc-repeated-subproblem | Whole-run invocations, one active path and repeated subproblems |
| Memoized reuse | rc-cache-hit, rc-memo-counts, rc-fresh-run | A cache hit, work avoided and the cache's lifetime |

Prerequisite links in the imported deck help the existing adaptive selector choose questions. They do not enforce a fixed lesson order. Each question states the conventions it needs.

## Worked investigation 1: a parent keeps its unfinished work

Choose **Factorial**, enter **4**, and select **Run trace**. Move through the events with **Next**. When factorial(2) is the executing child and has not yet called factorial(1), the three active frames have different jobs:

| Invocation | State | Work retained |
| --- | --- | --- |
| factorial(4) | Suspended parent | Multiply factorial(3)'s return by 4 |
| factorial(3) | Suspended parent | Multiply factorial(2)'s return by 3 |
| factorial(2) | Executing child | Obtain factorial(1), then multiply by 2 |

Each frame keeps its own n. The current n = 2 does not overwrite the waiting inputs 3 and 4. Once factorial(2) returns 2, factorial(3) returns **3 × 2 = 6**, and factorial(4) returns **4 × 6 = 24**.

Now use **Factorial** with input **3** and inspect its return events:

| Completion order | Invocation finishing | Calculation | Returned value |
| ---: | --- | --- | ---: |
| 1 | factorial(0) | Base rule | 1 |
| 2 | factorial(1) | 1 × 1 | 1 |
| 3 | factorial(2) | 2 × 1 | 2 |
| 4 | factorial(3) | 3 × 2 | 6 |

The entry order was **3, 2, 1, 0**. Completion goes **0, 1, 2, 3** because each parent needs its child's result. The first two returned values happen to match. Their invocations and work remain distinct.

A base case's returned value becomes an input to the waiting expression. Returning 1 from factorial(0) does not make every parent return 1.

## Worked investigation 2: a smaller input must reach the base

Consider this separate countdown example from rc-progress-reachable:

~~~text
walk(n):
    if n = 0:
        return "done"
    return walk(n - 2)
~~~

Starting at 5 gives **5, 3, 1, −1, −3, …**. All these inputs are odd, so none equals zero. Merely decreasing is insufficient: this sequence crosses below the only stopping input and continues away from it.

Changing the decrement to one gives **5, 4, 3, 2, 1, 0**: six invocations and a reachable base. Starting from any nonnegative integer, the input decreases by one until it reaches zero. The example describes the input logic; an actual failing implementation also has finite machine resources. The explorer executes its defined factorial/Fibonacci algorithms and does not run arbitrary countdown code.

## Worked investigation 3: two children run in sequence

Choose **Fibonacci**, input **4**. The full naive call tree has nine invocation nodes:

~~~mermaid
flowchart TD
    A["1: F(4)"] --> B["2: F(3)"]
    A --> G["7: F(2)"]
    B --> C["3: F(2)"]
    B --> F["6: F(1)"]
    C --> D["4: F(1)"]
    C --> E["5: F(0)"]
    G --> H["8: F(1)"]
    G --> I["9: F(0)"]
~~~

Numbers identify entry order. Each box is a separate invocation, including the two boxes for F(2). The boxes collect the whole run's history; during execution the active stack follows one root-to-current-call path.

The entry sequence is **4, 3, 2, 1, 0, 1, 2, 1, 0**. The root's right F(2) starts after the left F(3) branch has finished. The first deepest path is **4 → 3 → 2 → 1**, containing four active frames. The run therefore has **nine calls and maximum depth four**, and returns **3**.

Zoom in on an F(3) frame after its left F(2) returns 1. The parent still needs its right F(1). It keeps the left value 1, calls F(1), receives another 1, and returns **2**. For an initial F(3) run, the active stack during that final right-child call contains only F(3) and F(1). The earlier left branch has already returned.

## Worked investigation 4: reuse a returned answer

Choose **Memoized Fibonacci**, input **5**, and finish the trace. The invocations enter in this order:

| Entry | Input | Handling |
| ---: | ---: | --- |
| 1 | 5 | Miss; compute the two children |
| 2 | 4 | Miss; compute the two children |
| 3 | 3 | Miss; compute the two children |
| 4 | 2 | Miss; compute the two children |
| 5 | 1 | Miss; store and return the base value 1 |
| 6 | 0 | Miss; store and return the base value 0 |
| 7 | 1 | Hit; return the stored value 1 |
| 8 | 2 | Hit; return the stored value 1 |
| 9 | 3 | Hit; return the stored value 2 |

The six computed inputs are **0 through 5**. Their first results finish and enter the cache in the order **1, 0, 2, 3, 4, 5**. The three hits for inputs **1, 2, 3** have their own invocation frames but create no child calls.

The result is **5**, with **9 total calls = 6 computed calls + 3 hits**. The first descent still contains **5 → 4 → 3 → 2 → 1**, so maximum active depth is **5**. Naive F(5) has the same result and maximum depth, but makes **15 calls**. Reusing answers reduces repeated work while this first descent remains.

### A cache belongs to a run

Starting another memoized F(5) run in this explorer creates another empty cache. Its counts repeat: **9 calls, 6 computed calls, 3 hits, maximum depth 5**.

A separate program could deliberately retain the completed cache. A later F(5) request using that cache would return 5 with **1 call, 0 computed calls, 1 hit and maximum depth 1**. That is a warm-cache experiment with a different initial state. The explorer's comparisons use fresh caches.

## Derive the counts independently

For factorial under the zero-only base rule, the inputs are n, n−1, …, 0. There are **n + 1 calls**, and the entire chain is active before the base returns, giving **maximum depth n + 1**.

For naive Fibonacci, write C(n) for the total number of invocations. The root contributes one call, followed by both child runs:

- C(0) = C(1) = 1.
- C(n) = 1 + C(n−1) + C(n−2) for n ≥ 2.
- Equivalently, C(n) = 2F(n+1) − 1 under F(0) = 0 and F(1) = 1.

The maximum active depth is 1 for n = 0 or 1, and n for n ≥ 2. The two child branches run sequentially, so their depths are compared and the parent adds one; their depths are not added together.

For fresh memoized Fibonacci with n ≥ 2, each input from 0 through n is computed once. Exactly n−1 of these inputs are non-base computations, and each of those makes two child invocations. Including the root gives **1 + 2(n−1) = 2n−1 total calls**. There are **n+1 computed calls**, so **n−2 calls are hits**. For n = 0 or 1, handle the base separately: one computed call and no hit.

| n | F(n) | Naive calls | Memo calls | Memo computed | Memo hits | Maximum depth, either Fibonacci run |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 1 | 1 | 1 | 0 | 1 |
| 1 | 1 | 1 | 1 | 1 | 0 | 1 |
| 2 | 1 | 3 | 3 | 3 | 0 | 2 |
| 3 | 2 | 5 | 5 | 4 | 1 | 3 |
| 4 | 3 | 9 | 7 | 5 | 2 | 4 |
| 5 | 5 | 15 | 9 | 6 | 3 | 5 |
| 6 | 8 | 25 | 11 | 7 | 4 | 6 |
| 7 | 13 | 41 | 13 | 8 | 5 | 7 |
| 8 | 21 | 67 | 15 | 9 | 6 | 8 |
| 9 | 34 | 109 | 17 | 10 | 7 | 9 |
| 10 | 55 | 177 | 19 | 11 | 8 | 10 |

The table concerns these algorithms and initial states. It explains why the explorer caps input at 10: even the largest naive run contains a bounded 177 invocations. It is not a benchmark or a claim about every possible Fibonacci algorithm.

## Use and keep an exploration

Choose **Algorithm** and **Input n**, then **Run trace**. **Previous**, **Next** and **Jump to event** inspect the selected event. **Run to end** selects the completed state; **Back to start** returns to the beginning.

Read **Active call stack** for the current frames, saved child values and remaining expression. **Returned values** records completed calls through the selected position. **Cache** shows the reuse state. The **Completed-run comparison** for Fibonacci separately compares the full naive and fresh-cache runs at the same n.

Changing the algorithm or input clears the previous trace until **Run trace** is selected again. This keeps a previous run from being downloaded under edited input. The page uses exact integer results and deterministic traces; moving the cursor does not perform a new recursive calculation.

Two downloads have different purposes:

| Action | Downloaded content | Intended use |
| --- | --- | --- |
| **Download course (.json)** | The fixed original twelve-question deck, including answers, explanations, transfers and attribution | Import into RecallWeave's learner or Deck Studio |
| **Download this trace (.json)** | The full exact trace, plus selectedStep and selectedState identifying the displayed cursor | Inspect or compare an exploration as JSON |

The run record's format is **recallweave-recursion-trace/1**. It includes the full run even when the cursor is at an earlier event, with the selected position labeled separately. It is not a RecallWeave learner-session archive, and the explorer does not import it to restore a run. There is no automatic account, upload or browser persistence.

## Study the questions in RecallWeave

Open **[demo.html](../demo.html)** and choose **recursion-call-stack.json** under **Bring your own lesson**. Inspect the title and twelve-question preview, then select **Start this deck**. Previewing or cancelling leaves the existing lesson usable; starting the selected deck creates its fresh learning session.

Each answer receives its explanation and transfer prompt. Complete the lesson to use **Review the connections**, retry missed items, write your own explanations and **Download study notes (.txt)**. The canonical correct answer identifies an option's content; displayed choices may be shuffled. A corrected practice answer stays separate from the original first answer.

To edit the course, open **[Deck Studio](../author.html)**, use **Open draft or deck**, inspect the checked-deck preview and select **Replace draft**. **Check and preview** and **Download checked deck (.json)** use the existing course format. A saved editable draft is a separate format from an importable checked course.

The learner's selected deck and answers stay in its tab's memory. Reloading returns to the bundled lesson. Its explicit learning-trace download/restore workflow remains separate from the explorer's recursion-trace JSON. Structural import validation checks the deck format; it does not establish subject accuracy or learning efficacy.

## Answer and worked transfer notes

Use the stable item IDs and answer content rather than a displayed letter.

| Item | Correct answer and reason | Worked transfer response |
| --- | --- | --- |
| rc-base-zero | factorial(0) returns **1** with **1 call, depth 1**. The root is already an invocation. | factorial(1) calls inputs **1, 0**. The base returns 1; the parent multiplies 1 × 1 and returns 1. **2 calls, depth 2**. |
| rc-progress-reachable | Subtracting two from 5 never reaches zero: **5, 3, 1, −1, …** stay odd. | Subtract **one**. Inputs are **5, 4, 3, 2, 1, 0**, giving **6 invocations**. The nonnegative integer input has a reachable lower endpoint. |
| rc-fib-bases | F(2) calls **F(1), then F(0)** and returns **1 + 0 = 1**. | F(3) enters inputs **3, 2, 1, 0, 1**. Its left F(2) returns 1 and right F(1) returns 1, so the root returns **2**. |
| rc-suspended-parent | factorial(3) retains **3 × child**, then factorial(4) retains **4 × child**. | A child result of 2 gives factorial(3) = **6**, followed by factorial(4) = **24**. |
| rc-return-order | Completion is **0, 1, 2, 3**, returning **1, 1, 2, 6**. | factorial(0) returns its base value 1. factorial(1) is a separate invocation that receives that 1 and computes **1 × 1 = 1**. |
| rc-second-child | Keep left result **1**, call **F(1)**, then add the child's return. | For this initial F(3) run, active frames are **F(3), F(1)**. F(3) retains left = **1** and awaits the right value; the result becomes **2**. |
| rc-chain-cost | factorial(5) has **6 calls, depth 6**; the result 120 is a different quantity. | factorial(6) returns **720**, with **7 calls and depth 7**. Each extra input adds one frame and one call, while the returned product multiplies by the new n. |
| rc-tree-cost | Naive F(5) has **15 calls, depth 5**. | Naive F(6) makes **1 + 15 + 9 = 25 calls**, reaches **depth 6**, and returns **8**. |
| rc-repeated-subproblem | F(4) has **two distinct F(2) invocations**. | F(5)'s F(4) branch contains two and its F(3) branch contains one, for **three F(2) invocations**. |
| rc-cache-hit | One F(2) request is **one call and one hit**, returns stored **1**, and starts no children. | Stored **F(0) = 0** is a valid hit. Ask whether key 0 is present, rather than treating a zero answer as missing. |
| rc-memo-counts | Fresh F(5): **9 calls, 6 computed, 3 hits, depth 5**, returning **5**. | Fresh F(6): **11 calls, 7 computed, 4 hits, depth 6**, returning **8**. Naive F(6) makes **25 calls** at the same maximum depth. |
| rc-fresh-run | Another fresh F(5) run repeats **9 calls, 6 computed, 3 hits, depth 5** and result **5**. | Deliberately keeping the completed cache would instead yield result **5** with **1 call, 0 computed, 1 hit, depth 1**. That uses a different initial cache. |

The twelve questions have four options each, with three correct answers in each canonical position. This balances the content file's answer positions; it is not a psychometric or learning-outcome validation.

## Provenance and content verification

The course, worked examples and transfer answers were authored for Jacob's RecallWeave project with AI assistance. The questions are original. NIST's background material is linked above and retains its own terms; this file grants no additional reuse license for the course.

The content uses the existing **recallweave-deck/1** importer, author-draft conversion, adaptive selection, review, practice and study-note functions. Those consumers and the learning model are unchanged. The dedicated content controls are:

~~~bash
node --test tests/recursion-call-stack-course.test.mjs
~~~

The content receiving record pins the actual source and results. It separates native importer/consumer checks from an actual browser import, and from the explorer owner's engine/UI tests. Calculations are checked with a separate finite-product/binomial-sum reference and the derived call-count formulas rather than a second implementation of the explorer's event tracer.
