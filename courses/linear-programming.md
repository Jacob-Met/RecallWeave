# Linear programming: feasible regions and tied optima

This original RecallWeave lesson connects exact calculations to a picture you can inspect. Open `linear-programming-explorer.html` directly in a modern browser. It contains its model, interface, course and guide; it makes no network requests and stores no work automatically.

The lab solves a deliberately bounded, continuous problem:

- Two **real variables**, x and y, lie in an explicit closed rectangle.
- Up to eight authored rows have the form **a x + b y ≤ c**.
- An objective **p x + q y** is minimized or maximized.
- Bounds are integers from −20 to 20; row and objective coefficients are integers from −100 to 100.

The rectangle is a mathematical constraint. Editing a bound can change feasibility and the optimum. The solver is not an unbounded LP solver, an integer-programming solver, or a calibrated planning tool.

## Try a complete experiment

1. Load **Fractional optimum**. Both authored boundaries meet at (5/3, 5/3).
2. Inspect the vertex table: maximizing x+y gives **10/3**, not a rounded integer.
3. Select that vertex. Each authored row has slack 0, and the table also shows all rectangle slacks.
4. Change x maximum to 1. The previous result becomes unavailable until you apply the draft.
5. Apply the new problem. The new optimum is **3 at (1,2)**. The original point is excluded by the changed bound.
6. Download the observation if you want the complete exact calculation, including all pair decisions and the currently inspected vertex.

The observation is a record of the problem you applied. It is separate from a learner's answers or progress. The lab does not import observations or change an active RecallWeave session.

## Read the constraints before the objective

A feasible point must satisfy **every** row and every rectangle bound. For 0 ≤ x,y ≤ 4 with x+y ≤ 4 and 2x+y ≤ 5:

- (1,2) is feasible: 3 ≤ 4 and 4 ≤ 5.
- (2,2) fails the second row: 6 > 5.
- (4,4) is a crossing of two rectangle boundaries, but fails both authored rows.

An intersection is only a candidate. The lab enumerates every unordered pair of the four rectangle boundaries and the authored rows, then tests each defined intersection against all conditions. Eight authored rows produce 66 pairs. Parallel, coincident and zero-normal pairs remain visible instead of inventing an intersection.

Each row's **slack** is c−a x−b y. Nonnegative slack means that row is satisfied. Zero slack makes the row active at that point. Duplicate or scaled rows retain their own identities and slacks even when they do not change the feasible geometry.

A zero-normal row needs special care: 0x+0y ≤ 4 is always true; 0x+0y ≤ 0 is always true and tight; 0x+0y ≤ −1 is impossible everywhere.

## Evaluate the objective exactly

For the first example, the feasible vertices and the objective 3x+2y are:

| Vertex | Objective |
| --- | --- |
| (0,0) | 0 |
| (0,4) | 8 |
| (1,3) | 9 |
| (5/2,0) | 15/2 |

The maximum is 9 at (1,3); the minimum is 0 at (0,0). Changing the objective does not change the feasible set.

For 2x+y ≤ 5 and x+2y ≤ 5, adding the inequalities gives 3(x+y) ≤ 10. The feasible point (5/3,5/3) attains the resulting upper bound 10/3. This is an exact argument, independent of how the picture is drawn. Integer coefficients do not restrict x and y to integers.

A nonempty bounded feasible polytope has a vertex attaining a linear optimum. The lab uses that property, enumerates all feasible vertices, and keeps every tied optimum. All decisions use reduced rational arithmetic with BigInt numerators and denominators. Decimal conversion is used only to draw bounded coordinates.

## Describe the complete optimal set

**A tied edge.** In the triangle x ≥ 0, y ≥ 0, x+y ≤ 4, maximizing x+y gives 4 on the entire segment from (0,4) to (4,0). The endpoints describe that segment; they are not the only optimal points.

**A constant objective.** A zero objective is 0 everywhere on any nonempty feasible set. For a polygon, the entire region, including its interior, is optimal.

**A feasible line.** With x+y ≤ 3 and −x−y ≤ −3, the rectangle 0 ≤ x,y ≤ 4 contains only the feasible segment x+y=3. The nonzero objective 2x+2y is constant at 6 on it. Every feasible point is optimal.

**A feasible point.** Bounds 0 ≤ x ≤ 2, 0 ≤ y ≤ 1 together with x ≥ 2 and y ≥ 1 leave only (2,1). It is a valid feasible set, even though it has no area.

**An empty set.** Nonnegative x,y cannot also satisfy x+y ≤ −1. This problem has no attained optimum. The display does not call infeasibility a zero value or an unbounded result.

The observation's `region.kind` describes the feasible set as empty, point, segment or polygon. Its `optimum.kind` describes the optimal set as point, segment or region. Separately, `optimum.wholeRegion` says whether the entire feasible set is optimal. Thus an optimal segment may also be the whole feasible region; a singleton is both a point and the whole feasible set.

## Enter and inspect a problem

Use decimal integer tokens, with an optional + or − sign. Leading zeroes and −0 are accepted and normalized; decimals, exponent notation, hexadecimal and expressions are refused. Each token is limited to 32 trimmed characters.

Enter one authored row per line as `a,b,c`. Blank lines are ignored; LF, CRLF and CR line endings are supported. At most eight rows and 4,096 text characters are accepted. A blank constraints field means that only the rectangle limits the problem.

Editing a field retires the displayed calculation and disables its observation download. **Apply problem** validates the whole draft and computes a new result. An invalid draft does not leave a previous calculation looking current. Loading a preset replaces the draft and applies that preset explicitly.

The vertex list uses exact coordinate order, not an objective ranking. The drawing highlights the feasible boundary and complete optimal set. The table remains authoritative for exact fractions; the picture is illustrative. Degenerate bounds receive drawing padding without changing the mathematical rectangle.

## Use the original lesson

**Download course JSON** provides `linear-programming.json`, an original 16-question RecallWeave deck. Import it through the existing learner's normal course picker, inspect the preview, and start a session. This lab neither selects an answer nor submits one for you.

**Download guide** saves this Markdown text. **Download observation** saves `linear-programming-observation.json` with format `recallweave-linear-programming/1`: the admitted problem, all boundary identities, all pair outcomes, exact feasible vertices and slacks, complete optimum description, and optional inspected vertex.

All downloads are explicit browser downloads. There is no account, persistence, external service, automatic upload, or automatic modification of another tab.

## Scope and mathematical background

These small exact experiments teach continuous linear optimization in a finite rectangle. They do not implement general simplex, integer optimization, dual certificates or unboundedness classification. They make no physical, clinical, financial or calibration claim.

Primary background: [MIT 6.854, Linear Programming notes](https://courses.csail.mit.edu/6.854/21/Notes/n11-lp.html), particularly the geometry and vertex sections. The examples, questions, distractors and explanations here are original; no reference exercise, figure or passage is reproduced.

## Rebuild and check

From the repository root:

```sh
node tools/build-linear-programming.mjs
node tools/build-linear-programming.mjs --check
node --test tests/linear-programming.test.mjs tests/linear-programming-course.test.mjs
```

The builder validates the course with the unchanged native deck parser and embeds the exact model, UI, template, course and guide bytes. Its check mode refuses a stale generated explorer. Browser receiving is separate from these model and build checks.
