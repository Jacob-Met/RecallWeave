# Edit distance: inspect the prefixes, replay one alignment

Open [the standalone explorer](edit-distance-explorer.html), download its [twelve-question course](edit-distance.json), or import that JSON through RecallWeave's existing **Bring your own lesson → preview → Start this deck** flow. The lab is separate from the learner. It computes an explicit experiment in your browser; it never reads or changes a learner session.

## The question being answered

Given two short strings and three positive costs, what is the cheapest way to transform the first string into the second using insertion, deletion and substitution? A matching symbol costs 0. A transposition is not one operation. The inputs and costs remain visible with the result.

This lab uses literal Unicode scalar values. Spaces and letter case matter. It does not trim, normalize, sort, or compare meaning. One emoji such as 😀 is one scalar even though JavaScript's UTF-16 length is 2. A displayed accented character can consist of one scalar or several: é and e followed by U+0301 are different sequences here. This policy is useful for making the algorithm precise; it is not a universal definition of a human character or a language-similarity score.

Inputs allow 0–16 scalars each. Unpaired UTF-16 surrogates and C0/DEL controls are refused explicitly. Each operation cost is an integer 1–9, uniformly applied to that operation. Changing either string or any cost immediately retires the old result and experiment download. Choose **Compute minimum cost** again after editing. Invalid input never leaves an old successful table available.

## Read a prefix table

Let D[i,j] mean the minimum cost to transform the first i source scalars into the first j target scalars. Index 0 names an empty prefix. The table has (m+1)(n+1) cells, where m and n are the two input lengths.

- Empty into empty costs 0.
- D[i,0] is i times the deletion cost.
- D[0,j] is j times the insertion cost.

For an interior cell, consider three possible final operations:

| Final operation | Earlier prefix cell | Extra cost |
|---|---|---|
| Match or substitute | D[i−1,j−1] | 0 if the last scalars match; otherwise substitution |
| Delete a source scalar | D[i−1,j] | deletion |
| Insert a target scalar | D[i,j−1] | insertion |

The cell takes the smallest complete candidate. It does not choose the cheapest operation in isolation. A cheap operation can follow an expensive earlier prefix.

Every path to the new prefix ends in one of these three kinds of step. Removing that last step leaves one of the smaller prefix problems. Conversely, extending an optimal earlier prefix with a permitted step gives a valid candidate. Starting from the empty-prefix boundaries and taking the least candidate therefore computes a minimum for every prefix. With positive uniform costs, editing a symbol through repeated intermediate substitutions cannot improve on its direct substitution, while deleting and inserting remains an explicit alternative.

Use the row and column selectors to inspect any cell's exact calculations. Each minimum candidate is labeled; table arrows mark all tied predecessors. The table buttons support arrow-key movement. A wide table scrolls inside its own region on a narrow screen.

## Reconstruct one optimum

Start at D[m,n] and walk backward through any minimizing predecessor until D[0,0]. This lab makes the display reproducible by preferring diagonal, then deletion, then insertion at each backward tie. Reverse those steps to obtain a forward alignment.

That is **one optimal alignment**, not a uniqueness claim. In aa → a at unit costs, either source occurrence can be deleted. Both alignments cost 1. A table cell with one best predecessor does not prove that every earlier cell was untied.

The alignment list shows source and target scalars, prefix coordinates and individual costs. The replay controls consume the source from left to right, build the target prefix and retain the unused source suffix. Matches appear as zero-cost alignment steps; they are not edits. A valid final replay consumes the complete source, emits the exact target, and has total cost equal to the final cell.

## Worked checks

### A shifted alignment

tack → stack needs one insertion of s before tack, at unit cost 1. Comparing characters only at the same screen positions would miss the shift. The exact minimum is 1 because the target length differs, so a zero-cost sequence of matches cannot suffice.

### Boundaries are genuine problems

Empty → cat with insertion 2 costs 6. cat → empty with deletion 3 costs 9. Unequal insertion and deletion costs can make the directional minimum asymmetric. It is safer to say “minimum transformation cost” than to assume all properties of a symmetric metric.

### More edits can cost less

