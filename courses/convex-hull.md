# Convex hulls: exact turns and outer boundaries

This original lesson connects a point set with its smallest convex enclosure. Open convex-hull-explorer.html directly from your files, enter a JSON array of coordinate pairs, then choose Compute hull. The page is offline and needs no account, service, storage or dependencies.

Download the original lesson JSON, open RecallWeave, choose it under Bring your own lesson, inspect the preview and select Start this deck. The existing learner supplies feedback, review, separate practice and study notes. The worked answers below are optional study material.

## Conventions before computing

- Coordinates use x right and y up. Each coordinate must be an integer from -20 through 20; enter at most 16 pairs.
- An explicit [] is an empty point set. A blank field or malformed JSON is refused. Input text is limited to 4,096 UTF-8 bytes.
- Each entered pair receives an ID P1, P2, and so on. Identical coordinates use the first ID in computation, but all input occurrences and their representative remain in the table and trace.
- The vertex list contains extreme vertices only. A collinear point between two endpoints remains on the geometric boundary even when omitted from the vertex list.
- A polygon is listed counterclockwise from the smallest x, then smallest y. The closing vertex is not repeated. Empty, point and segment results are explicit, and have zero area.
- No floating-point tolerance changes a turn or a classification. Bounds make integer determinants exact: each coordinate difference is at most 40 in magnitude, giving a conservative determinant bound of 3,200. At most 16 shoelace terms have an absolute sum at most 12,800, far below the exact-integer limit of Number. Fractional coordinates and larger unbounded inputs are outside this explorer's contract.

## How to follow a scan

Sort unique coordinates by x, then y. The lower scan visits that order and the upper scan visits its reverse. When a candidate meets a stack with two or more points, inspect the last two stacked points A,B and the candidate C:

det = (Bx-Ax)(Cy-Ay) - (By-Ay)(Cx-Ax).

Positive means a left turn, negative a right turn, and zero collinearity. Keep a left turn; otherwise pop B and reconsider the same candidate. Push the candidate after any required pops. Join the two chains without repeating their shared endpoints.

The O(n log n) bound in this lesson describes sorting followed by the two stack scans. This bounded explorer also copies complete stack snapshots for inspection and classifies each input against the final hull; those recording and classification steps can add quadratic work. The 16-point limit keeps the complete educational record small.

Previous, Next and Final inspect a complete retained calculation. The completed result and the currently inspected stack are labeled separately. An intermediate stack is not a finished hull. Editing any input retires the old view and trace download until you explicitly compute again.

The trace download contains normalized original inputs, every duplicate ID, sorted representatives, both chains, all copied comparison/pop/push snapshots, classifications, the final hull and exact area. A separate selectedStep value records the inspection cursor; the download is not truncated to that step. Lesson and guide downloads preserve their exact original UTF-8 text.

## A complete worked set

Enter:
```json
[[-4,-3],[4,-3],[4,3],[-4,3],[0,0],[0,-3],[4,-3]]
```

The polygon is P1,P2,P3,P4, with twice-area 96 and area 48 square coordinate units. P5 is interior. P6 is an edge member, not an extreme vertex. P7 duplicates P2 and has the same geometric role, while its own input identity remains recorded. The lower scan's first pop tests P1,P4,P6: its determinant is -24, so it removes P4 from that lower stack. P4 still becomes an extreme vertex through the upper chain.

The complete record has 23 inspection steps for this example. Inspection step 3 (zero-based index 2 in the download) is that first pop. Its intermediate removal must not be interpreted as a final interior classification.

## Worked answers and transfer prompts

### 1. hull-smallest

For a finite set of planar points, which object is its convex hull?

Correct choice: The smallest convex set containing every point

The hull is the smallest convex set containing the inputs. Convexity requires the segment between any two members to remain in the set. A tour is an ordered path, and an axis-aligned box may contain extra area.

Transfer: Give a set of three noncollinear points. Describe one region contained in its bounding box but outside its convex hull.

### 2. hull-left

For A=(0,0), B=(3,0), C=(1,2), what are the orientation determinant and turn of A→B→C?

Correct choice: 6, left turn

B−A=(3,0) and C−A=(1,2), so the determinant is 3×2−0×1=6. With x right and y up, a positive result is a left turn. The determinant is twice the signed triangle area, not the triangle area itself.

Transfer: Swap B and C in this example. Compute the new determinant and explain the sign change.

### 3. hull-right

For A=(−1,1), B=(2,1), C=(2,−2), what is the orientation determinant?

Correct choice: −9

B−A=(3,0) and C−A=(3,−3), giving 3×(−3)−0×3=−9. The negative sign indicates a right turn in the stated Cartesian axes.

Transfer: Translate all three points by the same vector. Explain why the determinant does not change.

### 4. hull-collinear

The complete point set is A=(0,0), B=(1,1), C=(2,2). A lower chain ends with A,B, and C is next. Under the stated extreme-vertex policy, what happens to B?

Correct choice: It is removed from the chain because the determinant is zero; it still lies on the final segment

The only inputs are A, B and C. Their determinant is zero, and B lies between A and C. The extreme-only scan removes B from its vertex stack. The geometric hull is still the complete segment AC, so B remains an edge member rather than disappearing from the input record.

Transfer: Explain the difference between retaining a coordinate as an input and retaining it as an extreme vertex.

