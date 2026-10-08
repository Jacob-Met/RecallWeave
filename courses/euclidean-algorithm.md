# Euclid's algorithm: remainders, gcds and integer combinations

Open the [Euclidean algorithm explorer](euclidean-algorithm-explorer.html) directly in a browser. Enter two whole decimal numbers, choose **Compute the steps**, and inspect the exact remainder steps and integer combinations. It works from a local file without an installation, account or network connection.

The accompanying [twelve-question course](euclidean-algorithm.json) uses the existing RecallWeave lesson format. In RecallWeave, choose it under **Bring your own lesson**, inspect the preview, and select **Start this deck**. The normal learning trace, explanations, separate missed-question practice, study notes and saved learning trace then use this course. Answer letters are shuffled by the existing learner; the answer identities in this guide refer to the original option text.

## What the lesson develops

| Concept | Questions | Connection |
| --- | --- | --- |
| Division with remainder | 3 | A quotient and remainder must reconstruct the dividend and satisfy the remainder bounds. |
| Gcd and common divisors | 3 | A common divisor solves exact grouping problems; zero inputs and coprimality need precise meanings. |
| Invariant and termination | 3 | A remainder step preserves all common divisors while the second entry strictly decreases. |
| Integer combinations | 3 | Tracking subtraction expresses the gcd as a combination of the original integers; the coefficients need not be unique. |

The prerequisite links run from division to gcd, from those ideas to the invariant and termination, and then to integer combinations. RecallWeave's existing adaptive selector chooses the question order. Its illustrative learning-model estimates remain model state, not grades or evidence that this course improves learning.

## Use the explorer

1. Enter **First integer A** and **Second integer B**. Values run from 0 through 999999. Leading zeros and surrounding whitespace are accepted. Negative signs, plus signs, decimal fractions, exponents, separators and nondecimal digits are refused. Each trimmed value has at most six decimal digits, and each input string has at most 32 characters.
2. Choose **Compute the steps**. The page shows the gcd, a complete Bézout identity and the number of actual divisions. It preserves your input order.
3. Use **Previous**, **Next** and **Last division**, or choose a row in the complete table, to inspect one division. The inspector shows the exact equation, remainder bound, next ordered pair, and each value expressed using the original two inputs.
4. Read the proportional strip as a visual aid. Its widths are approximate. The quotient groups are combined into one segment; the exact integer labels and division equation carry the arithmetic.
5. Choose **Download this exact trace** to save the complete current computation, or **Download the RecallWeave lesson** to save the exact original lesson.

Editing either input or loading a preset retires the previous result immediately. Compute again before inspecting or downloading a trace. The course download remains available even when an input is incomplete or invalid. Choosing a preset fills the inputs; it does not silently calculate.

The trace download always contains the full computation, even if the inspector currently shows an early division. A browser may ask where to save a file. A download-request message reports that the request was issued; it does not claim the browser finished saving it.

The page has labelled inputs, native keyboard-operable controls, a visible focus outline, a live status region and text equivalents for the diagram. On a narrow viewport the sections stack. Only the detailed division table has a horizontal scrolling region. All learning controls run locally; the source references are ordinary links opened only when selected.

## The two facts behind the algorithm

For nonnegative integers a and positive b, division gives unique integers q and r such that

> a = qb + r, with 0 ≤ r < b.

The equation alone is insufficient. For example, both 87 = 6 × 12 + 15 and 87 = 8 × 12 − 9 reconstruct the dividend, but neither gives a valid Euclidean remainder. The valid division is 87 = 7 × 12 + 3.

Replacing (a, b) with (b, r) preserves every common divisor:

- If d divides a and b, it divides a − qb = r.
- If d divides b and r, it divides qb + r = a.

These are the two directions of the invariant. The whole set of common divisors is unchanged, so its greatest positive member is unchanged whenever the inputs are not both zero.

