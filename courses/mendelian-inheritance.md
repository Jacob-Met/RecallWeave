# Inheritance: from gametes to probabilities

A twelve-question original RecallWeave course and a direct-open cross explorer.

The lesson asks a learner to connect three representations: the alleles a parent can transmit, the fertilization routes that make an offspring genotype, and the phenotype categories that can group several genotypes. It is introductory practice, not a validated assessment or a prediction about a real organism.

## Use the course and lab

Open [the lab](mendelian-inheritance-lab.html) directly in a current browser. Choose the number of loci and the two parental genotypes, then select **Explore this cross**. Selecting a different parent or preset retires the displayed result until the cross is explored again.

Select a fertilization cell with a pointer or keyboard to inspect the two contributions. The route detail lists every cell that reaches that genotype. Compare the genotype and phenotype summaries: both account for the same probability mass, but they group cells differently.

**Save this cross (.json)** downloads the current computed result, including exact numerator/denominator pairs, distinct parental routes and the model assumptions. The file is a worked record, not a new lesson or a saved learner session. **Download the course (.json)** saves the exact checked [course file](mendelian-inheritance.json).

To study it, open the repository's [standalone learner](../demo.html), choose the course file, read the preview and select **Start this deck**. Begin the lesson. After the first session, use the existing review, separate missed-question practice and written-reflection fields; download study notes to retain that work. Starting another lesson or reloading follows the learner's existing local-session rules.

The generated lab is a self-contained file: it needs no network service, browser storage or additional JavaScript file. Its links to the learner and this guide work when it remains in the repository's `courses/` directory. The lab does not open or replace a learner session automatically.

## Definitions and assumptions

A **genotype** records the allele variants at the locus or loci being considered; a **phenotype** is an observable trait. A phenotype may depend on more than this small genetic model, including environmental factors. [R4, R5]

This lesson uses hypothetical diploid plants with autosomal loci. At the A locus, AA and aa are homozygous, while Aa is heterozygous. A gamete carries one allele at each locus. Equal segregation gives an Aa parent's A and a alternatives equal probabilities. [R1, R3]

The explorer's phenotype mapping is **complete dominance**: AA and Aa belong to the A-dominant category, written A_; aa belongs to the recessive category. B_ has the corresponding meaning at the B locus. Dominant does not mean stronger, more common or more likely to be transmitted. A different trait can map these same genotypes to different phenotype categories. [R2]

For two-locus crosses, the explorer explicitly assumes **independent assortment**. Each gamete combines one A-locus allele with one B-locus allele independently. Random fertilization then multiplies the two parents' gamete probabilities. These assumptions do not represent every linked-locus distribution. [R1]

There is no mutation, abnormal segregation, gamete selection, nonrandom pairing, interaction between the two phenotype mappings, environmental effect or differential survival in the calculation. Fractions describe probabilities of zygote outcomes, not guaranteed counts in a finite group of seeds. The seed positions in question 9 are independent hypothetical outcomes; no survival selection is applied.

The course also asks what changes when assumptions do not hold. Question6 deliberately uses a different phenotype mapping. Question12 supplies unequal two-locus gamete weights, which this explorer cannot represent exactly.

## Work through a cross

For **Aa × Aa**, parent 1 can contribute A or a and parent 2 can contribute A or a. There are four equally likely routes:

| Parent1 | Parent2 | Genotype | Probability |
|---|---|---|---|
| A | A | AA | 1/4 |
| A | a | Aa | 1/4 |
| a | A | Aa | 1/4 |
| a | a | aa | 1/4 |

Adding routes gives AA: 1/4, Aa: 1/2 and aa: 1/4. Applying complete dominance groups AA and Aa into A_: 3/4, leaving aa: 1/4. The different summaries do not describe different offspring; they group the same routes by different properties.

For the asymmetric **AABb × Aabb** cross, parent 1 gametes are AB and Ab, each 1/2; parent 2 gametes are Ab and ab, each 1/2. The four equally likely genotypes are AABb, AaBb, AAbb and Aabb. All have the A-dominant phenotype; the two with bb have total probability 1/2. The 9:3:3:1 ratio of AaBb × AaBb should not be substituted for a calculation of this different cross.

## Worked answers, distractors and transfers

The letters below refer to the canonical order in the JSON file. RecallWeave can shuffle the displayed options; use the answer text and reasoning when reviewing a learner's display.

