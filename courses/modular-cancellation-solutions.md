# When can you cancel? Worked solutions

These solutions match the twelve exercises in the [modular arithmetic worksheet](modular-cancellation-worksheet.md). Try the questions before reading the key. Where a question asks for a construction or a Bézout identity, a different answer is valid if it meets the conditions and is checked.

A numerical witness shows that a value works. A completeness argument shows that no other solution class has been missed. Keep the original modulus, any reduced modulus, and the domain of the final parameter visible throughout.

## 1. Same congruence, different representatives

**a.** Since $-11=7-2\cdot9$ and $17=8+9$, the rewritten congruence is

$$
7x\equiv8\pmod9.
$$

**b.** The original statement is $9\mid(-11x-17)$. The rewritten statement is $9\mid(7x-8)$. Their expressions differ by

$$
(-11x-17)-(7x-8)=-18x-9=-9(2x+1).
$$

Adding or subtracting a multiple of $9$ does not change divisibility by $9$. Thus the two statements agree for every integer $x$, including negative $x$.

**c.** Congruence requires a difference divisible by $9$, not a difference of zero. For example, $x=5$ gives $7x=35$, which is congruent to $8$ modulo $9$ because $35-8=27$. It is not equal to $8$ as an integer. No ordinary division turning $7x=8$ into $x=8/7$ is justified by the congruence.

## 2. See the whole multiplication map

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $4x\bmod10$ | 0 | 4 | 8 | 2 | 6 | 0 | 4 | 8 | 2 | 6 |

**a.** The complete representatives are **$3$ and $8$**. Direct checks give $4\cdot3-2=10$ and $4\cdot8-2=30$, both divisible by $10$.

**b.** There is no solution to $4x\equiv3\pmod{10}$: the output $3$ never appears.

**c.** The outputs $0,2,4,6,8$ each occur twice; the odd outputs never occur. Every integer can be written uniquely as $x=10q+r$ with $0\le r<10$. Then $4x=40q+4r$, so its remainder equals the table's entry for $r$. The table therefore covers every integer input, not merely the ten displayed integers.

## 3. Audit a cancellation

**a.** Take $x=6$. It satisfies the original congruence because

$$
6\cdot6-6=30=2\cdot15.
$$

But $6-1=5$ is not divisible by $15$, so $6\not\equiv1\pmod{15}$. The student's conclusion loses a genuine solution.

**b.** Here $\gcd(6,15)=3$. From the definition,

$$
15\mid6(x-1)
\quad\Longleftrightarrow\quad
5\mid2(x-1).
$$

Because $2\cdot3-5=1$, multiplication by $2$ is cancellable modulo $5$. Therefore the exact condition is

$$
x\equiv1\pmod5.
$$

Equivalently, all integer solutions are $x=1+5t$ with $t\in\mathbb Z$. Cancelling the factor $6$ changed the modulus from $15$ to $15/\gcd(6,15)=5$; retaining modulus $15$ was the error.

**c.** In $0,\ldots,14$, the complete representatives are **$1,6,11$**. For the full family,

$$
6(1+5t)-6=30t,
$$

which is divisible by $15$. Conversely, the equivalence above forces every solution to have this form. Exactly $t=0,1,2$ put it in the required representative range.

## 4. Turn a signed Bézout identity into an inverse

**a.** One identity is

$$
(-7)\cdot5+18\cdot2=-35+36=1.
$$

It can be obtained by back-substituting through $18=2\cdot7+4$, $7=4+3$, and $4=3+1$. Hence **$5$** is the least-nonnegative inverse of $-7$ modulo $18$.

**b.** Multiply $-7x\equiv5\pmod{18}$ by $5$. Since $5(-7)\equiv1\pmod{18}$, this gives

$$
x\equiv25\equiv7\pmod{18}.
$$

The only representative is **$7$**. The original check is $-7\cdot7-5=-54=-3\cdot18$. Every solution becomes congruent to $7$ after multiplication by the inverse, so no other class is possible. All integer solutions are $x=7+18t$, $t\in\mathbb Z$; substitution changes the checked difference only by $-126t$, another multiple of $18$.