The second entry also strictly decreases: its next value is r, a nonnegative integer smaller than b. This cannot continue forever. When the second entry becomes zero, the first entry is the gcd. The quotients do not have to decrease, and neither entry must halve at each step. These facts follow the treatment in [MIT's 2024 divisibility lecture](https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec08.pdf), especially its division, gcd and Euclid sections.

### Worked example: 252 and 198

| Division | Equation | Next pair |
| --- | --- | --- |
| 1 | 252 = 1 × 198 + 54 | (198, 54) |
| 2 | 198 = 3 × 54 + 36 | (54, 36) |
| 3 | 54 = 1 × 36 + 18 | (36, 18) |
| 4 | 36 = 2 × 18 + 0 | (18, 0) |

The answer is 18: 252 = 14 × 18 and 198 = 11 × 18. The final remainder zero is the stopping signal. The final divisor 18 supplies the gcd.

A first input smaller than the second is valid. Starting with (14, 39) gives 14 = 0 × 39 + 14, then the pair (39, 14). The explorer includes that real quotient-zero division. It does not reorder your inputs before displaying a trace.

### Zero and exact divisibility

| Inputs | Actual divisions | Result |
| --- | --- | --- |
| (45, 0) | None: the initial second entry is already zero. | gcd = 45 |
| (0, 45) | 0 = 0 × 45 + 0 | gcd = 45 |
| (19, 19) | 19 = 1 × 19 + 0 | gcd = 19 |
| (144, 24) | 144 = 6 × 24 + 0 | gcd = 24 |
| (0, 0) | None | gcd = 0 by the stated convention |

Every positive divisor of n also divides zero, because 0 = d × 0. Thus gcd(0, n) = n for positive n. When both inputs are zero, there is no greatest positive common divisor: every positive integer divides both. This course and explorer explicitly use the computational convention gcd(0, 0) = 0, also stated in the linked MIT lecture.

## Why integer combinations stay exact

Begin by expressing the inputs using themselves:

> a = 1 × a + 0 × b  
> b = 0 × a + 1 × b

If the current dividend has coefficients (u, v) and the divisor has coefficients (x, y), their remainder is

> (u − qx) × a + (v − qy) × b.

This is the same subtraction as dividend − q × divisor. Tracking the two coefficients therefore preserves an exact representation of every remainder. At the end it gives an identity

> gcd(a, b) = x × a + y × b.

Negative coefficients are allowed. They record subtraction; they do not make the gcd negative. [MIT's 2010 Recitation 4 notes](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/4f6767747decf6209215cfe789cef5f6_MIT6_042JF10_rec04_sol.pdf) discuss this integer-combination property alongside the Euclidean algorithm.

### Back-substitution: 88 and 26

The successive divisions are:

> 88 = 3 × 26 + 10  
> 26 = 2 × 10 + 6  
> 10 = 1 × 6 + 4  
> 6 = 1 × 4 + 2  
> 4 = 2 × 2 + 0

Work backward from the last nonzero remainder:

> 2 = 6 − 4  
> = 2 × 6 − 10  
> = 2 × 26 − 5 × 10  
> = 17 × 26 − 5 × 88.

Multiplication checks the identity: 442 − 440 = 2. The explorer's coefficient rows express the same reasoning while the divisions run forward.

A valid coefficient pair is not necessarily unique. For 24 and 30, both (−1, 1) and (4, −3) give 6. Adding 5 to the first coefficient and subtracting 4 from the second changes the value by 5 × 24 − 4 × 30 = 0. Another pair is (9, −7), since 216 − 210 = 6. The explorer returns one representation; a different pair can be equally correct.

Every integer combination also retains a divisor shared by its inputs. Since 6 divides both 18 and 30, it divides 18x + 30y for every pair of integer coefficients. Thus 25 is impossible. In contrast, 42 = 4 × 18 − 30, 0 = 0 × 18 + 0 × 30, and −12 = 18 − 30 have explicit witnesses.

## Course answer and transfer guide

The following answers use the original option text. The learner may display these options under different letters.

| Question ID | Correct answer | Reason and misconception |
| --- | --- | --- |
| euclid-division-1 | (7, 3) | It reconstructs 87 and satisfies 0 ≤ 3 < 12. The pairs (6, 15) and (8, −9) satisfy the equation but violate a bound; (3, 7) reconstructs 43. |
| euclid-division-2 | (39, 14) | The quotient is zero; the new pair is divisor then remainder. Subtracting the entries without applying that rule gives a different procedure. |
| euclid-division-3 | 0 ≤ r < b | Exact division allows zero. A remainder equal to the divisor belongs in the quotient. |
| euclid-invariant-1 | The two rearranged identities transfer divisibility in both directions. | A remainder need not be prime, and a divisor of the first input need not divide the second. The proof needs both directions. |
| euclid-invariant-2 | 18 | The final pair is (18, 0). Zero is the stopping remainder, 2 is the final quotient, and 36 does not divide 198. |
| euclid-invariant-3 | The new second entry is a nonnegative integer strictly smaller than y. | Neither a fixed decrement nor a halving rule is required. |
| euclid-gcd-1 | 42 packets, each with 2 blue and 3 gold cards | A packet count must divide both totals. The 21- and 6-packet alternatives work but are smaller; 252 packets require unavailable cards. |
| euclid-gcd-2 | gcd(0, 45) = 45 and gcd(0, 0) = 0 | The second value is an explicit convention; it is not a greatest positive divisor of zero. |
| euclid-gcd-3 | (14, 25) | Their gcd is 1. The other pairs have common divisors 7, 5 and 11 respectively. Neither coprime number must be prime. |
| euclid-combination-1 | 2 = (−5) × 88 + 17 × 26 | The right side is 2. The other proposed right sides are −2, 6 and −10. |
| euclid-combination-2 | 25 | It is not divisible by 6; the other three targets have explicit integer coefficients. |
| euclid-combination-3 | (4, −3) | 96 − 90 = 6. The other coefficient pairs give 246, 0 and −6. |

### Example responses to the transfer prompts

These are worked examples, not a unique answer key for open writing.

1. With divisor 12, choose 95 = 7 × 12 + 11. The equation holds and 0 ≤ 11 < 12.
2. Start with (17, 50). The first division is 17 = 0 × 50 + 17, followed by (50, 17). A zero quotient still gives a smaller second entry.
3. With divisor 8, use 40 = 5 × 8 + 0 and 47 = 5 × 8 + 7. These realize the smallest and largest allowed remainders.
4. For a = qb + r, a common divisor of a and b divides a − qb; a common divisor of b and r divides qb + r. Both directions are necessary to equate the common-divisor sets.
5. 315 = 1 × 225 + 90; 225 = 2 × 90 + 45; 90 = 2 × 45 + 0. The final pair is (45, 0), giving gcd 45.
6. Each second entry is an integer at least zero and strictly smaller than the previous one. There are only finitely many nonnegative integers below the initial second entry, so the process stops without a fixed decrement.
7. For 70 blue and 98 gold cards, gcd = 14. Fourteen equal packets each contain 5 blue and 7 gold cards, exhausting both totals.
8. If d divides positive n, then d also divides zero through 0 = d × 0. From (n, 0), Euclid performs no division and returns n.
9. The composite pair (8, 15) is coprime: 15 = 1 × 8 + 7 and 8 = 1 × 7 + 1. The next remainder is zero.
10. Substitute 4 = 10 − 6, then 6 = 26 − 2 × 10, then 10 = 88 − 3 × 26 into 2 = 6 − 4. This yields −5 × 88 + 17 × 26 = 2.
11. Use (x, y) = (4, −1) for 42 and (1, −1) for −12. Each input is a multiple of 6, so subtracting any integer multiples still produces a multiple of 6.
12. The pair (9, −7) also gives 6 from 24 and 30. The shift (+5, −4) contributes zero, so applying it again produces another representation.

A useful application reflection is to choose two quantities, justify their greatest possible equal grouping with the division trace, and check one integer-combination identity. Explain separately why the algorithm stops and why its result is the gcd.

## Source, format and receiving

All twelve question prompts, answer options, explanations, numerical worked examples and the explorer presentation are original RecallWeave material. The linked MIT sources supply the mathematical background. No textbook exercise, passage or figure is reproduced. The course attribution and permission statement travel with the JSON and the existing learner's downloaded notes. The MIT materials retain their own terms.

The pure implementation is [src/euclidean-algorithm.mjs](../src/euclidean-algorithm.mjs). It uses JavaScript BigInt for all division and coefficient arithmetic. The UI converts bounded nonnegative values to Number only to choose approximate SVG widths. It never uses those widths to calculate or validate the result.

The exported trace has format `recallweave-euclid-trace/1`, canonical original inputs, an explicit zero convention, the complete array of divisions, the gcd and one final coefficient pair. Every integer is decimal text except the one-based step index. Each division also includes dividend, divisor and remainder coefficient pairs. Results are recursively frozen within the program; JSON downloads are ordinary data and can be edited independently. The explorer does not import a trace or treat an edited file as verified evidence.

The mathematical trace is separate from the learner's saved learning trace. The former records one integer computation. The latter records the existing app's completed course answers and practice progress and is restored through that app's explicit preview flow.

Rebuild the self-contained explorer from its exact source inputs:

```bash
node tools/build-euclidean-algorithm.mjs
node tools/build-euclidean-algorithm.mjs --check
```

Run the focused core and course integration checks using Node 20+:

```bash
node --test tests/euclidean-algorithm.test.mjs tests/euclidean-algorithm-course.test.mjs
```

The core tests compare the complete 0–80 input square with common-divisor enumeration and bounded larger inputs with a separate binary-gcd oracle. They check every displayed division and coefficient identity, swapped/zero/equal/divisible inputs, input refusal, exact JSON and immutable results. Course checks use the unchanged deck parser, adaptive selector, review, separate practice and study-note functions. The generated-file check compares exact bytes. The native browser receiving packet records actual controls, saved downloads and current learner interoperability separately.

The explorer is a bounded teaching tool for nonnegative integers. It does not accept general signed inputs, fractions, arbitrary-size numbers or imported computation files. Its arithmetic identities do not establish learning efficacy or qualify any security application.
