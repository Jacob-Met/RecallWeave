# Quantifier order: a worksheet about witnesses

Twelve original exercises on bounded quantifiers, witness dependence, negation, and empty sets. This is a reading-and-writing worksheet: no app import, account, calculator, or program is required.

Prerequisite: truth values, conjunction, disjunction, negation, and implication. The [Boolean logic guide](boolean-logic.md) reviews those ideas. Write your reasoning before opening the [separate worked solutions](quantifier-order-solutions.md). A truth value alone is not a complete answer when an exercise asks for a witness or counterexample.

## Notation and scope

Every exercise names sets $X$ and $Y$. A relation $R\subseteq X\times Y$ specifies exactly which ordered pairs are true: $R(x,y)$ means $(x,y)\in R$. Rows always name elements of $X$; columns name elements of $Y$. A table entry **T** means true and **F** means false. There are no unknown entries. When a relation is given as a list of pairs, every unlisted pair is false.

A witness is an element of the named set that makes an existential claim true.

We use these two statements throughout:

$$
A:\quad (\forall x\in X)(\exists y\in Y)\,R(x,y)
$$

$$
B:\quad (\exists y\in Y)(\forall x\in X)\,R(x,y).
$$

Read $\forall x\in X$ as “for every element $x$ of $X$,” and $\exists y\in Y$ as “there is at least one element $y$ of $Y$.” Parentheses show scope. Keep the argument order $R(x,y)$ when comparing $A$ and $B$.

The bounds refer to the explicitly named mathematical sets. Exercise 10 deliberately allows those sets to be empty. This is not a claim that every formal first-order or many-sorted logic permits an empty universe or an empty sort.

All situations and data below are authored examples, not observations about actual people or services.

## 1. Two exhibition claims

Let $X=\{\text{mosaic},\text{mobile}\}$ be two exhibits and $Y=\{\text{card 1},\text{card 2}\}$ be two guide cards. Define $R(x,y)$ to mean “card $y$ explains exhibit $x$.”

Write each claim with bounded quantifiers and $R$:

1. Each exhibit has at least one guide card that explains it.
2. There is at least one guide card that explains every exhibit.

For each formula, underline the quantifier whose choice is made first. Explain what information is available when the guide card is chosen. Do these sentences specify which particular pairs belong to $R$?

## 2. Read a complete relation

Let $X=\{a,b\}$ and $Y=\{u,v,w\}$, with this complete table:

| $R(x,y)$ | $u$ | $v$ | $w$ |
|---|---|---|---|
| $a$ | T | F | T |
| $b$ | F | T | F |

Determine the truth values of $A$ and $B$.

For a true statement, give enough explicit choices to establish the whole statement. For a false statement, give enough false pairs to rule it out. Then list every possible choice of a witness for each row and every possible single witness that works for both rows.

## 3. Must witnesses differ? Must one be unique?

Let $X=\{a,b\}$, $Y=\{u,v\}$, and $R=X\times Y$.

1. List all ordered witness assignments $(y_a,y_b)$ that establish $A$, where $y_a$ is the choice for $a$ and $y_b$ the choice for $b$.
2. List all witnesses that establish $B$.
3. Assess both claims: “$A$ requires different witnesses for different $x$” and “$B$ requires exactly one successful witness.” Use your lists to justify your answers.

## 4. Build complete refutations

Let $X=\{a,b,c\}$, $Y=\{u,v\}$, and

$$
R=\{(a,u),(c,v)\}.
$$

Draw the full table. Determine $A$ and $B$, and produce a complete certificate for each answer. For a refutation, state which choices have been ruled out and why. Can the same element of $X$ be used more than once in a refutation of $B$?

## 5. How much does one failed pair tell you?

Let $X=\{a,b\}$ and $Y=\{u,v\}$. The only supplied fact is that $R(a,u)$ is false.

Construct two different complete relations consistent with that fact:

1. one in which both $A$ and $B$ are true;
2. one in which both $A$ and $B$ are false.

Give each relation as all four table entries and justify its two truth values. What does this show about trying to refute either quantified statement using only one failed pair?

## 6. Test the converse

Again let $X=\{a,b\}$ and $Y=\{u,v\}$.

Construct a relation that makes $A$ true and $B$ false. Give a full table, row witnesses, and a refutation covering every candidate uniform witness.

Make your relation use as few true pairs as possible. Explain why fewer true pairs could not satisfy $A$ on these named sets.

## 7. Prove or refute an implication

Let $X$ and $Y$ now be arbitrary finite sets, and let $R\subseteq X\times Y$.

Decide whether $B\Rightarrow A$ holds for every such relation. Give a general argument, not just a table. State explicitly whether your argument needs either set to be nonempty. Contrast the direction you have considered with Exercise 6.

