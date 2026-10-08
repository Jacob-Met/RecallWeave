# Congruences together: a common integer class

Open [the congruence lab](congruences-explorer.html) directly in a browser. The file is self-contained and needs no server, dependency, connection or account. Enter two conditions, choose **Compute both conditions**, and inspect the exact proof and a selected integer. The original [fourteen-question lesson](congruences.json) works through RecallWeave's existing **Bring your own lesson** preview and explicit start, feedback, review, separate practice and saved notes.

The preceding [Euclid course](euclidean-algorithm.md) develops gcd and integer combinations. This new lesson uses those ideas without modifying that course or the learner. It covers exactly two remainder conditions, not arbitrary systems or an inferred real-world schedule.

## Remainders and the complete class

For a positive integer modulus m, x ≡ a (mod m) means that m divides x − a. The canonical representative is the unique r in 0 ≤ r < m. Thus −14 and 1 describe the same class modulo 5. A class includes negative integers: x ≡ 7 (mod 20) means x = 7 + 20j for every integer j, including −1.

Modulo 1 every integer has canonical remainder zero, so that condition imposes no restriction. The lab accepts modulus 1 explicitly. Zero or negative moduli refuse rather than silently choosing a different convention.

## From two conditions to one exact construction

Normalize the supplied residues to a and b. A common solution has the form x = a + mk, and its second condition becomes

    mk ≡ b − a (mod n).

Let g = gcd(m, n). If a solution exists, g divides m, n and therefore b − a. When g does divide that difference, set M = m/g, N = n/g and d = (b − a)/g. The reduced equation is

    Mk ≡ d (mod N).

The exact extended Euclidean calculation produces integers s and t satisfying sm + tn = g. Dividing by g gives sM + tN = 1. When N > 1, the canonical residue of s modulo N is an inverse of M. Then k = sd modulo N solves the reduced equation. When N = 1, every multiplier satisfies the reduced condition; the lab chooses k = 0 and explicitly records no inverse.

Substitute x = a + mk and normalize modulo L = mN = lcm(m, n). This produces the least nonnegative solution x0. Every x0 + Lj is a solution. Conversely, the difference between any two common solutions is divisible by both m and n and hence by L. Therefore this single class contains every integer solution, and L is its least positive period.

If the gcd fails to divide the residue difference, the lab presents that contradiction. It does not invent a solution, rely on a finite search, or interpret an empty displayed window as impossibility.

This derivation applies the linear-congruence reduction and inverse construction discussed in [MIT OpenCourseWare, Abhinav Kumar, Theory of Numbers, Lecture 5](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/7b36e2ada32c5ed0638783d4e66af60c_MIT18_781S12_lec5.pdf). The pairwise-coprime Chinese remainder theorem is the special case g = 1, which guarantees compatibility for every pair of residues. Shared factors require the compatibility check; they do not automatically imply failure. All examples, questions and presentation here are original.

## Worked contrasts

| Conditions | Compatibility and result |
| --- | --- |
| x ≡ 3 (mod 4), x ≡ 2 (mod 5) | g = 1. The least solution is 7; every solution is 7 + 20j. |
| x ≡ 2 (mod 6), x ≡ 5 (mod 9) | g = 3 divides difference 3. Reduced 2k ≡ 1 (mod 3) gives k = 2, x0 = 14, period 18. |
| x ≡ 1 (mod 4), x ≡ 2 (mod 6) | g = 2 does not divide difference 1. One condition is odd, the other even: no solution. |
| x ≡ −14 (mod 5), x ≡ −1 (mod 7) | Normalize to 1 and 6. The least solution is 6, period 35. |
| x ≡ 5 (mod 12), x ≡ 1 (mod 4) | The second condition is redundant. Reduced N = 1; x0 = 5, period 12, no inverse needed. |
| x ≡ 6 (mod 7), x ≡ −1 (mod 7) | Identical classes after normalization. x0 = 6 and period 7. |
| x ≡ 0 (mod 1), x ≡ 9007199254740993 (mod 999999999999999999) | Modulus 1 removes no integers. The exact first solution is 9007199254740993, beyond Number's safe-integer range; period 999999999999999999. |

Reversing the order of the two conditions can change the displayed multiplier and Bézout coefficients. It cannot change compatibility, x0 or L. A Bézout witness is not unique; its exact identity is what matters.

## Input, precision and interaction boundaries

