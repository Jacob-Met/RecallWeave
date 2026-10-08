# Mathematical induction: a base, a bridge, every integer

Open [the offline proof lab](mathematical-induction-lab.html), or import [the twelve-question lesson](mathematical-induction.json) into the [RecallWeave learner](../demo.html). The lab saves the exact lesson, this guide and an explicit proof record. Keep the project folder for sibling links; the lab itself works as one directly opened HTML file.

## The argument

State the integer domain first. Ordinary induction establishes P(n) for every integer n ≥ n₀ when the base P(n₀) is true and, for every integer n ≥ n₀, P(n) implies P(n + 1). Inside the step, P(n) is a conditional hypothesis used to derive the next case; it is not permission to assume the desired universal conclusion.

The base provides a starting point, and the implication carries its truth to each successive integer. Checking finitely many cases can expose errors or suggest a pattern, but does not by itself supply that all-n implication. With a step of size 2, a base at 0 reaches only even integers unless another bridge reaches the odd chain.

Mathematical background: MIT OpenCourseWare, *Mathematics for Computer Science*, [Chapter 3: Induction, especially §3.2](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/resources/mit6_042jf10_chap03/) (Fall 2010). The questions, wording, examples and interface here are original; no source exercises, passages or figures are copied.

## The exact family in the lab

Let t(k) = ak + b, and let S(n) add t(k) from k = 1 through n, with S(0) = 0. The conjecture is S(n) = Q(n), where Q(n) = (An² + Bn + C)/D, for every integer n ≥ n₀.

The first integer n₀ is 0 or 1. It changes the claimed domain, not the sum's lower index. The coefficients a, b, A, B and C are integers −20 through 20. D is an integer 1 through 20. Negative terms and sums are valid. All arithmetic is exact, with rational results shown as reduced fractions.

The base is checked by directly adding the actual terms. For the step, assume S(n) = Q(n). Adding the next term gives S(n + 1) = Q(n) + t(n + 1). The target is Q(n + 1), so the needed difference is:

```
Q(n + 1) − Q(n) = [2An + A + B]/D
t(n + 1) = an + a + b
residual = Q(n + 1) − Q(n) − t(n + 1)
         = [(2A − Da)n + A + B − D(a + b)]/D
```

D is nonzero. The residual vanishes at every integer in this infinite domain exactly when both numerator coefficients are zero; a nonzero linear expression cannot vanish at every integer. A true base plus these exact zero coefficients supplies the ordinary induction proof for this family. The ten displayed numerical rows are illustrations, not the source of the proof.

This restricted lab does not decide arbitrary statements, verify prose proofs, handle inequalities or accept higher-degree expressions. The failed examples also show a concrete counterexample among the displayed values. Editing an input retires the old proof and its record download. Explicit checking binds a new record to the accepted values. Choosing a worked example fills and checks it immediately. The course and guide remain fixed and downloadable independently.

## Six worked examples

| Example | Terms t(k) | Proposed Q(n) | What happens |
| --- | --- | --- | --- |
| Odd numbers | 2k − 1 | n², n ≥ 0 | Base 0 = 0; successor difference 2n + 1 matches. |
| Triangular numbers | k | n(n + 1)/2, n ≥ 0 | Base 0 = 0; successor difference n + 1 matches. |
| Correct step, false base | 2k − 1 | n² + 5, n ≥ 0 | Constant 5 cancels in the step, but the base is 0 ≠ 5. |
| True base, failed step | k | n², n ≥ 1 | Base 1 = 1; the next actual sum is 3 but the proposal is 4. |
| Two matches, then failure | k | (3n² − 5n + 4)/2, n ≥ 1 | Matches at 1 and 2; at 3 the proposal is 8 versus actual 6. |
| Negative terms | −2k + 3 | −n² + 2n, n ≥ 0 | Base 0 = 0; successor difference −2n + 1 matches. |

The two-matches proposal differs from the true triangular sum by (n − 1)(n − 2). That difference is zero at 1 and 2, and nonzero at every larger integer. A small numerical pattern can be convincing while its universal extension is false.

## Original questions and worked transfers

### 1. ind-domain

A statement P(n) is intended for every integer n ≥ 3. Which induction plan reaches exactly that whole intended domain?

Correct option, counted from 1: **2** — Prove P(3), then prove P(n) implies P(n + 1) for every integer n ≥ 3.

The base starts at the smallest intended integer, 3. The successor argument applies at every reachable n: 3 reaches 4, 4 reaches 5, and so on. A base at 0 cannot cross the missing 0-to-3 interval when the given step starts at 3. A finite list alone is not this universal argument.

**Transfer:** Suppose the intended domain is n ≥ 7. State a sufficient base and the precise range of the ordinary successor implication.

**Worked transfer:** For n ≥ 7, prove P(7) and prove P(n) implies P(n + 1) for every integer n ≥ 7.

### 2. ind-empty-base

