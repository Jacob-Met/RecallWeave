# Nondeterministic automata: branching paths and exact subsets

Open [the standalone lab](nondeterministic-automata-explorer.html) directly in a browser. It contains its model, interface, course and guide, so it runs without a server or network request. The editable machine has 1–5 states and uses the binary alphabet **{0,1}**. A trace admits up to 24 symbols. The reachable subset construction is complete, with at most 32 states, regardless of that trace limit.

The [original twelve-question course](nondeterministic-automata.json) teaches branching paths, epsilon closure, subset states and language preservation. Download the course from the lab, open the existing [RecallWeave learner](../demo.html), choose the JSON under **Bring your own lesson**, inspect the preview and explicitly start the deck. The existing learner provides feedback, review and practice. If you move the standalone lab elsewhere, open your installed or saved learner separately.

## What a branch means

A nondeterministic finite automaton can have several destinations, or none, for the same state and input symbol. It accepts a word when at least one possible path consumes all its symbols and ends in an accepting state. No voting, probability or advance choice of one path is required. A path that cannot continue stops contributing possibilities; it does not cancel the other paths.

An epsilon edge consumes no input. It may be followed before, between or after symbol moves. Epsilon closure collects endpoints reachable by zero or more such edges, including the starting states. A cycle can generate infinitely many walks while still reaching only finitely many state identities. A visited-state traversal therefore finishes.

The lab represents possible states as a set. It first closes the start state. For each input symbol it unions the matching destinations of every active state, then closes that union. An accepting state in an earlier prefix does not stop the rest of the word.

These are the standard epsilon-NFA semantics and conversion rules described by Alfred V. Aho in [Columbia COMS W3261 Lecture 3, sections 1–2](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L3-Regular_Expressions.html). The examples and exercises below are original.

## Work an example: guess the final 10

Start at q0; only q2 accepts. There are no epsilon edges.

| State | On 0 | On 1 |
|---|---|---|
| q0 | {q0} | {q0,q1} |
| q1 | {q2} | ∅ |
| q2 | ∅ | ∅ |

q0 keeps reading arbitrary input. On a 1, a second possibility q1 guesses that this is the penultimate symbol. That possibility reaches q2 if the next symbol is 0. It has no further destination, so only a guess aligned with the actual end can accept.

For 1010, the exact sets are:

| Consumed prefix | Active set | Accepting at this prefix? |
|---|---|---|
| ε | {q0} | No |
|1|{q0,q1}|No|
|10|{q0,q2}|Yes|
|101|{q0,q1}|No|
|1010|{q0,q2}|Yes|

The full word 1010 accepts; 101 rejects. The language is all binary words ending in 10. This is an existential path interpretation, not a probability that a guessed path was lucky.

**Try it:** change q1's 0-destination to blank. Recompute before downloading. The edited machine has lost every path to q2 and accepts no word. Restore the example explicitly with **Load example**.

## Work an example: epsilon or exactly 01

Use four states. Start at q0; only q3 accepts.

| State | On 0 | On 1 | On ε |
|---|---|---|---|
|q0|∅|∅|{q1,q3}|
|q1|{q2}|∅|∅|
|q2|∅|{q3}|∅|
|q3|∅|∅|∅|

The start closure is {q0,q1,q3}, so the empty word accepts through the epsilon route to q3. For 0, the raw destination and closed set are {q2}, which rejects. For 01, they become {q3}, which accepts. A further symbol sends the set to∅. The recognized language is exactly {ε,01}.

An epsilon edge is not a character that the input must contain. Leave the word field blank for ε; typing the epsilon glyph or spaces is refused.

**Try it:** remove q3 from q0's epsilon destinations. The empty word now rejects, but 01 still accepts. This separates empty-word acceptance from symbol-consuming acceptance.

## Work an example: cycles do not prevent closure

In the five-state cycle example, q0 has an epsilon edge to q1 and q1 has one back to q0. q1 on 0 reaches q2; q2 has an epsilon edge to q3; q3 on 1 reaches accepting q4.

The initial closure is {q0,q1}. Reading 0 first produces raw destinations {q2}, then closure {q2,q3}. Reading 1 produces {q4}. The only accepted word is 01. Repeated epsilon walks between q0 and q1 neither consume a symbol nor add a new state.

The lab displays raw destinations separately from the closed active set to make the after-symbol epsilon step visible. A set with no active member cannot use an edge anywhere in the machine: closure(∅)=∅.

## Build the reachable subset DFA

Each DFA state is one entire closed active set. The initial DFA state is the closure of the NFA start. For each reachable subset and each binary symbol, the lab performs the same symbol-union and closure operation as the trace. A subset accepts when at least one of its members accepts.

