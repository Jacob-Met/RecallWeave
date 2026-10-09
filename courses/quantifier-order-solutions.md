# Quantifier order: worked solutions

These solutions match the twelve exercises in the [worksheet](quantifier-order-worksheet.md). Try the questions first. The examples below provide complete certificates; other witnesses or counterexamples are valid when they establish the same claim under the stated bounds.

Throughout,

$$
A=(\forall x\in X)(\exists y\in Y)\,R(x,y),
\qquad
B=(\exists y\in Y)(\forall x\in X)\,R(x,y).
$$

A witness for an existential statement must belong to its named set. To establish a universal statement, the argument must cover every element of its named set. An empty bounded universal has no counterexample; an empty bounded existential has no witness.

## 1. Two exhibition claims

The first claim is

$$
\underbrace{\forall x\in X}_{\text{first}}\,(\exists y\in Y)\,R(x,y).
$$

The exhibit $x$ is considered first. Its guide card may be chosen using that exhibit. The formula allows a different card for each exhibit but does not require different cards.

The second claim is

$$
\underbrace{\exists y\in Y}_{\text{first}}\,(\forall x\in X)\,R(x,y).
$$

A card $y$ must be available that works regardless of which exhibit is considered. It cannot be replaced when $x$ changes. “At least one” does not mean “exactly one.”

Neither sentence supplies the complete relation table. They describe properties that a relation may satisfy, without saying exactly which individual exhibit-card pairs are true.

## 2. Read a complete relation

$A$ is true. For example, choose $u$ for $a$ and $v$ for $b$: both $R(a,u)$ and $R(b,v)$ are true.

All row-witness sets are

$$
W(a)=\{u,w\},\qquad W(b)=\{v\}.
$$

Thus the complete ordered witness assignments $(y_a,y_b)$ are $(u,v)$ and $(w,v)$.

$B$ is false. Every candidate uniform witness fails:

| Candidate $y$ | A false pair that rules it out |
|---|---|
| $u$ | $R(b,u)$ |
| $v$ | $R(a,v)$ |
| $w$ | $R(b,w)$ |

There is no column that is true in both rows, so the set of uniform witnesses is empty. Different failing rows may be used for different columns.

## 3. Must witnesses differ? Must one be unique?

Since all four pairs are true, the complete witness assignments for $A$ are

$$
(u,u),\quad(u,v),\quad(v,u),\quad(v,v).
$$

Both $u$ and $v$ are uniform witnesses for $B$.

The assignments $(u,u)$ and $(v,v)$ show that $A$ does not require distinct witnesses. The two successful uniform witnesses show that $B$ does not require uniqueness. What $B$ requires is that at least one chosen element works for every $x$.

## 4. Build complete refutations

The full relation is

| $R(x,y)$ | $u$ | $v$ |
|---|---|---|
| $a$ | T | F |
| $b$ | F | F |
| $c$ | F | T |

$A$ is false: choose $x=b$. Both available choices of $y$ fail, so there is no witness for that row. Showing $R(b,u)$ false alone would leave $v$ unchecked; the second false cell completes the certificate.

$B$ is false: $u$ fails at $b$, and $v$ also fails at $b$. These two checks cover all candidates in $Y$. Reusing $b$ is allowed. A refutation requires a failing row for each candidate column, with no requirement that those rows be distinct.

## 5. How much does one failed pair tell you?

Here is a complete relation in which both statements are true:

| $R(x,y)$ | $u$ | $v$ |
|---|---|---|
| $a$ | F | T |
| $b$ | F | T |

For $A$, use $v$ in each row. For $B$, use the same uniform witness $v$.

Here is a complete relation in which both are false:

| $R(x,y)$ | $u$ | $v$ |
|---|---|---|
| $a$ | F | F |
| $b$ | F | F |

For $\neg A$, row $a$ has no witness. For $\neg B$, each of $u$ and $v$ fails at $a$.

Both relations satisfy the supplied fact $\neg R(a,u)$. On these named sets, that one failed pair therefore determines neither $A$ nor $B$. To refute $A$, rule out every witness for at least one row; to refute $B$, rule out every candidate uniform witness.

