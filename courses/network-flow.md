# Maximum flow: capacity, rerouting and a cut certificate

An original fourteen-question course and optional offline explorer for RecallWeave. Start with addition, subtraction and directed graphs; the course does not require matrix algebra. The aim is to distinguish a feasible assignment, a route’s bottleneck, a residual adjustment and a certificate of optimality.

## Open and use

Open [network-flow-explorer.html](network-flow-explorer.html) directly in a browser. The single file contains its code, the exact original course JSON and this guide. It needs no server, installation, connection, account or automatic browser storage.

Choose a worked example and select **Load example**, or edit the vertex list, source, sink and directed edges, then select **Build the trace**. **Next**, **Back**, **First**, **Finish** and the step selector revisit retained snapshots. Editing a network field retires the displayed result and disables trace download until another successful build; a refused draft is never presented as a computed result.

**Download course JSON** saves the original [course](network-flow.json). In RecallWeave choose that file under **Bring your own lesson**, inspect its preview and choose **Start this deck**. The existing learner then provides answers, authored feedback, review, practice and notes. Downloading an explorer observation does not restore a learner-answer archive.

**Download this complete trace** saves the applied network, all steps, the final cut and the selected inspection step. A file download happens only when selected. Reloading starts the first worked example again. The external mathematical reference is a normal link and is contacted only if the reader opens it.

## Exact conventions

- The network has 2–8 distinct case-sensitive vertex names. Names contain 1–12 letters, digits or underscores, beginning with a letter.
- Each original edge has a nonnegative integer capacity from 0 to 99. Enter one **FROM TO CAPACITY** per line. Empty lines are ignored. Decimal digits are used rather than signed, fractional or exponent notation.
- Source and sink are distinct listed vertices. Self-loops and duplicate ordered pairs are refused. An independently supplied opposite edge is allowed and keeps its own identity. A zero-capacity original edge is retained but offers no positive forward residual option.
- Every original edge keeps a flow between zero and its capacity. Intermediate incoming and outgoing totals match. Flow value is source outflow minus source inflow, and equals sink inflow minus sink outflow.
- A forward residual option adds to one original edge and has availability capacity − flow. A cancellation option reverses that edge’s direction, subtracts from that original assignment and has availability flow.
- Each search is breadth-first in the residual graph. Neighbors follow the entered vertex order. For options to the same next vertex, forward use precedes cancellation, then original edge order breaks any remaining tie. This is Edmonds–Karp; it does not optimize cost or pick the largest bottleneck.
- One augmentation adds the minimum available amount on its selected residual path. Every arithmetic value here is an exact small integer. The input bounds keep all sums far within JavaScript’s exact integer range.
- The final source side contains precisely the vertices reachable from the source by positive residual options. The displayed cut capacity sums only original edges leaving that set. It equals the final flow value. Original edges pointing into the set do not contribute to cut capacity.

The graph always draws **original** arrows. A dashed orange original arrow means its assignment was reduced; the residual path list states the reverse direction actually used. A residual option is not a new original edge. For dense networks, the original-edge table supplies the exact labels instead of crowding the drawing.

## Worked example 1: revise the first route

Vertices are S, A, B, C, D, T. Every edge below has capacity 1:

| ID | Original edge |
| --- | --- |
| e1 | S → A |
| e2 | S → B |
| e3 | A → C |
| e4 | A → D |
| e5 | B → C |
| e6 | C → T |
| e7 | D → T |

The first breadth-first path is S → A → C → T. Its bottleneck is 1. The current value becomes 1, and e1, e3 and e6 each carry 1.

Looking only at unused original edges would now miss the improvement. The next residual path is:

**S → B → C → A → D → T**

Its C → A step is the cancellation option belonging to original e3, A → C. Augmenting by 1 reduces e3 from 1 to 0 while adding 1 to e2, e5, e4 and e7.

The final original flows, in e1–e7 order, are 1, 1, 0, 1, 1, 1, 1. They form the two routes S → A → D → T and S → B → C → T, delivering 2. A and C still conserve flow: the change reroutes a complete assignment instead of destroying a delivered unit.

Only S is reachable in the final residual search. The outward original cut consists of e1 and e2, with capacity 2. A feasible value of 2 and an upper bound of 2 meet.

**Predict before selecting Next:** Which original edge must decrease during the second augmentation? Why does that decrease coexist with an increase in the total value?

## Worked example 2: a shared downstream limit

The supplied bottleneck example has:

- S → A: 7; S → B: 6.
- A → C: 4; B → C: 3.
- C → T: 5; B → T: 1.

Total outgoing source capacity is 13, but total incoming sink capacity is only 6. The solver produces a feasible value of 6. Its final outward cut has capacity 6, which certifies the result.

The breadth-first augmentation sequence is 1 on S → B → T, then 4 on S → A → C → T, then 1 on S → B → C → T. The final original assignments are 4, 2, 4, 1, 5, 1 in the listed order. Source net outflow and sink net inflow both equal 6.

**Change one input:** Increasing S → A alone does not remove the final limit. Change C → T instead, rebuild, and inspect which cut becomes limiting. A cut certificate belongs to its exact applied network; do not reuse an old numeric certificate after editing capacities.

## Worked example 3: two opposite originals