The lab visits subsets in breadth-first order, using 0 before 1. IDs D0,D1,… are display identities, not original NFA states. Each row records a first shortest reaching word under that ordering. Member sets are sorted and deduplicated. The empty subset appears if reachable and then loops to itself on both symbols.

For a machine with n states there are 2^n possible subsets, including∅. Only subsets reached from the closed start are included. An unreachable original state does not have to appear in any row. Five original states permit at most 32 rows, but a machine can use just one.

### Why all words are preserved

The invariant is: after a prefix, the DFA's current state is the exact closed set of NFA possibilities after that same prefix.

It holds initially because both start from the closed start state. Suppose it holds for one prefix. For the next symbol, both union exactly the same symbol destinations and close that union under epsilon edges. They therefore agree for the extended prefix. By induction this holds for every finite word. The acceptance test is the same intersection with the NFA accepting set, so the languages agree.

This argument is separate from finite tests. Testing words through any fixed length may find mistakes, but agreement in that panel alone is not a proof for all longer words. See also [Aho's Lecture 2, section 6](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L2-Finite_Automata.html) for the state-set simulation perspective.

Reachable subset construction is not minimization. Consider two accepting states with no epsilon edges: q0 goes to q1 on both symbols, and q1 loops on both. The construction reaches {q0} and {q1}, but a single accepting state with two loops recognizes the same language, all binary words. Removing unreachable states and merging equivalent reachable states are different operations.

## Edit, inspect and save

- Each transition cell accepts comma-separated integer indices, such as 0,2. Blank means∅. Indices must refer to the current table, and duplicates are refused.
- Select one start state and any accepting flags. **Replace with blank table** and **Load example** explicitly replace existing edits. Selecting a new blank-table size alone does not replace the current table.
- **Analyze** computes from the currently displayed inputs. Any actual machine or word edit clears the previous result and disables its download. An invalid edit stays visible with an actionable error; no old result is presented as current.
- The trace records each consumed prefix, its raw destinations and epsilon closure, the corresponding DFA ID and prefix acceptance. The final row decides the whole word.
- The subset table contains the complete reachable graph. Its trace highlights also have text labels; color is not the only cue.
- **Download this analysis** records the admitted machine, word, full trace, reachable subset table and DFA path. It is an inspectable result, not a learner deck.
- **Download course JSON** and **Download worked guide** preserve the exact fixed source text. **Download original offline lab** reconstructs the original built HTML, not your transient edited DOM. Reloading starts from the default example.

All computation and downloads stay local. The runtime makes no provider call and writes no learner state. The lab does not parse regular expressions, compare arbitrary NFAs for equivalence, minimize DFAs, assign transition probabilities, or measure teaching effectiveness. Existing deterministic-automata work and shared catalog/importer files remain separate.

## Worked course answers

### 1. Branching paths

Correct option: **C — Accept: one fully consuming accepting path is enough.**

Nondeterministic acceptance is existential: at least one possible path must consume the whole word and finish in an accepting state. Other paths may fail, stop early or end elsewhere. There is no vote or probability in this model.

**Transfer:** Only existence matters: a single complete accepting path establishes acceptance, regardless of how many other paths fail. A path with unread symbols has not processed the queried word and cannot establish its acceptance.

### 2. Branching paths

Correct option: **A — {q2}**

Take the union of the symbol destinations of the active states. q0 contributes nothing and q1 contributes q2, so the next set is {q2}. A stopped branch does not erase a surviving branch.

**Transfer:** If both states have no 1-destination, the next set is empty. Every later symbol still has no active origin; epsilon closure also has no seed, so the set cannot revive.

### 3. Branching paths

Correct option: **D — No: after all three symbols the active set is {q0,q1}, with no accepting state.**

After 1 the active set is {q0,q1}; after 10 it is {q0,q2}; after 101 it is {q0,q1}. Only the final set decides this word, and it excludes accepting q2. An accepting prefix does not stop consumption.

**Transfer:** For 1010 the sets are {q0}, {q0,q1}, {q0,q2}, {q0,q1}, {q0,q2}. It accepts because final q2 is present. For 101 it is only an earlier prefix that included q2.

### 4. Epsilon closure

Correct option: **B — {q0,q1,q2}**

Zero epsilon moves keep q0. One move reaches q1, and from q1 another move reaches q2 as well as returning to q0. The set is {q0,q1,q2}. Repeating a cycle does not create new states.

**Transfer:** A visited-state traversal expands each of the finitely many state identities once. Reaching an already visited state cannot reveal a new future edge set, even when infinitely many walks revisit it.

### 5. Epsilon closure

Correct option: **C — ∅: no starting state exists from which to follow an edge.**

Epsilon closure follows paths starting from members of its seed set. An empty seed set supplies no such starting state, so its closure remains empty even if the machine contains many edges or accepting states.

**Transfer:** closure(empty) is empty. closure({q}) is {q} when q has no outgoing epsilon edge, because zero moves are permitted.

### 6. Epsilon closure

Correct option: **A — {q1,q2}; accept**

The symbol move reaches q1. The following epsilon closure includes q1 itself and q2, giving {q1,q2}. Since q2 accepts and all input has been consumed, the word is accepted. Epsilon moves add reachable possibilities; they do not delete their starting states.

**Transfer:** A symbol can land at a state from which epsilon moves reach additional possible endpoints without reading another symbol. For the empty word, the start closure is just {q0}, which does not contain q2, so it rejects.

### 7. Subset states

Correct option: **D — The subset {q0,q1,q2}.**

The DFA represents every possible NFA state after each consumed prefix, including the empty prefix. Its start subset must therefore include q0 and all states epsilon-reachable from q0: {q0,q1,q2}.

**Transfer:** Yes. The start subset contains accepting q2, reached from q0 entirely through epsilon edges. That path reads no symbols and so accepts the empty word.

### 8. Subset states

Correct option: **B — Accepting, because at least one member is q2.**

A subset state accepts exactly when it intersects the NFA accepting set. {q0,q2,q3} contains q2, so it accepts. Other, nonaccepting members do not undo the successful possibility.

**Transfer:** {q2} is accepting and {q0,q3} is rejecting. The test is a nonempty intersection with {q2}, not a count or majority of accepting members.

### 9. Subset states

Correct option: **A — Both destinations are ∅.**

No active state contributes any symbol destination from the empty set. Closing the resulting empty union again gives the empty set. Thus both transitions return to it, making it a valid rejecting sink whenever it is reachable.

**Transfer:** No. For a one-state machine that loops on both symbols, only its nonempty singleton subset is reachable. The full power set includes the empty subset, but reachable-only construction need not include every possible subset.

### 10. Language preservation

Correct option: **C — At most 32; some subsets may be unreachable.**

Each DFA state is one subset of the five original states. There are 2^5 = 32 possible subsets, including the empty set, so no more than 32 can be reachable. The graph may use far fewer; epsilon cycles do not change that finite bound.

**Transfer:** Start q0, make each of its 0 and 1 moves return only q0, and give q0 no epsilon destinations. The other four states may have any internal moves provided there is no reachable edge to them; they remain unreachable from q0. Only {q0} is reached.

### 11. Language preservation

Correct option: **B — For every prefix, its DFA state equals the ε-NFA's closed active set; this invariant extends by each symbol and gives the same final acceptance.**

The start subset equals the NFA's closed start set. If the sets agree for a prefix, unioning the next symbol destinations and taking epsilon closure preserves the agreement for one more symbol. Final acceptance is the same set-intersection condition, giving agreement for every finite word.

**Transfer:** At the empty prefix both representations are closure({start}). For another symbol, both form the union of that symbol's edges from the current set, then close it under epsilon. The finite test panel samples prefixes, whereas induction establishes the invariant at every finite length.

### 12. Language preservation

Correct option: **D — No: one accepting state looping on both symbols recognizes the same language.**

Both reachable states accept, and any continuation stays among accepting states. The language is every binary word, including the empty word. One accepting state with loops on both symbols recognizes that language, so the two reachable subset states are not minimal.

**Transfer:** The language is {0,1}*, so it contains epsilon and every finite binary word. Removing unreachable subsets restricts attention to the start-reachable graph; minimization may also merge different reachable states whose accepted continuation languages agree.

## Native development

No npm dependencies are required. From the repository root:

```text
node tools/build-nondeterministic-automata.mjs
node tools/build-nondeterministic-automata.mjs --check
node --test tests/nondeterministic-automata.test.mjs tests/nondeterministic-automata-course.test.mjs
```

The builder validates the original course through the unchanged src/deck.mjs and embeds only this lab's own source. Native controls include a separate configuration-graph traversal oracle for every two-state transition table over a bounded word set. These controls test an implementation; the language-preservation proof above has its own inductive justification. Actual browser/download/importer qualification is recorded separately from native mathematical and content checks.

## Attribution and references

- Alfred V. Aho, Columbia COMS W3261, [Lecture 2: Finite Automata](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L2-Finite_Automata.html), nondeterministic simulation and subset construction.
- Alfred V. Aho, Columbia COMS W3261, [Lecture 3: Regular Expressions](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L3-Regular_Expressions.html), epsilon closure and epsilon-NFA determinization.

All worked examples, questions, distractors, explanations, transfer prompts and implementation here were newly authored by the HAMON autonomous cohort 3dcb83a1, with AI assistance, 2026-10-09. No linked lecture exercises, figures or passages are reproduced. Original lesson text is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); this does not relicense the references or other project code.
