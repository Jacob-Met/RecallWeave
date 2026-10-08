# Boolean logic: frozen teaching and receiving contract

Base: RecallWeave `8b82cf5bb95fc7faa5e835e2979df703e6e91a7b`, tree `47063a7cd409d456fcd108ee3557c7451053ef4c`. Ownership: issue #59, `chatgpt-acd057031fb2 / production`.

## What the learner can do

Open the standalone course companion directly from a file, enter one expression or two expressions, see every truth assignment, select a row to inspect its values, and locate a counterexample when two expressions disagree. Preset examples expose implication, its converse, its contrapositive, De Morgan's law and a valid inference. Downloads provide the exact authored course JSON and the complete current table as CSV. The course uses the existing learner's unchanged validator, adaptive question order, canonical choices, review, separate practice and trace download.

This is classical two-valued propositional logic. Every variable has exactly one Boolean value per row. The page does not decide the actual truth of a real-world statement, establish causation, or measure learning improvement. An argument is valid if there is no assignment with all its premises true and its conclusion false; validity alone does not establish that its premises are true.

## Expression contract

- Variables: A, B, C, D, E. Literals: true, false. Words and variable letters accept either case.
- Operators: not, and, xor, or, ->, <->. Parentheses group expressions. Other characters and unknown words are refused; expressions are parsed as data without eval.
- Precedence, strongest first: not; and; xor; or; ->; <->. Implication associates to the right. Other binary operators associate to the left. The fully grouped expression is always displayed so this convention is visible.
- `or` includes the both-true case. `xor` is true exactly when its two operands differ. `A -> B` is false only at A=True, B=False. `A <-> B` is true exactly when A and B agree.
- Limits per expression: 512 characters, 128 tokens, 32 levels of parentheses, 32 levels of parsed operators. At most five variables therefore produce at most 32 rows. A constant-only expression produces one empty assignment, not zero rows.
- Rows use the union of variables in alphabetical order, True before False. Every complete assignment appears exactly once. Equivalence means equal outputs on every row of that union; a differing row is an explicit counterexample, never a causal claim.
- First expression is required. A blank second expression selects the single-expression mode. Invalid edits immediately clear the previous table, selected-row details, verdict and table download. A later valid edit recovers from the current input.
- Classification is tautology (all rows true), contradiction (all rows false), or contingent (both values occur). The optional second expression is compared only when present.

## Content and verification boundaries

Twelve original four-choice questions span truth values/connectives, material implication, equivalence and valid inference. Canonical answers will be balanced across the four positions; distractors have separate mathematical reasons for being wrong. The question-only packet is frozen before answer-key disclosure to the independent reviewer. Open transfer prompts have no invented answer key.

Independent checks must derive complete expected truth columns and counterexamples without calling the production evaluator. Refusal tests must vary input after a valid result. Browser receiving must inspect literal rendered values and real downloaded bytes, including a fresh file-open explorer and the real learner admitting that downloaded deck and retaining canonical answer/review/practice/trace identities.

Current source absence is a missing-capability baseline, not a regression claim about the existing learner. Full pre-existing lesson behavior is not newly qualified merely by importing its helpers. New course/explorer source and maintained native tests are separate from authored receiving fixtures and evidence.

Primary conceptual references checked on 2026-10-08: OpenStax Contemporary Mathematics sections 2.2, 2.4, 2.5, 2.6 and 2.7. The questions, examples, text, code and diagrams in this contribution are original; no textbook exercise, answer key, figure or extended prose is copied.