Residues and moduli are decimal text, at most 18 digits excluding an optional + or − sign, and moduli must be positive. Leading zeros count toward the digit bound. Whitespace is trimmed for parsing, while the applied raw text is retained in the observation. Each input also has a total-text bound of 50 characters. Empty input, fractions, scientific notation, hexadecimal text and nondecimal characters refuse.

Every arithmetic identity, remainder, coefficient, solution and period uses JavaScript BigInt. The serialized integer values are decimal strings, so JSON does not round them. Only bounded row offsets and diagram positions use Number. A large least common multiple is never expanded into all of its members.

The inspector accepts a signed whole integer of at most 72 digits excluding sign and a total-text bound of 104 characters. It displays that integer and its next 23 successors. A successor may have an additional digit: it is computed exactly, not reread through an input bound. The lane diagram's horizontal coordinates are offsets 0–23 from the chosen start. The accompanying exact table retains all 24 integers, both canonical remainders and textual match states. Large values remain literal; the graph is not a floating-point picture of a whole period.

Computing a compatible pair initially inspects x0. An incompatible pair initially inspects zero, with the contradiction separately visible. **Inspect least nonnegative solution** is unavailable for an incompatible pair. Loading an example changes the input fields and retires the old result; computing is explicit. Editing a condition retires both its old proof and inspection. Editing only the inspected integer retires that window and observation download until **Inspect** succeeds. No stale calculation is presented as current input.

## Keep an observation or a lesson

**Download exact observation** records format `recallweave-congruence-observation/1`, the applied input text, normalized conditions, gcd/Bézout witness, compatibility remainder, solution (or null), and the entire selected 24-row window. It is a mathematical inspection record, separate from RecallWeave's learner-answer archives. The lab does not import observations or treat edited JSON as independently verified evidence.

**Download course JSON** and **Download worked guide** save the exact embedded source texts. In RecallWeave, preview the JSON then explicitly start the deck. The existing learner may shuffle displayed answer letters; answer identity is tied to the original option, not its shown letter. These downloads do not change a learning session, write browser storage or make a network request.

Keep a downloaded file before reloading if you want to retain the observation. A prepared browser download still needs the browser's ordinary save outcome; the page does not claim it has verified your destination filesystem.

## Original answer and transfer guide

The correct option text below is canonical; the learner may display different letters.

### 1. congruences-residue-1

**1**

The identity −14 = (−3) × 5 + 1 has remainder 1 in the required range. The negative remainder −4 also differs from −14 by a multiple of 5, but is not the canonical representative. Neither 4 nor 0 is congruent to −14 modulo 5.

Example transfer response: −23 = (−4) × 6 + 1, so the canonical remainder is 1.

### 2. congruences-residue-2

**−11, 3, 17**

Subtracting 3 from −11, 3 and 17 gives −14, 0 and 14, each divisible by 7. A congruence describes infinitely many integers, including negative ones; it is not an equation that forces x = 3.

Example transfer response: Examples are −18, 10 and 24. Their differences from 3 are −21, 7 and 21.

### 3. congruences-residue-3

**It imposes no restriction.**

Every integer difference x − 4 is divisible by 1. The sole canonical residue modulo 1 is zero, so normalizing the written residue 4 gives 0. Modulus 1 is valid and does not discard any integer candidate.

Example transfer response: The modulo-1 condition adds no restriction. The first solution is 3 and the period is 8.

### 4. congruences-inverse-1

**8**

7 × 8 = 56 = 5 × 11 + 1, so 8 is an inverse. The other products have remainders 6, 5 and 10. An inverse is a multiplicative identity witness modulo the modulus, not an ordinary fraction.

Example transfer response: k ≡ 8 × 2 ≡ 5 (mod 11). Check 7 × 5 = 35 ≡ 2.

### 5. congruences-inverse-2

**No: every 6k is divisible by 3.**

If 6k were congruent to 1 modulo 9, then 6k − 1 would be divisible by 9 and hence by 3. But 6k is divisible by 3 and 1 is not. The obstruction is gcd(6, 9) = 3, not whether the input is prime.

Example transfer response: 8 × 2 = 16 ≡ 1 (mod 15); gcd(8, 15) = 1 although both are composite.

### 6. congruences-compatible-1

**gcd 3 divides difference 3, so a solution exists.**

The gcd is 3 and the normalized residue difference is 5 − 2 = 3. Divisibility by the gcd is the condition. Shared factors do not automatically cause a contradiction; here 14 leaves remainders 2 and 5. Coprime moduli guarantee compatibility for every residue pair, but they are not necessary for this particular pair.

