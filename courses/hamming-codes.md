# Hamming codes: when a repair can be wrong

Open [the offline bit lab](hamming-codes-explorer.html), or download the [twelve-question lesson](hamming-codes.json) and use **Bring your own lesson** in RecallWeave. The bit lab needs no server, account, network connection or setup. It uses one fixed Hamming(7,4) code so that every step can be inspected.

The central question is simple: **does a plausible repair prove that the original message was recovered?** The answer depends on the error model. In this lab a receiver assumes at most one flipped bit. You, as the author of the simulated channel, can introduce more errors and see what the receiver cannot know.

## A consistent way to label the bits

A *bit* is either 0 or 1. Our sender carries four data bits in seven transmitted positions. Displayed position **1 is always at the left**, including in downloaded records. Read the data bits in positions 3, 5, 6 and 7, in that order.

| Position | Binary position label | Role | Included in checks |
| --- | --- | --- | --- |
| 1 | 001 | Parity | s1 |
| 2 | 010 | Parity | s2 |
| 3 | 011 | First data bit | s1, s2 |
| 4 | 100 | Parity | s4 |
| 5 | 101 | Second data bit | s1, s4 |
| 6 | 110 | Third data bit | s2, s4 |
| 7 | 111 | Fourth data bit | s1, s2, s4 |

An even-parity check passes when its group contains an even number of 1s. The sender chooses parity positions 1, 2 and 4 to make all three groups even:

- s1 checks positions **1, 3, 5, 7**.
- s2 checks positions **2, 3, 6, 7**.
- s4 checks positions **4, 5, 6, 7**.

The group names record their weights in the syndrome value. A check result of 1 means the received group is odd; 0 means it is even.

These conventions instantiate the construction in Hamming's original paper, sections 2–3. His minimum-distance interpretation appears in section 5.[1] All questions and worked scenarios here are original. The lab's calculations and complete finite model are independently checkable from the convention above.

## Work one message by hand

Choose data **1011**. Place those bits at 3, 5, 6 and 7.

For s1, the data contribution is 1 + 0 + 1 = 2, so position 1 must be 0. For s2 it is 1 + 1 + 1 = 3, so position 2 must be 1. For s4 it is 0 + 1 + 1 = 2, so position 4 must be 0. The transmitted codeword is **0110011**.

Now flip position **6**. The received word is **0110001**.

| Check | Received bits in its group | Count of 1s | Check result |
| --- | --- | --- | --- |
| s1 | 0, 1, 0, 1 | 2 | 0 |
| s2 | 1, 1, 0, 1 | 3 | 1 |
| s4 | 0, 0, 0, 1 | 1 | 1 |

The syndrome value is

**s1 + 2 × s2 + 4 × s4 = 0 + 2 + 4 = 6.**

Written as a three-bit binary number in **s4s2s1** order, it is **110**. Under the one-error assumption, the decoder flips position 6. Its candidate returns to 0110011, and the extracted data return to 1011.

The decoder does not need to know the original codeword to make that proposal. It needs the received bits, the check groups and its one-error assumption. The lab can then compare the proposal with the original because the lab separately retained what you sent.

## Why the guarantee works

The *Hamming distance* between two equal-length words counts the positions where they differ. For example, 0110011 and 0101010 differ at positions 3, 4 and 7, so their distance is 3.

For this construction, the 16 valid codewords have minimum pairwise distance 3. If exactly one bit changes, the received word is one step from the original. Any other codeword is at least two steps from the received word: moving one step toward a word that was at least three steps away cannot make it closer than two. The original is therefore the unique nearest codeword.

Each valid seven-bit word has itself plus seven one-bit neighbors, for eight received words. The 16 neighborhoods are disjoint and contain 16 × 8 = 128 words—every possible seven-bit received word. This explains both the useful guarantee and a limitation: **the decoder always has a nearest codeword to propose**, even if the actual sender was farther away.

A parity bit can itself be the changed bit. Flipping position 2, for example, makes only s2 fail. The syndrome is 2, so the same rule restores that parity position. Data bits being unchanged does not make parity-bit errors invisible.

## Two errors: a valid candidate can be wrong

Choose the lab's **Two flips** example. The sender transmits **0000000**. Flip positions **1 and 2** to produce **1100000**.

The received checks give s1 = 1, s2 = 1 and s4 = 0, so the syndrome value is **3**. The ordinary one-error rule flips position 3. Its candidate becomes **1110000**, a different valid codeword. The candidate's data are **1000**, not the original 0000.

There are two possible histories for exactly the same received word:

| Possible history | Sent word | Actual flipped positions | Received word |
| --- | --- | --- | --- |
| The lab's chosen history | 0000000 | 1, 2 | 1100000 |
| A different one-error history | 1110000 | 3 | 1100000 |

