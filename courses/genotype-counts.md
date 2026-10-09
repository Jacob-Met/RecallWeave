# Genotype counts: observations, allele copies and model expectations

This original fourteen-question RecallWeave lesson starts from recorded genotypes and asks which conclusions follow by counting, which require a model, and which the available information cannot establish. All plants and count tables are hypothetical.

## Use the finished material

- Open `demo.html`, choose `courses/genotype-counts.json` under **Bring your own lesson**, inspect the preview, then select **Start this deck**. Answer the full lesson, inspect the first-answer review, practice missed items separately, and explicitly download study notes.
- Open `courses/genotype-counts-worksheet.html` locally to work through six supplied count tables. It contains questions and writing space, with no embedded answer key or script. Browser Print creates a paper copy or PDF. The worksheet does not read files, accept saved answers or modify a learner session.
- This guide is the separate worked key. Keep it apart from an unanswered worksheet when teaching.

The course file is an ordinary native deck. The existing learner, parser, feedback, selection model, review and download behavior are unchanged. Saving a file does not start the lesson automatically. The material is practice, not a validated assessment or an empirical learning-efficacy result.

## What the numbers mean

At a single autosomal locus in hypothetical diploid plants, AA has two A copies, Aa has one A and one a, and aa has two a copies. The labels alone specify no dominant phenotype. For positive N=nAA+nAa+naa, direct counting gives:

- A copies = 2nAA+nAa; a copies = 2naa+nAa; total copies = 2N.
- p=(2nAA+nAa)/(2N), q=(2naa+nAa)/(2N).
- Observed genotype fractions = nAA/N, nAa/N, naa/N.

These are descriptions of the stated count table, without an equilibrium assumption. [R1]

Now make a separate assumption: draw two gametes independently from pools with the same fractions p and q, with ordinary segregation/equal contribution and no change in those stipulated pool fractions. The four ordered routes have probabilities p², pq, qp and q². The two middle routes both produce Aa, so the three genotype probabilities are p², 2pq and q². This derivation uses multiplication for independent draws and addition for disjoint routes. A model cohort of size M has expected counts Mp², 2Mpq and Mq².

Those expected counts can be fractional. They are not physical fractional plants, a quota to enforce, or replacements for the observed counts. Do not round them and label the rounded result an observed table. Even when M=N, the record and the model answer different questions.

For N=0, both observed allele fractions involve division by zero. They cannot be derived from that table. One could separately stipulate gamete probabilities, but that would add information the empty table does not contain.

## One union calculation versus persistence

The random-union calculation produces genotype probabilities from supplied allele-pool fractions. Persistence across generations is a stronger ideal Hardy–Weinberg model: random mating, no mutation or migration or selection, and no finite-population drift, along with the stated diploid/autosomal assumptions. These conditions are a teaching model rather than an assertion about the hypothetical count tables. [R1, R2]

Two groups can have the same allele fractions and very different genotype pairings. A count difference from model expectations does not identify its cause. Conversely, an exact match does not prove the model's biological assumptions. Actual inference additionally depends on observation and sampling processes and a suitable statistical procedure; this lesson provides no significance test, p-value, mechanism diagnosis, genotyping-quality decision or clinical interpretation. The distinction between a discrepancy and a calibrated statistical test is substantive; the cited primary paper discusses problems with some commonly used tests. [R3]

## Worksheet solutions

Every row below retains the original observed counts. Expected counts use M=N where N>0 and the stipulated same-pool independent-union model.

| Group | Observed AA, Aa, aa | N | A copies, a copies | p, q |
|---|---|---:|---|---|
| G1 | 7, 6, 3 | 16 | 20, 12 | 5/8, 3/8 |
| G2 | 0, 9, 0 | 9 | 9, 9 | 1/2, 1/2 |
| G3 | 5, 0, 5 | 10 | 10, 10 | 1/2, 1/2 |
| G4 | 0, 10, 0 | 10 | 10, 10 | 1/2, 1/2 |
| G5 | 8, 0, 0 | 8 | 16, 0 | 1, 0 |
| G6 | 0, 0, 0 | 0 | 0, 0 | Undefined from the table |

