# Prefix coding — follow the bits, count the cost

[Open the prefix-coding explorer](./prefix-coding-explorer.html) · [Get the 12-question lesson](./prefix-coding.json) · [Open the RecallWeave learner](../demo.html)

A codebook turns symbols into bit strings. This guide connects three ways to inspect it: follow a message through the codewords, count how often each word is used, and build a tree that minimizes that weighted cost. The examples are small enough to check by hand.

## Use the lesson and explorer together

1. Save [prefix-coding.json](./prefix-coding.json) as a local JSON file.
2. Open the [learner](../demo.html), choose the course file in its lesson-import area, inspect the title and 12-question preview, then choose **Start this deck**. Starting a deck replaces the current learning session, so save any study notes you want to keep first.
3. Work through the questions, then open the learning trace to read the explanations and write your own reflections. Missed first answers can be practiced separately. Download study notes to retain your recorded first answers, practice and reflections.
4. Open the [explorer](./prefix-coding-explorer.html) alongside the guide to inspect the queue, tree, codewords and exact costs.

The learner can choose a different question order and shuffle the displayed options. Use the question text and the reasoning below, not a memorized answer letter. Its mastery estimates are illustrative model state, not a validated assessment of your ability.

## 1. Recognize the prefix property

A binary code is **prefix-free** when no complete codeword is the beginning of another codeword. For example, `{00, 01, 10}` has that property. The set `{0, 01, 11}` does not: after reading a `0`, an immediate decoder would not yet know whether it had finished that word or started `01`.

Equal word lengths are one way to get the property, but unequal lengths can work too. Consider this codebook, used only for the decoding examples in this section:

| Symbol | Codeword |
| --- | --- |
| A | `0` |
| B | `10` |
| C | `110` |
| D | `111` |

Decode `0101110` by finishing a word and then restarting at the beginning of the codebook:

`0 | 10 | 111 | 0` → **A, B, D, A**

The bars help us read the example; they are not extra bits in the encoded payload. Encoding A, B, D, A with the same codebook reconstructs `0101110`.

### Unique decoding is a wider property

The code `A=0, B=01` is not prefix-free because `0` begins `01`. It is still uniquely decodable when the complete valid message and its end are known.

To see why, decode backward. A final `1` must finish `01`, so remove B. A final `0` must be the one-bit word A. Repeating this rule determines each preceding word uniquely. This code is **suffix-free**: neither complete word ends the other.

Thus prefix-free coding is sufficient for unique decoding, but it is not necessary. Prefix codes additionally allow a left-to-right decoder to finish a symbol as soon as its word ends. Our non-prefix example needs the complete end or another way to resolve the lookahead; an immediate prefix decoder cannot simply treat it as a prefix code.

### An unfinished word is not a complete message

With the four-symbol codebook above, `01011` splits as:

`0 | 10 | 11` → A, B, then an unfinished word.

The tail `11` could become C with another `0`, or D with another `1`. It cannot be discarded as padding unless the format explicitly defines that convention. A decoder should reject this stream as incomplete.

A cut exactly at a codeword boundary is different: `010` is a valid encoding of A, B even if a longer message was intended. Prefix coding alone cannot detect every truncation. A real format may need a stated message length, framing or an integrity check.

## 2. Count occurrences, not just distinct labels

The explorer's default example has counts **A=8, B=3, C=2, D=1**: fourteen symbol occurrences in total. With its deterministic tie rule and left/right convention, the codebook is:

| Symbol | Count | Codeword | Length | Count × length |
| --- | ---: | --- | ---: | ---: |
| A | 8 | `1` | 1 | 8 |
| B | 3 | `00` | 2 | 6 |
| C | 2 | `011` | 3 | 6 |
| D | 1 | `010` | 3 | 3 |
| **Total** | **14** | | | **23 bits** |

The decoding example in section 1 deliberately uses a different valid codebook. A sender and receiver must agree on the actual codewords; agreeing only that both use a prefix code is insufficient.

The payload calculation is:

**8×1 + 3×2 + 2×3 + 1×3 = 23 bits.**

Adding each word length once would give 9. That treats every label as equally frequent and does not describe this message. Adding the counts gives 14 occurrences, which also is not a bit count.

If this codebook stays fixed, one additional A costs one bit; one additional D costs three bits. Rebuilding a codebook for changed counts is a separate step.

### Compare an explicit fixed-width reference

Four known symbols need two bits each in the smallest fixed-width binary code. One bit distinguishes only two possibilities; two bits distinguish four. The fourteen-occurrence reference payload therefore costs **14×2 = 28 bits**.

For five symbols the minimum fixed width would be three bits, because two bits provide only four distinct words and three bits provide eight. In general, choose the smallest integer width whose number of binary words is at least the number of symbols.

This comparison says nothing about whether an original source file uses ASCII, UTF-8 or another storage format. Its reference is a specified fixed-width code over the same symbol alphabet.

The default example saves **28−23 = 5 payload bits**. Its exact average is **23/14 bits per symbol occurrence**, approximately 1.642857. The fraction is an average: no individual codeword contains a fractional bit.

## 3. Build the Huffman tree

Huffman construction repeatedly removes the **two smallest current weights**, makes them children of a new node, and returns their sum to the queue. The queue contains both untouched symbols and previously combined subtrees.

For the default counts:

| Step | Two entries removed | New weight | Queue weights after reinsertion |
| --- | --- | ---: | --- |
| 1 | D: 1 and C: 2 | 3 | 3, 3, 8 |
| 2 | B: 3 and the D/C subtree: 3 | 6 | 6, 8 |
| 3 | The B/D/C subtree: 6 and A: 8 | 14 | 14 |

