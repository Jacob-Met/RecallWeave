# Same rankings, different voting outcomes

Twenty-seven people submit complete rankings of three alternatives. One counting rule selects A, another selects C, and a third selects B. The arithmetic can be correct in all three cases because the rules ask different questions of the same ballots.

This original [sixteen-question course](ranked-voting.json) works in RecallWeave’s existing offline learner. Open `demo.html`, choose the JSON under **Bring your own lesson**, inspect its preview and select **Start this deck**. Answer choices may be shuffled and the learner may choose questions in a different order. Match answers by their meaning. Review the explanations afterward, retry missed questions and explicitly download your study notes to keep them.

The examples are hypothetical classroom data. They are not measurements of an electorate, advice to a campaign, or a recommendation of a voting system. The learner’s estimated mastery is an illustrative model state, not a validated assessment of civic or mathematical competence.

## 1. Specify the ballot and the rule

Each individual submits one **complete strict ranking**: every alternative appears exactly once, with no tied positions. `A > B > C` means that this individual ranks A above B and B above C; it also puts A above C. A row count represents that many individual ballots. It is not one vote per distinct ranking.

Every ballot has equal weight. We use the same rankings in all comparisons. There are no abstentions, missing ranks, exhausted ballots, strategic changes or random tie-breaks in the worked profiles.

The four calculations are:

| Calculation | Precisely what is counted |
| --- | --- |
| Plurality | One point for the first-ranked alternative on each ballot. The largest total leads. |
| Two-round runoff | Choose the top two plurality alternatives, then compare those two using every ballot’s relative order. |
| Borda | Award 2, 1 and 0 points to first, second and third; add points across ballots. |
| Pairwise majority | For each pair, count the ballots placing each alternative above the other. A strict Condorcet winner defeats every opponent. |

These definitions follow the cited university teaching sources.[1][2] The Borda convention here starts at zero. A 3, 2, 1 convention gives the same ordering for complete ballots; Section 4 derives why.

**Ties remain explicit.** Equal plurality or Borda totals are tied totals. A tie for the last runoff-finalist place requires an additional selection rule. A tied head-to-head contest is not a strict victory. This lesson does not silently choose alphabetically or assign a Condorcet winner when none exists. Profile P has no relevant ties; Profile Q contains a Borda tie.

The specified two-round procedure differs from repeated elimination among many alternatives. With three alternatives and an unambiguous weakest first-place count, removing that alternative reaches the same final pair. That three-alternative observation does not identify every multi-round voting procedure with the two-round rule used here.

## 2. The complete main profile

**Profile P** has these four groups:

| Ballots | First | Second | Third |
| ---: | --- | --- | --- |
| 11 | A | B | C |
| 9 | C | B | A |
| 5 | B | C | A |
| 2 | B | A | C |
| **27 total** | | | |

A strict majority of 27 means at least 14: half is 13.5, and counts are whole numbers. The largest first-place total need not reach that threshold.

### Plurality

The first-place totals are `A = 11`, `B = 5 + 2 = 7`, and `C = 9`. A is the unique plurality winner because 11 is the largest total. A does not have a first-place majority.

### Two-round runoff

The two highest first-place counts belong to A and C. Compare only their relative order on each ballot:

| Original group | Supports A | Supports C |
| --- | ---: | ---: |
| 11: A > B > C | 11 | 0 |
| 9: C > B > A | 0 | 9 |
| 5: B > C > A | 0 | 5 |
| 2: B > A > C | 2 | 0 |
| **Total** | **13** | **14** |

C wins the runoff, 14–13. The seven B-first ballots split 5–2 between C and A. Treating those seven as one group would discard the information that determines this one-ballot difference. No ballot is exhausted, because every ballot ranks both finalists.

This differs from comparing only A’s original 11 first places with C’s original 9. A runoff includes the relative preferences of all 27 ballots.

## 3. Borda points on the same ballots

Award 2 points to first place, 1 to second and 0 to third. Keep the output-column order fixed as A, B, C even when a row’s ranking changes.

| Group | Contribution to A | Contribution to B | Contribution to C |
| --- | ---: | ---: | ---: |
| 11: A > B > C | 22 | 11 | 0 |
| 9: C > B > A | 0 | 9 | 18 |
| 5: B > C > A | 0 | 10 | 5 |
| 2: B > A > C | 2 | 4 | 0 |
| **Total** | **24** | **34** | **23** |

B is the unique Borda winner. Each complete ballot contributes `2 + 1 + 0 = 3` points, so the grand total must be `27 × 3 = 81`. The calculated totals satisfy `24 + 34 + 23 = 81`.

This total is a useful error check, but it does not validate each column. Moving a point from one wrong column to another can leave the grand total unchanged.

We now have three distinct results on exactly the same complete rankings:

| Rule on Profile P | Result |
| --- | --- |
| Plurality | A, with 11 first places |
| Top-two runoff | C, with 14 of 27 final preferences |
| Borda, 2/1/0 | B, with 34 of the 81 awarded points |