### 1. mi-segregation-1

**Question:** A hypothetical diploid plant has genotype Aa at one autosomal locus. With normal segregation and no mutation, which allele content can a gamete carry at this locus?

**Answer: A — One allele: either A or a**

A gamete has one allele at this locus. The two alternatives are A and a; haploid does not mean that the locus disappears. Dominance does not decide which allele enters a gamete. [R1, R3]

| Other option | Why it does not answer this question |
|---|---|
| B. Both A and a together | A gamete does not keep both homologous allele copies at this locus. |
| C. Only A, because A is dominant | Dominance does not force A-only transmission. |
| D. Neither allele, because the gamete is haploid | Haploidy means one chromosome set, not an absent locus. |

**Transfer prompt:** Replace Aa with AA. What changes about the possible gamete alleles, and what stays the same about the number of alleles per gamete?

**Worked transfer:** AA supplies only A, with probability 1. Each gamete still carries one allele at this locus; the two identical parental copies do not travel together in this model.

### 2. mi-segregation-2

**Question:** Assume equal segregation in an Aa plant. What is the probability that a randomly chosen gamete carries a?

**Answer: C — 1/2**

The two allele alternatives have equal probability, so P(a) = 1/2. This describes the model for a random gamete; it does not require every small collected sample to contain equal counts. [R1]

| Other option | Why it does not answer this question |
|---|---|
| A. 0 | Zero would require no a contribution, contrary to Aa and equal segregation. |
| B. 1/4 | 1/4 is the probability of one specified two-parent route in Aa × Aa, not one parental allele choice. |
| D. 1 | One would fit an aa parent, not Aa under equal segregation. |

**Transfer prompt:** If a source pool contains only gametes from an aa plant, what is P(a)? Explain why the plant's two a copies do not give a gamete two alleles.

**Worked transfer:** For aa, P(a) = 1. Either parental copy has the same allele label a, but a gamete receives only one copy at this locus.

### 3. mi-segregation-3

**Question:** A learner claims: “Because A is dominant, an a allele in an Aa plant turns into A when gametes form.” Which correction fits the model?

**Answer: B — Dominance describes the Aa phenotype; either allele can be transmitted without changing into the other.**

The claim confuses expression with transmission. Under this model, an Aa plant transmits A or a; the allele symbol is not rewritten by dominance. A dominant phenotype in the parent therefore does not imply A-only gametes. [R1, R2]

| Other option | Why it does not answer this question |
|---|---|
| A. Dominance makes only the a allele enter gametes. | This reverses the unsupported claim; dominance does not choose gametes. |
| C. The two alleles blend into an intermediate allele in every gamete. | A new blended allele is not part of the stated inheritance model. |
| D. Both alleles must remain together so the dominant one can act. | Keeping both allele copies would describe a diploid contribution at the locus, not these gametes. |

**Transfer prompt:** How could an Aa plant show the dominant phenotype yet contribute a to an aa offspring? Name the contribution needed from the other parent.

**Worked transfer:** The Aa parent supplies a; the other parent must also supply a. An Aa or aa partner could supply that allele. The parent's phenotype does not erase the transmitted a.

### 4. mi-phenotype-1

**Question:** In a hypothetical plant trait with complete dominance of A over a, which genotypes share the A-dominant phenotype?

**Answer: D — AA and Aa**

Complete dominance maps both AA and Aa to the A-dominant phenotype; aa maps to the recessive phenotype. These are still three distinct genotypes. The explorer uses this specified mapping, not a rule that applies to every trait. [R2, R4, R5]

| Other option | Why it does not answer this question |
|---|---|
| A. AA and aa | AA and aa differ under the stated phenotype mapping. |
| B. Aa and aa | Aa shares the phenotype of AA, not aa, under complete dominance. |
| C. All three genotypes must have different phenotypes | Three genotypes need not create three phenotypes; the question specifies complete dominance. |

**Transfer prompt:** Could two plants with the same phenotype produce different gamete types at this locus? Give their possible genotypes.

**Worked transfer:** AA and Aa can share the A-dominant phenotype. AA supplies only A; Aa supplies A or a. A phenotype label can therefore hide different transmission possibilities.

### 5. mi-phenotype-2

**Question:** A plant has the A-dominant phenotype under complete dominance. No parental or offspring information is available. Which genotype conclusion is justified?

**Answer: B — It could be AA or Aa.**

