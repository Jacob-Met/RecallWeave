# When can you cancel? A modular arithmetic worksheet

This worksheet connects the [Euclidean algorithm and integer-combination lesson](euclidean-algorithm.md) to a new question: how can you find **every** solution of one congruence $ax\equiv b\pmod m$?

Work through the twelve exercises before opening the [separate worked solutions](modular-cancellation-solutions.md). Paper and pencil are enough. A table can establish a claim about its finite list; a general claim still needs a proof.

## Notation and answer types

All letters represent integers unless a question says otherwise. Every original modulus $m$ is at least $2$.

- $u\equiv v\pmod m$ means that $m$ divides $u-v$. It does not mean that $u=v$ as integers.
- A **least-nonnegative representative modulo $m$** is one of $0,1,\ldots,m-1$. Different representatives in this range describe different residue classes.
- “All representatives modulo $m$” asks for a complete finite list in that range. “All integer solutions” asks for a family with an integer parameter. These are different ways to describe the same solution set.
- $\gcd(a,m)$ means $\gcd(|a|,m)$, the positive greatest common divisor. In particular, $\gcd(0,m)=m$.
- An **inverse of $a$ modulo $m$** is an integer $u$ such that $au\equiv1\pmod m$. When asked for its representative, choose $0\le u<m$.
- You may use Bézout's identity from the prerequisite lesson: there are integers $s,t$ with $sa+tm=\gcd(a,m)$. Check any particular identity you construct by multiplication.
- A reduced modulus may be $1$. Congruence modulo $1$ means divisibility by $1$, so every pair of integers is congruent. Handle that case directly; no convention about an inverse modulo $1$ is needed.

For a numerical solution, substitute back into the **original** congruence. When a question asks for all solutions, also explain why the list or family is complete. Giving one working value is not a completeness argument.

## 1. Same congruence, different representatives

Consider

$$
-11x\equiv17\pmod9.
$$

a. Replace the coefficient and right-hand side by their least-nonnegative representatives modulo $9$.

b. Write the original congruence as a divisibility statement. Explain why the replacement in part a preserves its truth for every integer $x$.

c. Is the rewritten congruence an ordinary equality between its two sides? Explain the distinction. You do not need to solve for $x$ in this exercise.

## 2. See the whole multiplication map

Complete the final row. Every entry must be the least-nonnegative remainder modulo $10$.

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $4x\bmod10$ |  |  |  |  |  |  |  |  |  |  |

a. Use the table to give all representatives solving $4x\equiv2\pmod{10}$.

b. Use the table to decide whether $4x\equiv3\pmod{10}$ has any solution.

c. Which output remainders occur, and how many times does each occur? Explain why checking these ten representatives also settles the two questions for every integer $x$.

## 3. Audit a cancellation

A student writes:

> From $6x\equiv6\pmod{15}$, cancel $6$ and conclude $x\equiv1\pmod{15}$.

a. Give a value in $0,\ldots,14$ that satisfies the original congruence but contradicts that conclusion. Show both checks.

b. Find a single congruence of the form $x\equiv r\pmod n$, with $n$ positive and $0\le r<n$, that describes **exactly** the original integer solutions. Explain how the common factor affects the modulus.

c. List all least-nonnegative representatives modulo the **original** modulus $15$. Explain both why they work and why no others do.

## 4. Turn a signed Bézout identity into an inverse

a. Find integers $u,v$ satisfying

$$
(-7)u+18v=1.
$$

Verify the equality, then give the least-nonnegative inverse of $-7$ modulo $18$.

b. Use that inverse to solve $-7x\equiv5\pmod{18}$. Give all representatives modulo $18$, check the original congruence and explain why your answer is complete.

## 5. Composite does not mean noninvertible

Both $8$ and $15$ are composite.

a. Determine whether $8$ has an inverse modulo $15$. Give a certificate for your conclusion.

b. Solve $8x\equiv7\pmod{15}$. State its least-nonnegative representative and its full family of integer solutions.

c. Explain why there is only one solution class modulo $15$. Which property of $8$ and $15$ matters here, rather than either number being prime?

## 6. Keep every solution after division

Solve

$$
12x\equiv18\pmod{30}.
$$

a. Compute $d=\gcd(12,30)$. If division by $d$ is justified, write the resulting congruence, including its modulus.

b. Solve that reduced congruence. Give all integer solutions as a family.

c. List every least-nonnegative representative modulo $30$. Check the original congruence and justify the number and completeness of the representatives. Do not stop after finding one.

## 7. Certify impossibility

Consider

$$
14x\equiv9\pmod{21}.
$$

a. Decide whether any integer solution exists.

b. Give a divisibility argument that settles the question for **all** integers. A search through several trial values is not the requested certificate.

