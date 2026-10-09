# Sorting networks: one trace, every binary input

Open **sorting-networks-explorer.html** in this directory. The generated page contains its complete model, interface and lesson; it can be opened directly from disk. The portable archive at **dist/sorting-networks-offline.zip** keeps the same relative layout and includes the unchanged RecallWeave learner at **demo.html**.

This lab helps distinguish two questions:
- Did this particular input come out sorted?
- Does this fixed sequence of min/max comparisons sort every ordered input of the same length?

The first is a trace. The second is a universal property. The exhaustive binary table provides a finite certificate or explicit counterexamples for the second question.

## Try an incomplete network

Choose **Four wires — missing the final comparator**, then **Use example as draft**, then **Run network**. Its authored input is 2, 4, 1, 3. The four pairs are (1,2), (3,4), (1,3), (2,4).

| Step | Compared wires | Full vector afterward |
| --- | --- | --- |
| 0 | None | 2, 4, 1, 3 |
| 1 | 1, 2 | 2, 4, 1, 3 |
| 2 | 3, 4 | 2, 4, 1, 3 |
| 3 | 1, 3 | 1, 4, 2, 3 |
| 4 | 2, 4 | 1, 3, 2, 4 |

The middle inversion disproves the sorting claim. The binary table also retains four counterexamples, with inputs 0101, 0110, 1001 and 1010. Choose **Trace** beside any case to inspect its entire path. This only changes the viewed trace; it does not rewrite your authored input or the downloaded observation.

Add the pair 2 3 on a new line. Editing retires the result immediately. Choose **Run network** again. The complete five-comparator network passes all 16 binary inputs. This establishes its sorting property; the lab does not claim that it found the network, measured its speed or proved minimum size.

## Enter your own example

Use 2–6 wires, 0–30 comparator rows, and exactly one integer value per wire in the range -999 through 999. Values are separated by whitespace. Comparator rows contain two whitespace-separated wire numbers. Lower-numbered wire first is required: 1 3 is accepted, while 3 1 and 2 2 are refused. Blank comparator text means an empty network; internal blank rows are refused. Repeated comparator pairs remain separate steps.

Numbers use ordinary signed decimal integer notation. Decimal points, exponents, hexadecimal notation and commas are refused. Leading zeros and a leading + are accepted. Negative zero is normalized to numeric zero. No values are sorted or inferred during input admission.

The wire count, values and pair list form one draft. Editing any of them, or applying a preset, hides the accepted result and disables its configuration and observation downloads. A failed Run leaves that draft visible and explains the refusal. Preset selection alone does not run a network. Results do not survive a reload. No network request, automatic storage, code evaluation or simulation timer is used.

The diagram preserves written comparator order. It is intentionally not a parallel-depth diagram. At narrow widths, scroll inside the diagram or table; the step summary and current wire values remain readable above them. Previous/Next step and case Trace are ordinary keyboard-operable buttons. Every step, including a comparison that does not swap, remains in the table and observation.

## What the binary test proves

A comparator sends the minimum to its first wire and the maximum to its second. Imagine an output with a larger value before a smaller value. A nondecreasing threshold map that separates those two values turns the inversion into 1 before 0. Such a map commutes with min and max, so applying it to the original input produces that binary failure through the same fixed network. Therefore, if every binary input succeeds, no ordered input can fail.

This proof depends on fixed min/max comparisons. It does not certify an arbitrary program that branches specially on binary data. It says nothing about stable ordering of labeled records with equal values, minimum comparator count, minimum depth, physical circuit timing, or performance on a particular machine.

Primary mathematical reference: Sariel Har-Peled, *Sorting Networks* (December 3, 2018), definitions 24.2.1–24.2.3 and theorem 24.3.2:
https://sarielhp.org/teach/notes/algos/files/24_sortnet.pdf
The exercises, examples, diagrams and prose here are newly authored; the reference's prose and diagrams are not reproduced. The reference retains its own license. Original lesson content is CC0-1.0.

## Keep the result and study the lesson

- **Download configuration** saves exactly the accepted structured wire count, integer vector and ordered pair list. It preserves semantic values, not whitespace or the spelling of integer tokens. It is an inspection/reuse artifact; this page has no configuration-file importer.
- **Download full observation** saves the accepted configuration, complete authored trace and all binary cases with full traces. It always refers to the authored accepted configuration, even while you inspect another case.
- **Download lesson JSON** saves the fixed 12-question lesson. This remains available while the editable network is unfinished or invalid.

Open the unchanged **demo.html** learner, select the downloaded lesson JSON, inspect its preview, and explicitly choose **Start this deck**. Answer the questions, read the feedback, review and practice, and keep the learner's own notes download. The imported lesson does not alter the learner's Bayesian model, progress semantics or other decks. The source parser checks structure, not mathematical correctness. Lesson keys and explanations are included in the JSON, as with the existing course format.

The portable ZIP has exactly six regular files:
1. courses/sorting-networks-explorer.html
2. courses/sorting-networks.json
3. courses/sorting-networks.md
4. demo.html (unchanged canonical learner)
5. PLAY.md
6. SOURCE-MANIFEST.json

Extract to a new directory. Open the lab or learner by its filename. No installation or service is needed. Keep the original ZIP and manifests for recovery; extraction does not update any installed application or existing learner session.

## Model and build boundaries

New module **sorting-networks-core.mjs** exports immutable presets and these pure entry points:
- validateConfiguration({wires, values, comparators}) copies and validates the complete exact field set.
- parseDraft(wireText, valueText, comparatorText) reads the documented editor grammar.
- traceInput(configuration, values) returns an initial vector, every numbered comparison with before/after and swapped, final output, sorted flag and first adjacent inversion (or null).
- analyzeNetwork(configuration) returns the versioned full authored/binary observation. Binary cases are lexicographic, wire 1 most significant; ordinal starts at zero.
- configurationJSON(configuration) and observationJSON(configuration) serialize validated complete results with a final LF.

Inputs are never mutated. Unsupported configuration fields, noninteger values, out-of-range values, malformed pairs, wrong vector lengths and oversized drafts are refused before a result is produced. Array holes are invalid values. The network's complete fixed pair sequence is retained, including repeated pairs and comparisons that do nothing.

Build and check with the already installed Node runtime:

~~~sh
node tools/build-sorting-networks.mjs
node tools/build-sorting-networks.mjs --check
node --test tests/sorting-networks.test.mjs
~~~

The builder validates the exact lesson through the unchanged native deck validator. It embeds the complete core, UI and original course bytes into the template. It does not modify the shared learner, catalog, other courses, dependencies or workflows.