The observed phenotype is compatible with both AA and Aa. One observation cannot distinguish two genotypes that this model maps to the same phenotype. Recessive aa would instead have the recessive phenotype. [R2, R4, R5]

| Other option | Why it does not answer this question |
|---|---|
| A. It must be AA. | AA is possible but not established by this phenotype alone. |
| C. It must be Aa. | Aa is possible but not established by this phenotype alone. |
| D. It must be aa. | aa has the recessive phenotype under the stated mapping. |

**Transfer prompt:** Propose a cross partner that could reveal whether this plant can transmit a. What observation would be decisive, and what observation would leave uncertainty?

**Worked transfer:** Cross with aa. An aa offspring establishes that the unknown parent supplied a, so it is Aa under the stated alternatives and no-mutation assumption. Only dominant offspring in a finite sample leave both AA and Aa possible; computing a posterior probability would need prior information as well as a sampling model.

### 6. mi-phenotype-3

**Question:** Consider a different trait in which AA, Aa and aa have three distinguishable phenotypes. Equal segregation and random fertilization still hold. An Aa × Aa cross has genotype probabilities 1/4 AA, 1/2 Aa and 1/4 aa. What follows?

**Answer: A — The genotype probabilities can stay the same while the phenotypes form three categories with probabilities 1/4, 1/2 and 1/4.**

The stated genotype distribution already follows from the gamete combinations. A different genotype-to-phenotype mapping does not by itself change those combinations. Here all three genotypes are distinguishable, so their probabilities give three phenotype categories. The lab's complete-dominance phenotype display does not represent this trait. [R2]

| Other option | Why it does not answer this question |
|---|---|
| B. Equal segregation must fail because Aa looks different. | A changed phenotype mapping does not logically imply failed segregation. |
| C. All offspring must now have genotype Aa. | The given genotype distribution explicitly includes AA and aa. |
| D. The phenotype probabilities must still be 3/4 dominant and 1/4 recessive. | The question says all three phenotypes are distinguishable, so collapsing AA and Aa into one category is inappropriate. |

**Transfer prompt:** Which part of a cross calculation would you replace for this new trait: the gamete combinations, the phenotype mapping, or both? State what additional evidence could require changing the gamete model too.

**Worked transfer:** Replace the phenotype mapping while retaining the stated gamete probabilities. Evidence of unequal segregation, altered gamete viability, nonrandom fertilization or linkage between relevant loci could additionally require changing a gamete/fertilization model. A phenotype observation by itself does not establish such a change.

### 7. mi-cross-1

**Question:** Under equal segregation and random fertilization, what is P(Aa) for an Aa × Aa cross?

**Answer: C — 1/2**

A from parent 1 with a from parent 2 gives Aa, and a from parent 1 with A from parent 2 also gives Aa. Each route has probability 1/4, so P(Aa) = 1/4 + 1/4 = 1/2. Genotype Aa has two routes even though it is written only once in the summary.

| Other option | Why it does not answer this question |
|---|---|
| A. 1/4 | 1/4 counts only one of the two routes to Aa. |
| B. 3/4 | 3/4 is P(A-dominant), which also includes AA. |
| D. 1 | Aa is not certain; AA and aa each remain possible. |

**Transfer prompt:** In the lab, select each route to Aa. Then explain why listing the three genotype names AA, Aa and aa does not make them equally probable.

**Worked transfer:** The routes are parent-1 A plus parent-2 a, and parent-1 a plus parent-2 A. Each has probability 1/4. Names are not equiprobable units: Aa gathers two of the four equally likely fertilization routes.

### 8. mi-cross-2

**Question:** A plant known to be either AA or Aa is crossed with aa. At least one offspring is aa. Assume the stated parents are correct, inheritance follows this model and there is no mutation. What must the unknown parent be?

**Answer: D — Aa, because it supplied a and AA cannot do so.**

The aa partner supplies a. An aa offspring also needs a from the unknown parent. That parent cannot be AA under the assumptions, so the allowed alternative is Aa. This uses an impossible-versus-possible distinction; it does not require guessing a prior probability.

| Other option | Why it does not answer this question |
|---|---|
| A. AA, because its phenotype was dominant. | A dominant parental phenotype does not supply the needed a allele from AA. |
| B. Either AA or Aa; an AA parent can supply a. | With no mutation, an AA parent cannot supply a. |
| C. aa, because an offspring is aa. | The unknown parent was restricted to AA or Aa; an aa offspring does not make both parents aa. |