These totals have different meanings. Fourteen runoff votes and thirty-four Borda points are not quantities that can be compared as if they measured the same unit.

## 4. Two useful Borda identities

### Adding one point at every rank

Suppose each complete ballot uses 3, 2 and 1 points instead. Every alternative receives one extra point on every one of the 27 ballots. Thus the totals become:

`A = 24 + 27 = 51`, `B = 34 + 27 = 61`, `C = 23 + 27 = 50`.

All score differences remain the same. For any two totals, `(S_A + 27) − (S_B + 27) = S_A − S_B`. This preserves both strict ordering and ties. The argument depends on the same constant being added to every alternative’s total; it should not be applied blindly to a different rule for partial ballots.

### Count the alternatives below each candidate

On a complete three-alternative ballot, the alternative in first place has two alternatives below it, second has one and third has none. Those are exactly the 2/1/0 Borda points.

Consequently, an alternative’s score is the sum, over its opponents, of the number of ballots ranking it above that opponent. This is a rearrangement of a finite sum, not an assumption that the alternative wins its head-to-head contests.

For Profile P:

- A is above B on 11 ballots and above C on 13, giving `11 + 13 = 24`.
- B is above A on 16 ballots and above C on 18, giving `16 + 18 = 34`.
- C is above A on 14 ballots and above B on 9, giving `14 + 9 = 23`.

The identities match the direct point table. They also show why counting the *number of pairwise victories* is different from adding the *numbers of ballots supporting each relative order*.

## 5. Compare every pair

Each head-to-head comparison uses all 27 rankings. Its two counts must sum to 27.

| Pair | Ballots preferring the first | Ballots preferring the second | Strict winner |
| --- | ---: | ---: | --- |
| A versus B | 11 | 16 | B |
| A versus C | 13 | 14 | C |
| B versus C | 18 | 9 | B |

B defeats both A and C and is therefore the **Condorcet winner** under the stated strict definition.[2] B has only seven first places. Winning a strict majority in every pairwise contest does not require being ranked first by a majority of all voters.

There is a useful sufficient condition: if an alternative is first on more than half of these complete strict ballots, those same ballots rank it above every opponent. It must then win every head-to-head contest. Profile P shows that the converse need not hold.

The runoff’s winner C is not a Condorcet winner here: C defeats its actual finalist opponent A, but loses to B. The procedure never holds that B-versus-C final contest because B did not qualify from first-place totals.

### Remove an alternative explicitly

In a separate calculation, delete C from every ranking while preserving A and B’s relative order. The nine C > B > A ballots become B > A. The other groups yield 11 A > B and another 7 B > A. Two-alternative plurality therefore gives B 16 and A 11.

The original three-alternative plurality winner was A. This changed result follows from a changed alternative set and explicitly reduced ballots. None of the individuals reversed their A-versus-B preference.

## 6. Consistent individuals can produce a majority cycle

**Profile Q** is a different nine-ballot example:

| Ballots | Ranking |
| ---: | --- |
| 4 | A > B > C |
| 3 | B > C > A |
| 2 | C > A > B |

Its pairwise counts are:

| Pair | Supporting groups | Result |
| --- | --- | --- |
| A over B | First and third: 4 + 2 | A wins 6–3 |
| B over C | First and second: 4 + 3 | B wins 7–2 |
| C over A | Second and third: 3 + 2 | C wins 5–4 |

The majority arrows form `A > B > C > A`. A loses to C, B loses to A and C loses to B. None defeats both opponents, so this profile has no strict Condorcet winner. Each individual ballot remains a consistent strict ranking. Different pairs can be supported by different majorities; there is no single common ranking behind all three aggregate arrows. The named majority-cycle phenomenon is described in the cited MIT notes.[2]

Nine is odd, so none of these complete pairwise contests ties. Odd totals prevent pairwise ties under these assumptions; they do not prevent majority cycles.

This finite example establishes possibility. It supplies no estimate of the frequency of cycles in a population of actual elections, and it does not prove an impossibility theorem about all voting rules.

### Other calculations on Q

Plurality gives A = 4, B = 3 and C = 2, so A leads without a first-place majority. The 2/1/0 Borda totals are A = `8 + 0 + 2 = 10`, B = `4 + 6 + 0 = 10` and C = `0 + 3 + 4 = 7`. A and B tie for the largest Borda score. Report that tie; this lesson supplies no further tie-break.

### Sequential comparisons need a stated order

If the winner of one pairwise contest meets the remaining alternative, the specified order matters for Q:

| First contest | First winner | Second contest | Final survivor |
| --- | --- | --- | --- |
| A versus B | A | A versus C | C |
| A versus C | C | C versus B | B |
| B versus C | B | B versus A | A |

These are three different procedures using the same fixed ballots. A final survivor need not beat the alternative eliminated in the first contest. Reproducing a sequential result requires the comparison order as well as the rankings.