The explorer sorts literal symbol labels by Unicode code point for initial node IDs. At equal weights, the lower node ID comes first; a new internal node receives a later ID. The first removed node is the left child, labeled `0`, and the second is the right child, labeled `1`. For this example that produces exactly the default table above. Reordering the same input rows does not change these tie decisions.

### Why the merge weights add up to the payload cost

A merge puts a new parent above two subtrees. Every leaf inside them moves one level deeper, so each occurrence represented there gains one bit. The cost added by that merge is exactly the combined weight.

Here the added costs are **3 + 6 + 14 = 23 bits**. This is the same total as the separate count-times-length calculation. A symbol's count is included once per level on its path, which is exactly its codeword length; these are two ways to count the same contributions.

### Why choosing two smallest weights is justified

The objective here is minimum weighted codeword length among **binary prefix codes for the supplied positive counts**.

Represent a prefix code by a binary tree with symbols at leaves. An optimal tree need not have a node with only one child: bypassing such a node would shorten the affected words and reduce the positive weighted cost. A full tree has a deepest sibling pair.

There is an optimal assignment with the two lightest labels in that deepest pair. Exchanging a lighter label with a heavier label that lies deeper cannot increase weighted cost. This is an existence statement; it does not say every optimal assignment looks identical.

Now contract those siblings to one leaf whose weight is their sum. The contracted tree must solve the smaller problem optimally. Otherwise, substitute a cheaper smaller tree and expand the pair again; that would improve the supposedly optimal original. Repeating this reduction gives the Huffman merge rule.

Trying one example is not this proof. The exchange step explains why the first choice can belong to an optimum; the contraction step explains why solving the smaller problem preserves that optimum.

## 4. Read ties and savings carefully

With **A=1, B=1, C=1, D=1**, the first two merges make separate weight-2 pairs and the final merge joins them. Every word has length two, and the payload has **8 bits**. Different tie and branch choices can assign different two-bit words to labels, while preserving this result. The fixed-width reference is also 8 bits, so there is no payload saving in this case.

More generally, compare codeword identity, lengths and weighted cost as separate quantities. The encoder and decoder must share the codeword assignment. Two implementations can obtain an optimal cost without using identical bit strings.

### Payload savings are not file-size measurements

Suppose a deliberately simplified container has these stated costs:

| Scheme | Payload | Stated overhead | Stated total |
| --- | ---: | ---: | ---: |
| Variable code | 23 bits | 12 bits | **35 bits** |
| Fixed code | 28 bits | 3 bits | **31 bits** |

The variable payload is five bits smaller, yet its toy container is four bits larger. These overhead numbers are supplied for arithmetic; they are not measurements of a real format.

For an actual file, include whatever the format stores: the codebook or dictionary, framing, padding and other metadata. Check that the original data is recovered, then compare complete outputs using the same boundary. The explorer's JSON is a readable record of an example and its calculations. Its file size is not a measurement of compression of that JSON or of a source file.

### Explorer boundary

The explorer accepts two to eight distinct literal labels and integer occurrence counts from 1 through 10,000. Labels are case-sensitive and retain their entered characters; they are not automatically interpreted as bytes, words or probabilities. It builds a code for the supplied counts and can encode or decode with that same codebook.

Those authored examples demonstrate the algorithm and exact payload arithmetic. They do not benchmark compression software or infer a source distribution from a file.

## Check the twelve connections

The learner may ask these in a different order. Each row identifies the question by its stable lesson ID and gives the result to explain in your own words.

| Question | Result and reason |
| --- | --- |
| `pc-prefix-1` | `{00, 01, 10}`: none of the complete words begins another. |
| `pc-prefix-2` | A, B, D, A: split into `0`, `10`, `111`, `0`. |
| `pc-prefix-3` | `{0, 01}` is not prefix-free but is uniquely decodable from the known complete end. |
| `pc-cost-1` | 23 bits: 8×1 + 3×2 + 2×3 + 1×3. |
| `pc-cost-2` | 28 bits: fourteen occurrences at two bits each. |
| `pc-cost-3` | 23/14 bits per occurrence: total bits divided by total occurrences. |
| `pc-merge-1` | D=1 and C=2: the two smallest current weights. |
| `pc-merge-2` | 3+6+14 = 23: every merge adds one bit per included occurrence. |
| `pc-merge-3` | An optimal deepest-sibling placement and its contracted optimal subproblem justify the merge rule. |
| `pc-limits-1` | Four equal counts produce four length-two words and eight payload bits. |
| `pc-limits-2` | `01011` ends inside a word: A and B finish, but the final `11` does not. |
| `pc-limits-3` | Variable 35 bits, fixed 31 bits, counting the stated toy overheads. |

## Source and authorship

The questions, distractors, explanations, transfer prompts, worked examples and guide are original content for Jacob's RecallWeave project. No additional reuse license is granted by these course files.

Background consulted: [MIT OpenCourseWare, 6.046J Design and Analysis of Algorithms, Spring 2012, Lecture 19](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/388115265a456321c4a5d19dc9e05281_MIT6_046JS12_lec19.pdf), particularly sections 19.1.6, 19.2 and 19.2.2 on prefix codes, weighted tree cost and the Huffman argument. The cited lecture retains its own terms. No lecture exercises, worked frequency table or figures are reproduced.

The repository's course check is `node --test tests/prefix-coding-course.test.mjs`. It uses the actual deck parser, adaptive selection, review, separate practice, study notes and trace archive modules, with independent arithmetic checks for the authored examples. Browser interaction and visual receiving are recorded separately from that source-level check.
