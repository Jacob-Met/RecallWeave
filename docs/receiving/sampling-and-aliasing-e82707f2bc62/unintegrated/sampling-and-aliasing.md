# Sampling and aliasing

An original RecallWeave course about what discrete samples establish, what they leave ambiguous, and which assumptions make reconstruction possible.

## Use the course

Open the repository's `demo.html`, choose [sampling-and-aliasing.json](sampling-and-aliasing.json) under **Bring your own lesson**, inspect the preview, then select **Start this deck**. The lesson has twelve questions across four concepts. The application shuffles answer positions, so the worked answers below identify the answer text or value rather than an on-screen letter.

Try each question before reading its explanation. After the first session, **Review the connections** retains the first answers; **Practice missed connections** offers a separate retry. **Download study notes (.txt)** preserves the explanations and transfer prompts. To restore recorded answers later, save a trace and reopen the exact same course before restoring it. The existing [project instructions](../README.md) describe those controls.

The examples use ideal mathematical signals and deliberately small numbers. They assume basic arithmetic and the periodicity of sine and cosine. They do not require a Fourier-transform proof. All frequencies here are in hertz (cycles per second), and all times are in seconds unless stated otherwise.

| Concept | Questions | What to pay attention to |
| --- | --- | --- |
| Sample timing | `sample-01`–`sample-03` | Index, number of intervals and saved timestamps |
| Aliasing | `alias-01`–`alias-03` | Exact equality on a sampling grid and phase at its boundary |
| Reconstruction conditions | `reconstruct-01`–`reconstruct-03` | Band limit, timing, complete data and filtering before sampling |
| Reading sampled data | `interpret-01`–`interpret-03` | Computed values, frequency-bin spacing and information a longer record supplies |

The prerequisite links are concept hints for RecallWeave's existing selector. They are not a separate scoring system or a promise that the app presents these sections in order. Its model estimates remain illustrative, not validated measures of learning.

## A compact reference

For a uniform sampler starting at time `t_0`, with rate `f_s` samples/s:

- Sample index `n` occurs at `t_n = t_0 + n/f_s`.
- `N` recorded samples, indexed `0` through `N-1`, span `(N-1)/f_s` from first to last.
- A standard `N`-point DFT places adjacent bin centres `f_s/N` hertz apart.
- The sampled zero-phase cosines at frequencies `f` and `f_s-f` agree on the exact grid `t=n/f_s`.

The ideal sampling theorem applies to a band-limited signal and its complete infinite sequence of exact uniform samples. A rate strictly above twice the highest frequency magnitude is sufficient under those assumptions. This course keeps that strict inequality explicit. See Dennis Freeman's [MIT 6.003 Lecture 21, Sampling](https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/resources/mit6_003f11_lec21/), especially lecture pages 13–21 and 26–31, for the sampling model, theorem and aliasing background.