**Transfer prompt:** If this cross instead produced only A-dominant offspring in a small sample, would that prove the unknown parent is AA? Explain using a possible Aa route.

**Worked transfer:** No. An Aa × aa cross can produce an A-dominant offspring whenever the Aa parent supplies A. Repeated dominant offspring remain possible from Aa, so an all-dominant finite sample is not a proof of AA. This does not assign a posterior genotype probability without a prior.

### 9. mi-cross-3

**Question:** Two independently formed seeds from Aa × Aa are labeled left and right before their phenotypes are known. Assume complete dominance. What is the probability that the left seed has the A-dominant phenotype AND the right seed has the recessive phenotype?

**Answer: D — 3/16**

One seed has P(A-dominant) = 3/4 and P(recessive) = 1/4. The requested ordered outcome uses both independent events: (3/4) × (1/4) = 3/16. The four gamete routes are probabilities for each fertilization, not a quota that every small group of seeds must meet.

| Other option | Why it does not answer this question |
|---|---|
| A. 3/4 | 3/4 accounts only for the left seed and omits the right-seed requirement. |
| B. 1/4 | 1/4 accounts only for the right seed and omits the left-seed requirement. |
| C. 1/16 | 1/16 would be the probability that both seeds are recessive; the left seed is required to be dominant. |

**Transfer prompt:** What if the question asks for one dominant and one recessive seed in either order? List the two disjoint orders before adding their probabilities.

**Worked transfer:** The disjoint orders are dominant-left/recessive-right and recessive-left/dominant-right. Each has probability 3/16; adding gives 6/16 = 3/8. Independence between the two fertilizations and the preassigned positions are explicit here.

### 10. mi-independent-1

**Question:** An AaBb plant has two independently assorting autosomal loci with equal segregation. Which gamete distribution follows?

**Answer: B — AB, Ab, aB and ab, each with probability 1/4**

A gamete carries one allele from the A locus and one from the B locus. Independent choices give A/B, A/b, a/B and a/b. Each route has probability (1/2) × (1/2) = 1/4. The independence assumption is needed for these four equal probabilities. [R1]

| Other option | Why it does not answer this question |
|---|---|
| A. AB and ab only, each with probability 1/2 | This omits Ab and aB, which are possible under the specified independence assumption. |
| C. Aa and Bb only, each with probability 1/2 | Aa and Bb each include both copies at a single locus and omit the other locus. |
| D. AABB, AaBb and aabb, each with probability 1/3 | These are diploid genotypes, not one-allele-per-locus gametes; their probabilities are also not equal thirds. |

**Transfer prompt:** For AABb, list the possible gametes and their probabilities. Which two choices from AaBb disappear, and why?

**Worked transfer:** AABb gives AB and Ab, each 1/2. aB and ab disappear because the AA locus cannot contribute a. The gamete still carries one allele from each of the two loci.

### 11. mi-independent-2

**Question:** For AABb × Aabb, assume independent assortment, random fertilization and complete dominance at each locus with no interaction between the traits. What is the probability of an offspring with the A-dominant phenotype AND genotype bb?

**Answer: A — 1/2**

At the A locus, AA × Aa always contributes at least one A, so P(A-dominant) = 1. At the B locus, Bb × bb gives bb with probability 1/2. Independence gives 1 × 1/2 = 1/2. For AaBb × AaBb, 9/16 describes A-dominant AND B-dominant offspring; A-dominant AND bb has probability 3/16 in that cross. Neither number answers the given AABb × Aabb cross.

| Other option | Why it does not answer this question |
|---|---|
| B. 1/4 | 1/4 is the probability of either AAbb or Aabb individually; both satisfy the requested phenotype and bb condition. |
| C. 3/4 | 3/4 is a familiar one-locus Aa × Aa dominant probability, but that is not the A-locus cross here. |
| D. 9/16 | 9/16 is P(A_ and B_) for AaBb × AaBb. For that cross, P(A_ and bb) is 3/16. Neither event calculation uses the parents given here. |

**Transfer prompt:** Use the lab to find the two genotypes included in this requested outcome. What is the probability of each, and how do they add to the phenotype probability?

**Worked transfer:** The satisfying genotypes are AAbb and Aabb, each with probability 1/4. They sum to 1/2. All offspring receive A from the AABb parent, but the second parent's A or a distinguishes these two genotypes.