## 5. Composite does not mean noninvertible

**a.** The certificate

$$
2\cdot8-15=1
$$

shows that $\gcd(8,15)=1$ and that **$2$** is an inverse of $8$ modulo $15$.

**b.** Multiplying by $2$ gives $x\equiv14\pmod{15}$. Thus the least-nonnegative representative is **$14$**, and the integer family is

$$
x=14+15t,\qquad t\in\mathbb Z.
$$

The original difference is $8\cdot14-7=105=7\cdot15$. For the family it is $105+120t$, still divisible by $15$.

**c.** Multiplication by an inverse takes every possible solution to the same class $14$ modulo $15$. Coprimality is the relevant property. Neither $8$ nor $15$ is prime, but they have no common positive divisor other than $1$.

## 6. Keep every solution after division

**a.** The gcd is $d=6$, which divides $18$. Dividing the divisibility equation by $6$ gives the equivalence

$$
30\mid(12x-18)
\quad\Longleftrightarrow\quad
5\mid(2x-3).
$$

The reduced congruence is **$2x\equiv3\pmod5$**, with modulus $30/6=5$.

**b.** The inverse of $2$ modulo $5$ is $3$, so $x\equiv9\equiv4\pmod5$. All integer solutions are **$x=4+5t$**, $t\in\mathbb Z$.

**c.** The complete representatives modulo $30$ are

$$
\boxed{4,\ 9,\ 14,\ 19,\ 24,\ 29}.
$$

They correspond to $t=0,1,\ldots,5$. For the whole family,

$$
12(4+5t)-18=30+60t=30(1+2t),
$$

so every member solves the original congruence. Every original solution also satisfies the equivalent reduced congruence and hence belongs to this family. Values with $t<0$ are negative; those with $t\ge6$ exceed $29$. There are therefore exactly six representatives, not just the first one found.

## 7. Certify impossibility

**a–b.** There is **no integer solution**. If a solution existed, there would be an integer $q$ with

$$
14x-9=21q,
\qquad\text{so}\qquad
9=14x-21q.
$$

The right side is divisible by $7$, whereas $9$ is not. This is a contradiction.

**c.** Negative $x$ cannot help. An integer multiple of $14$ is divisible by $7$ regardless of its sign, and the same is true of an integer multiple of $21$. The contradiction covers every integer, not merely a range of tested values.

## 8. Zero coefficients and a reduced modulus of one

| Row | $d$ | $m/d$ | All least-nonnegative representatives | All integer solutions |
|---|---:|---:|---|---|
| A: $0x\equiv0\pmod7$ | 7 | 1 | $0,1,2,3,4,5,6$ | Every integer |
| B: $0x\equiv3\pmod7$ | 7 | 1 | None | None |
| C: $18x\equiv-27\pmod9$ | 9 | 1 | $0,1,2,3,4,5,6,7,8$ | Every integer |
| D: $18x\equiv4\pmod9$ | 9 | 1 | None | None |

- **A:** The difference $0x-0$ is zero for every $x$, and $7$ divides zero.
- **B:** The difference is always $-3$, which is not divisible by $7$.
- **C:** The original difference is $18x-(-27)=9(2x+3)$, divisible by $9$ for every integer $x$.
- **D:** Both $18x$ and any multiple of $9$ are divisible by $9$, but $4$ is not. Thus $9$ cannot divide $18x-4$.

In the compatible rows A and C, reducing by $d$ leaves modulus $1$, which imposes no restriction on an integer $x$. Every original residue class works. No inverse modulo $1$ is needed.

In rows B and D, the compatibility check fails first: $d$ does not divide the right-hand side. The value $m/d=1$ alone does **not** establish solvability. Dividing an incompatible right-hand side by $d$ would introduce a noninteger and leave the stated problem.

## 9. Prove the existence and counting rule

