# Finite automata: small memory, exact recognition

Open [the standalone explorer](finite-automata-explorer.html) directly in a browser. It contains its code and course text, so the explorer runs without a server, account, network connection, or install. Its calculations use complete deterministic machines over the fixed alphabet **{0, 1}**.

A finite automaton keeps a state rather than the entire input history. A transition table says how that state changes when the next symbol arrives. A language is the set of words the machine accepts. Two machines may have different tables or different numbers of states and still recognize the same language.

The [original twelve-question course](finite-automata.json) connects four ideas: complete transition rules, tracing a word, recognizing a language, and proving equivalence. Download it from the explorer, open [RecallWeave](../demo.html), and choose the JSON under **Bring your own lesson**. Inspect the preview, then choose **Start this deck**. The existing learner supplies the feedback, review and practice flow.

## A complete rule for every situation

The explorer admits 1–6 states named q0, q1, and so on. Choose exactly one initial state. Each state has an explicit accepting flag and two destinations: one for 0 and one for 1. Destinations must be existing states. A transition may loop to its own state, and both symbols may lead to the same destination.

These are complete deterministic finite automata (DFAs). The standard definition requires a unique transition for each state and alphabet symbol; the initial state and accepting states complete the machine’s description. See the [Stanford CS103 reference](https://web.stanford.edu/class/archive/cs/cs103/cs103.1156/reference/index.html), finite-automata section, for the formal definition.

A blank machine has no accepting states and loops at each state. That is already a valid machine: it accepts no words. Edit its flags and destinations to give it a different language. **Replace with blank** deliberately replaces the current table; selecting a state count alone leaves it intact.

Enter a word using only 0 and 1. Leave the field blank for the **empty word**, written ε in the explanation. The ε glyph is notation for no symbols; it is not a third symbol to type. Spaces, 2 and other characters are refused instead of deleted or reinterpreted. Traces admit up to 64 symbols.

## Example 1: remember whether the number of 1s is even

The initial state is q0, and only q0 accepts.

| State | Meaning after the prefix read so far | On 0 | On 1 | Accepting? |
| --- | --- | --- | --- | --- |
| q0 | An even number of 1s | q0 | q1 | Yes |
| q1 | An odd number of 1s | q1 | q0 | No |

For **1011**, the state path is:

| Symbols consumed | Last symbol | State |
| --- | --- | --- |
| None | ε | q0 |
| 1 | 1 | q1 |
| 10 | 0 | q1 |
| 101 | 1 | q0 |
| 1011 | 1 | q1 |

The word is rejected because its final state is nonaccepting q1. The earlier visit to q0 does not stop the run. Inserting 0s anywhere cannot change parity, because the 0-transitions leave both states unchanged.

The empty word is accepted: there are zero 1s, zero is even, and the run stays in accepting q0 without taking an edge. The two-symbol word 11 is also accepted, after two flips.

**Transfer:** a two-state memory can remember parity, but it does not retain the exact count. Explain why prefixes with 2 and 20 occurrences of 1 can share the same state for this task.

## Example 2: finish with 01

This machine remembers only the suffix that could help the next symbol finish the pattern. It starts in q0; only q2 accepts.

| State | Memory | On 0 | On 1 | Accepting? |
| --- | --- | --- | --- | --- |
| q0 | No useful suffix | q1 | q0 | No |
| q1 | Ends in 0 | q1 | q2 | No |
| q2 | Ends in 01 | q1 | q0 | Yes |

The word **010** follows q0 → q1 → q2 → q1 and is rejected. Its prefix 01 was accepted, but the whole word ends in 10. Append one more 1 and the last transition reaches q2, accepting **0101**.

An accepting state is a place where a run may end successfully. It need not absorb later input. Membership is decided by simulating all symbols and inspecting the final state, as described in [Alfred Aho’s Columbia CS3261 lecture on regular-language decision problems](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L6-Properties_of_Regular_Languages_II.html), section 1.

**Transfer:** compare “ends in 01” with “contains 01 somewhere.” The latter needs to remember a completed match permanently, while the former must keep updating the suffix.

## Example 3: a violation that cannot be undone

The **Never contains 11** preset starts in accepting q0. Accepting q1 records a single trailing 1. Nonaccepting q2 records that adjacent 1s have already appeared.

| State | Memory | On 0 | On 1 | Accepting? |
| --- | --- | --- | --- | --- |
| q0 | No trailing 1 and no violation | q0 | q1 | Yes |
| q1 | One trailing 1 and no violation | q0 | q2 | Yes |
| q2 | The word has already contained 11 | q2 | q2 | No |

For **10110**, the path is q0 → q1 → q0 → q1 → q2 → q2. A later 0 cannot erase the adjacent 11, so q2 loops on both symbols. Both ε and 1010 are accepted.

This is different from “does not end in 11.” The word 110 violates “never contains 11” but does not end in 11.

## From a counterexample to an exact comparison

A handful of examples can disprove equivalence when one machine accepts and the other rejects. Agreement on those examples cannot establish equivalence by itself.

The explorer compares a pair of complete machines through their **product graph**. A product state records both current states after the same word. Its 0-edge advances both machines using 0; its 1-edge advances both using 1. The initial product state contains the two initial states.

A pair is a disagreement when exactly one of its states is accepting. A path to such a pair spells a distinguishing word. This is the symmetric-difference construction behind DFA equivalence; see [Suprakash Datta’s York CSE2001 lecture, slides 10–11](https://www.eecs.yorku.ca/course_archive/2012-13/F/2001/LEC/2001Ch4.pdf). The implementation uses the direct product with disagreeing acceptance flags.

The search starts by checking the initial pair. If its flags differ, the shortest witness is **ε**. Otherwise it explores the product graph breadth first. Every edge consumes one symbol, so the first disagreement has minimum word length. Exploring 0 before 1 picks the lexicographically first word when shortest witnesses tie.

The search queues each pair only once. A later visit to the same pair has the same future behavior for every suffix, so it adds no new possibility. If every reachable pair agrees and the queue empties, no finite word can distinguish the machines: every word ends at a reachable pair already covered by the search. The alternative table-filling decision procedure is described in [Aho’s lecture, sections 2–3](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L6-Properties_of_Regular_Languages_II.html).

### A bound that comes from the machines

Machines with n and m states have at most n×m product states. A shortest path to a disagreement never needs to repeat a pair: remove the loop between two occurrences, and the same remaining suffix still reaches a disagreement. Thus a shortest witness has at most n×m−1 symbols.

For a 2-state machine and a 3-state machine, that bound is 5. For two admitted 6-state machines, the product has at most 36 pairs and a shortest witness has at most 35 symbols. The trace limit of 64 therefore accommodates every witness the comparison can produce.

This is an exhaustive finite-state decision, not a search that stops after trying words up to a user-selected length. The explorer does not claim to minimize states, infer a language from examples, or handle nondeterministic or incomplete machines.

### Two useful comparisons

- **Even number of 1s** versus **Every binary word**: both accept ε and 0; they disagree on 1. The shortest witness is 1.
- **Even number of 1s** versus **Ends with 01**: the initial acceptance flags differ. The shortest witness is ε.

Renaming states, adding an unreachable state, or giving an all-rejecting machine extra memory need not change its language. The empty language ∅ contains no words; the language {ε} contains one word whose length is zero.

## Keep a result and study the lesson

**Download current trace** saves the admitted machine, exact input word, state path and per-symbol transitions, with the final acceptance result. **Download current comparison** saves both admitted machines, the checked product pairs, the outcome and any shortest witness with both traces.

Changing a machine clears both results and disables their downloads. Changing only the word clears its trace. Changing the reference clears the comparison. Recompute to save a result for the changed inputs. Results and edits stay in the tab; refresh returns to the initial example.

The downloadable course is fixed original lesson content, separate from the edited machine and result records. Its format is the existing `recallweave-deck/1` contract. Trace and comparison records are inspectable JSON evidence, not learner course files.

## Development and receiving

No npm dependencies are needed.

```bash
node tools/build-finite-automata.mjs
node tools/build-finite-automata.mjs --check
node --test tests/finite-automata.test.mjs tests/finite-automata-course.test.mjs
node tools/check_finite_automata_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-finite-automata-check
```

The builder uses the existing deck validator unchanged and inlines only this explorer’s modules. The browser receiver uses an already installed Chrome/Chromium and Node 22 or newer. It launches its own browser profile, reads real browser downloads, and imports the downloaded course into both the current modular learner and the current standalone learner. Its output directory must be new.

Core qualification includes independent language predicates for all binary words through length eight, an exhaustive comparison of every pair of complete two-state machines, and a separate backward distinguishability oracle. These check mathematical and interface behavior; they are not a study of learning outcomes.

## References and attribution

- Stanford CS103, [course reference: finite automata](https://web.stanford.edu/class/archive/cs/cs103/cs103.1156/reference/index.html): complete deterministic transition rules and language recognition.
- Alfred Aho, Columbia COMS W3261, [Lecture 6: Properties of Regular Languages II](https://www.cs.columbia.edu/~aho/cs3261/Lectures/L6-Properties_of_Regular_Languages_II.html): membership, reachable acceptance, and equivalence through distinguishability.
- Suprakash Datta, York CSE2001, [Chapter 4: Decidability](https://www.eecs.yorku.ca/course_archive/2012-13/F/2001/LEC/2001Ch4.pdf), slides 10–11: equivalence via the empty symmetric difference.

The examples, question wording, distractors, worked explanations, transfer prompts and implementation were newly authored by the HAMON autonomous cohort (52e56ea8fcca), with AI assistance, on 2026-10-08. No linked course exercises, figures or passages are reproduced. The original lesson text is licensed CC BY 4.0; that license does not relicense the linked references. The runtime makes no AI or provider calls.
