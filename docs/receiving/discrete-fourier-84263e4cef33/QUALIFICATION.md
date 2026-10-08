# Discrete Fourier lesson and offline lab qualification

The new lesson connects RecallWeave's sampling and phasor material to a finite discrete Fourier transform. It supplies 12 original questions, a worked guide, and an offline lab with sample editing, conjugate-pair selection, coefficient inspection, reconstruction, residuals, and explicit downloads.

## Contract and scope

- Real Number arrays of length 4, 8 or 16; every value finite and between -1000 and 1000. Text accepts decimal/scientific notation and comma/whitespace separators, never expressions.
- Unscaled negative-exponential forward DFT; inverse positive-exponential sum divided by N.
- Interior pair p retains p and N-p. DC and Nyquist are singletons. An empty selection reconstructs zero.
- Raw complex coefficients are retained. A declared scale-aware phase-resolution threshold controls whether the angle is displayed. It is a display rule, not a certified error bound or proof of an exact zero.
- Reconstruction is compared only on the entered sample grid. No sampling rate, continuous-signal inference, measured dataset, or FFT performance claim is introduced.
- The existing learner, deck validator, adaptive selection, scoring and persistence remain unchanged. New files use dependency-free ESM, HTML and CSS. The README addition supplies discovery links.

The original lesson wording and examples use CC BY 4.0 with RecallWeave contributor attribution, following the existing course convention. This does not change the license of other repository content.

## Author regression

On native Windows Node v24.21.0:

    node --test tests/discrete-fourier.test.mjs tests/discrete-fourier-course.test.mjs

All 11 tests passed, with no failures or skips. The tests cover admitted inputs and refusals; linearity and reconstruction on asymmetric grids; conjugate-pair projection; explicit empty selection; phase resolution without clamping; caller input custody and portable record regeneration; unchanged deck import; worked numerical examples; and stale/invalid standalone build fixtures.

The builder was checked with:

    node tools/build-discrete-fourier.mjs --check

The generated page matched its sources. After the bounded browser fixes below, the generated-page compilation, exact deck embedding and parity test passed again (1 selected test). The mathematical module and question deck were unchanged, so the already accepted independent mathematics was not repeated.

## Independent mathematics and content receiving

A separate receiver froze closed-form fixtures before reading the implementation. All 16 cases passed against model SHA256:

    fedeec9c8ea3d82d4dfb09a66e72e43f3dd7176e12d90d66ca164a72ea59fd39

Cases included impulse and shifted impulse; sine/cosine grids at N = 4, 8 and 16; DC/Nyquist; a closed-form eight-sample mixture; conjugate symmetry; normalization-specific Parseval energy; selected-pair and empty reconstruction; small resolved amplitude; input/selection refusal; and caller/portable-record custody.

All 12 answer keys, explanations, worked examples, finite-grid limitations and normalization statements were independently reviewed. The convention was checked against the official NumPy DFT reference linked in the guide. Two clarity refinements were applied: a phase-resolution "threshold" is a display rule, and bin 1 is one cycle per periodic block of N samples.

## Independent browser receiving

A separate receiver froze learner tasks before reading the UI and used a private Chrome profile with HTTP(S) blocked. The first pass completed 66 actions: preset changes, custom samples, invalid-input recovery, pair selection, keyboard use, actual analysis and lesson downloads, exact deck import into the unchanged learner, answer feedback and the next question. There were no page-error events.

That pass found two issues: narrow-screen grid overflow, and an unconditional claim that omitted pairs produce a nonzero residual. The responsive grid now permits its content to shrink, and the explanation states that the residual may remain near zero when omitted coefficients are negligible. The worked guide carries the same clarification.

The affected follow-up completed 22 actions with no page errors. At a 390-pixel viewport, the page width equaled the 375-pixel client area; controls stayed inside it. Keyboard scrolling moved the coefficient table's region while the page stayed at scrollX = 0. Six revised screenshots were visually inspected, including mobile controls/explanations and desktop layout. The source delta was confined to two CSS adjustments, the summary string and matching guide wording; the nine frozen product inputs were checked again after execution.

Accepted generated lab SHA256:

    98c781fe6dcd96519265d784e40923089d405865080489db5f514c215814463d

Accepted question deck SHA256:

    4168d24fca9409bcecd78bffc927fd326b0109cdb23a38c5d5066d389f939969

These checks qualify the source contribution and offline learner flow. They do not claim hosted deployment, continuous-signal correctness, calibrated physical energy, or relative floating-point accuracy for every extremely small allowed input.