## 6. Test the converse

One minimal counterexample is

| $R(x,y)$ | $u$ | $v$ |
|---|---|---|
| $a$ | T | F |
| $b$ | F | T |

For $A$, choose $u$ for $a$ and $v$ for $b$. For $\neg B$, $u$ fails at $b$ and $v$ fails at $a$.

Two true pairs are necessary: each of the two distinct rows must contain at least one true pair, and a single pair belongs to only one row. This example uses exactly two. The reversed diagonal is another minimal counterexample.

Thus $A\Rightarrow B$ does not hold for every relation, even when both named sets are nonempty.

## 7. Prove or refute an implication

$B\Rightarrow A$ does hold for every relation under these bounds.

Assume $B$. Then there is some $y_0\in Y$ such that $R(x,y_0)$ holds for every $x\in X$. For any $x\in X$, choose $y=y_0$ to establish its existential requirement. This establishes $A$.

No additional nonemptiness assumption is needed. If $X$ is empty, $A$ has no row to check. If $Y$ is empty, $B$ is false, so there is no true-premise/false-conclusion counterexample to the implication. The proof uses a witness only under the assumption that $B$ supplies it.

Exercise 6 concerns the opposite direction, $A\Rightarrow B$. A counterexample to that direction does not refute $B\Rightarrow A$.

## 8. Negate the row-by-row requirement

Push negation across one quantifier at a time:

$$
\begin{aligned}
\neg A
&=\neg\bigl[(\forall x\in X)(\exists y\in Y)R(x,y)\bigr]\\
&\equiv(\exists x\in X)\neg\bigl[(\exists y\in Y)R(x,y)\bigr]\\
&\equiv(\exists x\in X)(\forall y\in Y)\neg R(x,y).
\end{aligned}
$$

There is an element of $X$ for which every candidate from $Y$ fails.

For nonempty finite $Y$, give one row and show all its entries are false. A single false cell is not sufficient in general: another entry in that row might be true. If $Y$ is a singleton, checking its one entry does cover the whole row.

The bounded formula also handles emptiness. If $Y$ is empty and $X$ has an element, that element has no possible witness even though there are no cells to mark false. If $X$ is empty, the outer existential in $\neg A$ has no witness.

## 9. Negate the uniform-witness requirement

Again retain the bounds while moving negation:

$$
\begin{aligned}
\neg B
&=\neg\bigl[(\exists y\in Y)(\forall x\in X)R(x,y)\bigr]\\
&\equiv(\forall y\in Y)\neg\bigl[(\forall x\in X)R(x,y)\bigr]\\
&\equiv(\forall y\in Y)(\exists x\in X)\neg R(x,y).
\end{aligned}
$$

Every candidate uniform witness has at least one failing element of $X$. In a nonempty finite table, supply a failing row for each column. The failing row may depend on the column; no single row is required to refute all columns.

In Exercise 2, $A$ is true and $B$ false, so $\neg A$ is false while $\neg B$ is true. The failures $(b,u),(a,v),(b,w)$ refute $B$, but neither row is entirely false. Consequently the two negated statements are not equivalent.

If $Y$ is empty, the universal in $\neg B$ has no candidates to check and needs no failing row. The complete empty-set cases appear next.

## 10. Empty named sets

| Case | $X$ | $Y$ | $A$ | $B$ | $\neg A$ | $\neg B$ |
|---|---|---|---|---|---|---|
| i | $\varnothing$ | $\{u,v\}$ | T | T | F | F |
| ii | $\{a,b\}$ | $\varnothing$ | F | F | T | T |
| iii | $\varnothing$ | $\varnothing$ | T | F | F | T |

**Case i.** $A$ has no $x$ to check and is true without choosing any $y$. For $B$, choose $u$ (or $v$); its inner universal has no $x$ to check. This is a genuine witness in the nonempty set $Y$, even though it must satisfy no relation pairs.

**Case ii.** $A$ fails at $a$, because no element of $Y$ can witness its existential requirement. $B$ also has no possible outer witness. For $\neg A$, choose $a$: its universal over empty $Y$ is true. For $\neg B$, the universal over empty $Y$ needs no checks.

