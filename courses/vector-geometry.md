# Vector geometry: moves, projections and transformations

This optional RecallWeave course contains twelve original questions across six
connected ideas. It is for a learner who can add signed numbers, work with simple
fractions and read a point as an ordered pair. It connects those skills to the
geometry behind two-dimensional motion and linear transformations.

Use [vector-geometry.json](vector-geometry.json) with RecallWeave's local deck
importer. Review the selected course, then explicitly choose **Start this deck**.
Each answer opens a worked explanation and a transfer prompt. On completion,
review the full learning trace, practice initially missed questions, and download
study notes. Starting the deck replaces the current in-memory lesson; merely
previewing it does not. The course does not replace the bundled biology lesson.

## Explore a projection first

Open [vector-geometry-explorer.html](vector-geometry-explorer.html) directly in a
browser, or serve it beside the rest of the project. It contains the complete
course download and works without a server or connection. The four coordinate
fields change the original vector `b` and a nonzero direction `a` for a line
through the origin. The diagram and numeric evidence update together.

Start with **Course example**, then choose **Same line, longer a**. The dot
product and squared direction length both change, but the projected point stays
at `(4, 2)`. Try **Perpendicular to a** and **Already on the line** to see which
part becomes zero. Finally, reverse both direction components by typing `-2`
and `-1`; the line and projection remain unchanged. The dashed residual arrow
starts at the projection and ends at `b`, making `p + r = b` visible.

The explorer uses coordinates from `-6` to `6` in quarter-unit steps. It clears
its calculated result when a field is incomplete, outside that domain, or both
direction components are zero. Values are displayed to three decimal places;
the underlying calculation uses JavaScript numbers. **Download the 12-question
course** prepares the same JSON as the companion file for RecallWeave's importer.
Geometry changes stay in the page; reopening starts from the course example.

## A short preparation sheet

All vectors here use ordinary Euclidean coordinates with perpendicular axes and
the same unit along each axis. A vector written `(x, y)` may be displayed on one
line, but the matrix questions explicitly treat it as a **column vector**.

**A position and a displacement answer different questions.** A position locates
a point relative to an origin. A displacement describes the change from a start
to an end. Subtract start from end component by component; add displacement
vectors to combine moves. Translating both endpoints by the same amount does
not change their difference.

**Length and direction can be separated.** In these coordinates the length of
`v = (x, y)` is `sqrt(x² + y²)`. For a nonzero vector, divide every component by
that positive length to get a unit vector pointing in the same direction. The
zero vector has no unit direction to recover. The sum of the absolute components
measures a different quantity from the Euclidean length.