Original A → B has capacity 3, and original B → A has capacity 5 in the supplied opposite-edge preset. At the final assignment, A → B carries 3 and B → A carries 0.

The residual table therefore contains two options from B to A:

| Option | Availability | Assignment it changes |
| --- | ---: | --- |
| Use original B → A | 5 | Increases B → A |
| Cancel original A → B | 3 | Decreases A → B |

The options point the same way but act on different records. The original-edge table makes that distinction visible.

The preset’s maximum value is 5. The solver may leave the original reverse edges into S and from B to A unused; maximum flow does not require using every supplied edge.

## Worked example 4: a maximum of zero

The network has S → A of capacity 8 and A → T of capacity 0. Starting at zero, the residual search reaches S and A but cannot reach T. The final cut leaves {S, A} and includes only the zero-capacity A → T edge.

Its capacity is 0, matching the feasible value. This is a complete answer, not an execution failure. It also shows why outgoing capacity at the source alone does not establish deliverable flow.

## Answer and transfer guide

The course stores answer indices for the original option order. RecallWeave may shuffle displayed choices; use the meaning of the answer rather than a remembered letter.

| Question | Correct reasoning | Transfer check |
| --- | --- | --- |
| nf-capacity | Flow 4 uses part of capacity 7; forward room is 3. | At flow 6: capacity 7, forward room 1. |
| nf-conservation | Incoming 5 requires outgoing 1 + 4. | Capacity 3 on the second outgoing edge cannot support the unchanged assignments. |
| nf-value | Net source outflow is 5 − 1 = 4. | A one-unit circulation raises outgoing and incoming by 1; value stays 4. |
| nf-series | The sole route is limited by its capacity-2 edge. | Raising only the capacity-7 edge leaves the maximum at 2. |
| nf-parallel | Separate routes deliver 3 + 2 = 5. | A shared final capacity-4 edge would bound total delivery by 4. |
| nf-forward | Available forward capacity is 9 − 4 = 5. | After adding 3, flow is 7; forward availability is 2 and cancellation availability is 7. |
| nf-cancel | Cancel 3 from flow 4 to leave flow 1. | Cancelling more than the current flow would violate the zero lower bound. |
| nf-opposite | Use 3 on the opposite original, or cancel 5 on the first original. | Cancel 2: original flows become 3 and 1. Use 2: original flows become 5 and 3. |
| nf-reroute | S → B → C → A → D → T includes cancellation of A → C. | Final flows are 1, 1, 0, 1, 1, 1, 1. A and C each receive and send 1. |
| nf-bfs | Prefer the 2-edge residual path. | A declared tie order makes a trace reproducible without claiming a unique maximizing assignment. |
| nf-cut | Outward capacities are 3 + 4 = 7. | S → A remains within the source side, so it contributes zero to this cut. |
| nf-certificate | Feasible value 6 plus a capacity-6 cut proves optimality. | With feasible value 4 and a capacity-6 cut, the maximum is only bounded between 4 and 6. |
| nf-unreachable | A zero maximum can be certified by the final residual reachable set. | The source side is {S, A}; its outward capacity is 0. |
| nf-upgrade | The source-side cut remains capacity 2. | In the upgraded network, raise S → A toward 9; A → T of capacity 9 then supplies the next bound. |

## Why the final certificate is useful

Check the proposed assignment directly: original capacities are respected and every intermediate vertex conserves flow. This proves the displayed value is achievable.

Then check the displayed cut directly: it includes the source, excludes the sink, and sums only capacities of original outward edges. Any delivered source-to-sink flow must cross that separation. Its net crossing cannot exceed the outward capacity.

If the achievable value and cut capacity agree, there is no gap left for a larger value. The explorer shows both objects so the claim can be inspected rather than accepted only because an algorithm stopped.

A certificate proves a maximum **value** for the supplied network. Different edge assignments or different cuts may have that same value. It does not establish a least-cost route, a unique solution, physical validity, measured throughput or improved learning outcomes.

## Sources and production notes

Mathematical background was checked against [MIT OpenCourseWare, 6.046J Design and Analysis of Algorithms, Spring 2015, Lecture 13: Incremental Improvement: Max Flow, Min Cut](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/resources/lecture-13-incremental-improvement-max-flow-min-cut/), with its [lecture notes](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/ac6b6e8ac932bb5dfb6506fd0db9d5ad_MIT6_046JS15_lec13.pdf). Those notes use a net-flow presentation and temporarily exclude opposite original edges. This explorer keeps a separate nonnegative assignment for each original edge and separately identifies cancellation options, including when an opposite original exists.

All questions, distractors, graphs, tables and explanations here were authored for RecallWeave with AI assistance. No reference exercise, figure or passage was copied. The original course’s own attribution and permission text travels with its JSON; linked reference material retains its original terms.

Maintained source: src/network-flow.mjs, src/network-flow-ui.mjs, this guide, the course JSON and the explorer template.

    node tools/build-network-flow.mjs
    node tools/build-network-flow.mjs --check
    node --test tests/network-flow.test.mjs

The first command rebuilds the direct-open page. The second verifies exact source parity. The third runs maintained mathematical/content/parity checks. Browser receiving is a separate real-browser check, and content or software checks do not establish learning efficacy.
