# From PCR to sequence evidence: what a DNA result can and cannot tell you

Use this original worked guide with the [20-question RecallWeave lesson](pcr-to-sequence-evidence.json). In the offline learner, choose **Bring your own lesson**, select the JSON file, inspect its preview, and explicitly choose **Start this deck**. The deck and guide address evidence and interpretation, not laboratory instructions, diagnostic decision-making, or clinical validity.

The questions join four ideas: **what amplification does**, **what its mathematical models and controls do not prove**, **what aligned sequencing reads observe**, and **where an inference outruns its evidence**. A correct quiz response alone is not the goal. Explain what observation would distinguish two competing explanations before making a stronger claim.

## One map, four different claims

| Kind of statement | What supports it | What it does *not* independently establish |
| --- | --- | --- |
| Target amplification | An appropriately designed assay response interpreted with valid controls | Exact sequence across a region, independence of original molecules, or viability |
| A modeled copy count | Starting quantity, explicit efficiency assumption and number of cycles | A measured copy count or unchanged late-cycle efficiency |
| Read depth or base fraction | Alignments that survive named filters at a particular reference position | Independent template molecules, unambiguous mapping, or a validated genotype |
| Base-level sequence inference | Position-specific coverage, quality, mapping and relevant confirmatory evidence | Observations at uncovered positions or automatic biological/clinical significance |

These statements are deliberately not interchangeable. A high number in one column cannot rescue missing observations or invalid controls in another.

## 1. Amplification is selective synthesis, not sequencing

The conventional DNA PCR cycle is usually described by **strand separation**, **primer annealing**, and **extension**. The words describe different molecular events. During denaturation, two complementary template strands separate; during annealing, each suitably matched primer can bind a complementary template interval; during extension, DNA polymerase adds nucleotides to the primer's growing **3′ end**, making a new strand in the **5′→3′ direction**.

A primer pair helps define the region to amplify, but the word *helps* matters. Complementarity at an unintended site, unexpected sample material, or an altered primer-binding region can change the outcome. An amplified product's apparent size cannot by itself prove that every base inside it matches an intended sequence. A target-specific sequence observation asks a stronger question than amplification alone.

If the starting target is RNA and the polymerase is DNA-dependent, **reverse transcription** produces complementary DNA first. Calling a target RNA-derived signal positive does not, without additional evidence, show intact infectious material or viable organisms.

**Work through the five mechanism prompts:**

- **pcr-01-strand-separation — Separation:** paired strands hide potential complementary primer-binding surfaces. Separating them makes templates available; the operation does not change DNA into RNA or protein.
- **pcr-02-primer-annealing — Annealing:** a second unintended primer-binding position could lead to multiple amplified products. A specificity evaluation would compare products with the intended sequence or otherwise independently distinguish intended and unintended targets.
- **pcr-03-extension-direction — Direction:** a primer's 3′ end is where polymerase adds the next nucleotide. The template runs antiparallel. For example, a growing strand written 5′-A C G-3′ pairs antiparallel with 3′-T G C-5′; extension continues at the first strand's 3′ end, not at its 5′ end.
- **pcr-04-target-specificity — Specificity:** an expected product size is useful but limited. Independent sequence confirmation or another target-specific check can distinguish an intended target from an unintended product of similar size.
- **pcr-05-rna-bridge — RNA bridge:** observing RNA-derived cDNA answers whether target-associated material was detected within assay limitations; observing living organisms requires evidence of viability. Those are different experiments and different inferences.

## 2. Copy-growth mathematics does not measure a sample

For an **idealized model** that exactly doubles target quantity each cycle,

    N(c) = N₀ × 2^c

Here N₀ is the assumed starting count and c is the integer cycle count. The equation has no information about a physical assay's efficiency, contaminants, controls, or plateau.