A receiver that sees only 1100000 cannot distinguish these histories using the three checks. Its assumption favors the second history even when the first actually occurred.

**Detection and correction are different decisions.** Two distinct errors produce a nonzero syndrome in this code, so a check-only detector can notice inconsistency. A decoder that automatically applies the one-error correction rule can miscorrect those two errors. A passing candidate is not proof of the original history.

The lab's amber *simulation comparison* identifies this failure using the known sender and authored flips. That comparison is not information available to the receiver.

## Three errors: the checks can miss the change

Choose **Three hidden flips**. Start with **0000000**, then flip positions **1, 2 and 3**. The received word is **1110000**.

Each affected group has changed in two places, so all three checks are even. The syndrome is **0** and the decoder leaves the received word unchanged. It is a valid word, but it is not the one the sender chose.

Zero syndrome therefore means **consistent with these checks**. It cannot establish that the channel introduced no errors. Try finding another three-position set with zero syndrome using the binary position labels in the first table.

The explorer intentionally supports all subsets of the seven positions. A checked box flips a position once. This is an authored finite scenario, not a random-error process or a forecast of hardware/network behavior. It assigns no probability to any pattern.

## Use prediction to make the distinction visible

1. Choose four data bits and a set of flipped positions.
2. Predict the syndrome value, including 0 when you expect every check to pass.
3. Select **Inspect decoder**.
4. Read the received parity sums and the candidate.
5. Compare the candidate with the separately labeled simulation truth.
6. Change one input and predict again. The previous result is retired until you inspect the new scenario.

A prediction is optional and records only a proposed syndrome. It is not a graded assessment or a fitted estimate of mastery. The complete lesson in RecallWeave uses its existing learning/review/practice flow.

Invalid data remain visible for correction and do not create a result. The accepted input is exactly four ASCII 0/1 characters; spaces, other symbols and extra characters are not normalized into a different message. Leading zeros are part of the data. The narrow model interface also rejects duplicate, sparse or out-of-range flipped-position lists.

## Keep or teach a worked example

**Download worked record** saves a UTF-8 text copy of the current inspected scenario. It includes the original data, codeword, authored flips, received bits, every parity sum, syndrome, decoder proposal, optional prediction and the comparison against simulation truth. Changing an input disables that download until a new result is inspected.

**Download course JSON** saves the exact original twelve-question deck. Open it with **Bring your own lesson** in RecallWeave, inspect the preview and start it explicitly. The questions connect four concepts:

| Concept | Learner task |
| --- | --- |
| Parity and redundancy | Count parity and distinguish data fraction from transmission overhead |
| Syndrome reasoning | Derive the failed-check pattern, including an error in a parity bit |
| Distance and recovery | Explain unique nearest-word correction and the complete 128-word coverage |
| Decoder assumptions | Compare indistinguishable histories, miscorrection and undetected changes |

The standalone page can be printed through the browser's ordinary print function after inspecting a scenario. Its checks table scrolls horizontally on narrow screens. Displayed words retain position 1 at the left at every size.

Choices live only in the current tab. Reloading clears them. Downloads use the browser's normal file flow; a successful request message does not certify that the browser or user saved a file. No input is uploaded, and no site is contacted automatically. The optional reference links open only when selected.

## Implementation and receiving

The finite model is in [model.mjs](hamming-codes/model.mjs). Its received-word decoder has no parameter for the original data or error mask. The scenario layer separately retains simulation truth. Every structured result, nested check and array is immutable; the input position list is copied.

The page is generated deterministically from that model, its DOM interface, page template and the original course text. With Node available, rebuild or check it from the repository root:

```sh
node tools/build_hamming_explorer.mjs
node tools/build_hamming_explorer.mjs --check
node --test tests/hamming-codes.test.mjs
```

The unique [receiving directory](../docs/receiving/hamming-codes-87eaaf0fdf63/) preserves the independent oracle, blind prompt answers, actual source pins and qualification results as they are completed. Source qualification and learner efficacy are different claims; this contribution does not measure learning outcomes or real channel reliability.

## Reference and reuse

[1] R. W. Hamming, *Error Detecting and Error Correcting Codes*, **Bell System Technical Journal 29**(2), 147–160 (1950). [DOI](https://doi.org/10.1002/j.1538-7305.1950.tb00463.x) · [Original paper](https://zoo.cs.yale.edu/classes/cs323/doc/Hamming.pdf). Sections 2–3 establish parity and the seven-position construction; section 5 develops distance-based guarantees. The eight-position extension in section 4 is outside this explorer.

Original question wording, worked examples and this explorer are offered under **CC BY 4.0**, with attribution to RecallWeave contributors and identification of changes. AI assistance was used in their development. The historical paper retains its own rights; its text and figures are not reproduced here.
