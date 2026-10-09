# Periodic diffusion: conserved does not mean stable

This lesson follows eight numbers around a ring. They represent dimensionless deviations. Negative values are allowed. The experiment is a small discrete numerical scheme, not a calibrated temperature forecast.

## One simultaneous step

Number the cells 0 through 7. Cell 0 has neighbors 7 and 1; cell 7 has neighbors 6 and 0. For a fixed ratio r, compute every new cell from the **same previous row**:

u_new[j] = r*u_old[j-1] + (1-2r)*u_old[j] + r*u_old[j+1].

The indices wrap around the ring. Never replace an old cell while other new cells still need it. At r=1/4, the weights are 1/4, 1/2, 1/4. Starting from [8,0,0,0,0,0,0,0], the first row is [4,2,0,0,0,0,0,2]. The contribution at cell 7 uses old cell 0 through wraparound.

The ratio has a standard numerical interpretation: r=kappa*dt/dx^2 for a forward-time centered-space discretization of u_t=kappa*u_xx on a uniform periodic grid. This lab accepts r directly. It does not specify physical spacing, units, material parameters or a measured initial field, and it does not estimate discretization error.

## What conservation says

Sum all eight update equations. Each old cell occurs once with each of the three weights. Their sum is one, so the total and the mean are preserved for every admitted r.

For the pulse above the sum stays 8 and the mean stays 1. This remains true at r=3/4, where the next row is [-4,6,0,0,0,0,0,6]. A conserved sum does **not** guarantee a nonnegative field or bounded deviations.

The table also reports sum_j (u[j]-mean)^2. This is a measure of distance from the constant mean for this finite vector. It is not labeled physical heat or material energy. Signed deviations make its distinction from the ordinary sum especially useful.

## When the update is averaging

For 0<=r<=1/2, all three weights are nonnegative and add to one. Each new cell lies between its three old input values. Therefore the global minimum cannot decrease and the global maximum cannot increase. The squared-deviation sum cannot increase either: square is convex, and summing its three-weight inequalities counts each old squared deviation with total weight one.

This says nonincrease, not strict decrease. At r=0 every field is unchanged. At r=1/2 the center weight is zero, and an alternating pattern can persist by swapping signs.

For r>1/2 the center coefficient is negative. A row may still stay unchanged—for example, a constant row—but the averaging guarantee no longer holds. One quiet initial field does not establish stability for every possible initial field.

## A pattern that exposes the boundary

Let a[j]=(-1)^j on the eight-cell ring. Both neighbors are -a[j], so one update gives

r*(-a[j]) + (1-2r)*a[j] + r*(-a[j]) = (1-4r)*a[j].

Thus the alternating amplitude is multiplied by g=1-4r at every step.

| Ratio | Multiplier | Alternating pattern |
|---|---|---|
| 0 | 1 | unchanged |
| 1/4 | 0 | vanishes after one step |
| 1/2 | -1 | flips each step without shrinking |
| 3/4 | -2 | flips and doubles in magnitude |
| 1 | -3 | flips and triples in magnitude |

At r=3/4, starting cell 0=1 gives 1,-2,4,-8 across steps 0–3. The sum stays zero while the squared-deviation sums are 8,32,128,512.

A constant plus an alternating pattern makes the same point without a zero mean. Starting from [2,0,2,0,2,0,2,0], the mean is 1. At r=3/4 the first two rows are [-1,3,-1,3,-1,3,-1,3] and [5,-3,5,-3,5,-3,5,-3].

For this even periodic grid the full Fourier multiplier is 1-4r*sin^2(theta/2). All discrete modes have magnitude at most one precisely for 0<=r<=1/2, because the alternating mode theta=pi is present. This finite-grid statement does not itself establish accuracy for a continuous physical problem. The lab plots vectors and exact step arithmetic, not a continuum solution.

## Using the lab

Open diffusion-stencil-lab.html directly. The default pulse starts at r=1/4 for eight steps.

1. Edit any cell, ratio numerator/denominator, or step count. The previous accepted result remains labeled as previous, but row/cell navigation and observation download are retired.
2. Choose **Apply experiment** to validate all fields together. Integers only: eight initial values between -20 and 20, 0<=numerator<=denominator<=16 with denominator at least 1, and 0–24 steps.
3. Choose a row and cell to inspect. Row 0 is the initial condition and has no incoming transition. Later rows show the three indices, previous values, weights, weighted terms and exact sum.
4. Compare the approximate diagram with the exact rational table. Colors and SVG coordinates are approximate; they do not establish equality. Long fractions can be scrolled within their table.
5. Download the accepted observation as JSON. It contains the complete applied input and every exact row, plus the selected row/cell. Unapplied or refused edits cannot be exported as an accepted observation.

Presets only fill draft fields; they still require Apply. Fixed lesson JSON and this guide may be downloaded even while a draft is invalid. Nothing is uploaded or automatically stored.

## Continue in RecallWeave

Open the unchanged demo.html learner. Under Bring your own lesson, select the downloaded diffusion-stencil.json, inspect the preview, and choose **Start this deck**. That action begins the first question directly. There is no second welcome Start step.

Answer the twelve questions, inspect each explanation, then use the existing review and missed-item practice. Study notes include the course's transfer prompts. Importing this structurally checked deck does not validate a learner's physical model or provide a measured learning-benefit claim.

## Original transfer exercises

- List the three stencil indices for cell 7.
- Compute the full first pulse row at r=1/4; explain why an in-place left-to-right overwrite is different.
- Compute a constant row at r=3/4, and explain its limitation as a stability test.
- Compare the pulse sums/means at r=1/4 and r=3/4.
- Find the conserved mean for [-2,6,0,0,0,0,0,0].
- Track an alternating vector's sum and squared deviations at r=3/4.
- Update neighborhood [-4,4,12] at r=1/4.
- At r=3/5, construct a neighborhood that leaves its old range.
- Explain the zero center weight at r=1/2.
- Decompose [3,1,3,1,3,1,3,1] into mean and alternating parts.
- Track alternating squared deviations at r=1/2 over two steps.
- Track [2,0,2,0,2,0,2,0] at r=3/4 over two steps.

Original lesson text and exercises: HAMON / ChatGPT, 2026, CC BY 4.0. Mathematical background: Gilbert Strang, *Computational Science and Engineering*, section 5.4, MIT: https://math.mit.edu/classes/18.086/2006/am54.pdf. That source retains its own terms.