c. Would allowing negative values of $x$ change your conclusion? Explain using the same argument.

## 8. Zero coefficients and a reduced modulus of one

For each row, give all least-nonnegative representatives modulo its stated modulus, or state that none exist. Then describe all integer solutions and justify the answer directly.

| Label | Congruence |
|---|---|
| A | $0x\equiv0\pmod7$ |
| B | $0x\equiv3\pmod7$ |
| C | $18x\equiv-27\pmod9$ |
| D | $18x\equiv4\pmod9$ |

For each row also identify $d=\gcd(a,m)$ and the reduced modulus $m/d$. Explain how the compatible rows can be handled without trying to find an inverse modulo $1$. The nonzero coefficient in rows C and D must be checked modulo the stated modulus.

## 9. Prove the existence and counting rule

Let $a,b$ be arbitrary integers, $m\ge2$, and $d=\gcd(a,m)$.

a. Prove that if $ax\equiv b\pmod m$ has a solution, then $d$ divides $b$.

b. Suppose $d$ divides $b$. Put $a'=a/d$, $b'=b/d$ and $n=m/d$. Prove that the original congruence is equivalent to $a'x\equiv b'\pmod n$.

c. If $n\ge2$, use a Bézout identity to construct a solution and prove uniqueness modulo $n$. If $n=1$, handle the solution set directly.

d. Let $r$ be the least-nonnegative solution representative modulo $n$, taking $r=0$ when $n=1$. Prove that the complete least-nonnegative representatives modulo $m$ are

$$
r,\ r+n,\ r+2n,\ \ldots,\ r+(d-1)n.
$$

Explain why these are in range, distinct, solutions, and exhaustive. State separately the full family of integer solutions.

## 10. State exactly what cancellation permits

Let $c,u,v$ be integers, $m\ge2$, and $g=\gcd(c,m)$.

a. Prove the equivalence

$$
cu\equiv cv\pmod m
\quad\Longleftrightarrow\quad
u\equiv v\pmod{m/g}.
$$

Include $c=0$ and signed $c$. You may use your earlier results, but explain why they apply.

b. Prove that the rule

> For every pair of integers $u,v$, if $cu\equiv cv\pmod m$, then $u\equiv v\pmod m$

holds exactly when $\gcd(c,m)=1$. For the other direction, construct a counterexample pair for any $g>1$.

c. When $\gcd(c,m)>1$, does that mean **every particular** pair satisfying the premise makes the conclusion false? Give a pair that answers this question and explain the distinction between a universal rule and one instance.

## 11. Design and verify an equation

Work modulo $12$.

a. Choose least-nonnegative coefficients $a,b$ with $a\ne0$ so that $ax\equiv b\pmod{12}$ has exactly **three** solution representatives. State your equation, list those representatives, and justify their completeness.

b. Keep the same $a$ but choose a new least-nonnegative right-hand side $b$ so that the equation has no solution. Give a certificate.

There is more than one valid construction. Your checks, rather than agreement with a particular example, establish a correct answer.

## 12. Interpret solutions as move counts

A numbered circular strip has positions $0,1,\ldots,13$. A marker starts at position $3$. Each move advances it by exactly $6$ positions, wrapping modulo $14$. After $k$ moves its position is the least-nonnegative representative of $3+6k$ modulo $14$, with $k$ a nonnegative integer.

a. Write and solve the congruence for reaching position $11$. Give every admissible move count in $0,\ldots,13$, the first nonnegative move count, and the full family of nonnegative move counts.

b. Can the marker reach position $10$? Give an exact reason.

c. Find the first **positive** move count that returns the marker to its starting position. Explain why the number of positions alone does not justify guessing that count.

Keep the move-count condition $k\ge0$ separate from the unrestricted integer solution family used in the algebra.

## Mathematical background and original material

- [MIT 6.042J/18.062J, Cancellation & Inverses (mod n), Albert R. Meyer, March 9, 2015](https://courses.csail.mit.edu/6.042/spring15/inversesmodn.pdf), especially the cancellation and Bézout-inverse argument.
- [MIT 18.781, Theory of Numbers, Spring 2012, Lecture 5 notes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/7b36e2ada32c5ed0638783d4e66af60c_MIT18_781S12_lec5.pdf), page 1, for a single linear congruence and its complete solution classes. These notes were prepared by Joseph Lee in collaboration with Prof. Abhinav Kumar.

The twelve exercises and their examples are original RecallWeave material. They may be used, adapted and redistributed with attribution to RecallWeave contributors. The linked sources retain their own terms; no source exercise, passage or figure is reproduced here.

This is a worksheet about one linear congruence at a time. It does not implement a solver, teach a simultaneous-congruence system, or qualify a cryptographic or scheduling application.