Let S(n) = sum of (2k − 1) for k = 1 through n, with S(0) defined as the empty sum 0. For the claim S(n) = n² on integers n ≥ 0, what is its base check?

Correct option, counted from 1: **4** — S(0) = 0 and 0² = 0, so the stated base is true.

At n = 0 the index range 1 through 0 has no terms, so its sum is the stated empty sum 0. There is no k = 0 term. The right side is 0² = 0. Checking n = 1 is useful but does not replace the specified base at 0.

**Transfer:** For T(n) = sum from k = 1 through n of (4k + 1), state T(0) and T(1). Explain which is the base if the claim starts at 0.

**Worked transfer:** T(0) = 0; T(1) = 4·1 + 1 = 5. The base for a domain starting at 0 is T(0).

### 3. ind-hypothesis

You want to prove 1 + 2 + ⋯ + n = n(n + 1)/2 for every integer n ≥ 0, with the empty sum at 0. Which is a legitimate hypothesis inside the successor step?

Correct option, counted from 1: **1** — For an arbitrary integer n ≥ 0, assume the formula holds at n and use that assumption to derive it at n + 1.

The hypothesis is conditional at an arbitrary allowed n. You derive the next case using that condition, producing P(n) implies P(n + 1). Separately proving the base gives the starting point for repeated use. Assuming the final universal claim would skip the proof.

**Transfer:** Write the hypothesis and target for proving the odd-number sum S(n) = n² by induction starting at 0. Keep the assumed and to-be-proved statements distinct.

**Worked transfer:** Assume S(n) = n² at an arbitrary n ≥ 0. Derive S(n + 1) = (n + 1)² by adding 2n + 1.

### 4. ind-odd-step

Assume sum from k = 1 through n of (2k − 1) equals n². Which calculation justifies adding the next term?

Correct option, counted from 1: **3** — n² + [2(n + 1) − 1] = n² + 2n + 1 = (n + 1)².

The next index is n + 1, so its odd term is 2(n + 1) − 1 = 2n + 1. Under the hypothesis the new sum is n² + 2n + 1, which factors as (n + 1)². Using the old term 2n − 1 would advance the index incorrectly.

**Transfer:** Use the odd-number induction step at n = 4. State the old sum, new term and next sum.

**Worked transfer:** At n = 4 the old sum is 16, the new term is 9, and the next sum is 25 = 5².

### 5. ind-triangular-step

Assume the sum 1 + 2 + ⋯ + n is n(n + 1)/2. What does adding the next term n + 1 produce?

Correct option, counted from 1: **4** — n(n + 1)/2 + (n + 1) = (n + 1)(n + 2)/2.

Factor out n + 1: n(n + 1)/2 + (n + 1) = (n + 1)(n/2 + 1) = (n + 1)(n + 2)/2. This is the same proposed formula with n replaced by n + 1. The next term is n + 1, not 1 or n.

**Transfer:** Using the triangular formula at n = 4, calculate the fifth partial sum by adding the next term and by substituting into the formula.

**Worked transfer:** The old total is 4·5/2 = 10. Adding 5 yields 15; substitution gives 5·6/2 = 15.

### 6. ind-base-essential

For S(n) = sum from k = 1 through n of (2k − 1), someone proposes S(n) = n² + 5 for every integer n ≥ 0. The proposed right side increases by exactly 2n + 1 when n becomes n + 1. What does that establish?

Correct option, counted from 1: **2** — The successor difference matches, but the base fails: S(0) = 0 whereas 0² + 5 = 5.

Adding a constant does not change successive differences: (n + 1)² + 5 − (n² + 5) = 2n + 1. However, S(0) is 0 and the proposed base is 5. Without the true base this step cannot establish the claim. In fact the proposed expression stays 5 above the actual sum at every n.

**Transfer:** Replace the constant 5 by any integer c in the proposed odd-number formula n² + c. Which c passes the base at 0, and what happens to the successor difference?

**Worked transfer:** The base 0 = c holds only for c = 0. Every constant c cancels from the successor difference.

### 7. ind-step-essential

A proposed formula for 1 + 2 + ⋯ + n is n² for integers n ≥ 1. Its base at n = 1 is true. What happens at the first successor?

Correct option, counted from 1: **3** — The next sum is 1 + 2 = 3, while the proposed value 2² is 4; the base alone is insufficient.

At n = 1 the formula gives the right value 1, but at n = 2 the actual sum is 3 and the proposal is 4. A successful base is one required part, not evidence that every needed implication has been justified. This is a direct counterexample in the claimed domain.

**Transfer:** For the same false triangular proposal n², compare the true and proposed totals at n = 3. State the numerical difference.

**Worked transfer:** The true sum is 1 + 2 + 3 = 6 and the proposal is 9, an excess of 3.

### 8. ind-finite

