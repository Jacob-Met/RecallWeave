# Finite convolution: indices, contributions, and filters

This optional RecallWeave lesson teaches how a short input and a short impulse response produce a complete output sequence. It is intended for an introductory signals, computing, or engineering learner who can multiply signed numbers and read an integer index. All examples are original, finite, and fully specified.

## Try the lab and take the lesson

Open [the offline convolution lab](finite-convolution-lab.html) directly from your files. Edit the input and kernel, then move through output indices to see every product in the selected sum. The page contains its own scripts and diagrams and needs no server or packages.

Use **Download lesson (.json)** in the lab, or save [finite-convolution.json](finite-convolution.json). Open a RecallWeave version with **Bring your own lesson** in [the learner](../demo.html), choose that JSON file, inspect the preview, and select **Start this deck**. The twelve questions use the existing adaptive selection, shuffled answer presentation, explanations, review, practice, study notes, and trace mechanisms. The lab does not create another learning model or store learner answers.

Starting this course follows the learner's existing explicit-start behavior. Its original content is not a replacement for the bundled biology lesson or any other course.

## Exact convention

Every list starts at index 0. An index outside that list has value zero. The displayed operation is full linear convolution:

\[
y[n]=\sum_{k=0}^{N-1}x[k]h[n-k],
\qquad n=0,\ldots,N+M-2.
\]

The result keeps **N+M−1 entries**, including leading and trailing zeros. This is a representation convention: an all-zero result can still have multiple retained entries. There is no wraparound, cropping, or implicit continuation of a nonzero endpoint.

For the selected output index, the table retains every input index k. It shows the associated kernel index n−k, its value or explicit outside-list zero, and the signed product. Reading down the table makes the reversed kernel order visible. All products sum to the highlighted output.

Convolution and correlation have different index pairings. This course defines its one real zero-lag correlation comparison explicitly as r[0]=Σₖx[k]h[k]. It does not infer another library's lag convention from the word “correlation.”

