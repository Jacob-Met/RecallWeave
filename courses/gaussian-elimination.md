# Gaussian elimination: keep the solution set

This original course introduces the row-reduction ideas used when solving small linear systems. It supplies a foundation for RecallWeave's least-squares and normal-modes courses: recognize pivots, distinguish a solution family from inconsistency, and verify a result in the original equations.

Open the self-contained **gaussian-elimination-explorer.html**. It works offline. Download its question deck and import that JSON through RecallWeave's existing deck import flow. The deck contains twelve retrieval questions with explanations and transfer prompts. The explorer does not save progress.

## Before starting

You should be able to substitute a value in an equation, add signed fractions, and recognize an ordered pair or triple. An augmented matrix records each equation's coefficients, followed by its right-hand side. For example,

    x + y = 5       [1   1 | 5]
   2x - y = 1       [2  -1 | 1]

The vertical bar separates the right-hand side; it does not introduce another variable. Changing an equation is useful only when its set of possible simultaneous solutions is preserved.

## Three reversible operations

1. Swap two rows. This changes the order of equations.
2. Multiply a row by a **nonzero** number. Multiply every entry, including the right-hand side. The reciprocal reverses this operation.
3. Add a multiple of one row to a different row, leaving the source row unchanged. Subtracting that multiple reverses the operation.

Multiplication by zero can erase a restriction, so it is not an elementary row operation. For example, x + y = 5 becomes the uninformative 0 = 0. Also, operations act on whole augmented rows. Changing only a coefficient or only the right-hand side generally changes the solution set.

In the explorer, choose the operation and its target row. An add operation uses the selected source row and factor. Each successful operation appears in the history; Undo reverses your last recorded step by restoring that exact prior matrix. Reset returns to the loaded original system. Changing a preset or loading a new matrix starts a new attempt.

## Build a pivot, then clear its column

A pivot is the leading nonzero entry in a row after arranging the rows in echelon order. Reduced row-echelon form goes further: each pivot is 1 and is the only nonzero entry in its column; zero rows are at the bottom. Pivots move to the right as you move down rows.

For the first example, try:

    R2 ← R2 - 2R1       [1   1 |  5]
                        [0  -3 | -9]

    R2 ← (-1/3)R2       [1   1 | 5]
                        [0   1 | 3]

    R1 ← R1 - R2        [1   0 | 2]
                        [0   1 | 3]

Read x = 2 and y = 3. Verify both original equations: 2 + 3 = 5 and 2(2) - 3 = 1. This independent substitution catches errors that a tidy final matrix can hide.

The guided button performs one legal operation at a time using the first available nonzero pivot. It normalizes the pivot and clears entries above and below it. A different legal operation order may take a different route to the same reduced form.

A zero candidate pivot is not a verdict on the whole system. In the preset

    [0  2 | 4]
    [3  1 | 5]

swap the rows to find a nonzero first-column pivot. The solution is x = 1, y = 2. If every remaining entry in a coefficient column is zero, continue to the next column instead of dividing by zero.

## Three possible outcomes

**One solution.** A consistent system has a pivot in every variable column. The final right-hand sides then specify each variable.

**Infinitely many solutions.** A consistent system leaves one or more variable columns without pivots. These variables are free; they are not automatically zero. For

    [1  2  -1 | 3]
    [2  4  -2 | 6]

subtracting twice the first row from the second yields a zero row. Write x2 = s and x3 = t. Then

    (x1, x2, x3) = (3 - 2s + t, s, t)
                 = (3, 0, 0) + s(-2, 1, 0) + t(1, 0, 1),

where s and t may be any real numbers. The first vector is one particular solution. Each direction vector produces zero when substituted into the left sides of the original equations. This is why adding any combination of them to the particular solution preserves the right sides.

**No solution.** A row with all coefficient entries zero and a nonzero right-hand side asserts an impossibility. For

    [1  -1 | 2]
    [2  -2 | 5]

R2 - 2R1 gives [0, 0 | 1], or 0 = 1. The combination weights (-2, 1) on the original equations certify the contradiction. A zero row [0, 0 | 0] is entirely different: it adds no restriction and does not itself prove inconsistency.

The coefficient rank counts pivots in variable columns. The augmented rank counts pivots when the right-hand-side column is included. Unequal ranks mean no solution. When the ranks agree, the number of free variables equals the number of variables minus the coefficient rank.

## Fractions stay exact

The fraction preset represents

    (1/2)x + y = 2
       x - (1/3)y = 1/3.

Its exact solution is x = 6/7 and y = 11/7. Substitution gives 3/7 + 11/7 = 2 and 6/7 - 11/21 = 1/3. The explorer uses normalized rational numbers, so a value such as 1/3 is never silently replaced by a rounded decimal.

You may enter 2 or 3 equations in 2 or 3 variables. Separate entries with spaces or commas and rows with newlines or semicolons. Enter integers or fractions, not decimal or exponential notation. Each typed scalar is limited to 40 characters. Canonical intermediate values may be longer; normalized numerators and denominators are bounded to 128 bits. If exact arithmetic would exceed that classroom bound, the attempted operation is refused and the current matrix remains intact. Each attempt permits 80 operations; Undo frees a slot.

This is a small exact-arithmetic teaching model. Floating-point computation introduces rounding error and numerical stability questions. Choosing a large-magnitude pivot, scaling strategies, and more advanced factorizations matter in numerical software; the explorer's first-nonzero-pivot rule is not a numerical-stability recommendation.

## Practice and transfer

Work through the first example manually, then use the guided button on the same system and explain why both sequences preserve the original equations. Use Undo to compare adjacent matrices.

Try the family and contradiction presets. Before finishing the reduction, predict whether a zero row will mean freedom or inconsistency. Then check the right-hand side.

Finally, connect this to least squares: an inconsistent observed-data system has no exact solution. Minimizing the squared length of Ax - b asks a different, useful question; it does not make contradictory equalities true. For normal modes and other nullspace problems, a nonzero free direction has meaning, whereas setting every free variable to zero would conceal it.

For each quiz answer, give your reasoning before revealing the explanation. Then attempt its transfer prompt without copying the previous numbers. Correctness on these examples does not establish mastery of larger systems or measured learning gains.

## References and authorship

General mathematical references, not copied exercises or prose:

- MIT OpenCourseWare, Gilbert Strang, *18.06SC Linear Algebra*, Fall 2011, [Elimination with Matrices](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/elimination-with-matrices/).
- MIT OpenCourseWare, Gilbert Strang, *18.06SC Linear Algebra*, Fall 2011, [Solving Ax = b: Row Reduced Form R](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/solving-ax-b-row-reduced-form-r/).

The questions, explanations, worked examples, guide, and explorer were drafted with AI assistance for RecallWeave. A subject-matter educator should review the material before learner deployment. The running explorer calls no AI or hosted service. Cited materials retain their own terms; no source exercise or figure is reproduced here.
