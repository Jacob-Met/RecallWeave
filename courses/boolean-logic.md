# Boolean logic: from truth values to valid inference

This original twelve-question course introduces classical, two-valued propositional logic. Its companion [Boolean explorer](boolean-logic-explorer.html) lets a learner change expressions, inspect every assignment, find a counterexample to equivalence, and download the full truth table. Both the explorer and the existing learner work from local files.

## Try the course

1. Open `boolean-logic-explorer.html` directly in a browser. The initial example compares an implication with its converse. Choose **Inspect first difference** and read the assignment and the two outputs.
2. Try **Contrapositive** or **De Morgan's law**. Compare their complete truth tables with the converse example. The table reports logical equivalence only when the outputs agree on every assignment.
3. Write your own expression or pair. The page shows exactly how each expression was grouped. Select any row to inspect its assignment and result.
4. Use **Download full table (.csv)** to keep every row, including rows currently hidden by **Show differing rows only**.
5. Choose **Download course (.json)**. Open the existing [RecallWeave learner](../demo.html), choose the downloaded file under **Bring your own lesson**, review its preview, and select **Start this deck**. If you copied the explorer alone to another folder, open a separate copy of `demo.html` for this step.

Complete the twelve challenges in the learner, review the original answers and explanations, and practice any missed connections. Practice keeps the first answers and first-session model estimates intact. Study notes and learning traces use the learner's existing downloads. Restoring a trace requires starting the same course first.

The explorer computes a finite truth table. It does not determine whether a real-world premise is true, show causation, or measure a learner's improvement. The learner's existing estimates remain illustrative model state.

## Expression rules

Use variables **A, B, C, D, E** and constants **true** and **false**. Letter case does not matter. Parentheses make grouping explicit. Word operators must be separate words; `trueandfalse` is not an expression.

| Operator | Meaning | True when |
|---|---|---|
| `not A` | Negation | A is False |
| `A and B` | Conjunction | Both operands are True |
| `A xor B` | Exclusive disjunction | Exactly one operand is True |
| `A or B` | Inclusive disjunction | At least one operand is True |
| `A -> B` | Material implication | A is False or B is True |
| `A <-> B` | Biconditional | Both operands have the same value |

In this explorer, precedence runs from strongest to weakest: `not`, `and`, `xor`, `or`, `->`, `<->`. Repeated implication groups to the right: `A -> B -> C` means `A -> (B -> C)`. The other binary operators group to the left. These are the app's explicit parsing conventions; the displayed parenthesized expression is the authoritative grouping for the table.

A table uses the alphabetical union of variables from both expressions, even when a variable does not change an output. Assignments place True before False. Two variables therefore produce TT, TF, FT, FF; five variables produce 32 rows. An expression made only of constants produces one empty assignment. A single expression is classified as a tautology, contradiction, or contingent according to its complete output column. A comparison is equivalent only if every pair of outputs matches. The first differing assignment is a counterexample to equivalence.

Each expression accepts at most 512 UTF-16 code units, 128 tokens, 32 levels of parentheses, and 32 levels of nested operators. These are separate limits. The second expression is optional; a blank first expression is invalid. Unsupported letters, symbols, incomplete input and exceeded limits clear the previous table, result and download. Correcting the input computes a new result.

The CSV contains the complete current table, grouped expression headings and a result-agreement column when comparing two expressions. The course JSON download preserves the exact checked-in course bytes. Neither download uploads data or saves automatically.

## Course structure and answer reasoning

The course has three questions in each of four concepts. Material implication follows truth values and connectives. Logical equivalence follows those two concepts. Valid inference follows implication and equivalence. The existing learner chooses the next available question using its unchanged model and selector.

The following answer positions refer to the order in the JSON file. The learner shuffles displayed choices, so a displayed letter is not a stable answer identity.