**A dot product is a signed scalar.** For `u = (u_x, u_y)` and `v = (v_x, v_y)`,
`u·v = u_x v_x + u_y v_y`. Two nonzero vectors are perpendicular exactly when
that Euclidean dot product is zero. When `d` is a unit direction, `v·d` is the
signed component along it; reversing `d` reverses that sign. This is distinct
from the full vector length. Background: MIT's sections on
[vectors](https://ocw.mit.edu/ans7870/18/18.013a/textbook/HTML/chapter03/contents.html)
and dot products.

**Projection keeps a component along a line.** For a line through the origin
with nonzero direction `a`, the orthogonal projection of `b` is
`p = ((b·a)/(a·a))a`. The result must satisfy two checks: `p` lies on the line,
and the residual `b - p` is perpendicular to it. Under Euclidean distance these
identify the nearest point on that line. Multiplying the direction `a` by any
nonzero scalar describes the same line and leaves the projected point unchanged.
Background: MIT 18.06SC,
[Projections onto Subspaces](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/projections-onto-subspaces/).

**A matrix describes a linear action.** With column vectors, each output component
is the dot product of a matrix row with the input. Equivalently, the columns tell
where the coordinate basis vectors go; combine those columns using the input
components as weights. If operation `R` happens first and `S` second, the result
is `S(Rv) = (SR)v`. Reversing the order can change the result. A map that sends
different inputs to the same output loses information and cannot have a unique
inverse on the whole input space. Background: MIT 18.06SC,
[Multiplication and Inverse Matrices](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/multiplication-and-inverse-matrices/).

## Worked answer guide

The application shuffles displayed options, so this guide identifies answers by
their values and stable question IDs, not by the visible A–D label.

| Question | Correct result | Reason and useful check |
| --- | --- | --- |
| `vg-move` | `(4, 3)` | `(5, 1) - (1, -2) = (4, 3)`. Add this displacement back to the starting point to recover the endpoint. |
| `vg-combine` | `(1, 3)` | `(3, -1) + (-2, 4) = (1, 3)`. From `(4, 2)`, both procedures end at `(5, 5)`. Net displacement length need not equal path length. |
| `vg-length` | `5` | `sqrt(9 + 16) = 5`. The answer `25` omits the square root; `7` adds absolute components. |
| `vg-unit` | `(-3/5, 4/5)` | Its squared length is `9/25 + 16/25 = 1`; a positive rescaling retains direction. `(3/5, -4/5)` points backward. |
| `vg-dot` | `0` | `2(-1) + 1(2) = 0`. Both vectors are nonzero, so this expresses perpendicularity. |
| `vg-component` | `-3` | `(4, -3)·(0, 1) = -3`. Changing the direction to `(0, -1)` makes the component `+3`, while the displacement remains unchanged. |
| `vg-project` | `(4, 2)` | `b·a = 10`, `a·a = 5`, so `p = 2a`. Residual `(-1, 2)` has dot product zero with `(2, 1)`. |
| `vg-residual` | `(3, -3)` | Subtract the proposed projection from `b`: `(5, -1) - (2, 2)`. The opposite vector is also perpendicular but fails the required identity `p + residual = b`. |
| `vg-matrix` | `(0, -6)` | The row products are `2(1) + 1(-2)` and `0(1) + 3(-2)`. |
| `vg-basis` | `(4, 9)` | `3(2, 1) + 2(-1, 3) = (4, 9)`. The basis images form columns under the stated convention. |
| `vg-order` | `(-4, 1)` | Rotate `(1, 2)` to `(-2, 1)`, then stretch. The reverse order gives `(-2, 2)`. |
| `vg-loss` | `(3, 1)` and `(3, 5)` | Both flatten to `(3, 0)`. Every original `y` is discarded, so an output alone cannot recover it. |

## Transfer checks

The prompts invite explanation as well as arithmetic. These check results can be
used after attempting them:

- Translating both `vg-move` endpoints by `(10, 7)` still gives displacement
  `(4, 3)`. The added translation cancels in subtraction.
- The vectors `(-3, 4)` and `(3, 4)` both have length `5`; `(6, -8)` has length
  `10`. Reflecting one component retains length, while scaling the entire vector
  by magnitude `2` doubles it.
- Normalizing `(6, 8)` gives `(3/5, 4/5)`. Multiplication by `12` gives
  `(36/5, 48/5)`, a vector of length `12` with the same direction.
- Replacing the dot-product question's second vector by `(1, 2)` gives `4`;
  the nonzero vectors are no longer perpendicular.
- Replacing projection direction `(2, 1)` by `(4, 2)` changes the coefficient
  from `2` to `1`, leaving the point `(4, 2)` unchanged.
- The matrix in `vg-matrix` sends the basis vectors to `(2, 0)` and `(1, 3)`.
  Their weighted combination `1(2, 0) - 2(1, 3)` gives `(0, -6)`.
- The linear map in `vg-basis` sends `(-1, 2)` to `(-4, 5)`.
- From `(2, 1)`, rotate then stretch gives `(-2, 2)`, while stretch then rotate
  gives `(-1, 4)`. A uniform stretch by `2` commutes with this linear rotation:
  `R(2v) = 2R(v)` by linearity.
- `G(x, y) = (2x, 3y)` is reversed by `(x', y') → (x'/2, y'/3)`.
  Flattening uses a zero scale for the second coordinate, so division cannot
  recover the discarded coordinate on the whole plane.

## Content and receiving scope

There are two items per concept. Canonical correct-option indices are balanced
three each across `0`, `1`, `2`, and `3`; the app's independent answer-order
mechanism still shuffles their presentation. Prerequisite links are acyclic and
identify useful conceptual connections. As in other RecallWeave decks, those
links guide selection rather than enforce a fixed lesson order. Each question
states its own inputs and conventions, without depending on a previous answer.

All question scenarios, wording, options, worked feedback and transfer prompts
are newly authored for this contribution. No third-party textbook wording,
exercises or figures are copied. The linked MIT materials are background
references and keep their own terms; this course file makes no separate
reuse-license grant or change to existing repository licensing. AI assistance
was used in authoring and checking the new content.

The focused native mathematical tests independently calculate the conditions
that make one option correct, including direction, signed residual, projection
and operation order. Import admission uses the existing owner's validator rather
than a new schema. The standalone explorer has passed actual HTTP and direct-file
receiving, including keyboard editing, invalid input recovery, narrow-screen
layout and exact JSON downloads. The verification packet distinguishes that
completed gate from the independent subject review and final imported lesson,
review, practice and study-note receiving. Structural validation or passing
arithmetic tests alone do not establish learning outcomes. RecallWeave's fixed
model estimates remain illustrative model state, not a grade.
