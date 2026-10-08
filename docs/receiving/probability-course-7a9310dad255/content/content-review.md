# Probability course: independent content review

**Accepted after four targeted wording clarifications.** All twelve answer keys match answers frozen before the key was viewed. Every explanation and transfer response is mathematically correct. Each question has exactly one correct complete option and three incorrect complete options.

Accepted course SHA-256: `17a35b359ab5c1f097931bba29dcf7deddc75c98accbf1cced8ae5eca9e9ad01`. Guide SHA-256: `870ed70b7574c1709a6adfecd0c179fe2382c8dcb6e2a41c4b3a156ba9a88ae4`. The original course `a426bd95…`, blind input projection, and original blind derivations remain preserved separately; their hashes are recorded in `blind-freeze.json`.

## Per-item review

Answer indices below are zero-based source indices. RecallWeave may shuffle display choices, so these are not displayed answer letters. Transfers were checked after the blind answer freeze; their review is not represented as blind.

| Item | Answer | Mathematical check | Transfer and guide check |
| --- | --- | --- | --- |
| pf-s1 | 1: 3/8 | The favorable equally likely outcomes are {6,7,8}; 3 of 8 outcomes qualify. | P(6)+P(7)+P(8). Need the masses of the favorable outcomes, or other information sufficient to determine their sum. Equal labels do not imply equal probabilities. |
| pf-s2 | 3: 73/100 | The two stated categories are exhaustive and disjoint, so P(no rework)=1-27/100=73/100. | 23/25 = 0.92. The literal complement is not missing the deadline. 'Meeting the deadline' is equivalent under the guide's explicit exhaustive two-way interpretation. |
| pf-s3 | 0: 7/10 | The union contains 30+24-12=42 distinct learners; uniform selection gives 42/60=7/10. | 18 learners; probability 3/10. The union has 42 learners, so 60-42=18; alternatively (1-0.70)*60=18. |
| pf-c1 | 2: 1/5 | Conditioning restricts the equally likely sample space to 30 Windows builds, of which 6 failed: 6/30=1/5. | 2/35, approximately 5.71%. Condition on the 70 Linux builds, with 4 failures: 4/70=2/35. This describes uniform selection from the stated finite log. |
| pf-c2 | 0: 3/5 | There are 30 late parcels and 18 of them are priority, so P(priority given late)=18/30=3/5. | 3/10. For late given priority, the joint numerator remains 18 but the conditioning group has 60 parcels: 18/60=3/10. |
| pf-c3 | 1: 1/2 | After the known first red token is removed, 2 red and 2 blue remain. Conditional probability for the second draw is 2/4=1/2. | 3/5. Replacement restores the original three red and two blue tokens. The original uniform-draw condition carries through the counterfactual. |
| pf-i1 | 3: independent | P(A and B)=1/5=(2/5)(1/2)=P(A)P(B). Equivalently P(A given B)=(1/5)/(1/2)=2/5=P(A). | P(A given B)=3/5; dependent. 0.3/0.5=0.6 differs from P(A)=0.4. The changed joint model is feasible: cells 0.3,0.1,0.2,0.4 are nonnegative and sum to one. |
| pf-i2 | 1: dependent | Mutual exclusivity implies P(A and B)=0, whereas P(A)P(B)=0.3*0.2=0.06>0. Since P(B)>0, P(A given B)=0 differs from P(A)=0.3. | Empty overlap; dependent. A={1,2,3}, B={9,10}. Joint probability 0 differs from (3/10)(2/10)=3/50, and P(A given B)=0 differs from 3/10. |
| pf-i3 | 2: 7/25 | Independence gives P(neither)=0.90*0.80=0.72, so P(at least one)=1-0.72=0.28=7/25. Also 0.10+0.20-0.02=0.28. | P(A union B)=0.30-q where q=P(A and B). The joint overlap suffices. Equivalently use P(B given A)*P(A) or P(A given B)*P(B) for q. Independence is not licensed in this counterfactual. |
| pf-b1 | 2: 2/3 | P(B and defective)=0.40*0.06=0.024. Total defective probability is 0.60*0.02+0.40*0.06=0.036. Their ratio is 0.024/0.036=2/3. | 3/4. With equal supplier shares, posterior B=0.5*0.06/(0.5*0.02+0.5*0.06)=0.03/0.04=3/4. |
| pf-b2 | 3: 1/12 | P(defective and flagged)=0.01*0.90=0.009. P(nondeffective and flagged)=0.99*0.10=0.099. The posterior is 0.009/(0.009+0.099)=1/12. | 9/1000 = 0.009. The joint event uses all 1,000 equally weighted model files, whereas the original posterior conditions on the 108 flagged files. |
| pf-b3 | 0: 1/12 -> 1/2 | With prevalence p, the posterior is 0.9p/(0.9p+0.1(1-p))=9p/(1+8p). At p=0.01 this is 1/12; at p=0.10 it is 1/2. Fixed positive flag rates make this increase with p. | 9/10 = 0.90. At prevalence 1/2, posterior=0.45/(0.45+0.05)=0.90. The prior weights both contributions to total flags; conditional rates are unchanged. |

Detailed distractor judgments are retained per item in `blind-answers.json` and `content-review.json`. In pf-i2, the last option begins with the correct classification but attaches a false universal explanation. It is not a second correct complete statement; the revised stem now explicitly requires the correct explanation.

## Assumptions and prerequisite graph

Uniform sampling is explicit in the finite-list questions and now in both relevant Bayes stems. The token question states uniform draws without replacement. The independence criterion is checked in an exact model rather than inferred from rounded data; positive probabilities in the mutually exclusive-events question make its conditional denominator valid. The two-module question explicitly supplies independence. None of the Bayes calculations assumes independence between the cause and the observed event.

The four-concept graph is acyclic, has three items per concept, and has consistent prerequisites across items. Conditional probability depends on sample spaces. Independence and Bayes' rule both use sample spaces and conditional probability. Bayes does not require independence. The guide correctly describes these as conceptual relationships rather than a promise of a fixed presentation order.

The guide's changed-joint model in pf-i1 is feasible. Its 10,000-sensor illustration and 1,000-file table exactly represent the supplied proportions; neither is described as a guaranteed realization of a random sample. Counts, totals, complements and all twelve transfer derivations agree with the deck. The learning-effectiveness limitation is clear.

## Resolved wording

The exact rejected and accepted strings are preserved in `wording-revisions.json`.

- pf-c2 transfer now compares the two conditional probabilities explicitly, replacing the confusing phrase about reversing words after “given.”
- pf-i2 now asks for both the independence classification and its correct explanation.
- pf-b1 now specifies uniform selection from the combined supply.
- pf-b3 now specifies uniform selection from each collection while holding the conditional flagging rates fixed.

Only these four fields changed. All answers, options, explanations, prerequisites, other fields and the guide stayed unchanged. The new wording leaves every frozen mathematical answer intact.

## Source and receiving scope

I opened the two official MIT readings cited by the guide. Reading 2's sections 2–3 cover the finite-event relationships used here. Reading 3's sections 2, 4, 6 and 7 match the stated conditional probability, total-probability, independence and Bayes references. Both identify Jeremy Orloff and Jonathan Bloom. The exact source URLs and checked section names are retained in `content-review.json`.

This accepts the original educational content and its worked guide. Actual importer, shuffled-choice, feedback, completion, first-answer trace and study-note behavior are a separate receiving phase. No app, importer, authoring-module, bundled-biology or trace-archive source was modified for this review.