## 7. Reading a reported outcome

Record the alternative set, complete ballot assumptions, group multiplicities, counting rule and treatment of ties. For a runoff, identify its finalists. For a claimed Condorcet winner, inspect every opponent. Keep the units clear: first places, head-to-head preferences and assigned points are different totals.

First-place totals alone cannot recover all lower rankings. For example, P has A = 11, B = 7 and C = 9 first places and C defeats A 14–13. Another profile with those same first totals is 11 A > C > B, 9 C > A > B and 7 B > A > C. There A defeats C 18–9. The first-place report cannot distinguish the two.

The worked results demonstrate differences between specified calculations. Choosing rules for a real institution introduces additional requirements that this arithmetic lesson does not decide.

## 8. Answer and transfer guide

The IDs below identify the questions even when the learner presents them in a different order. Correct displayed letters may change after answer shuffling.

| Question ID | Correct result | A worked transfer response |
| --- | --- | --- |
| rv-profile-count | 16 ballots rank B above A. | A above C: 11 + 2 = 13; C above A: 9 + 5 = 14; sum 27. |
| rv-majority-threshold | At least 14 of 27. | With 28 ballots, a strict majority needs 15; 14 is exactly half. |
| rv-complete-strict | C > A > B. | The six orders are ABC, ACB, BAC, BCA, CAB and CBA; choose one of 3 first alternatives, then one of 2 seconds, then the last. |
| rv-first-counts-insufficient | A is the plurality leader; other outcomes are undetermined. | P and the alternative profile in Section 7 keep first totals fixed but reverse the A-versus-C winner. |
| rv-plurality-finalists | A and C. | A tie for the final place needs an explicit additional policy; without one, finalist selection is unresolved. |
| rv-runoff-transfer | Five support C, two support A. | The first-place count 7 does not distinguish BCA from BAC. |
| rv-runoff-winner | C wins 14–13. | The totals sum to 27 and 14 exceeds half; the original plurality tally omitted the B-first ballots’ later choices. |
| rv-reduced-ballot | B wins 16–11 after C is removed. | Each ballot’s A/B order stays fixed, while some original C-first ballots now give their first place to B. |
| rv-borda-group | The contribution is (22, 11, 0). | Nine CBA ballots contribute (0, 9, 18) in fixed A/B/C order. |
| rv-borda-totals | The totals are (24, 34, 23). | Sum 81 checks total allocation; an offsetting error across columns could still preserve 81. |
| rv-borda-shift | The totals become (51, 61, 50), still led by B. | Adding the same constant cancels when any two totals are subtracted, preserving differences and ties. |
| rv-borda-pair-sum | Points count how many alternatives lie below B on each ballot. | A: 11 + 13 = 24; C: 14 + 9 = 23. |
| rv-condorcet-winner | B defeats A 16–11 and C 18–9. | C defeats A 14–13; this does not change B’s victories over both. |
| rv-cycle-tallies | A>B 6–3, B>C 7–2, C>A 5–4. | The directed majority cycle returns to its start after three arrows. |
| rv-cycle-meaning | No alternative defeats both opponents; each ballot is consistent. | The supporting group pairs differ. An existence example alone gives no prevalence estimate. |
| rv-cycle-agenda | AB first leaves C; AC first leaves B. | BC first leaves B, then A defeats B. Preserve the first-contest choice to reproduce the result. |

## Source, permission and verification

The ballot counts, questions, explanations, tables, finite derivations and transfer solutions in this course are original HAMON contributions. Named rule definitions are grounded in these primary university teaching materials:

1. Carnegie Mellon University, *Voting Methods*, 21-301, 30 April 2018, definitions of plurality, top-two runoff and rank-based points: https://www.math.cmu.edu/~mradclif/teaching/301S18/voting_methods.pdf. Its Borda points start at one; the constant-shift calculation above explains our zero-based equivalent for complete ballots. Its separate completion rule for unresolved pairwise contests is not adopted here.
2. Ben Olken, MIT OpenCourseWare 14.75, *Condorcet’s Paradox and Arrow’s Impossibility Theorem* (2012), strict Condorcet-winner and majority-cycle definitions: https://ocw.mit.edu/courses/14-75-political-economy-and-economic-development-fall-2012/a9fd8e5ab75a325016094e6bbe625b2a_MIT14_75F12_Lec12.pdf. We use the three-alternative definitions and do not restate its broader theorems or empirical discussion.

Original course and guide: **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/. Attribute HAMON contributors for RecallWeave, *Same rankings, different voting outcomes*, 2026. This permission does not relicense the linked source documents.

Run `node --test tests/ranked-voting-course.test.mjs` for the focused finite arithmetic, deck and unchanged-learner checks. The native receiving record accompanies the eventual source publication and binds the exact course, reader and actual downloaded study notes. Nothing in this lesson is automatically stored or submitted.