| Modeled starting quantity | Cycles | Assumed factor per cycle | Model outcome |
| ---: | ---: | ---: | ---: |
| 1 copy | 5 | 2 | 32 copies |
| 1 copy | 7 | 2 | 128 copies |
| 4 copies | 3 | 2 | 32 copies |
| 8 copies | 3 | 2 | 64 copies |
| 10 units | 2 | 1.8 | 32.4 expected units |

A simplified fixed-efficiency alternative is `N(c) = N₀ × g^c` with a stated multiplier g. With g=1.8 and N₀=10, two cycles give `10 × 1.8² = 32.4`. A fractional *model expectation* need not represent a fractional physical molecule. If comparing ideal and 1.8-fold growth from the same start, the ratio is `(2/1.8)^c`; it grows with the number of cycles. This does **not** show that real samples follow either constant-factor model indefinitely.

Late-cycle reactions may become limited by available reactants or exhibit competing reactions, inhibition and plateau behavior. Therefore extrapolating a late-cycle signal backward by a perfect factor of two is unjustified without a validated quantitative model. Likewise, a **no-template control** with an unexpected amplification signal is a warning to investigate: possible contamination, nonspecific amplification or other assay behavior must be resolved before interpreting the run as reliable. The signal alone does not uniquely identify the failure mechanism.

**Transfer answers for the five growth/control prompts:**

- **pcr-06-ideal-five-cycles:** seven ideal cycles from one modeled copy give `2^7 = 128`.
- **pcr-07-ideal-two-starts:** eight modeled starting copies after three ideal cycles give `8 × 2³ = 64`.
- **pcr-08-less-than-ideal:** the ideal/1.8-fold ratio after c cycles is `(10/9)^c`; it increases as c increases. This is a comparison of assumptions, not a laboratory prediction.
- **pcr-09-plateau:** if efficiency falls with cycle number, late signal is no longer tied to the original amount by simple repeated doubling. Independent calibration and suitable controls would be needed for a quantitative inference.
- **pcr-10-no-template-control:** check the no-template and other relevant controls, product identity, sample handling, assay specificity and reproducibility of an independent confirmation. Do not interpret an anomalous control as though it had passed.

## 3. Coverage describes where data exist, not how many independent molecules exist

At a reference position, **alignment depth** counts read alignments after the stated filtering criteria. If 12 retained alignments overlap it, its reported depth is **12×** by that definition. This does not prove they represent 12 independent starting molecules: amplification or library-preparation steps can produce multiple reads derived from one original template.

A mean can conceal a complete absence of data. For a 100-base region with 50 positions at 20× depth and 50 positions at 0× depth,

    Mean depth = (50 × 20 + 50 × 0) / 100 = 10×

But **half the positions have no coverage**. Compare this with 100 positions each at 10×: the same mean, but no position is unobserved. An output claiming a measured specimen base at an uncovered position would confuse the reference sequence with specimen evidence.

Base quality is another distinct quantity. Under the conventional Phred encoding `Q = −10 log₁₀(p)`, a nominal Q20 base-call error probability is `p = 10^(−20/10) = 0.01`, or 1%; Q30 corresponds to `10^(−3) = 0.001`, or 0.1%. These are probabilities *under the stated model* and are not proofs that individual calls are correct. In repetitive genomic sequence, a short read may fit two locations equally well; without distinguishing information, mapping remains ambiguous. A longer read spanning unique flanking bases can sometimes resolve the location, subject to its own quality and alignment evidence.

**Transfer answers for the five read/coverage prompts:**

- **pcr-11-local-depth:** many duplicated reads could be descendants of one starting molecule. Molecular barcodes or library-level duplicate analysis, when properly available, can help distinguish independently sampled templates.
- **pcr-12-mean-vs-local:** 100 bases at 10× each yield mean 10× with no uncovered bases; the same mean is not evidence of the same completeness.
- **pcr-13-duplicate-reads:** evidence of distinct original molecules, using an appropriate library design such as unique molecular identifiers, would strengthen independence; simply collecting more duplicate alignments may not.
- **pcr-14-phred-q20:** Q30 encodes a nominal `10^−3 = 0.001`, or 0.1%, error probability.
- **pcr-15-ambiguous-mapping:** a longer read reaching unique flanking sequence may distinguish repeat copies; absence of such distinguishing sequence leaves the origin uncertain.