**Case iii.** $A$ is true because its outer universal has no $x$ to check. $B$ is false because its outer existential has no $y$ to supply. An empty inner universal cannot create an element for an outer existential. The two negations follow as shown.

None of these cases makes $B$ true while $A$ is false, consistent with Exercise 7. These are restricted quantifiers over named sets, not a change to every logic's convention about its overall universe.

## 11. Exhaust the two-by-two possibilities

The bit order is $au,av,bu,bv$. “None” in the last column means that no element of $Y$ is a uniform witness.

| Bits | $A$ | $B$ | All uniform witnesses |
|---|---|---|---|
| 0000 | F | F | None |
| 0001 | F | F | None |
| 0010 | F | F | None |
| 0011 | F | F | None |
| 0100 | F | F | None |
| 0101 | T | T | $v$ |
| 0110 | T | F | None |
| 0111 | T | T | $v$ |
| 1000 | F | F | None |
| 1001 | T | F | None |
| 1010 | T | T | $u$ |
| 1011 | T | T | $u$ |
| 1100 | F | F | None |
| 1101 | T | T | $v$ |
| 1110 | T | T | $u$ |
| 1111 | T | T | $u,v$ |

The counts are

| $(A,B)$ | Number of relations |
|---|---:|
| $(T,T)$ | 7 |
| $(T,F)$ | 2 |
| $(F,T)$ | 0 |
| $(F,F)$ | 7 |
| Total | 16 |

For each row, $A$ is true exactly when both row-pairs of bits contain a 1: at least one of $au,av$, and at least one of $bu,bv$. A uniform $u$ exists exactly when $au=bu=1$; a uniform $v$ exists exactly when $av=bv=1$. These checks give certificates for every table entry.

The two $(T,F)$ rows are the minimal counterexamples from Exercise 6. No $(F,T)$ row occurs, agreeing with the general proof in Exercise 7. The exhaustive table covers only these fixed two-element sets; it does not replace that general proof.

These counts do not by themselves supply a probability. A probability would require a specified way of selecting relations. No sampling distribution or real-world frequency is given.

## 12. Transfer the distinction to a decision

The premise is $A$ and is true. One complete witness assignment is:

- mosaic: blue;
- mobile: green;
- print: gold.

The conclusion is $B$ and is false. Blue fails to explain the mobile; green fails to explain the print; gold fails to explain the mosaic. This rules out every available uniform witness.

The coordinator has moved from an exhibit-dependent choice to a uniform choice without justification: the invalid converse $A\Rightarrow B$.

Exactly three permitted one-cell edits make the conclusion true:

| Change this pair from F to T | Resulting uniform witness |
|---|---|
| $(\text{mobile},\text{blue})$ | blue |
| $(\text{print},\text{green})$ | green |
| $(\text{mosaic},\text{gold})$ | gold |

Each column originally has exactly one false entry. Changing that entry completes its column. These are all the original false entries, so the list is exhaustive under the one-cell rule.

Before any edit, the negation of the conclusion is

$$
(\forall y\in Y)(\exists x\in X)\neg R(x,y).
$$

The three failures listed above are its certificate. They may involve different exhibits because $x$ is chosen within the scope of each candidate card $y$.

## Checking your reasoning

A correct answer names the bounds, keeps $R(x,y)$ in the same argument order, and gives a certificate with the right coverage. Different valid witnesses are acceptable. Watch especially for these errors:

- treating “may depend on $x$” as “must be different for every $x$”;
- reading an existential as a uniqueness claim;
- using one failed cell when an entire row or every candidate column must be covered;
- swapping quantifiers without justification;
- changing quantifier order when negating, instead of flipping each quantifier in place;
- assuming an empty universal supplies an element required by an existential.

Conceptual references are listed in the [worksheet](quantifier-order-worksheet.md#references-and-reuse). These original worked examples use the same bounded-set conventions.

Prepared with AI assistance. Released under CC BY 4.0; attribute “RecallWeave — Quantifier order worked solutions.”