| Group | Observed genotype fractions AA, Aa, aa | Model genotype probabilities AA, Aa, aa | Model expected counts AA, Aa, aa |
|---|---|---|---|
| G1 | 7/16, 3/8, 3/16 | 25/64, 15/32, 9/64 | 25/4, 15/2, 9/4 |
| G2 | 0, 1, 0 | 1/4, 1/2, 1/4 | 9/4, 9/2, 9/4 |
| G3 | 1/2, 0, 1/2 | 1/4, 1/2, 1/4 | 5/2, 5, 5/2 |
| G4 | 0, 1, 0 | 1/4, 1/2, 1/4 | 5/2, 5, 5/2 |
| G5 | 1, 0, 0 | 1, 0, 0 | 8, 0, 0 |
| G6 | Undefined from the table | No p or q derived from these counts | No model expectation derived from these counts |

### G1: keep each denominator visible

The A-copy numerator is 2×7+6=20; the denominator is 2×16=32. Thus p=5/8, not 7/16. The latter is the observed AA fraction. For the model, 2pq=2×(5/8)×(3/8)=30/64=15/32. Its expected Aa count for M=16 is 16×15/32=15/2, while the observed Aa count remains 6.

### G2: an odd-sized group

Nine heterozygotes contain nine A copies and nine a copies. The model expectations sum exactly: 9/4+9/2+9/4=9. The observed table contains nine whole Aa plants; the expectation 9/2 does not alter that record.

### G3 and G4: same alleles, different pairing

Both groups contain ten copies of each allele. G3 pairs equal labels within each plant; G4 pairs unlike labels. Their shared allele fractions lead to the same model probabilities, even though the observed Aa fractions are 0 and 1. This comparison establishes the loss of pairing information when moving from genotype counts to allele totals. It does not identify how either group formed.

### G5 and G6: a boundary is not an empty denominator

G5 has a real positive denominator: 16 copies, all A. Its p=1 and q=0 are well defined. G6 has no copies; neither p=0 nor p=1 nor p=1/2 can be obtained from 0/0. The empty count table alone does not specify a gamete pool.

### Scaling extension

Doubling G1 yields observed (14,12,6), N=32, and allele copies (40,24). The observed fractions, p, q and model probabilities remain unchanged. Expected counts for M=32 are (25/2,15,9/2), exactly twice the M=16 expectations. No inference about a real time transition follows from making a doubled teaching table.

## Worked lesson answers and transfers

The letters below use the JSON file's canonical option order. RecallWeave may shuffle displayed options; match answer text and item ID when reading a learner's screen.

### 1. gc-account-1

**Question:** Ten hypothetical diploid plants have counts AA=3, Aa=4 and aa=3 at one autosomal locus. How many A copies and how many total allele copies are recorded?

A. 7 A copies out of 10 total copies
B. 10 A copies out of 20 total copies
C. 6 A copies out of 20 total copies
D. 14 A copies out of 20 total copies

**Answer: B — 10 A copies out of 20 total copies**

Each AA plant contributes two A copies, each Aa contributes one, and each aa contributes none. The A count is 2×3+4=10. Ten diploid plants contribute 2×10=20 copies at this locus. Counting plants that carry A would answer a different question.

**Transfer:** Change the counts to AA=2, Aa=5 and aa=3. Calculate the A-copy count, the a-copy count and both allele fractions.

**Worked response:** The new counts total 10 plants. A copies=2×2+5=9; a copies=2×3+5=11. The allele fractions are p=9/20 and q=11/20; their sum is one.

### 2. gc-account-2

**Question:** Group G1 has observed counts AA=7, Aa=6 and aa=3. What is its observed A allele fraction p?

A. 7/16
B. 13/16
C. 7/8
D. 5/8

**Answer: D — 5/8**

There are N=16 plants and 32 allele copies. AA contributes 14 A copies and Aa contributes 6, so p=20/32=5/8. The observed AA genotype fraction is 7/16; it is not the same quantity as p.

**Transfer:** Calculate G1's a allele fraction directly from the a-copy count. Then check p+q without replacing either count with a model expectation.

**Worked response:** G1 has a copies=2×3+6=12, so q=12/32=3/8. Thus p+q=5/8+3/8=1.

### 3. gc-account-3

**Question:** A table contains reliable AA, Aa and aa counts for a complete, nonempty hypothetical diploid group at one autosomal locus. Which calculation needs no assumption of random mating or Hardy–Weinberg equilibrium?

A. Count A copies and divide by the total allele-copy count.
B. Set the observed AA fraction equal to the square of p.
C. Replace the observed Aa count with the model's 2pq count.
D. Infer an unknown genotype from its dominant phenotype.

**Answer: A — Count A copies and divide by the total allele-copy count.**

Allele-copy accounting uses the recorded genotypes alone: p=(2nAA+nAa)/(2N), for N>0. Squared genotype probabilities require a separate gamete-union model. A phenotype also need not identify a genotype. The allele labels A and a do not themselves assert dominance.

