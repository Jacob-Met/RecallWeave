# Discrete Fourier: build a finite sample grid back from its bins

This original lesson connects RecallWeave's [sampling and aliasing](sampling-aliasing.md), [phasor interference](phasor-interference.md), and [finite convolution](finite-convolution.md) lessons to a discrete Fourier transform (DFT). You need arithmetic with complex numbers and an understanding that a sample index is not a time unit.

Open [the offline lab](discrete-fourier-lab.html). It works directly from a local file, uses no packages or network requests, and saves nothing automatically. To study the 12 questions in RecallWeave, download the deck from the lab (or use [the JSON deck](discrete-fourier.json)), open [the unchanged learner](../demo.html), and import it through the lesson selector. Loading a lesson is separate from inspecting the lab.

## What the lab computes

Enter exactly 4, 8 or 16 real samples, each between -1000 and 1000. Commas and whitespace separate numbers; decimal and scientific notation are accepted. Expressions such as 1/2 are not evaluated: enter 0.5. These small bounds make every coefficient and reconstruction point inspectable.

For samples x[n], with n = 0 through N-1, the forward convention is

    X[k] = sum_n x[n] * (cos(2*pi*k*n/N) - i*sin(2*pi*k*n/N)).

There is no 1/N in the forward transform. Reconstruction uses the selected bins S:

    y[n] = (1/N) * sum_(k in S) X[k] * (cos(2*pi*k*n/N) + i*sin(2*pi*k*n/N)).

This implementation evaluates the direct sums, rather than an FFT. It makes no performance claim. The graph shows discrete sample positions without joining them into an inferred waveform. A full reconstruction checks this finite array; it does not identify the unknown values between samples, a physical frequency in hertz, or the accuracy of measured data.

## Experiment 1: distinguish a coefficient from an amplitude

Select **Constant (4 samples)**. The input is [3, 3, 3, 3]. Before looking at the table, predict DC.

Every forward factor at k = 0 is 1, so X[0] = 12. Reconstruction divides that coefficient by N = 4, giving 3 at each sample. The constant's mean is X[0]/N, not X[0]. Other bins should be close to numerical cancellation.

Deselect DC. The reconstruction becomes approximately zero, while the RMS residual becomes approximately 3. Restore all pairs. Any remaining small discrepancy is floating-point arithmetic, not evidence for an unobserved signal.

## Experiment 2: reconstruct a cosine with a pair

Enter **1, 0, -1, 0** and analyze. The exact coefficients are [0, 2, 0, 2]. Keeping pair 1 selects k = 1 and k = 3 together:

    y[n] = (2*exp(i*pi*n/2) + 2*exp(-i*pi*n/2))/4
         = cos(pi*n/2), on the four sample positions.

A magnitude of 2 in either bin is not a sample amplitude of 2. Both partners and the inverse factor matter.

Now enter **0, 1, 0, -1**. The forward sign makes X[1] = -2i and X[3] = +2i. The two examples have the same coefficient magnitudes but different phases. A magnitude-only view loses this distinction.

## Experiment 3: find the singleton at Nyquist

Select **Alternating (8 samples)**. The samples alternate 1 and -1. The Nyquist bin is k = N/2 = 4, and its raw coefficient is 8. Keeping this singleton alone reconstructs the pattern. It is its own conjugate partner, so it must not be counted twice. DC k = 0 is the other singleton.

For any interior pair p, the lab retains both p and N-p. This pairing keeps real inputs' reconstructed contribution real apart from roundoff. The imaginary residual is still reported rather than silently discarded.

## Experiment 4: use residuals and energy as different checks

Select **Offset + two tones (8 samples)**. Keep all pairs, then remove one pair at a time. Watch the reconstructed points and RMS residual. The residual compares the reconstructed real value with the original at the same index:

    error[n] = Re(y[n]) - x[n]
    RMS residual = sqrt(sum_n error[n]^2 / N).

Dropping a nonzero component is an intentional approximation; a nonzero residual is then expected. Omitting a zero or negligible component may leave the residual near zero. With no pairs retained, the reconstruction is zero and RMS equals the input's root mean square.

Under this convention, Parseval's equality is

    sum_n |x[n]|^2 = (1/N) * sum_k |X[k]|^2.

The lab displays both sides and the selected reconstruction's energy. These are finite-array squared magnitudes, not a calibrated physical measurement. As a hand check, the input [1, 0, 0, 0] has energy 1, all four coefficient magnitudes are 1, and 4/4 = 1.

## Read the phase and the numerical limits honestly

The table retains all raw coefficients in the downloadable analysis. Displayed values are rounded. Phase is marked unresolved when its magnitude is not above the declared threshold

    max(64 * Number.EPSILON * N * sum_n abs(x[n]), 64 * N * Number.MIN_VALUE).

This scale-aware rule avoids assigning a confident angle to numerical cancellation. It is a display-resolution rule, not a proof that a coefficient is exactly zero. The raw complex values are never clamped. Very small squared energies can underflow to zero in floating-point arithmetic, so the lab does not promise relative accuracy at every allowed scale.

The exported analysis records the exact entered numerical samples, selected pair indices, all bins, reconstructed points, normalization-specific energy quantities, and residuals in format recallweave-discrete-fourier/1. It contains no identity or browser-storage data. Reusing the record elsewhere requires applying the same convention.

## Lesson map

The four concepts are finite sample grids; Fourier coefficients; real-sample frequency pairs; and reconstruction and residuals. The 12 questions move from the grid and units to normalization/sign, conjugate pairs/singletons/phase resolution, and energy/omission checks. The prerequisite links form that progression without changing the learner's existing selection or scoring.

Reference for the transform convention, inverse normalization and real-input symmetry: [NumPy DFT reference](https://numpy.org/doc/stable/reference/routines.fft.html). The explanations, questions and examples here are original. Lesson content is CC BY 4.0 with attribution to RecallWeave contributors.
