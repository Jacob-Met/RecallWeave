# Sampling: different signals, identical observations

This original RecallWeave course helps an introductory science or engineering learner distinguish a sampled observation from a claim about its continuous source. It connects the sample clock, cosine aliases, the assumptions behind reconstruction, and acquisition choices. The companion lab works directly from a local file.

## Start with an experiment

Open [sampling-aliasing-lab.html](sampling-aliasing-lab.html) in a browser. It contains its controls, graph, numerical table and downloads; no server, package installation, account or internet connection is needed. Start with **9 Hz at 8 samples/sec**. Predict a different cosine that will meet every dot, then inspect the graph and numerical table. Change the reference to 1 Hz while retaining the rate. The alternative changes to 9 Hz: the same observations support both possibilities.

Try the below-half-rate, boundary and constant-looking presets. In each case, describe which curve is the authored reference, which is a compatible alternative, and what is actually measured. The reference is supplied by this experiment; an unknown physical source would not come with that label. The lowest alias is a convenient representative, not proof of the original frequency.

**Download these samples · CSV** saves the current frequency, sample rate, comparison frequency, lowest representative, time and both cosine values for every displayed sample. The table rounds to six decimal places; the CSV keeps numeric precision. Empty, out-of-range or off-step inputs pause the results and disable sampling export until corrected. Downloads are explicit; this lab does not retain a session after refresh.

**Download practice course · JSON** saves the adjacent [sampling-aliasing.json](sampling-aliasing.json) in the existing `recallweave-deck/1` format. It has four concepts and twelve questions, each with an explanation and a transfer prompt. Open it in RecallWeave's separate **Deck studio** using **Open a deck to edit**, review the preview, then choose **Replace draft**. **Check and preview** shows the native answer key; **Download deck (.json)** exports a checked course. A local lesson importer is tracked separately in [issue 7](https://github.com/Jacob-Met/RecallWeave/issues/7); import availability depends on the version you are using. This addition does not replace the six-question default course or change that importer's behavior.

## What the model assumes

The reference is an ideal unit-amplitude, zero-phase cosine:

\[
x(t)=\cos(2\pi f t),\qquad t_n=\frac{n}{f_s}.
\]

Frequency is measured in hertz; the rate is samples per second. The input range is 0–40 Hz in half-Hz increments and integer rates from 2–32 samples per second. The display includes both zero and one second, so it contains `fs + 1` sample points across `fs` intervals. The extra endpoint does not change the sampling rate.

For integer n, adding any integer multiple of the sample rate adds whole cycles to the sampled cosine's phase. Cosine's evenness also makes the reflected frequency agree. Consequently frequencies of the form `k fs + f` or `k fs − f`, when nonnegative, can describe the same zero-phase cosine samples. The lab selects the lowest representative in `[0, fs/2]`. If the reference already is that representative, it draws `f + fs` as a different compatible alternative. Even a low-frequency reference therefore has higher alternatives unless additional information excludes them. [1]

The graph draws the two analytical curves between samples; it does not estimate a reconstruction. These particular alias identities hold for every integer sample index, although the display shows only one second. Arbitrary-phase signals require the phase to be treated as well; the lab does not silently extend a zero-phase demonstration to all phases.

For an ideal signal known to have no content above B, the strict condition `fs > 2B` is a sufficient sampling condition in the usual ideal theorem with the complete sample sequence. It is not a conclusion that can be drawn from this finite display. Equality is excluded in this course: a sine at `B = fs/2` can vanish at every sample despite varying between them. The known band limit, ideal samples and complete sequence are substantive assumptions. [2]

## Worked answers and distractor review

The letters below refer to the course's original option order. A learner UI may rearrange how choices are displayed; the native answer index remains bound to the original option text.