## 4. Inference needs controls, positions and alternatives

Consider three statements: (a) an expected-size PCR product appeared, (b) sequence reads disagree with a chosen reference at one position, and (c) the sample has a particular clinical genotype. They require progressively different evidence. Even statement (a) is weakened by an unexpected no-template-control signal. Statement (b) is limited by quality, alignment, coverage and the selected reference. Neither alone establishes statement (c).

An observed alternate-read fraction is calculated by dividing alternate-supporting alignments by all relevant alignments under the stated filters. **Seven of fourteen is 7/14 = 0.5, or 50%.** It does not, on its own, establish heterozygosity. Amplification bias, allele imbalance, multi-mapping, sequencing noise and copy-number state can also matter. Independent molecule support, base/alignment quality, strand balance, neighboring context and an appropriate validation strategy are possible discriminators; the relevant checks depend on the assay and purpose.

Coordinate systems also matter. A reported position is a position **on a particular reference build and alignment**. Changing the reference can change mappings, coordinates and how a difference is described. The reference itself is not an unobserved sample's ground truth.

**Transfer answers for the five inference prompts:**

- **pcr-16-positive-is-not-proof:** an independent target-specific sequence or confirmatory assay provides a different kind of evidence; repeating only the same signal may reproduce the same systematic issue.
- **pcr-17-absence-of-reads:** mark uncovered specimen bases as **not observed/unknown** (or an equivalent explicit missing-data state), even if a reference letter is displayed beside them.
- **pcr-18-allele-fraction:** check, for example, base and mapping quality plus evidence that reads represent independent molecules; other checks may be necessary for the assay.
- **pcr-19-reference-is-not-ground-truth:** document the exact reference build and alignment method. A different build may change coordinates or even apparent locus assignment, so compare on a common coordinate system before interpreting differences.
- **pcr-20-different-questions:** a minimal useful report separates **target detection**, **control outcomes**, **covered positions and base/variant evidence**, and **unresolved uncertainties**; it does not silently fill gaps with reference bases.

## Before accepting a strong conclusion, challenge it

Ask four questions of any apparent result: **What was actually observed? Which mathematical or biological assumptions connect it to the claim? Which controls and locations are missing? What alternative explanation would produce the same observation?**

Two examples show why this matters. In an ideal model, 32 final copies could arise from one copy across five cycles or four copies across three cycles; knowing only the final model number does not identify the starting condition. In a read pileup, 20 alternate-supporting reads could be 20 independent source molecules or amplification-derived observations from far fewer molecules; raw alignment count alone does not resolve that distinction.

## Reference and rights note

Background references: [NCBI Bookshelf, Polymerase Chain Reaction](https://www.ncbi.nlm.nih.gov/books/NBK589663/); [Cold Spring Harbor Protocols, Polymerase Chain Reaction (2019)](https://cshprotocols.cshlp.org/content/2019/6/pdb.top095109.full); [ACMG/Genetics in Medicine, next-generation sequencing technical standard (2021)](https://www.nature.com/articles/s41436-021-01139-4); [Nature Reviews Genetics, sequencing depth and coverage](https://www.nature.com/articles/nrg3642). The links provide background; they are not copied questions, figures or laboratory procedures. This guide was originally authored with AI assistance on 2026-10-12 for the accompanying HAMON RecallWeave deck, and its original writing is offered under **CC0-1.0**. Source publications retain their own rights. Biological and clinical interpretations require domain-specific methods, validation and qualified judgment; this guide is conceptual educational material only.
