# Sorting records without losing their identity

This original twelve-question RecallWeave course follows a record's key and identity through two elementary sorting recipes. It is for learners who can read a short ordered list and want to explain why a correctly sorted result may still lose equal-key order.

## Explore, then recall

Open [the standalone explorer](../stable-sorting.html) directly from disk. Its source, style and exact course file are embedded. The [modular explorer](../stable-sorting/index.html) is the equivalent version for a static server.

Start with **A distant exchange crosses a tie**: key 2, label A; key 2, label B; key 1, label C. Choose **Start comparison**, then advance each panel independently. Input badges are identities; labels may repeat. Insertion finishes C, A, B, keeping the two key-2 records in their input order. Selection's first distant exchange finishes C, B, A, reversing those identities.

Change a key or label, add or remove a record, or choose another example. That edit retires the previous run. A new successful **Start comparison** captures the revised input. **Restart both traces** returns both panels to the beginning of the same still-current run.

**Download complete comparison (.json)** saves the captured input, declared rules and both complete traces. The file is complete even when you are viewing an intermediate step. It is an inspection artifact, with no restore/import promise.

**Download lesson (.json)** saves the exact [course file](stable-sorting.json), independently of the current draft. In the [RecallWeave learner](../demo.html), select this course file and inspect its preview. Explicitly start the imported course to replace an unfinished session. Work through all twelve first answers, then use review and practice for misses. Download study notes to retain the original first answers and later practice outcomes.

## What the lesson teaches

The four concepts are record identity, insertion passes, selection and stability, and choosing/checking a sort. Each concept has three original questions with worked explanations and transfer prompts.

A key decides order; an input identity distinguishes records. Stability preserves relative input order only within equal-key groups. In this explorer, duplicate labels remain separate identities.

The insertion recipe compares a record with its predecessor and exchanges adjacent records only on a strict less-than decision. The selection recipe keeps the earliest current minimum when keys tie and exchanges that minimum with the pass position only when the positions differ. Earliest-minimum selection can still cross a tied pair through a distant exchange.

Counts belong to those declared recipes. A comparison is a strict-less-than decision; extra equality classification for narration is excluded. An exchange swaps two distinct positions; a self-exchange is omitted. These counts are not elapsed-time measurements.

The UI distinguishes a recipe's general stability guarantee from a particular input's final tie order. If there are no tied keys, there is no equal-key order to inspect. A selection result that happens to preserve ties does not establish its general stability.

## Conceptual sources and original material

Primary conceptual references are Robert Sedgewick and Kevin Wayne's Princeton Algorithms materials:

- [Elementary sorts](https://algs4.cs.princeton.edu/21elementary/) for key-based record sorting and the insertion/selection recipes.
- [Insertion documentation](https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/Insertion.html) for stability and the relationship between adjacent exchanges and inversions.
- [Selection documentation](https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/Selection.html) for the lack of a general stability guarantee.
- [Sorting applications](https://algs4.cs.princeton.edu/25applications/) for stability and successive sorts by different keys.

All prompts, examples, explanations, transfer cues, layout and implementation in this addition are original. No reference code, prose passages or figures are copied. Princeton's implementation counts self-exchanges; this explorer explicitly skips them, so its exchange totals must be interpreted under its own rule.

The course JSON carries an explicit attribution and reuse permission statement. Structural validation, independent content review, native algorithm controls and actual browser downloads establish different parts of the receiving record; none is a claim about learning efficacy or benchmark performance.

## Development

Run the focused maintained tests with:

```sh
node tools/make_stable_sorting.mjs
node --test tests/stable-sorting.test.mjs
node tools/make_stable_sorting.mjs --check
```

The addition uses native JavaScript and the existing course validator, with no new package. Existing learner, importer, model, notes, archive, authoring and other course files are not edited by this feature.