| Item | Original answer position | Reasoning and the distinction tested |
|---|---:|---|
| `logic-connectives-1` | 2 | When both A and B are True, inclusive or is True and xor is False. Xor admits the two mixed assignments, not the both-True assignment. |
| `logic-connectives-2` | 4 | `A and not (B or C)` needs A=True and B=C=False. Each other listed assignment either makes the inner or True or makes A False. |
| `logic-connectives-3` | 1 | At A=True, B=False, `((not A) and B)` is False, while `not (A and B)` is True. Negating one operand differs from negating the conjunction. |
| `logic-implication-1` | 3 | Only A=True, B=False falsifies `A -> B`. Each other listed assignment satisfies the material conditional. |
| `logic-implication-2` | 1 | With A=False, both B=True and B=False make the implication True. Its truth does not determine B on those rows. |
| `logic-implication-3` | 3 | Substitute the entire antecedent P=(A and B) into `not Q -> not P`: `not C -> not (A and B)`. The converse reverses without negating; the inverse negates without reversing. Requiring both A and B to be False is too strong. |
| `logic-equivalence-1` | 4 | `not (A or B)` is True exactly when both operands are False, which is `(not A) and (not B)`. The listed alternatives admit additional rows. |
| `logic-equivalence-2` | 2 | At A=False, B=True, `A -> B` is True and `B -> A` is False. One mismatch suffices. The listed both-True and both-False rows match. |
| `logic-equivalence-3` | 3 | The two columns must agree for every assignment. Shared variable names, one matching row, or having some True rows do not establish equivalence. Both stated expressions have the TT, TF, FT, FF output column True, False, True, True. |
| `logic-inference-1` | 2 | If A and `A -> B` are both True, B cannot be False. Otherwise the implication would be False. This is modus ponens. |
| `logic-inference-2` | 1 | A=False, B=True satisfies both premises `A -> B` and B but falsifies conclusion A. This refutes affirming the consequent. |
| `logic-inference-3` | 4 | No all-True-premises/False-conclusion row establishes valid form. It does not establish the premises' actual truth, a conclusion that is True under every assignment, or causation. |

Every question has its own explanation and an open transfer prompt. The transfer prompts invite a learner to construct or test an example; they are not assigned an invented single-answer score.

## Content sources and permission

The question text, distractors, explanations, transfer prompts and this guide are original material authored for RecallWeave with AI assistance. The lesson text is offered under **CC BY 4.0** with attribution retained in the JSON. No textbook exercise, figure or passage is reproduced.

Definitions and distinctions were checked against OpenStax, *Contemporary Mathematics*:

- [2.2 Compound Statements](https://openstax.org/books/contemporary-mathematics/pages/2-2-compound-statements): connectives and compound statements.
- [2.4 Truth Tables for the Conditional and Biconditional](https://openstax.org/books/contemporary-mathematics/pages/2-4-truth-tables-for-the-conditional-and-biconditional): material conditional and biconditional tables.
- [2.5 Equivalent Statements](https://openstax.org/books/contemporary-mathematics/pages/2-5-equivalent-statements): equivalence, converse and contrapositive.
- [2.6 De Morgan's Laws](https://openstax.org/books/contemporary-mathematics/pages/2-6-de-morgans-laws): negating conjunctions and disjunctions.
- [2.7 Logical Arguments](https://openstax.org/books/contemporary-mathematics/pages/2-7-logical-arguments): validity and argument forms.

The repository's [AI disclosure](../AI-DISCLOSURE.md) applies. An educator should review the material for the intended learners before using it for instruction or assessment.

## Rebuild and verify

The new parser, UI and builder use native JavaScript and the existing deck validator, with no new dependencies. The checked-in explorer includes the validator, model, UI and exact course text in one file.

```bash
node tools/build-boolean-logic.mjs
node tools/build-boolean-logic.mjs --check
node --test tests/boolean-logic.test.mjs tests/boolean-logic-course.test.mjs tests/boolean-logic-build.test.mjs
```

The optional receiving driver needs Node 22+ and an existing Chrome or Chromium executable. It creates its own profile, opens the local explorer and existing learner, drives real controls, and reads actual completed downloads.

```bash
node tools/check-boolean-logic-browser.mjs --browser /path/to/chromium --output /tmp/recallweave-boolean-receiving
```

The [receiving packet](../docs/receiving/boolean-logic-acd057031fb2/) keeps the source-pinned baseline, independent question-only material and verification evidence. Execution claims in that packet apply to the recorded source and runtime.