The DFT convention follows the official [NumPy `fftfreq` definition](https://numpy.org/doc/stable/reference/generated/numpy.fft.fftfreq.html): bin frequencies have denominator `N d`, where the sample spacing is `d=1/f_s`. The worked values, questions and explanations below are original calculations.

## Worked answers and transfer checks

### 1. Locate a sample — `sample-01`

**Answer: 0.20 s.** At 20 samples/s, one interval is `1/20 = 0.05 s`. The timestamps beginning at index zero are `0, 0.05, 0.10, 0.15, 0.20`. Index four is the fifth value but lies four intervals after the first value.

The 0.05 s choice is one interval; 0.25 s adds an extra interval; 4 s treats an index as a time without the rate conversion.

**Transfer:** Beginning at 2 s and using 25 samples/s gives `t_6 = 2 + 6/25 = 2.24 s`. Indices zero through six contain seven values. A nonzero starting time shifts the timestamps without changing the spacing.

### 2. Count elapsed intervals — `sample-02`

**Answer: 0.200 s.** Nine samples at 40 samples/s span eight gaps: `8/40 = 0.200 s`. The first timestamp is zero and the last is `8/40`.

The 0.225 s choice is `9/40`, the time from index zero to the next sample after the nine-value record. The 0.025 s choice is only one gap. The 0.400 s choice doubles the correct endpoint span. A duration formula needs an explicit definition of its endpoints.

**Transfer:** Six samples at 10 samples/s occur at `0, 0.1, 0.2, 0.3, 0.4, 0.5 s`. The value `6/10 = 0.6 s` is the time of the next sample on that clock.

### 3. Read the recorded timestamps — `sample-03`

**Answer: the final adjacent interval is 0.2 s; its cause is not established.** The saved differences are `0.1, 0.1, 0.2 s`. A configured rate of 10 samples/s describes the nominal clock, while the excerpt supplies the saved times.

The nominal setting cannot make the final saved difference equal 0.1 s. Replacing 0.4 with 0.3 would alter the record. Inferring exactly one lost physical measurement would require evidence that distinguishes acquisition, selection, export and storage behavior.

**Transfer:** The differences for `2.0, 2.1, 2.35, 2.45 s` are `0.1, 0.25, 0.1 s`. Useful additional evidence might include original sequence numbers, an acquisition log or documentation of which rows the excerpt selected. Those examples are possible investigations, not explanations already proved by the four values.

### 4. Show an exact alias — `alias-01`

**Answer: 7 Hz.** At the stated sample times:

```text
cos(2π · 7n/8)
  = cos(2πn - 2πn/8)
  = cos(2πn/8).
```

Removing an integer number of complete cycles uses periodicity; reversing the sign uses cosine's evenness. This is an equality for every integer `n`, including negative indices. It is stronger than two curves looking similar over a few points. The listed 2, 3 and 4 Hz cosines already differ from the 1 Hz cosine at index one.

**Transfer:** At 10 samples/s, replace `7/8` with `8/10 = 1-2/10` to obtain the same identity for 2 Hz and 8 Hz. At the off-grid time `t=0.05 s`, their values are `cos(π/5)` and `cos(4π/5)`, respectively, which are unequal.

### 5. Reflect a cosine frequency — `alias-02`

**Answer: 3 Hz.** On a 12 samples/s clock, `9/12 = 1-3/12`. Applying the same identity gives the 3 Hz cosine at every sample.

Halving 9 to obtain 4.5 does not preserve these values. The 6 Hz choice is at the boundary rather than below it. The original 9 Hz frequency fails the requested range. The exact statement concerns zero-phase, unit-amplitude cosines; changing a sine/cosine phase requires tracking that phase too.

**Transfer:** A zero-phase 13 Hz cosine sampled at 16 samples/s has the same samples as the 3 Hz cosine because `13/16 = 1-3/16`. At indices zero, one and two, both sequences give `1`, `cos(3π/8)` and `cos(3π/4)`.

### 6. Inspect the exact boundary — `alias-03`

**Answer: every sample is zero.** Substitution gives `sin(2π · 4n/8) = sin(πn) = 0`. At `t=1/16 s`, between the first two samples, the continuous sine is 1. A zero sequence therefore does not establish that this continuous input is zero.

Alternating positive and negative ones describes a different phase: the cosine. A constant one or a visible four-sample sine cycle also fails direct substitution. The example explains why a frequency slogan that ignores phase and the exact boundary can be misleading.

**Transfer:** The corresponding cosine gives `cos(πn)`: `+1, -1, +1, -1` for the first four samples. Its frequency is still 4 Hz. The wave's alignment with the clock has changed.

### 7. Apply the strict rate condition — `reconstruct-01`

**Answer: 13 samples/s.** Twice the highest allowed magnitude is `2 × 6 = 12`. Of the choices, only 13 is strictly greater than 12. The rates 6 and 10 are below it, and 12 is equal to it.

Keep the quantifiers in the question: an otherwise arbitrary band-limited signal, an exact uniform grid and the complete infinite sample sequence. A finite excerpt does not automatically inherit the complete-information conclusion. A practical filter or noisy instrument also has its own behavior beyond this ideal exercise.

**Transfer:** For a 5 Hz bound, 12 samples/s exceeds `2 × 5 = 10`. Applying that ideal result to an excerpt still requires checking what is known about the source's frequency content, sample timing and available data.

### 8. Prevent the ambiguity before sampling — `reconstruct-02`

**Answer: use the stated analog low-pass filter before sampling.** On the 20 samples/s grid, the unwanted 17 Hz cosine can fold to `20-17 = 3 Hz`. Removing the unwanted component before acquisition prevents its contribution from sharing the desired component's sampled frequency.

The drawing rule changes no observations. A post-sampling operation cannot always infer whether a sampled 3 Hz contribution originated at 3 or 17 Hz. Extending this same grid gives more values with the same ambiguity. This is an ideal conceptual filter, not a hardware design specification.

**Transfer:** Desired 2 Hz and unwanted 18 Hz similarly share a sampled frequency at 20 samples/s. An ideal separating filter must act on the analog input before it is sampled. For arbitrary phase, the unwanted contribution still becomes a cosine at the aliased frequency with an appropriate phase, so source separation is not generally available from these samples alone.

### 9. Distinguish a finite excerpt from complete data — `reconstruct-03`

**Answer: the complete infinite sequence would determine the signal; five values alone do not determine its entire waveform.** Although `8 > 2 × 3`, five observations impose only five point constraints on an otherwise unspecified band-limited signal.

For a concrete nonuniqueness witness, let the five sample times be `t_0,...,t_4`. The function

```text
g(t) = product over j=0,...,4 of sin(2π · 0.5 · (t - t_j))
```

vanishes at every one of those times. Expanding the product into complex exponentials shows frequencies no larger than `5 × 0.5 = 2.5 Hz` in magnitude. It is not identically zero. Adding a nonzero multiple of it to a signal band-limited to 3 Hz gives another such signal with the same five values. This is a mathematical example, not a numerical reconstruction method.

Thus the five-value uniqueness claim is too strong. Saying that no amount of data at 8 samples/s could suffice ignores the strict rate condition and the complete sequence. Straight lines are an extra interpolation rule, not a consequence of the observations.

**Transfer:** Ten samples supply more constraints but remain finite. With no additional signal model, they still do not establish the entire waveform. A separately justified finite-parameter model would pose a different inference problem.

### 10. Identify a computed value — `interpret-01`

**Answer: the middle value comes from the chosen interpolation rule.** The linear rule computes `0 + 0.5 × (2-0) = 1`. The recorded count and observation times are unchanged.

For example, `u(t)=2t` and `v(t)=2t+sin(πt)` both satisfy the measured endpoints. Their midpoint values are 1 and 2, respectively. The two measurements alone cannot choose between them. Interpolation therefore supplies neither a third physical observation, proof of the source's straightness nor a doubled acquisition rate.

**Transfer:** Those two functions provide the requested example. Linear interpolation draws `u(t)` on the interval. Additional assumptions could justify a particular interpolator, but none were given in this question.

### 11. Compute DFT bin spacing — `interpret-02`

**Answer: 0.5 Hz.** For `N=40` samples at `f_s=20`, adjacent standard DFT bin centres differ by `20/40=0.5 Hz`.

The 20 Hz option is the sample rate; 2 is the `N/f_s` interval in seconds, not a frequency; `1/40` lacks the sample-rate factor. The record's first-to-last span is `39/20=1.95 s`. In the DFT's periodic extension, the next sample after those forty values is at `40/20=2 s`, explaining the denominator without moving the last observation.

Bin spacing describes the analysis grid. Whether an analysis distinguishes nearby tones also depends on the signal, record, window and method.

**Transfer:** With eighty actual samples at 20 samples/s, spacing becomes `20/80=0.25 Hz`; the endpoint span is `79/20=3.95 s`. Merely inserting interpolated points into the original record would be a different operation.

### 12. Ask what more recording changes — `interpret-03`

**Answer: this same grid cannot distinguish the stated pair.** The premise already supplies equality at every integer index. Recording additional indices cannot invalidate an equality that includes those indices. Drawing a denser curve also adds no observation.

This conclusion is specific to the exact alias pair and sampling grid. It does not say that every signal produces the same samples or that longer records are never useful.

**Transfer:** At `t=1/16 s`, the two wave values are `cos(π/8)` and `cos(7π/8) = -cos(π/8)`. This additional off-grid observation distinguishes the particular pair. It changes the information supplied, while establishing no general recovery guarantee for every possible source.

## Content and verification boundaries

The JSON is the authoritative lesson content. This guide supplies worked reasoning and suggested transfer responses; transfer prompts remain open responses, not additional scored multiple-choice questions.

The twelve prompts and answer choices were reviewed independently before the reviewer saw the authored course key or explanations. Native receiving checks the course through RecallWeave's actual validator, selection, answer identity, review, practice and export functions; its exact source and execution receipts are kept in [the receiving packet](../docs/receiving/sampling-and-aliasing-e82707f2bc62/README.md). Mathematical review and software checks do not establish improved learning, instrument accuracy or browser behavior that has not been exercised.

All question wording, choices, explanations, transfer prompts and worked examples are original and were created with AI assistance. The original course text is dedicated under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). The linked background material retains its own terms; no source exercise, passage or figure is reproduced.