| Question | Correct option | Reason |
|---|---|---|
| Clock interval | A · 0.125 seconds | The interval is `1/8` second. |
| Endpoint count | B · 7 samples | Indices 0 through 6 give seven observations across six intervals. |
| Phase advance | C · π/2 radians | `2π × 3 × (1/12) = π/2`. |
| 9 Hz at 8 samples/sec | D · 1 Hz | Removing one sample rate leaves 1 Hz. |
| 13 Hz at 10 samples/sec | A · 3 Hz | Removing 10 Hz leaves 3 Hz, already below the 5 Hz half-rate. |
| A matching 2 Hz alternative | B · 12 Hz | Adding 10 Hz changes sampled phase by `2πn`. |
| A known 5 Hz band limit | C · 12 samples/sec | Of the listed rates, only 12 is strictly greater than 10. |
| The 4 Hz sine at an 8 Hz rate | D · Every sample is zero | `sin(πn) = 0`; the continuous signal still varies. |
| What the observations establish | A · Both curves are compatible | Matching observations do not identify an unknown physical original. |
| Filter ordering | B · Attenuate 11 Hz before sampling | At a rate of 8, the unwanted 11 Hz component folds onto 3 Hz. |
| A filter after ambiguous sampling | C · Identical inputs cannot be distinguished | A deterministic digital operation cannot infer which of two identical input sequences occurred. |
| Put 9 Hz strictly below half-rate | D · 24 samples/sec | `9 < 24/2`; a rate of 18 is exactly the excluded boundary. |

### Why the other options are tempting—and wrong

1. **Clock interval.** “8 seconds” confuses the rate with its reciprocal. “0.25 seconds” is the interval at 4 samples/sec, and “0.0625 seconds” belongs to 16 samples/sec. The unit on a rate is not the unit on an interval.

2. **Endpoint count.** Six counts intervals while overlooking one included endpoint. Five would exclude both endpoints. Twelve doubles the number of intervals without justification. Listing the integer indices removes the ambiguity.

3. **Phase advance.** π would be half a cycle per sample; π/4 would be an eighth; 2π/3 would be a third. The stated 3 Hz signal at 12 samples/sec advances one quarter-cycle. Multiplying angular frequency by the interval gives radians, not seconds.

4. **The 9 Hz alias.** Seven hertz also gives the same zero-phase cosine samples, but is not the lowest nonnegative representative. Four hertz is the half-rate, not an automatic alias of every signal. Nine is the supplied reference, not the lowest compatible frequency.

5. **The 13 Hz alias.** One hertz is not compatible with this sample sequence. Seven is compatible by reflection about the sample rate, but folds further to 3 Hz. Thirteen is compatible because it is the reference; it does not answer “lowest.” This question separates finding any alias from choosing the lowest representative.

6. **The 2 Hz family.** Seven hertz folds to 3 at this rate. Five is the half-rate and gives a different sequence. Three is also a different baseband sequence. Twelve is the only offered frequency that differs from 2 by an integer sample rate or a suitable reflection.

7. **The strict sampling condition.** Rates of 8 and 5 are below `2B = 10`. A rate of 10 is equal, whereas the question explicitly asks for strict inequality. Selecting 12 follows the stated assumptions; it does not make a finite record a general reconstruction proof.

8. **The boundary sine.** Sampling observes values; it does not physically cancel the input before it arrives. The continuous sine is not zero at every time. Eight samples per second do not determine every possible signal up to 8 Hz. The sample values vanish because the chosen phase meets zero at every sampled instant.

9. **Measurement evidence.** Neither the lower nor the smoother-looking curve is proven to be the original. The higher frequency is also compatible with the observations. Additional justified bandwidth information could exclude it, but no such information is supplied by these measurements alone.

10. **Acquisition order.** Filtering digital frequencies above 4 Hz cannot remove the 11 Hz cause after it has appeared at 3 Hz. Connecting more display points changes a drawing, not the measurements. Recording longer at unchanged uniform times also fails to separate these ideal aliases. A suitable filter before sampling can reject the unwanted input while retaining 0–3 Hz; this example does not specify a physical filter design.

11. **Digital processing after aliasing.** Smoothing does not add the missing distinction. Removing higher digital frequencies cannot separate two causes with identical digital inputs. Filters do not all return zeros: the limitation is identical inputs producing identical outputs, regardless of the particular common output.

