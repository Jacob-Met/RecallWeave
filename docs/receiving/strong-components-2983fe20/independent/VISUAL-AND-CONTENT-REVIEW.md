# Independent visual and content review

Source reviewed: runtime `a93e7861b4febc2b991276bddec2fa0afcb6fbd5`,
custody `e39f27d90239b790ae99005cbc8ec48e6809f55d`.

## Content

The reviewer read the complete graph core, explorer UI, course JSON and worked
guide. All twelve answer keys were checked independently against the stated
graphs and definitions, and those exact answer indices were asserted against
the browser-downloaded course.

| Question | Independently checked result |
| --- | --- |
| scc-return | {A, B} and {C}; C has no return path. |
| scc-join | D → A closes the route between the two cycles. |
| scc-singleton | {Z}; a zero-edge path supplies self-reachability. |
| scc-finish | C, B, A for the chain A → B → C. |
| scc-root-order | B, A, C; the finish list is C, A, B. |
| scc-finish-meaning | A call finishes after its edges and descendants. |
| scc-transpose | Strong-component memberships are preserved. |
| scc-second-pass | {B}, then {A}, then {C} with the stated root order. |
| scc-reset | New transpose searches still need fresh marks. |
| scc-collapse | C1 → C2 and C2 → C3, retaining direct witnesses. |
| scc-no-cycle | A cycle among components would make them one group. |
| scc-edge-work | 18 edge inspections, nine in each traversal. |

The guide distinguishes discovery from finishing, component membership from
display order, and traversal cost from teaching-snapshot/rendering overhead.
The explanation of the first-finish event in the receiver’s separate graph
matches the remaining caller path. The guide does not call an arbitrary cyclic
node graph topologically ordered; it explains the component DAG separately.

The cited primary teaching sources were opened during review:
[Cornell CS 2112 graph traversals](https://www.cs.cornell.edu/courses/cs2112/2022fa/lectures/traversals/)
and [MIT 6.1200J Lecture 14](https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec14.pdf).
Their definitions and traversal discussion support the lesson’s stated
background. The review does not treat the author’s graph-oracle results as
independent receiving evidence.

## Captures inspected

| Capture | Observed result |
| --- | --- |
| desktop-transpose.png | B → b is highlighted in the reversed diagram; case, state table, path and numeric inspection counters agree. |
| desktop-condensation.png | Four exact membership chips and the two directed component edges are visible; both second-edge witnesses are listed. |
| mobile-twelve-labels.png | At 375px, controls remain accessible and the page does not overflow horizontally. All twelve exact labels appear in the state lists, table and component chips. |
| learner-preview.png | The SCC file’s twelve-question preview is visible while the previously started biology question remains in the workbench. |
| learner-correction.png | The deliberately wrong finish-order answer is marked and the correct explanation and transfer prompt are readable. |
| learner-complete.png | Twelve review entries, eleven correct results and one needs-review result appear, with source attribution and course title preserved. |

The maximum-length mobile case makes the small diagram labels dense and wraps
some table labels/statuses onto two lines. The full state lists and component
chips remain readable and preserve exact identity. This is a visual density
observation, not a correctness failure; the default and six-node desktop
captures remain clear.

No blocking source, explanation, download, importer or visual defect was found
in the reviewed scope. The independent browser receiver passed all eleven
groups. Screen-reader behavior and browsers other than the recorded Chromium
were not exercised.