### 12. mi-independent-3

**Question:** A proposed inheritance model assigns an AaBb parent's gamete probabilities as AB = 0.40, ab = 0.40, Ab = 0.10 and aB = 0.10. These are stipulated probabilities, not noisy sample counts. Can the lab's equal-gamete independent-assortment model represent this distribution exactly?

**Answer: C — No; this distribution needs a model with the stated unequal gamete probabilities.**

The four probabilities sum to 1, but they are not the equal 1/4 probabilities assumed for AaBb in this lab. Retaining the names while replacing the weights with 1/4 would answer a different question. Linked loci are one reason independence may be unsuitable; this exercise does not diagnose a mechanism from sample counts. [R1]

| Other option | Why it does not answer this question |
|---|---|
| A. Yes; four possible gamete names always means four equal probabilities. | Possible categories alone do not determine their probability weights. |
| B. Yes; the 9:3:3:1 phenotype ratio applies to every two-locus cross. | 9:3:3:1 is not a universal ratio and does not follow from these unequal weights. |
| D. No; the genotype AaBb is impossible. | AaBb is an ordinary two-locus genotype; the problem is the model's probability assumptions. |

**Transfer prompt:** What information would you need about the other parent's gametes before computing offspring probabilities for this unequal distribution? Explain why a larger Punnett table alone does not supply the missing weights.

**Worked transfer:** Obtain the other parent's possible gametes and their probabilities, and specify how gametes pair during fertilization. Under random pairing, multiply each parental weight for a cell and add cells for a requested outcome. Increasing the number of table cells cannot invent the missing weights; equal-area display alone does not justify equal probability.

## Course structure

| Concept | Questions | Prerequisites |
|---|---|---|
| Alleles and segregation | 1–3 | None |
| Genotype and phenotype | 4–6 | Alleles and segregation |
| One-locus crosses | 7–9 | Alleles and segregation; genotype and phenotype |
| Independent two-locus crosses | 10–12 | One-locus crosses |

These links are native RecallWeave selection hints, not hard lesson gates. The existing illustrative Bayesian model is unchanged. Correctness in this exercise and model estimates should not be interpreted as general biological competence.

## References and original authorship

Scientific definitions and scope were checked on 2026-10-08 against these primary institutional/publisher pages. The numerical crosses, scenarios, questions, distractors, explanations and transfer work above were authored for this course. No source exercise, passage or figure is reproduced.

- **R1:** OpenStax, *Biology 2e*, [12.3 Laws of Inheritance](https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance): segregation, independent assortment and linkage limits.
- **R2:** OpenStax, *Biology 2e*, [12.2 Characteristics and Traits](https://openstax.org/books/biology-2e/pages/12-2-characteristics-and-traits): genotype/phenotype relationships, complete dominance and other mappings.
- **R3:** National Human Genome Research Institute, [Meiosis](https://www.genome.gov/genetics-glossary/Meiosis): reduction to a haploid chromosome set.
- **R4:** National Human Genome Research Institute, [Genotype](https://www.genome.gov/genetics-glossary/genotype).
- **R5:** National Human Genome Research Institute, [Phenotype](https://www.genome.gov/genetics-glossary/Phenotype).

Original course text and questions are offered under **CC0-1.0**. The cited sources retain their own terms. Their institutions do not endorse this course.

## Native maintenance

No package installation is needed for the deterministic model, course or build checks:

```sh
node tools/build-mendelian-inheritance.mjs
node tools/build-mendelian-inheritance.mjs --check
node --test tests/mendelian-inheritance.test.mjs tests/mendelian-inheritance-course.test.mjs
```

The optional browser receiver uses Node 20+, an existing Playwright installation and an installed Chromium-compatible browser. The repository already supports optional Playwright browser tests; this companion does not install a package or change a dependency manifest:

```sh
node tools/check-mendelian-inheritance-browser.mjs --playwright /path/to/playwright/index.mjs --browser /path/to/chromium --output /path/to/fresh-receiving-output
```

If the standard `playwright` package is already resolvable by Node, omit `--playwright`. Omit `--browser` to use that installation's existing Chromium. The receiver operates in a fresh browser context and writes its own screenshots, downloads and receipt. Its learner imports use the actual course file downloaded by the lab. No learner/model/importer or existing course source is changed by this companion.