For a → b with insertion 1, deletion 1 and substitution 4, one substitution costs 4. Deletion plus insertion costs 2. The optimum minimizes the chosen cost policy, not the number of edit operations.

### A swap is not available

ab → ba has unit-cost minimum 2. Two substitutions work; deletion plus insertion also works. None of the three permitted single operations can produce ba: insertion/deletion changes length, and substitution changes only one position. A model with transpositions would answer a different question.

### One complete cell

For ab → ac at unit costs, the relevant earlier cells are D[1,1]=0, D[1,2]=1 and D[2,1]=1. The last-step candidates are 1,2,2, so D[2,2]=1. The substitution's operation cost is 1; the cell's total includes its prefix cost 0.

### Literal Unicode policy

é → e + combining acute has unit-cost minimum 2 under scalar identity. Substitute the original scalar and insert the second target scalar. There is no one-step operation that both changes the original scalar and adds another. The visually composed character is not silently normalized.

## Downloads and the learner

**Download experiment** retains the accepted literal inputs, cost policy, complete cells and candidate calculations, one alignment, and every replay state. It is a record, not an accepted restore format or a learner archive. Editing the draft disables this download until a new valid computation succeeds.

**Download lesson** always saves the same authored twelve-question course, regardless of experimental inputs. **Download worked guide** saves this document. All downloads are explicit and local. No network request, provider, automatic storage or background computation is needed.

Import the lesson into the existing learner, answer all twelve items, inspect the original review, and practice missed items separately. A correct retry does not rewrite the original answer or its first-attempt estimate. The lesson and lab illustrate reasoning; they are not evidence that this course improves learning outcomes.

## Original course answer derivations

| Item | Correct answer | Reason |
|---|---|---|
| edit-01 | option 2: cost 1 | One middle substitution; different literal inputs cannot have cost 0. |
| edit-02 | option 3:6 and 9 | Three insertions at 2; three deletions at 3. |
| edit-03 | option 4: cost 2 | 1+1 is less than substitution 4. |
| edit-04 | option 1: two prefixes | i and j are consumed prefix lengths. |
| edit-05 | option 2:1,2,2 | Prefix cost plus the stated last-operation cost. |
| edit-06 | option 3: leading insertion | tack remains in order after inserting s. |
| edit-07 | option 4: either deletion | Repeated identical source symbols create alternative optimal alignments. |
| edit-08 | option 1:2 | No single permitted operation is a swap. |
| edit-09 | option 3: full witness checks | Source consumption, exact target and final-cell cost all agree. |
| edit-10 | option 4:20 | Four source prefix lengths times five target prefix lengths. |
| edit-11 | option 1:2 | One scalar must change and one must be inserted. |
| edit-12 | option 2: literal identity | Positive edit costs leave only identical-symbol matches in a cost 0 alignment. |

These are original questions, distractors, explanations and worked examples. The source deck uses zero-based answer indices; this table numbers visible options from 1.

## Build and receive

No packages are needed for the model, tests or standalone builder. Use the repository's Node 20+ requirement:

```sh
node tools/build-edit-distance.mjs
node tools/build-edit-distance.mjs --check
node --test tests/edit-distance.test.mjs
```

The optional actual-browser receiver uses an already installed Puppeteer and Chromium. Its command and native source identities are recorded with the receiving packet; it must use its own profile and download directory. Source validation is separate from browser, hosted or public delivery acceptance.

The standalone file bundles the authored model, UI, course and guide. It can be moved and opened directly. Rebuilding it is deterministic; --check refuses a stale committed artifact. The existing catalog/importer/learner and other lesson modules are unchanged.

## Conceptual references and authorship

Wagner and Fischer's original [1974 paper](https://doi.org/10.1145/321796.321811), *The String-to-String Correction Problem*, gives the weighted prefix formulation; [MIT 6.006 Spring 2020 Recitation 16](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_r16/) discusses unit-cost prefix subproblems and reconstruction. These references informed conceptual checking. No passages, question banks, diagrams or implementations were copied. Original lesson content is CC BY 4.0; referenced works retain their own licenses. AI assistance was used for this implementation and original educational wording.