**a. Necessity.** If $ax\equiv b\pmod m$, then $ax-b=mq$ for some integer $q$. Rearranging gives $b=ax-mq$. Since $d$ divides both $a$ and $m$, it divides both terms on the right and therefore divides $b$.

**b. Exact reduction.** Now assume $d\mid b$. Write $a=da'$, $b=db'$, and $m=dn$. Because $d>0$,

$$
ax-b=mq
\quad\Longleftrightarrow\quad
d(a'x-b')=dnq
\quad\Longleftrightarrow\quad
a'x-b'=nq.
$$

Thus the original and reduced congruences have exactly the same integer solutions. Also $\gcd(a',n)=1$: a positive common divisor larger than $1$ would make $d$ times that divisor a common divisor of $a$ and $m$ larger than $d$.

**c. Construction and uniqueness.** If $n\ge2$, choose integers $s,t$ with $sa'+tn=1$. Set $x_0=sb'$. Then

$$
a'x_0-b'=(sa'-1)b'=-tnb',
$$

which is divisible by $n$. So $x_0$ is a solution. Let $r$ be its least-nonnegative representative modulo $n$.

If $x$ and $y$ are any two solutions, then $n\mid a'(x-y)$. The same Bézout identity gives

$$
x-y=s\,a'(x-y)+t\,n(x-y).
$$

Both terms are divisible by $n$, so $n\mid(x-y)$. This proves uniqueness **modulo $n$**. Conversely, adding any multiple of $n$ to a solution preserves the reduced congruence.

If $n=1$, then $d=m$. Under the current assumption $d\mid b$, both $a$ and $b$ are multiples of $m$, so $ax-b$ is a multiple of $m$ for every integer $x$. All integers solve the original congruence. Set $r=0$; no inverse is involved.

**d. The complete original representatives.** In either case, the full integer solution family is

$$
\boxed{x=r+nt,\qquad t\in\mathbb Z.}
$$

For $k=0,\ldots,d-1$, the values $r+kn$ satisfy:

- **Range:** $0\le r+kn\le(n-1)+(d-1)n=dn-1=m-1$.
- **Distinctness:** different $k$ give different integers in this range, hence different classes modulo $m$.
- **Validity:** each is congruent to $r$ modulo $n$, so it satisfies the reduced and original congruences.
- **Exhaustiveness:** any original solution in $0,\ldots,m-1$ is $r+nt$. Since $0\le r<n$, a negative $t$ makes it negative, and $t\ge d$ makes it at least $m$. Thus precisely $t=0,\ldots,d-1$ are possible.

There are exactly **$d$ solution classes modulo $m$** when $d\mid b$, and none otherwise. A solvable congruence still has infinitely many integer solutions. The finite count concerns classes or their canonical representatives.

## 10. State exactly what cancellation permits

**a.** Put $w=u-v$, $c=gc'$ and $m=gn$. Then

$$
m\mid cw
\quad\Longleftrightarrow\quad
n\mid c'w.
$$

Here $\gcd(c',n)=1$. For $n\ge2$, a Bézout identity for $c'$ and $n$ proves $n\mid c'w$ if and only if $n\mid w$, by the same argument as exercise 9. Therefore

$$
cu\equiv cv\pmod m
\quad\Longleftrightarrow\quad
u\equiv v\pmod n,
\qquad n=m/g.
$$

The argument permits negative $c'$ because its coefficients and products remain integers. If $n=1$, then $m$ divides $c$, so the left statement holds for all $u,v$; the right statement also holds for all $u,v$ modulo $1$. This includes $c=0$, for which $g=m$. No inverse-modulo-one convention is used.

**b.** If $g=1$, the reduced modulus is $m$, so the equivalence proves the stated universal cancellation rule.

If $g>1$, choose

$$
u=m/g,\qquad v=0.
$$

The premise holds because $cu=(c/g)m$ is a multiple of $m$. But $1\le m/g<m$, so $m$ does not divide $u-v$. The conclusion fails. This supplies a counterexample for **every** noncoprime factor, including $c=0$.

Thus same-modulus cancellation is valid for all pairs exactly when $\gcd(c,m)=1$.

**c.** No: failure of a universal rule does not mean every instance fails. For example, $u=0$ and $v=m$ satisfy $u\equiv v\pmod m$, and their products by any $c$ are also congruent modulo $m$. These distinct integers give a true premise and true conclusion even when $c$ is not coprime to $m$.

A noncoprime factor therefore cannot be cancelled as an unrestricted rule while retaining the modulus; particular conclusions can still be true.

## 11. Design and verify an equation

One valid construction is **$3x\equiv6\pmod{12}$**. Its coefficients are in the requested range, and $a=3$ is nonzero.

Here $\gcd(3,12)=3$ divides $6$. Equivalently,

$$
12\mid3(x-2)
\quad\Longleftrightarrow\quad
4\mid(x-2).
$$

All integer solutions are $x=2+4t$. The complete representatives modulo $12$ are **$2,6,10$**. Their original differences $3x-6$ are $0,12,24$, and the reduced congruence excludes every other class.

Keeping $a=3$, change the right side to $b=1$. The equation **$3x\equiv1\pmod{12}$** has no solution: both $3x$ and multiples of $12$ are divisible by $3$, whereas $1$ is not.

Other constructions are valid. Under the question's bounds, a coefficient with gcd $3$ with $12$ and a right-hand side divisible by $3$ gives exactly three classes. Keeping that coefficient and choosing a right-hand side not divisible by $3$ gives no solution. Each proposed representative list must still match the particular equation.

## 12. Interpret solutions as move counts

**a.** Reaching position $11$ means

$$
3+6k\equiv11\pmod{14}
\quad\Longleftrightarrow\quad
6k\equiv8\pmod{14}.
$$

The gcd is $2$, which divides $8$. The reduced congruence is $3k\equiv4\pmod7$. Since $3\cdot5\equiv1\pmod7$, it becomes $k\equiv20\equiv6\pmod7$.

The unrestricted integer family is $k=6+7t$, $t\in\mathbb Z$. Applying the move-count requirement $k\ge0$ leaves

$$
\boxed{k=6+7t,\qquad t=0,1,2,\ldots.}
$$

The values in $0,\ldots,13$ are **$6$ and $13$**; the first nonnegative one is **$6$**. Direct checks are $3+6\cdot6=39=11+2\cdot14$ and $3+6\cdot13=81=11+5\cdot14$. The family is complete because every step above was an equivalence.

**b.** Reaching position $10$ would require $6k\equiv7\pmod{14}$. This is impossible: $\gcd(6,14)=2$ does not divide $7$. Equivalently, $6k-7$ is odd and cannot be a multiple of $14$.

**c.** Returning to position $3$ requires $6k\equiv0\pmod{14}$, or $3k\equiv0\pmod7$. Inverting $3$ modulo $7$ gives $k\equiv0\pmod7$. Its positive solutions begin at **$7$**.

The movement checks this directly:

$$
3,\ 9,\ 1,\ 7,\ 13,\ 5,\ 11,\ 3.
$$

A step of $6$ does not visit all fourteen positions before returning. The first positive return is $14/\gcd(6,14)=7$ moves; the count must follow from the step size as well as the number of positions.

## Mathematical background and original material

The primary background is [MIT's Cancellation & Inverses (mod n) slides](https://courses.csail.mit.edu/6.042/spring15/inversesmodn.pdf) and page 1 of [MIT 18.781 Lecture 5 notes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/7b36e2ada32c5ed0638783d4e66af60c_MIT18_781S12_lec5.pdf). The worksheet provides their full attribution and the link to RecallWeave's Euclidean-algorithm prerequisite.

These worked examples and explanations are original RecallWeave material. They may be used, adapted and redistributed with attribution to RecallWeave contributors. The linked sources retain their own terms; no source exercise, passage or figure is reproduced here.

The results establish exact mathematical statements for the specified congruences. They do not establish learning effectiveness or qualify a cryptographic or scheduling application.