For S(n) = 1 + 2 + ⋯ + n, consider Q(n) = (3n² − 5n + 4)/2. It matches S(n) at n = 1 and n = 2. Which observation correctly challenges a claim that these two matches prove equality for every n ≥ 1?

Correct option, counted from 1: **1** — At n = 3, S(3) = 6 but Q(3) = 8, so two matching cases did not prove the universal claim.

Q(1) = (3 − 5 + 4)/2 = 1 and Q(2) = (12 − 10 + 4)/2 = 3. But Q(3) = (27 − 15 + 4)/2 = 8, while 1 + 2 + 3 = 6. Two numerical matches leave this false proposal possible; they do not supply induction's all-n step.

**Transfer:** Write Q(n) as n(n + 1)/2 plus (n − 1)(n − 2). Use that difference to explain both initial matches and the discrepancy at n = 4.

**Worked transfer:** Q minus the true sum is (n − 1)(n − 2). At n = 4 the excess is 6: Q(4) = 16 versus S(4) = 10.

### 9. ind-step-size

For a statement about nonnegative integers, a proof establishes P(0) and P(n) implies P(n + 2) for every integer n ≥ 0. What coverage follows from those facts alone?

Correct option, counted from 1: **2** — Every nonnegative even integer; reaching the odd integers also needs a starting odd case or another bridge.

Adding 2 preserves parity. Repeatedly applying the given implication from 0 reaches 2, 4, 6 and every later even integer. It never reaches 1. A true base P(1) together with the same step would also start the odd chain.

**Transfer:** State two base cases that, together with the +2 successor implication, cover every integer n ≥ 0.

**Worked transfer:** P(0) starts the even chain and P(1) starts the odd chain. Both plus the all-n +2 implication cover every n ≥ 0.

### 10. ind-missing-bridge

A proof intends to establish P(n) for all integers n ≥ 4. It checks P(4), but its argument P(n) implies P(n + 1) is valid only for n ≥ 5. What is missing?

Correct option, counted from 1: **4** — A justification reaching P(5), such as a valid 4-to-5 step or a separate true base at 5.

The successor argument is unavailable at n = 4, so the stated proof cannot move from its only known base to 5. Proving P(5) separately would then let the given step cover 6, 7 and every larger integer, while P(4) remains separately checked.

**Transfer:** If the successor argument were valid only for n ≥ 6, which additional individual cases would bridge a checked P(4) to that range?

**Worked transfer:** Check P(5) and P(6), or supply valid bridges 4 → 5 and 5 → 6. The given step then reaches every later integer.

### 11. ind-arithmetic

Let S(n) = sum from k = 1 through n of (3k + 2), and S(0) = 0. Which proposed formula has the correct base and increases by the next term 3(n + 1) + 2 for every integer n ≥ 0?

Correct option, counted from 1: **1** — S(n) = (3n² + 7n)/2.

At n = 0, (3n² + 7n)/2 is 0. Its successor difference is [3((n + 1)² − n²) + 7]/2 = (6n + 10)/2 = 3n + 5, exactly 3(n + 1) + 2. These two facts prove the stated formula by induction on all n ≥ 0.

**Transfer:** Propose and verify a formula for the sum from k = 1 through n of (2k + 3), starting at n = 0.

**Worked transfer:** Sum(2k + 3) = n² + 4n. Base: 0. Successor difference: 2n + 5 = 2(n + 1) + 3.

### 12. ind-coefficients

In an exact symbolic check, the successor residual Q(n + 1) − Q(n) − t(n + 1) is (6n − 6)/2. It is zero at n = 1. Can this residual certify the required successor identity for every integer n ≥ 1?

Correct option, counted from 1: **3** — No; at n = 2 the residual is 3, so the successor identity fails within the stated domain.

Substituting n = 2 gives (12 − 6)/2 = 3. The required identity is therefore not true at every allowed n. A nonzero linear polynomial can have a particular zero without being identically zero. Exact symbolic coefficients, rather than a single successful substitution, determine that distinction.

**Transfer:** A successor residual is (0n + 0)/7. What does that establish about the successor identity? What separate fact is still needed for an induction proof?

**Worked transfer:** Residual 0/7 is zero for every n, so the successor identity holds. The starting case must still be true.

## Use and development

The lesson uses the existing RecallWeave preview, explicit start, question selection, feedback, review, practice and notes flows. Course links organize these concepts without changing model rules. Software qualification is not evidence of measured learning improvement.

```bash
node tools/build-mathematical-induction.mjs
node tools/build-mathematical-induction.mjs --check
node --test tests/mathematical-induction.test.mjs
node tools/check-mathematical-induction-browser.mjs
```

The browser receiver uses existing Playwright and Chrome/Chromium; see its environment overrides. Source and native receiving evidence lives in `docs/receiving/mathematical-induction-0378a7b6/`.

Original material authored for Jacob’s RecallWeave project with AI assistance. No additional reuse license is granted here; references retain their published terms.