12. **A higher acquisition rate.** Rates of 8 and 12 have half-rates of 4 and 6, both below 9. A rate of 18 places 9 exactly at half-rate. The stated strict comparison is satisfied by 24. This would govern a new acquisition; it does not change a previously sampled record.

## Transfer answers

Use these after making a prediction and writing down a calculation.

1. At 20 samples/sec the interval is `1/20 = 0.05` seconds. A higher rate places consecutive observations closer together.
2. At 10 samples/sec, times 0, 0.1, 0.2, 0.3 and 0.4 correspond to indices 0 through 4: five observations.
3. `2π × 5 / 20 = π/2` radians per sample, again one quarter-cycle.
4. At a rate of 12, `17 − 12 = 5` Hz is already between 0 and 6, so the lowest representative is 5 Hz.
5. At a rate of 8, 11 Hz reduces to 3 Hz. A 7 Hz cosine reflects to 1 Hz because `cos(2π × 7n/8) = cos(2πn − 2πn/8) = cos(2πn/8)` for integer n.
6. One answer is 17 Hz: at a rate of 10 it differs from 7 by a whole sample rate. Other valid examples include 3, 13 or 27 Hz if the whole-cycle or reflection argument is made explicitly. The prompt does not demand the lowest representative.
7. With a known 7 Hz band limit, 14 samples/sec equals `2B` and fails the stated strict condition; 15 is greater and satisfies it.
8. The cosine gives `cos(πn) = (−1)^n`, alternating +1 and −1. The sine at the same frequency gives zero at every integer index. The phase difference matters at the boundary.
9. For example, a justified bound below 9 Hz but admitting 1 Hz can exclude the 9 Hz alternative in the 1/9 Hz pair. The bound is additional information about the input; choosing it after seeing the dots would not establish it.
10. At a rate of 12, a 15 Hz cosine shares its samples with 3 Hz. Attenuate the unwanted 15 Hz component before sampling to prevent this fold.
11. No. The 9/1 Hz equality at a rate of 8 holds for every integer n. More observations at those unchanged uniform times still match. Different acquisition information, not mere record length, is needed to separate this specified pair.
12. Yes: `9 < 20/2 = 10`, so the 9 Hz reference lies strictly below the half-rate at 20 samples/sec.

## Rebuild and inspect the addition

The checked-in standalone is generated from three new sampling-prefixed sources and the course. From the repository root:

```sh
node tools/build-sampling-aliasing.mjs
node tools/build-sampling-aliasing.mjs --check
node --test tests/sampling-aliasing.test.mjs tests/sampling-aliasing-course.test.mjs
```

The builder uses the unchanged native deck parser and embeds the exact authored JSON for download. `--check` compares output without writing. This separate build does not rebuild the shared demo, editor or learner importer. The ordinary native review, separate practice and study-notes functions can consume the course without changing their contracts; structural validity and executable compatibility do not establish educational efficacy.

## Sources, authorship and limits

1. MIT 6.300 Signal Processing, [Sampling and Aliasing, Fall 2025](https://sigproc.mit.edu/_static/fall25/lectures/Sampling_and_Aliasing-handout.pdf). Primary teaching reference for uniform sampling, frequency equivalence and the baseband representative.
2. Dennis Freeman, MIT 6.003 Signals and Systems, [Lecture 21: Sampling, Fall 2011](https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/12e6e5d7567fca2e993ef8563fef5a60_MIT6_003F11_lec21.pdf). Primary reference for the ideal theorem and its strict sampling condition with a known band limit.

The questions, distractors, explanations, transfer examples and guide are original AI-assisted teaching content. Their wording and worked examples are released under **CC0-1.0**. The referenced MIT materials retain their own licenses; no source exercises, figures or prose are copied. This statement does not relicense existing repository content.

The lab models ideal deterministic cosine samples. It does not measure a physical input, include quantization or noise, choose real hardware, design an analog filter, or demonstrate recovery from a finite record. Its authored reference, matching alternative and measured sample values are kept distinct throughout.