**Transfer:** Give two different nonempty AA/Aa/aa count tables with p=1/2. Explain why the same p need not mean the same observed genotype fractions.

**Worked response:** One example is (AA,Aa,aa)=(5,0,5); another is (0,10,0). Each has 10 A copies among 20 total copies, but their genotype pairing is entirely different.

### 4. gc-union-1

**Question:** Two gametes are drawn independently from pools that each have A fraction 3/4 and a fraction 1/4. Under this stipulated model, what is the probability that their union has genotype Aa?

A. 1/16
B. 3/16
C. 3/8
D. 9/16

**Answer: C — 3/8**

Aa has two disjoint routes: A from the first pool and a from the second, or a from the first and A from the second. Each route has probability (3/4)(1/4)=3/16. Their sum is 6/16=3/8. Counting only one route loses half the Aa probability.

**Transfer:** List all four ordered gamete routes for p=2/3 and q=1/3, then combine the two routes that produce Aa.

**Worked response:** The ordered routes are A/A:4/9, A/a:2/9, a/A:2/9 and a/a:1/9. Combining the middle routes gives P(Aa)=4/9. All routes sum to one.

### 5. gc-union-2

**Question:** For independent gamete union from two pools with the same A fraction p, which listed value of p gives the greatest Aa probability 2p(1−p)?

A. p=0
B. p=1/2
C. p=1/4
D. p=1

**Answer: B — p=1/2**

The listed Aa probabilities are 0, 1/2, 3/8 and 0, respectively. More generally, 2p(1−p)=1/2−2(p−1/2)², so the model's heterozygote probability cannot exceed 1/2. An observed group can still contain more than half heterozygotes.

**Transfer:** An observed group consists entirely of Aa plants. Does the bound on model probability make that count table impossible? Distinguish an observation from the model's expectation.

**Worked response:** No. An observed all-Aa group is a valid genotype count table. The bound concerns the expected Aa probability under this particular independent-union model. It does not cap the possible observed fraction in every finite realization or in groups formed under other assumptions.

### 6. gc-union-3

**Question:** G1 has p=5/8 and q=3/8. For a model cohort of 16 independently formed zygotes using those same pool fractions, which expected AA/Aa/aa counts follow?

A. 25/4, 15/2, 9/4
B. 7, 6, 3
C. 25/64, 15/32, 9/64
D. 6, 8, 2

**Answer: A — 25/4, 15/2, 9/4**

The probabilities are 25/64, 2×(5/8)×(3/8)=15/32, and 9/64. Multiplying each by 16 gives 25/4, 15/2 and 9/4. They sum to 16. Expected counts need not be integers and should not be rounded into an invented observed table.

**Transfer:** Use the same pool fractions for a cohort size of 32. Find the three expected counts and explain which quantities changed and which did not.

**Worked response:** The probabilities remain (25/64,15/32,9/64). Multiplication by 32 gives expected counts (25/2,15,9/2), totaling 32. Pool fractions and model probabilities are unchanged; expected counts double.

### 7. gc-union-4

**Question:** Group G5 has counts AA=8, Aa=0 and aa=0. Suppose both gamete pools keep exactly the allele fractions calculated from this group, with no mutation or other change. Which AA/Aa/aa probabilities follow under independent union?

A. 1/4, 1/2, 1/4
B. 1/2, 1/2, 0
C. 0, 1, 0
D. 1, 0, 0

**Answer: D — 1, 0, 0**

G5 has p=1 and q=0. Both gametes therefore carry A with probability one, producing AA. This conclusion comes from the stipulated pool and no-change assumptions, not from A being a dominant or superior allele.

**Transfer:** Reverse the boundary: use a nonempty group containing only aa plants. State p, q and the three model probabilities.

**Worked response:** For a nonempty all-aa group, p=0 and q=1. Independent union gives (P(AA),P(Aa),P(aa))=(0,0,1).

### 8. gc-compare-1

**Question:** G3 has counts (AA,Aa,aa)=(5,0,5); G4 has (0,10,0). What is the correct comparison?

A. Both groups have the same observed genotype fractions.
B. G3 has more A allele copies because it contains AA plants.
C. Both have p=1/2, but their observed genotype fractions differ.
D. G4 has p=1 because every plant carries an A allele.

**Answer: C — Both have p=1/2, but their observed genotype fractions differ.**

Each group has 10 plants, 20 total copies and 10 A copies. Both therefore have p=q=1/2. G3's observed fractions are (1/2,0,1/2), while G4's are (0,1,0). The shared independent-union model has probabilities (1/4,1/2,1/4) for either pool.

