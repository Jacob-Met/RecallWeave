# Bézier curves: a curve from repeated interpolation

This original sixteen-question RecallWeave lesson is for a learner who can add two-dimensional vectors and work with fractions. It connects a familiar weighted average to curved paths, exact subdivision and parameter-dependent motion.

Open [Straight steps. Curved paths.](bezier-curves-explorer.html) directly in a browser. Enter two, three or four control points, apply a parameter, then inspect each interpolation level. Every coordinate in the tables is an exact reduced fraction. The diagram uses browser SVG geometry; its positions are a visual rendering of those values, not measurements of curve length.

## Try the construction

The default quadratic uses P0 = (0, 0), P1 = (4, 8), P2 = (8, 0), with t = 1/2.

| Level | Points |
|---|---|
| Original controls | (0, 0), (4, 8), (8, 0) |
| One interpolation | (2, 4), (6, 4) |
| Two interpolations | (4, 4) |

At every level, interpolate adjacent points with the **same** parameter: (1 - t)A + tB. The final single point is B(t). Two controls describe a linear segment, three a quadratic and four a cubic representation. The represented polynomial may have lower degree when control points have special relationships.

The endpoints are B(0) = P0 and B(1) = Pn. Interior controls shape the curve but need not lie on it. In the arch example, the interior control has height 8 while the curve reaches a maximum height of 4.

Use **Previous**, **Next**, or the level selector to inspect the retained construction. The exact table highlights that level. Editing either input retires the displayed calculation and its trace download; choose **Apply construction** to produce a new one. Loading a preset applies its own inputs. **Reset example** restores the default arch.

## Split without changing the curve

The same triangle contains two new control polygons. Read the first point of each level to obtain the left controls. Read the last point of each level in reverse level order to obtain the right controls.

For the default arch split at t0 = 1/2:

- Left controls: (0, 0), (2, 4), (4, 4).
- Right controls: (4, 4), (6, 4), (8, 0).

They meet at the evaluated point (4, 4) and represent the original two portions exactly. Each portion has a fresh local parameter u between 0 and 1:

- L(u) = B(t0 * u).
- R(u) = B(t0 + (1 - t0) * u).

For a split at t0 = 1/4, left u = 1/2 means original t = 1/8. Right u = 1/3 means original t = 1/2. The local parameter is not the original parameter and is not an arclength fraction. At t0 = 0 the left portion collapses to the initial point; at t0 = 1 the right portion collapses to the final point. These boundary cases remain defined.

The subdivision toggle overlays the two portions and their control polygons. Their apparent precision is limited by drawing pixels; the listed controls and downloaded trace retain exact fractions.

## A derivative is tied to a parameter

For a degree-n representation, B'(0) = n(P1 - P0) and B'(1) = n(Pn - Pn-1). At an interior t, multiply the difference of the final two construction points by n to obtain B'(t).

These are coordinate changes per unit of t. They are neither total curve length nor necessarily unit directions. Under subdivision the local derivatives are L'(u) = t0 B'(t0 u) and R'(u) = (1 - t0) B'(t0 + (1 - t0)u). Sharing a geometric join therefore does not imply equal derivatives with respect to separately normalized parameters.

The preset with controls (0, 0), (0, 0), (8, 0) gives B(t) = (8t², 0). At t = 0 its first derivative is zero, although later points move. The page labels this as a stationary parameter value. A zero vector cannot be normalized to a direction; it alone does not establish whether a geometric tangent exists.

That same example gives positions 0, 2 and 8 on the x-axis at t = 0, 1/2 and 1. The two equal parameter intervals travel distances 2 and 6. Straight geometry does not guarantee uniform parameter speed.

## Study the original course

Download [bezier-curves.json](bezier-curves.json) from the explorer. In RecallWeave choose **Bring your own lesson**, inspect its title and question preview, then choose **Start this deck**. The course uses the existing adaptive learner, feedback, learning trace, missed-question practice and study notes. It does not replace an active learner session automatically.

The course also opens in Deck studio through its existing checked authoring flow. Each of its four concepts has four original questions. Correct options are balanced across the four canonical positions; the learner may reorder displayed options while preserving their answer identities.

| Question | Correct value or statement | Key distinction |
|---|---|---|
| bz-interpolate | (4, 0) | Weight the displacement from the initial point. |
| bz-endpoints | A, then B | t = 0 and t = 1 select opposite endpoints. |
| bz-convex | Nonnegative weights sum to 1. | Coordinates need not increase. |
| bz-translation | (1, 5) | Translate controls and result together. |
| bz-quadratic | (4, 4) | Complete both interpolation levels. |
| bz-control-point | Maximum height 4, below 8. | An interior control is not generally interpolated. |
| bz-cubic | (4, 6) | Four controls require three levels. |
| bz-collinear | (2, 0) | A quadratic representation can trace a line. |
| bz-left-split | (0, 0), (2, 4), (4, 4) | Left-edge controls retain traversal order. |
| bz-right-split | (4, 4), (6, 4), (8, 0) | Right-edge controls run from split to endpoint. |
| bz-left-parameter | 1/8 | Scale the local parameter by t0. |
| bz-right-parameter | 1/2 | Include the right interval's offset and scale. |
| bz-start-derivative | (6, 12) | Multiply the forward difference by degree. |
| bz-end-derivative | (12, 6) | Retain forward traversal direction. |
| bz-stationary | Zero first derivative, later motion. | Zero derivative does not imply a constant curve. |
| bz-parameter-speed | 2, then 6 | Equal parameter steps need not travel equal distances. |

Each explanation derives its answer from the stated example. Transfer prompts ask the learner to change a premise and predict the consequence. These design choices are not evidence of measured educational effectiveness.

## Inputs, downloads and reproducibility

Coordinates must be whole integers from -20 through 20. Enter one x,y pair per line or separate pairs with semicolons. The parameter is 0, 1 or an unsigned fraction whose integers satisfy 0 <= numerator <= denominator <= 1000, with a positive denominator. Decimal and exponent tokens are refused. Empty, malformed, sparse or out-of-range model inputs are refused without coercion.

The trace download is an observation of the applied mathematical construction, including original entered text and selected level. It is separate from a learner-answer archive. Changing the inspected level does not alter the underlying calculation. The course and guide downloads preserve the repository's exact UTF-8 bytes.

The standalone page makes no network requests and keeps no automatic browser storage. It needs no account, server or installation. It covers degree-one through degree-three planar polynomial Bézier representations, not B-splines, general CAD editing or arclength inversion.

Rebuild with `node tools/build-bezier-curves.mjs`; use `--check` to verify exact parity with the model, UI, template, course and guide. The builder uses the existing deck validator and changes only the generated explorer. Source modules remain ordinary native JavaScript with no dependency installation.

## Mathematical sources and original content

The examples, questions, diagrams, explanations and transfer prompts were written for this contribution. No textbook exercise or figure is reproduced.

- N. M. Patrikalakis, T. Maekawa and W. Cho, *Shape Interrogation for Computer Aided Design and Manufacturing*, MIT online edition, [section 1.3.4](https://web.mit.edu/hyperbook/Patrikalakis-Maekawa-Cho/node12.html): the Bernstein representation and endpoint derivative identities.
- The same work, [section 1.3.5](https://web.mit.edu/hyperbook/Patrikalakis-Maekawa-Cho/node13.html): de Casteljau evaluation and the two subdivision control polygons.

Consulted 8 October 2026. The displayed examples and local-parameter identities are derived explicitly here. This original lesson and guide are released under CC0-1.0; referenced works and application code retain their own terms.