The connection between linear time-invariant systems, impulse responses, and convolution is covered in [Oppenheim's MIT lecture](https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/resources/lecture-4-convolution/). The finite full-output length and distinction from circular wraparound are covered in [Rowell's MIT notes, pages 18–1 to 18–2](https://ocw.mit.edu/courses/2-161-signal-processing-continuous-and-discrete-fall-2008/14f29be83ac38f11eb1a1bd5fdb6f5ea_lecture_18.pdf). The calculations and teaching scenarios below were authored for this course.

## Lab behavior

The input and kernel each accept 1–24 decimal numbers between −100 and 100, with at most four digits after the decimal point. Separate numbers with commas or whitespace. Empty comma fields, bracket syntax, scientific notation, extra precision, and out-of-range values are refused with a visible explanation.

These small bounds keep every displayed multiplication and sum inspectable. The calculation uses the admitted decimal grid so its product sums are exact integer accumulations before decimal output; displayed output values need at most eight decimal places. This is a finite numerical teaching model, not a simulation of a physical sensor or a continuous signal.

The presets expose a signed example, a one-sample delay, a two-tap average, and a finite first difference. A new valid edit recomputes the full result and keeps the selected index when it remains available. An invalid edit clears the old calculation and diagrams and disables calculation navigation and download. A corrected input or preset restores them. Course download remains independent of the current calculation.

**Download calculation (.json)** saves the currently displayed input, kernel, full output, convention, and per-index terms. It contains authored numerical values, not measurements or a learner record. The source arrays and exported record are kept separate, so a later edit does not silently relabel an earlier calculation.

Nothing is uploaded or saved automatically. There is no audio device, recording, account, provider, or external data source. External reference links load only if the reader chooses them.

## Worked answer guide

Letters here refer to the canonical JSON order. RecallWeave shuffles the visible option order for a new session and preserves the underlying answer identity.

| Item | Key | Calculation or reason |
| --- | --- | --- |
| fc01 | C | The listed indices are 0, 1, 2, so x[−1]=0. |
| fc02 | A | Last index (4−1)+(3−1)=5; six retained entries. |
| fc03 | D | h[1]=1 gives y[n]=x[n−1], so [0,2,−1,3]. |
| fc04 | B | 2×2+(−1)×1+3×0=3. |
| fc05 | C | The successive sums are 2, 3, 1, 6. |
| fc06 | A | At n=2, the kernel indices are 2 and 1; 1×2+2×(−1)=0. |
| fc07 | D | Half of each input plus half of its predecessor gives [0,2,2,0]. |
| fc08 | B | Zero extension creates both boundary changes: [2,0,0,−2]. |
| fc09 | A | The impulse copies [2,−1] into a four-entry full representation. |
| fc10 | C | Add [1,3,2] and [3,2,−1] to obtain [4,5,1]. |
| fc11 | B | y[0]=1×3=3; the defined r[0]=1×3+2×4=11. |
| fc12 | D | Commutativity preserves [−1,3,−2,6]. |

### Why the other options differ

- **fc01:** −2 is x[1], 3 is x[0], and 4 is x[2]. None is a negative-index sample under the stated zero extension.
- **fc02:** Seven entries counts one too many. Four entries crops the full output. The range −2…3 gives six entries but changes the declared output origin.
- **fc03:** Appending a zero gives the opposite placement of the delay. Doubling the values introduces an absent gain. Dropping the leading zero loses the declared time shift and full range.
- **fc04:** Zero results from multiplying only matching indices in this example. Five comes from using the reversed kernel at the wrong placement. −1 is one product rather than the sum.
- **fc05:** [2,−2,3] multiplies matching entries with an invented third kernel value. [2,3,6] drops the interior cancellation result. [4,1,5,3] uses h reversed before the convolution and therefore changes the operation's input.
- **fc06:** The alternative sums choose h[0] in place of h[2], fail to reverse the kernel indexing, or pair the second input with h[0]. Each computes a different placement from n=2.
- **fc07:** Keeping [0,4,0] ignores the filter. [0,2,0,0] loses the second contribution of the impulse. [2,2,2] extends the interior average incorrectly and has the wrong full length.
- **fc08:** An all-zero output assumes a constant input extending beyond the finite list. Copying the input ignores subtraction. Reversing both edge signs uses the opposite difference.
- **fc09:** [2,−1] drops the declared output padding. [2,1,0,0] loses the kernel's negative sign. [0,2,−1,0] delays an impulse that the question places at index 0.
- **fc10:** Multiplying outputs is not linear superposition. [4,1] is the summed input before filtering. Concatenating the two outputs does not add samples at matching indices.
- **fc11:** The first alternative swaps the two defined quantities. The third uses a different kernel placement. The last omits the second nonzero term in the zero-lag correlation.
- **fc12:** Reversing or negating the output is not a consequence of swapping convolution operands. The three-entry alternative multiplies or discards samples instead of retaining all four output indices.

### Open transfer guidance

Transfer prompts invite explanation, not another automatically scored answer.

For fc01, x[0]=3 and x[2]=4 are listed, while x[3]=0 is extended. For fc02, lengths 2 and 5 give indices 0…5. For fc03, [0,0,1] yields [0,0,2,−1,3]. For fc04, at n=2 the kernel indices are 2, 1, 0, so the first term is outside and the remaining products are −2 and 3. For fc05, increasing x[1] by 1 changes y[1] by 1 and y[2] by 2 only. For fc06, the complete result is [3,5,0,4].

For fc07, [1,1] doubles each value of the average's output. For fc08, [2,2,2,2]*[1,−1] is [2,0,0,0,−2]. For fc09, [0,1,0]*[2,−1] is [0,2,−1,0]. For fc10, any correctly specified equal-length inputs and fixed kernel can illustrate the distributive sum. For fc11, y[1]=1×4+2×3=10, compared with r[0]=11. For fc12, the sum can be decomposed into a different number of terms after swapping lists even though each final output agrees.

## Source, build, and verification

The production calculation is in [src/finite-convolution.mjs](../src/finite-convolution.mjs). The UI and standalone template are separate source inputs. Build or check only this optional lab:

    node tools/build-finite-convolution.mjs
    node tools/build-finite-convolution.mjs --check
    node --test tests/finite-convolution.test.mjs tests/finite-convolution-course.test.mjs

The existing project CI discovers both test files. These tests check authored mathematical results, impulse and boundary behavior, commutativity/superposition controls, the admitted numeric domain, immutable calculations, exact build parity, the published course validator, and actual native learning/review/practice/notes compatibility. Native browser receiving additionally exercises the lab, completed downloads, the current owner-provided importer, and keyboard/narrow-screen use. See the unique receiving packet for actual executed source pins and results; source presence alone is not a pass.

## Provenance and limits

All questions, numbers, distractors, explanations, transfer prompts, UI, and diagrams were originally authored for RecallWeave. The questions do not reproduce MIT exercises, passages, or figures. Original course wording, examples, and diagrams are offered under CC BY 4.0; the cited MIT resources retain their own terms.

The twelve canonical keys are balanced across the four positions. Correctness checks establish these mathematics and software contracts. They do not measure improved learning, validate a learner's ability, qualify a hardware filter, or claim a deployed teaching service.