**Transfer:** Derive the observed Aa fraction and model Aa probability for each group. Explain why pooling allele copies discards some information about their pairing.

**Worked response:** G3 has observed Aa fraction 0/10=0. G4 has observed Aa fraction 10/10=1. Both yield model P(Aa)=1/2. Allele totals record how many copies carry each label, not how those copies were paired within the recorded plants.

### 9. gc-compare-2

**Question:** A second recorded group doubles every G1 count from (7,6,3) to (14,12,6). The same independent-union rule is applied, using each group's own size as its model cohort size. What changes?

A. Allele fractions stay the same; expected counts double.
B. Allele fractions double; expected genotype fractions stay fixed.
C. Allele fractions stay fixed; expected counts stay fixed too.
D. The Aa probability doubles because twice as many Aa were seen.

**Answer: A — Allele fractions stay the same; expected counts double.**

Both copy numerators and the total copy denominator double, leaving p=5/8 and q=3/8 unchanged. Model probabilities also remain unchanged. The model cohort size doubles from 16 to 32, so every expected count doubles. Observed counts and expected counts are still separate.

**Transfer:** Write the fraction cancellation showing why multiplying all nonzero group counts by the same positive whole number leaves p unchanged.

**Worked response:** If all three counts are multiplied by a positive whole number k, then p'=(2knAA+knAa)/(2kN)=k(2nAA+nAa)/(k·2N)=p. This assumes N>0 and k>0; scaling an empty table does not create a denominator.

### 10. gc-compare-3

**Question:** G6 has counts AA=0, Aa=0 and aa=0. What can be calculated from this table alone?

A. p=q=0, so the three genotype probabilities are all zero.
B. p=q=1/2, because neither allele is more frequent.
C. p=1, because A is written before a in the table.
D. Zero allele copies; the observed fractions cannot be defined.

**Answer: D — Zero allele copies; the observed fractions cannot be defined.**

The table records zero plants and zero allele copies. Computing an observed fraction would divide zero by zero, so p, q and the observed genotype fractions are undefined. No gamete-pool probabilities can be derived from these counts alone. Separately supplied model probabilities would be additional information.

**Transfer:** Contrast G6 with a group of one Aa plant. Count its copies and calculate its observed fractions without treating the small group as empty.

**Worked response:** One Aa plant has two copies: one A and one a. Thus p=q=1/2. Its observed genotype fractions are (0,1,0). These are defined despite the small size; the empty table has no copies at all.

### 11. gc-compare-4

**Question:** G2 has nine Aa plants and no other genotypes, giving p=q=1/2. A model cohort of nine uses independent union from those pool fractions. Its expected Aa count is 9/2. How should 9/2 be interpreted?

A. A realized cohort must contain exactly four Aa plants.
B. It is an expected count, not a required realized integer count.
C. Half of one zygote has genotype Aa and the rest does not.
D. The model is invalid because expected counts must be integers.

**Answer: B — It is an expected count, not a required realized integer count.**

Expected counts are averages defined by the model. Here 9×(1/2)=9/2. Each realized cohort has an integer Aa count, but the model expectation can be fractional. The original observed count is nine and must remain recorded as nine; it is not replaced by 9/2.

**Transfer:** Find the expected AA and aa counts for this model cohort, keep exact fractions, and check that all three expectations sum to nine.

**Worked response:** The expectations are 9/4 AA, 9/2 Aa and 9/4 aa. Their sum is 9/4+18/4+9/4=36/4=9. Do not round the components and call the result an observed cohort.

### 12. gc-limits-1

**Question:** An observed genotype table differs from the expected counts calculated under a stated independent-union model. No sampling design or other biological evidence is supplied. What follows from that comparison alone?

A. It proves natural selection favored one allele.
B. It proves the genotypes were recorded incorrectly.
C. It records a discrepancy, but does not identify its cause.
D. It proves a new allele entered the population.

**Answer: C — It records a discrepancy, but does not identify its cause.**

The comparison shows how the counts and the chosen model differ. Finite realization, the sampling process, different model assumptions and other factors can matter; the table alone does not identify a cause. This lesson supplies neither a significance test nor a biological diagnosis.

**Transfer:** Name one additional kind of information you would request before interpreting a real discrepancy, and explain why the count table does not supply it.

**Worked response:** Examples include how the plants were sampled, whether genotype calls were checked, or what mating and gamete-contribution process is being proposed. The counts do not contain those procedures. A request for such information is not a finding that any particular process caused the discrepancy.

