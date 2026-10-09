# Linked genes: same genotype, different gametes

This twelve-question continuation asks a question the original [Mendelian inheritance course](mendelian-inheritance.md) deliberately leaves outside its model: what if the four gamete combinations are not equally likely?

Use the [offline linkage lab](genetic-linkage-lab.html) to compare the two chromosome arrangements of an AaBb parent. Then study the original [course JSON](genetic-linkage.json) in [RecallWeave](../demo.html). Nothing in this continuation changes the earlier lesson or its independent-assortment assumptions.

## Open and study

Keep the repository's relative layout when using these files offline. Open `courses/genetic-linkage-lab.html` directly in a browser with JavaScript enabled. The generated page contains its model, interface and exact course bytes; it does not fetch a service or use browser storage.

1. Choose **AB / ab** or **Ab / aB**, enter a whole recombinant-gamete percentage from 0 through 50, and choose **Apply cross**.
2. Read the homolog arrangement, four gamete rows and offspring genotypes. The aabb tester always supplies ab.
3. Use **Download this cross (.json)** to retain the applied inputs and exact probabilities.
4. Use **Download course (.json)**, open the learner, and choose `genetic-linkage.json`.
5. Inspect the twelve-question preview, then choose **Start this deck**. File selection and preview do not replace the current lesson; explicitly starting the deck does.
6. After the lesson, inspect the review, try a practice round for missed connections, and download study notes. Practice is distinct from the original first-attempt record.

The downloaded observation is not a course. It cannot be imported into the deck picker. The course download is always the original lesson, regardless of the cross currently on screen.

The main learner link requires the unchanged `demo.html` one directory above `courses/`. Scientific references below are external websites; they are not required for the lab to calculate.

## What AaBb leaves unspecified

AaBb tells us that the parent has one A and one a allele, and one B and one b allele. It does not describe which combinations occupy the homologs:

| Phase | Homologs | Parental gamete classes | Recombinant classes |
|---|---|---|---|
| Coupling | AB / ab | AB, ab | Ab, aB |
| Repulsion | Ab / aB | Ab, aB | AB, ab |

The lab's homolog display is an arrangement schematic. It has no physical positions or distance scale.

For this deliberately small model, let `r` be the entered percentage of recombinant gametes. Each parental class gets `(100 − r) / 200`; each recombinant class gets `r / 200`. Fractions are reduced exactly. Zero-probability rows remain visible.

For coupling with 20% recombination, the parental total is 80% and the recombinant total is 20%. AB and ab each have probability 2/5; Ab and aB each have probability 1/10. Switching to repulsion preserves the genotype and category totals, but switches which combinations receive those probabilities.

An allele's marginal probability adds every row carrying that allele. In both phases, A, a, B and b each have probability 1/2. Unequal joint combinations do not imply unequal single-allele segregation.

## Why use a testcross?

The fixed cross is AaBb × aabb. The tester contributes only ab, so each gamete from the heterozygous parent corresponds to one offspring genotype:

| AaBb parent's contribution | Tester contribution | Offspring genotype |
|---|---|---|
| AB | ab | AaBb |
| Ab | ab | Aabb |
| aB | ab | aaBb |
| ab | ab | aabb |

The offspring probability equals the probability of that first gamete under the stated assumptions. The lab does not calculate phenotypes, infer dominance from allele capitalization, or estimate parameters from an uploaded dataset.

As a second worked example, in a coupling cross at 40%, ab is parental and receives half the 60% parental total. Thus P(aabb) is 3/10. With the same percentage in repulsion, ab is recombinant and receives half the 40% recombinant total, giving P(aabb) = 1/5.

## Interpret the limits before drawing a conclusion

- **Recombination percentage is a gamete fraction.** It is not the number of crossover events. Different events and their products cannot be identified merely by reading this parameter.
- **50% matches a distribution, not a chromosome address.** Both phases give four probabilities of 1/4. That does not distinguish loci on different chromosomes from loci sufficiently separated on the same chromosome.
- **Probabilities are not sample quotas.** A probability of 1/10 gives an expected count of one among ten offspring, but the observed count can differ.
- **A finite observed fraction is an estimate.** In the lesson's 100-observation example, the two smaller classes sum to 20. That supports an observed recombinant fraction of 20/100 under the assumed model; it does not establish an exact underlying probability.
- **This is not a physical map.** No coordinate, gene order, map distance, crossover count or organism-specific prediction is returned.

The hypothetical diploid plants have two autosomal loci. The model assumes equal segregation, equal probabilities within each parental or recombinant pair, no mutation, no segregation distortion, no differential gamete or offspring survival, and no nonrandom fertilization. Those assumptions must be examined before using a similar argument on real data.

## Applied inputs and downloads

The initial form shows coupling and `20`, but nothing is calculated until **Apply cross**. Input accepts only ASCII digits after trimming surrounding whitespace, at most 32 raw UTF-16 code units, representing an integer from 0 through 50. Leading zeros are accepted; blanks, signs, decimal points and exponents are refused.

Any input or change event retires the prior result, including a same-value edit. Downloading also checks the actual raw controls against the applied controls, so an unannounced change cannot export an old cross as current.

`genetic-linkage-observation.json` has format `recallweave-genetic-linkage-observation/1`, the exact applied phase and raw percentage text, and the complete analysis. The analysis includes reduced integer fractions, fixed row order AB/Ab/aB/ab, category totals, allele marginals, assumptions and the independent benchmark. JSON uses two-space indentation and exactly one final line feed, with no timestamp or byte-order mark.

Repeated explicit downloads of an unchanged applied cross have identical bytes. A preparation error leaves a still-current cross available for retry. The page reports that a download was requested; the browser controls final delivery. Reloading clears the applied result. The lab neither saves automatically nor sends inputs elsewhere.

## Native build and verification

With Node.js 20 or newer, no new dependencies are needed for the model, builder or maintained tests:

```sh
node tools/build-genetic-linkage.mjs
node tools/build-genetic-linkage.mjs --check
node --test tests/genetic-linkage.test.mjs tests/genetic-linkage-course.test.mjs
```

The build validates the unchanged native deck schema and embeds the exact raw course bytes. Importing the builder does not write. Its command line accepts only an optional sole `--check`; the check refuses a stale generated page.

The optional browser check uses an already available Playwright installation and Chromium, supplied explicitly through `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE`. It opens the actual generated file, checks the ordinary applied cross and physical downloads, and keeps its evidence in an explicitly selected output directory. It does not install a browser, exercise providers, or qualify all learner workflows.

## Scientific background and reuse

These questions, explanations, examples and interface prose were written originally for RecallWeave. They are not adapted textbook exercises or copied figures.

- [OpenStax, Biology 2e, §13.1: Chromosomal Theory and Genetic Linkage](https://openstax.org/books/biology-2e/pages/13-1-chromosomal-theory-and-genetic-linkage) — linkage, testcross reasoning and limits of recombination fractions.
- [NHGRI: Linkage](https://www.genome.gov/genetics-glossary/Linkage) — inheritance of nearby DNA features.
- [NHGRI: Crossing Over](https://www.genome.gov/genetics-glossary/Crossing-Over) — exchange between homologous chromosomes.
- [NHGRI: Homologous Recombination](https://www.genome.gov/genetics-glossary/homologous-recombination) — the broader process and terminology.

CC0-1.0 applies to this original lesson text and course questions. Referenced materials retain their own terms; the current OpenStax material is not relicensed by this lesson. This educational model makes no claim about learning effectiveness or a particular learner's mastery.