### 5. hull-rectangle

The input contains (0,0), (4,0), (4,3), (0,3), (2,1), and (2,0). How many extreme hull vertices are retained?

Correct choice: 4

The four rectangle corners are extreme vertices. The point (2,1) lies inside the rectangle. The point (2,0) lies on its lower edge between two corners, so the extreme-only convention excludes it from the vertex list while retaining its edge classification.

Transfer: Add a point beyond the rectangle's right edge. Explain why you must recompute rather than assume the four old corners all remain extreme.

### 6. hull-duplicates

A point set already contains (4,0). Another input occurrence of (4,0) is added. Which statement is correct?

Correct choice: The geometric hull is unchanged; both input identities can still be recorded

Repeating an existing coordinate does not enlarge the set of geometric locations and therefore does not change its hull or area. This explorer retains both original input IDs and uses the first occurrence as the computational representative.

Transfer: If several entries share a coordinate, explain which identity the explorer selects and which identities the download still retains.

### 7. hull-sort

Sort (2,0), (0,3), (0,−1), (−1,2) by x first, then y for equal x. Which order results?

Correct choice: (−1,2), (0,−1), (0,3), (2,0)

First compare x: −1 comes before 0, which comes before 2. The two x=0 points then compare y: −1 before 3. This gives (−1,2),(0,−1),(0,3),(2,0). The ordering is about coordinates, not the order in which points were entered.

Transfer: Give another pair of points with equal x and show how their y coordinates break the tie.

### 8. hull-pop

The lower chain is [(0,0),(1,2)] and next candidate is (2,0). The orientation determinant is −4. What is the next chain operation?

Correct choice: Remove (1,2), then reconsider the candidate against the shortened chain

A non-left turn cannot stay in the lower extreme-vertex chain. The last stacked point (1,2) is popped. The candidate (2,0) is then reconsidered with the shortened stack; a scan may need several pops before it pushes a candidate.

Transfer: Construct a sorted candidate that causes two successive pops. Show both determinants.

### 9. hull-vertical

What is the canonical extreme-vertex hull of [(2,3),(2,−1),(2,1)]?

Correct choice: Segment [(2,−1),(2,3)]; (2,1) is an edge member

All three coordinates have x=2, so they are collinear. The least endpoint is (2,−1) and the greatest is (2,3). They define a segment with zero area. The middle coordinate (2,1) remains an edge member. Equal x coordinates are allowed.

Transfer: Give a horizontal all-collinear example, identify its two endpoints, and classify a point between them.

### 10. hull-triangle

For the points (0,0), (4,0), (1,3), which hull ordering—counterclockwise from the lexicographically smallest coordinate—and area are correct?

Correct choice: [(0,0),(4,0),(1,3)], area 6

The least coordinate is (0,0). From it, (4,0) then (1,3) produces determinant 4×3−0×1=12, a positive counterclockwise turn. The triangle area is half that determinant, 6 square coordinate units.

Transfer: Reverse the triangle's order and compute its signed twice-area. Distinguish the sign from its unsigned geometric area.

### 11. hull-degenerate

What hull kinds result, respectively, from [], [(2,1)], and [(2,1),(2,1)]?

Correct choice: empty, point, point

The empty array has no hull vertices and is labeled empty. One distinct coordinate defines a point. Two occurrences of the same coordinate still define one geometric point, represented by the first input ID while both input occurrences remain recorded.

Transfer: Explain why two input rows do not necessarily define a line segment.

### 12. hull-cost

For n distinct points, why does sorting followed by two monotone-chain scans take O(n log n) time?

Correct choice: Sorting costs O(n log n); each point is pushed once and popped at most once per chain

Lexicographic sorting costs O(n log n). In each scan, a point is pushed once. Once it has been popped, it never returns to that scan's stack. Total push/pop work is linear, even though a particular candidate can trigger several pops.

Transfer: Distinguish the number of operations in one candidate's inner loop from the total number over a complete scan.

## Verification and scope

The bounded core is checked against all 512 subsets of a 3×3 grid using an independent containment criterion for extreme points, plus supporting-side, winding, canonical-start, trace-replay, degenerate, boundary, duplicate and half-area controls. The independent criterion uses segments and triangles of other points, rather than repeating the chain algorithm. Native course receiving exercises the unchanged parser, adaptive selector, first-response review, separate practice and full reflected study-note export.

These checks are mathematical/software evidence, not a learning-efficacy claim. The rendered diagram is an illustration; exact coordinate, determinant and trace text defines the calculation. No clipping, triangulation, collision detection or handling of arbitrary floating-point geometry is implemented here. Those are distinct problems.

Mathematical background: [Dave Mount, University of Maryland CMSC754, Lecture 2](https://www.cs.umd.edu/class/spring2026/cmsc754/Lects/lect02-hulls-1.pdf). The containment oracle also uses the two-dimensional consequence of [Carathéodory's theorem, MIT 6.253 Lecture 3](https://ocw.mit.edu/courses/6-253-convex-analysis-and-optimization-spring-2012/3e2a100d7fa327637ed8e31771a22c18_MIT6_253S12_lec03.pdf). All wording, examples and diagrams here are original; source exercises and figures are not copied.

Original lesson content prepared for RecallWeave. This file makes no additional reuse-license grant; cited mathematical sources retain their own terms.