### 13. gc-limits-2

**Question:** A group has counts AA=2, Aa=4 and aa=2. These observed fractions equal the independent-union probabilities calculated from p=q=1/2. What does this exact numerical agreement establish?

A. There has been no mutation in this group or its ancestors.
B. Every mating was random and every genotype had equal survival.
C. The next finite cohort must contain exactly the same counts.
D. This table matches those model proportions; the assumptions are not proved.

**Answer: D — This table matches those model proportions; the assumptions are not proved.**

The observed fractions are (1/4,1/2,1/4), matching the chosen model. An agreement of outputs does not prove the biological history, mating process or absence of mutation, migration, selection and drift. It also does not fix the counts of a future finite cohort.

**Transfer:** Construct another count table of a different positive size with the same observed fractions. State what the numerical match still cannot tell you.

**Worked response:** The counts (1,2,1), total 4, have the same observed fractions (1/4,1/2,1/4). The match still does not establish a mating history, rule out mutation/migration/selection/drift, or guarantee the next finite cohort.

### 14. gc-limits-3

**Question:** Which statement correctly separates one random-union calculation from a persistent Hardy–Weinberg model across generations?

A. One union calculation stipulates pool probabilities; persistence needs additional generational assumptions.
B. One union calculation proves every later generation has exactly the same integer genotype counts.
C. Independent union alone eliminates mutation, migration, selection and drift in real populations.
D. The formulas apply only when A is dominant and more frequent than a.

**Answer: A — One union calculation stipulates pool probabilities; persistence needs additional generational assumptions.**

The union calculation starts with stated p and q and independent gamete contributions. Maintaining allele and genotype frequencies across generations requires the ideal model's further assumptions, including no mutation, migration or selection and no finite-population drift. Dominance is not a prerequisite for the allele-count algebra or these genotype probabilities.

**Transfer:** Show algebraically that the model's expected A fraction is p²+pq=p. Explain why that identity is not a promise that every finite next generation realizes exactly p.

**Worked response:** In the model, the A fraction among zygote allele copies is P(AA)+(1/2)P(Aa)=p²+(1/2)(2pq)=p²+pq=p(p+q)=p. This is an identity for the model probabilities. Finite reproduction samples outcomes, so exact realized allele fractions need not equal their expectation.

## References and original wording

- **R1:** Mary Ann Clark, Matthew Douglas and Jung Choi, OpenStax, *Biology 2e*, [19.1 Population Evolution](https://openstax.org/books/biology-2e/pages/19-1-population-evolution). Consulted for allele accounting and the ideal Hardy–Weinberg framework; no passage, source exercise or figure is reproduced.
- **R2:** University of California Berkeley, Biology 1B, [Evolution Lecture 4: Hardy–Weinberg, genetic drift, mutation](https://ib.berkeley.edu/courses/bio1b/evolutionspring11/pdfs/MoritzNotes4.pdf). Consulted for assumptions and the distinction between genotype proportions and allele fractions. This lesson uses none of its organism/disease examples or figures.
- **R3:** Janis E. Wigginton, David J. Cutler and Gonçalo R. Abecasis, [A Note on Exact Tests of Hardy–Weinberg Equilibrium](https://csg.sph.umich.edu/abecasis/Exact/abstract.html), *American Journal of Human Genetics* 76 (2005), 887–893, DOI 10.1086/429864. The author's institutional abstract was read as a primary reference for the limits of a raw comparison and the importance of a calibrated test; no test from the paper is implemented here.

References were checked on 2026-10-09. The article's PMC route returned a browser-verification page; the independently available institutional author abstract was used instead. No full-paper reading is claimed. An attempted NHGRI allele-frequency URL did not return usable content and is not cited as support.

The original wording, fictional counts, distractors, worked algebra and worksheet design were authored with Codex AI assistance for RecallWeave and are offered under CC0-1.0. Cited works retain their respective terms. Their authors and institutions do not endorse this course. It is not a medical resource, statistical test, population assessment or claim of biological mastery.

## Maintenance and receiving scope

The only executable product behavior is the unchanged RecallWeave learner. No new model module, package, installation or remote service is required. Run the focused course check with:

```sh
node --test tests/genotype-counts-course.test.mjs
```

That check uses the original native parser and preserves the public exercise inputs. It cannot establish subject accuracy or educational efficacy by itself; the separate independent question/solution reading and actual learner/worksheet receiving address their stated boundaries. The saved-source and actual-browser results will be described in the receiving record, with failures retained rather than replaced by this guide.
