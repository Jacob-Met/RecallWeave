# Independent review of the Recall #206 explanation draft

Outcome: no material mathematical or provenance defect found. One minor table-heading clarification is recommended. This review reads exact saved artifacts and the explanation text; it does not qualify new product behavior.

## Immutable intake and review order

The independent saved-output reading was frozen BEFORE exposure to the draft: 8,604 bytes, SHA256 006520def66fd6e6fa9f0644850faee3ac154769fb57b27f9191db3be91d9197.

The exact draft received after root authorized review is 8,183 UTF-8 bytes including final LF, SHA256 d22b954b8106913fdb7762197eec701174f3276b7782e0c0720669e2f31f1e10. Its relayed full text was independently hashed in memory.

The separately bound saved inputs are:
- R1 fair-step3.json: 13,024 bytes / 708ca16c87d292cf9c86a39bf7befed6011579f7694afb462829aa74447a907b.
- R5 study-notes.txt: 8,373 bytes / c040c1de2c46220553c2de8706d656caad64087ed1f0eb817c0b02dece3dc17d.

The review neither replaces these saved bytes nor alters the earlier 8,604-byte reading.

## Mathematical interpretation

The draft explicitly distinguishes selectedStep 3 from input horizon 4 and retained frames 0 through 4. Both probability tables match the saved fraction objects. At step 3, left cumulative absorption 5/8 and right cumulative absorption 1/4 give total 7/8, while only 1/8 newly arrives at the left endpoint. The 0→0 contribution is correctly explained as retained mass. The conditional edge probability and its transferred mass are kept separate.

The expectation table matches every saved truncatedExpectedSteps and expectedExcessSteps field. For step 3, the survival sum 1+1/2+1/4=7/4 is correctly interpreted as E[min(T,3)]. The draft explicitly excludes the conditional mean among paths already stopped. Eventual E[T]=2 is identified as the saved eventual value, not an inference from the truncated table.

The draft correctly interprets 1/4 as unconditional E[(T−3)+]. Its derived conditional remaining time (1/4)/(1/8)=2 is valid and labeled as arithmetic on saved values, not an exported field or producer result. The horizon-4 discussion retains residual survival 1/16, cumulative endpoint values 5/8 and 5/16, and the distinction from eventual 2/3 and 1/3. It does not mistake the expectation for a deadline.

The item-9 wording caveat is preserved without asserting a numerical model defect or editing the course. Explicitly naming the fair 0..3 walk avoids the saved notes' ambiguous cross-reference after the preceding 0..6 example.

## Receiving provenance and learner interpretation

The R1 export and R5 notes are consistently presented as distinct captures. The draft preserves R1's later negative stress result and treats R5 ordinary practice/notes continuation separately. No replacement-success label is applied to R1–R4, and no renderer cause is asserted.

Saved note counts and all six mastery percentages match the exact notes. The draft properly separates 11/12 first answers from one correct practice retry, preserves unwritten reflections, and explicitly rejects an inference about a human learner's weakness or teaching efficacy.

For the claim that the wrong first answer was deliberately scripted, runtime supplied a cached excerpt from hash-verified receive-browser-r5.mjs (8,082 bytes / SHA256 6c6051f479c3ff4b56c4f996384c198fb5dbf91235d54448184cf58af4626b84; Git blob e2d49416272d9fa7c6a520c7ebae6ffd2ac6d2e3). The excerpt selects (answer+1)%options.length only for conditional-step and records choice alongside independentAnswer; the retained receipt records choice 3 versus independentAnswer 2. The later practice click explicitly selects choice 2. This establishes a scripted receiving choice rather than an observed human mistake. I reviewed the supplied exact excerpt and receipt statement; I did not repeat runtime's full archive audit.

Runtime also supplied cached JOINT.md provenance (7,429 bytes / SHA256 cae5c84232cfb03b23e7f8324c14e7f3836e521a64523bae06ce1bae82558f0b; Git blob 237d529c298354009429d1a6ce1cdff5b04eb23a). Its source and limitation statements support the qualified cb12f239 source, receiving-only joint additions, original-companion stress reproduction and separately authorized ordinary continuation. The draft's 194-payload archive audit and permission-normalization statement remain attributed to the separate recovered-custody audit, not newly audited by this review.

## Sole proposed clarification

Change this one existing line:
| Selected observation step h | Saved E[min(T, h)] | Saved E[T] - E[min(T, h)] |

to:
| Observation step h | Saved E[min(T, h)] | Saved E[T] - E[min(T, h)] |

Only step 3 is selected, while this table lists all observation steps. The surrounding draft already makes that distinction correctly; this is a minor reader-clarity improvement, not a numerical finding.

The old line occurs exactly once. This sole replacement yields 8,174 bytes / SHA256 fa969782c64e73727d3111f0acdbea9e225f875889165681e11e89b4206d6563, and the inverse replacement reconstructs the exact 8,183-byte draft. This identity is a proposed text successor only; runtime/root own its publication. No other prose, source or saved-input change is requested.

## Limits

No future explanation was read before the independent reading froze. No native, filesystem, browser, producer, model solver, course loader, source mutation, installed adoption or qualification campaign was performed. Existing #206 content/source owners retain their scope. The review supports delivery of this explanation as a single receiving Markdown artifact; it does not reopen the closed native gates or establish teaching efficacy.