Example transfer response: Choose second residue 4. Difference 4 − 2 = 2 has remainder 2 modulo gcd 3, so no solution exists.

### 7. congruences-compatible-2

**The first condition requires odd x; the second requires even x.**

The first class consists of odd integers and the second of even integers. Equivalently, gcd(4, 6) = 2 does not divide the difference 2 − 1 = 1. This is an exact contradiction, not a failed search within a small displayed range.

Example transfer response: Choose second residue 3. Difference 3 − 1 = 2 is divisible by gcd 2; x = 9 is a witness.

### 8. congruences-compatible-3

**They are the same class, x ≡ 6 (mod 7).**

−1 normalizes to 6 modulo 7. Both conditions select the same integers. Repeating an identical condition adds no restriction and does not multiply its period. The complete class is 6 + 7k for integer k.

Example transfer response: −2 and 7 are the same class modulo 9. Residues 7 and 8 are distinct and cannot hold together for one modulus.

### 9. congruences-construct-1

**7**

The integers 3, 7, 11, 15, 19 are the first representatives of the first class below 20. Only 7 has remainder 2 modulo 5. Check both equations: 7 = 1 × 4 + 3 and 7 = 1 × 5 + 2. The integer 17 meets the second condition but not the first.

Example transfer response: The next positive solution is 27 and a negative one is −13. Both retain remainders 3 modulo 4 and 2 modulo 5.

### 10. congruences-construct-2

**2**

Modulo 3, the inverse of 2 is 2 because 2 × 2 = 4 ≡ 1. Thus k ≡ 2, producing x = 2 + 6 × 2 = 14. Dividing the coefficient, target and modulus by their common gcd preserves the appropriate solution class for k; dividing only the target would not.

Example transfer response: Dividing −6 + 9 = 3 by 3 gives −2 + 3 = 1. Thus −1 is an inverse of 2 modulo 3, with canonical representative 2.

### 11. congruences-construct-3

**The second condition adds no restriction; x = 5 + 12k.**

Every integer 5 + 12k has remainder 1 modulo 4. The canonical multiplier modulo 1 is zero, so no inverse operation is needed. The least nonnegative solution is 5 and the period remains 12. The explorer labels this case directly rather than inventing an ordinary inverse modulo 1.

Example transfer response: Begin with x = 1 + 4k. Requiring remainder 5 modulo 12 gives 4k ≡ 4, hence k ≡ 1 (mod 3), x0 = 5 and period 12.

### 12. congruences-class-1

**x = 7 + 20k for any integer k.**

The integer parameter k may be positive, zero or negative. For example, k = −1, 0, 1 gives −13, 7 and 27. A least nonnegative representative names a whole class; it is not the only solution and is not a promise about a physical schedule.

Example transfer response: The integers are 7, 27, 47, 67 and 87. The interval condition excludes the rest of the infinite class.

### 13. congruences-class-2

**18**

A difference between common solutions must be divisible by both moduli, so it must be a multiple of lcm(6, 9) = 6 × 9 / 3 = 18. The product 54 repeats but is not least; gcd 3 does not preserve either remainder in general. For the residues 2 and 5, the class is 14 + 18k.

Example transfer response: lcm(8, 12) = 24. The product 96 repeats but skips three intermediate repetitions.

### 14. congruences-class-3

**That particular 24-integer window contains no solution.**

A compatible system may have a period much larger than the displayed window and its first solution may lie elsewhere. The exact gcd/difference test establishes compatibility; a bounded display only illustrates its chosen integers. For example, x ≡ 40 (mod 101) with a redundant modulus-1 condition has no solution among 0 through 23.

Example transfer response: Use x ≡ 40 (mod 101) and x ≡ 0 (mod 1). The first solution is 40, so none occurs in the window 0–23.

## Source and verification

Rebuild the self-contained file with `node tools/build-congruences.mjs`, or use `--check` to require exact model/UI/template/course/guide parity. The original Node test workflow discovers `tests/congruences*.test.mjs`. The dedicated browser receiver uses the repository's established Node 22 and already installed hosted Chrome environment, with fresh local files and no application dependency.

The course parser validates structure, not mathematical truth or educational effectiveness. Independent question-only and mathematical receiving, exact hosted test results and real browser receipts are retained separately at their source identities. This guide describes the intended contract; it is not itself an execution receipt.

This is a bounded mathematics lesson. It does not qualify a cryptographic implementation, business schedule, scientific instrument or learning-effectiveness claim.