## 8. Negate the row-by-row requirement

Write $\neg A$ using bounded quantifiers with negation immediately before $R(x,y)$, and with no negation outside a quantifier. Show each quantifier-negation step, keeping the bounds.

Translate the result into ordinary language. Describe what must be supplied to establish $\neg A$ in a finite relation table. Explain why merely finding one false cell is or is not sufficient.

## 9. Negate the uniform-witness requirement

Do the same for $\neg B$: show the quantifier-negation steps, translate the result, and describe a complete finite-table certificate.

Compare your formula with the answer to Exercise 8. Use the complete table in Exercise 2 to decide whether $\neg A$ and $\neg B$ must have the same truth value. State whether a refutation of $B$ must use the same failing row for every column.

## 10. Empty named sets

For each row below, the only possible relation is $R=\varnothing$. Determine all four truth values and explain them directly from the bounds.

| Case | $X$ | $Y$ | $A$ | $B$ | $\neg A$ | $\neg B$ |
|---|---|---|---|---|---|---|
| i | $\varnothing$ | $\{u,v\}$ |  |  |  |  |
| ii | $\{a,b\}$ | $\varnothing$ |  |  |  |  |
| iii | $\varnothing$ | $\varnothing$ |  |  |  |  |

For each case, distinguish a requirement to provide an element from a requirement that has no elements to check. Revisit your general argument in Exercise 7.

## 11. Exhaust the two-by-two possibilities

Let $X=\{a,b\}$ and $Y=\{u,v\}$. Encode a relation by four bits in the fixed order

$$
R(a,u),\ R(a,v),\ R(b,u),\ R(b,v),
$$

where 1 means true and 0 means false. Fill in the table without changing this order.

| Bits | $A$ | $B$ | All uniform witnesses for $B$ |
|---|---|---|---|
| 0000 |  |  |  |
| 0001 |  |  |  |
| 0010 |  |  |  |
| 0011 |  |  |  |
| 0100 |  |  |  |
| 0101 |  |  |  |
| 0110 |  |  |  |
| 0111 |  |  |  |
| 1000 |  |  |  |
| 1001 |  |  |  |
| 1010 |  |  |  |
| 1011 |  |  |  |
| 1100 |  |  |  |
| 1101 |  |  |  |
| 1110 |  |  |  |
| 1111 |  |  |  |

Count how many rows have $(A,B)$ equal to each of $(T,T),(T,F),(F,T),(F,F)$. Check that the counts total 16. Explain how the table relates to Exercises 6 and 7, and why these finite counts alone do not establish a probability for an unspecified real-world relation.

## 12. Transfer the distinction to a decision

A gallery has exhibits $X=\{\text{mosaic},\text{mobile},\text{print}\}$ and guide cards $Y=\{\text{blue},\text{green},\text{gold}\}$. As in Exercise 1, $R(x,y)$ means “card $y$ explains exhibit $x$.”

| $R(x,y)$ | blue | green | gold |
|---|---|---|---|
| mosaic | T | T | F |
| mobile | F | T | T |
| print | T | F | T |

A coordinator says: “Every exhibit already has a suitable card, so we can print just one of these card designs and use it for every exhibit.”

1. Formalize the premise and conclusion. Evaluate each using the complete table and explicit evidence.
2. Identify the exact logical step that needs justification.
3. The gallery may expand one card so that it explains one additional exhibit, changing exactly one F entry to T and no other entry. List all changes that would make the conclusion true, and name the resulting uniform witness in each case.
4. Write the negation of the conclusion with bounded quantifiers, then explain what evidence would establish it before the edit.

## References and reuse

These freely readable primary teaching references support the notation and concepts. The exercise wording, contexts, tables, and sequence here are original; the references are not answer keys for this worksheet.

- [MIT 6.042, Predicate Logic I](https://courses.csail.mit.edu/6.042/spring18/predicate-logic1.pdf): finite quantifiers as conjunction/disjunction and contrasting quantifier orders.
- [forall x: Calgary, §25.3, The order of quantifiers](https://forallx.openlogicproject.org/html/Ch25.html#S3): dependent and uniform choices.
- [Stanford CS103, Winter 2025, Lecture 05](https://web.stanford.edu/class/archive/cs/cs103/cs103.1254/lectures/05/Condensed%20Lecture%20Slides.pdf): quantifier negation and restricted quantifiers, including empty-set bounds.

Prepared with AI assistance. Released under CC BY 4.0; attribute “RecallWeave — Quantifier order worksheet.” This worksheet does not claim app, browser, print-layout, or learning-outcome validation.
