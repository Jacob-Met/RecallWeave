# DNA to RNA to peptide: follow the labelled strand

This casebook is for a learner who knows that DNA stores sequence information and that proteins contain amino acids, but wants to follow the steps without guessing a strand or reading frame. Work on paper or in your own notes. Each case supplies the information needed; no sequence program or biological sample is involved.

All fragments are short, invented teaching strings. Their assigned transcription spans and translation starts are premises, not discoveries about natural genes. The cases do not establish whether a fragment is expressed, how much protein a cell makes, how a peptide folds or functions, or any phenotype or clinical effect.

## Rules and notation

- **Direction matters.** Every strand has a 5′ end and a 3′ end. These labels describe molecular orientation, not numerical values to calculate. Spaces help you see groups; they are not bases.
- **DNA and RNA alphabets differ.** DNA uses A, C, G and T. RNA uses A, C, G and U.
- **Template DNA supplies complementary bases.** Read the assigned DNA template in its 3′→5′ direction to write RNA in its 5′→3′ direction. The partners are DNA A→RNA U, DNA T→RNA A, DNA C→RNA G and DNA G→RNA C. If the template is printed 5′→3′ from left to right, begin at its right-hand 3′ end when deriving RNA 5′→3′.
- **Coding DNA is the other strand for this transcript.** When both coding DNA and RNA are written 5′→3′, their base order matches, with U in RNA where coding DNA has T. A coding strand printed 3′→5′ would first need to be reversed to report RNA 5′→3′. “Coding” does not mean that this strand is the template.
- **Transcription and translation have different endpoints here.** For each DNA case, the entire displayed DNA fragment is the stipulated transcription span. Produce RNA for every displayed base, including bases whose RNA lies after a translation stop. There are no introns, splicing or RNA editing in these cases. A translation stop is not an instruction to truncate the stipulated RNA.
- **Use the assigned translation start.** An RNA base position is numbered from 1 at its 5′ end, ignoring spaces and end labels. Begin at the position named in the case and read successive, nonoverlapping groups of three bases toward 3′. The assignment supplies the reading frame; do not search for a different start. It is not a claim that the first AUG in every natural RNA always starts translation.
- **Use the supplied Standard Code mappings.** Write the decoded peptide from its N terminus to its C terminus, abbreviated N→C. These are the two ends of a peptide chain. AUG supplies Met in these assigned starts. Stop at the first in-frame stop codon; a stop adds no amino acid. Do not decode later bases as part of that same peptide.
- **Do not invent missing bases.** If the supplied RNA ends with one or two bases left in the assigned frame before a stop has appeared, report an incomplete terminal triplet. Do not pad it or assume an unseen stop. A list of amino acids decoded from a finite fragment is not evidence that a complete protein has been specified.
- **Keep sequence and function separate.** Two stipulated decodings can yield the same amino-acid list without establishing equal expression or function. A sequence edit can change a reading frame without guaranteeing that every later amino acid differs.

Use three-letter amino-acid abbreviations from the table. Report RNA with both end labels, and peptides as `N–Met–…–C`. Record a stop separately, not as `–Stop–` inside the peptide.

## Code mappings used in these cases

The table gives RNA codons for the **Standard Code (NCBI translation table 1)**. A row listing two codons assigns the same amino acid to each; it does not mean the two codons are one longer unit. This is the subset needed here, not a complete codon table.

| RNA codon(s), each read 5′→3′ | Result | Three-letter abbreviation |
|---|---|---|
| AUG | Methionine | Met |
| CCU, CCC | Proline | Pro |
| AAG | Lysine | Lys |
| GCU | Alanine | Ala |
| AAU | Asparagine | Asn |
| GAC | Aspartate | Asp |
| GAA, GAG | Glutamate | Glu |
| GUA | Valine | Val |
| UGC | Cysteine | Cys |
| UUU, UUC | Phenylalanine | Phe |
| UGG | Tryptophan | Trp |
| GGA | Glycine | Gly |
| CUU | Leucine | Leu |
| CGG | Arginine | Arg |
| AUA | Isoleucine | Ile |
| CAA | Glutamine | Gln |
| ACA | Threonine | Thr |
| UAA, UAG, UGA | Translation stop | No amino acid |

## Case 1 — A coding strand with more transcript after the stop

**Given:** coding DNA `5′–ATG CCT AAG TGA TTT–3′`. Transcribe the entire displayed span. Translation is assigned to start at RNA base 1.

1. Write the complete RNA 5′→3′.
2. Mark the consecutive codons from the assigned start. Write the decoded peptide N→C and identify the first in-frame stop by its codon and RNA base positions.
3. Which RNA bases remain after that stop? Explain why they belong in the RNA answer but do not extend this peptide.

## Case 2 — Use the template, not the coding-strand shortcut

**Given:** template DNA `3′–TAC GGG TTA ACT ACC–5′`. Transcribe the entire displayed span. Translation is assigned to start at RNA base 1.

1. Write the complete RNA 5′→3′, showing the complementary RNA triplet beneath each displayed DNA triplet.
2. Write the decoded peptide N→C and identify the first in-frame stop.
3. A learner replaces T with U in the displayed DNA letters without complementing them. Explain which strand rule that learner has confused with the rule needed here.

## Case 3 — The template is printed in the other direction

**Given:** template DNA `5′–TTA GTC CAT–3′`. Transcribe the entire displayed span. Translation is assigned to start at RNA base 1.

1. Rewrite the template itself in 3′→5′ order. Keep its end labels and all its bases.
2. Use that rewritten template to produce RNA 5′→3′. Show the pairing rather than only a final sequence.
3. Write the decoded peptide N→C and identify the first in-frame stop. Explain why a left-to-right complement of the originally printed template cannot simply be labelled RNA 5′→3′.

## Case 4 — An assigned start is not a search for the first AUG

**Given:** RNA `5′–CAUGAUGGCUUGA–3′`. Translation is explicitly assigned to start at **base 5**, not at any earlier position.

1. Number all RNA bases from 1 to 13. Identify the bases before the assigned start.
2. Group the codons beginning at base 5, give their base-position ranges, and write the decoded peptide N→C. Identify the first in-frame stop.
3. An earlier AUG is visible in the same RNA. Give its positions and explain why starting there would answer a different question. Does the assigned start in this exercise establish how a real cell would choose a start on this fragment?

## Case 5 — Three substitutions, three decoding comparisons

**Reference:** coding DNA `5′–ATG GAA TGC TGA–3′`.

Each variant below is a **separate single-base edit of that reference**, not a cumulative edit. Positions refer to the reference coding DNA written 5′→3′, with spaces ignored.

| Variant | Exact edit |
|---|---|
| S1 | Replace the A at position 6 with G. |
| S2 | Replace the A at position 5 with T. |
| S3 | Replace the G at position 4 with T. |

For the reference and every variant, transcribe the entire displayed or edited span. Retain translation start at RNA base 1.

1. Write each variant's complete coding DNA, then the complete RNA for the reference and all three variants.
2. Decode all four peptides N→C. Give each first in-frame stop and the number of amino acids decoded before it.
3. Which variant preserves the reference amino-acid list, which substitutes one amino acid, and which introduces an earlier stop? Support each comparison with the changed codon.
4. Does an unchanged decoded amino-acid list establish that the edit has no biological effect? State what the case does and does not determine.

## Case 6 — Inserting one base versus one complete codon

**Reference RNA:** `5′–AUG UUC GGA UAG–3′`, with translation start assigned to base 1.

Make each edit separately to the reference. In both variants, retain the original first three bases as the assigned start codon.

- **I1:** Insert the single RNA base C immediately after reference base 3.
- **I3:** Insert the three RNA bases CAA, in that order, immediately after reference base 3.

1. Write both complete edited RNAs 5′→3′.
2. For the reference, I1 and I3, group the bases in the assigned frame and write every amino acid decoded from the supplied fragment. Identify any first in-frame stop; otherwise state that none is shown. Record any incomplete terminal triplet that is reached before a stop.
3. Which insertion preserves the original downstream codon boundaries, shifted along the RNA by the inserted length? Show the codon groups that justify your answer.
4. Is “a one-base insertion must change every later amino acid and must produce a nonfunctional protein” justified by the supplied information? Separate the frame change from those stronger claims.

## Case 7 — A fragment endpoint is not a translation stop

Consider these two supplied RNA fragments separately. Both have assigned translation start at base 1.

- **F1:** `5′–AUG ACA GG–3′`
- **F2:** `5′–AUG ACA UAA GG–3′`

1. Give the amino-acid list decoded from each fragment, written N→C. Report the first in-frame stop if one is present.
2. Explain what the terminal GG means in each case. Is it an incomplete triplet that decoding reaches, or is it after a stop that has already ended this decoding?
3. The decoded amino-acid lists agree. Why do the fragments nevertheless provide different evidence about termination within the supplied sequence?
4. For F1, is it justified to claim a complete two-amino-acid protein? For F2, does the in-frame stop prove that this invented RNA is actually expressed or that its peptide has a particular function? State the supported sequence-level conclusions instead.

Finish the cases before reading the worked answers. Keep the complete RNA, the assigned codon groups and the peptide as separate records: each answers a different question.

## Worked answers

The spaces below show base groups, not extra bases. Each decoding uses the start stipulated in its case. A peptide written N→C here is the amino-acid list supported by that decoding; the notation alone does not establish that a complete protein or an expressed product exists.

### Case 1 — Keep the complete transcript

1. Both the coding DNA and the requested RNA are oriented 5′→3′, so preserve the base order and replace T with U:

   **RNA: 5′–AUG CCU AAG UGA UUU–3′.**

2. The assigned groups are:

   | RNA positions | Codon | Result in this decoding |
   |---|---|---|
   | 1–3 | AUG | Met |
   | 4–6 | CCU | Pro |
   | 7–9 | AAG | Lys |
   | 10–12 | UGA | First in-frame stop; no amino acid |
   | 13–15 | UUU | After that stop; not decoded into this peptide |

   **Peptide: N–Met–Pro–Lys–C.** There are three amino acids before the stop.

3. Bases 13–15, UUU, remain in the complete stipulated RNA. The transcription span includes them. Translation from the assigned start has already stopped at UGA, so the UUU does not add Phe to this peptide. Knowing a codon's mapping does not mean it is reached during a particular decoding.

### Case 2 — Complement the labelled template

1. The template is already written 3′→5′, so pair each base with its RNA partner in the displayed order:

   | Strand | Left end | Group 1 | Group 2 | Group 3 | Group 4 | Group 5 | Right end |
   |---|---|---|---|---|---|---|---|
   | Template DNA | 3′ | TAC | GGG | TTA | ACT | ACC | 5′ |
   | Complementary RNA | 5′ | AUG | CCC | AAU | UGA | UGG | 3′ |

   **Complete RNA: 5′–AUG CCC AAU UGA UGG–3′.** For example, template ACT pairs with RNA UGA because A→U, C→G and T→A.

2. AUG, CCC and AAU give **N–Met–Pro–Asn–C**. UGA at RNA positions 10–12 is the first in-frame stop. UGG at positions 13–15 remains in the RNA but does not add Trp after that stop.

3. Replacing T with U without complementing would apply the coding-strand shortcut to a template strand. That shortcut applies when coding DNA and RNA are both written 5′→3′. Here the given strand is template DNA written 3′→5′; its letters supply complementary RNA bases, not the same base order with only a letter substitution.

### Case 3 — Reverse the orientation before pairing

1. Rewriting the same template from its 3′ end gives **3′–TAC CTG ATT–5′**. This reverses the complete base order, including the order within the displayed triplets. It does not complement the DNA.

2. Now pair the rewritten template with RNA:

   | Strand | Left end | Group 1 | Group 2 | Group 3 | Right end |
   |---|---|---|---|---|---|
   | Rewritten template DNA | 3′ | TAC | CTG | ATT | 5′ |
   | Complementary RNA | 5′ | AUG | GAC | UAA | 3′ |

   **Complete RNA: 5′–AUG GAC UAA–3′.**

3. AUG and GAC give **N–Met–Asp–C**. UAA at RNA positions 7–9 is the first in-frame stop.

   A complement placed beneath the originally printed template would run in the opposite direction: beneath 5′–TTA GTC CAT–3′ it would be **3′–AAU CAG GUA–5′**. Those RNA letters are in 3′→5′ display order. Relabelling them 5′→3′ without reversing them would change the sequence being reported. Read that complementary strand from its 5′ end to obtain AUG GAC UAA.

### Case 4 — Follow the assigned start

1. Number the complete RNA as follows:

   | Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | Base | C | A | U | G | A | U | G | G | C | U | U | G | A |

   Bases 1–4 are CAUG. They precede the assigned start at base 5 and are not part of this peptide's decoding.

2. Starting at base 5 gives:

   | RNA positions | Codon | Result |
   |---|---|---|
   | 5–7 | AUG | Met |
   | 8–10 | GCU | Ala |
   | 11–13 | UGA | First in-frame stop; no amino acid |

   **Peptide: N–Met–Ala–C.**

3. The earlier AUG occupies positions **2–4**. Starting there would answer a different start assignment and would give N–Met–Met–Ala–C before the same UGA. In this particular sequence, starts at bases 2 and 5 lie in the same reading frame: they are three bases apart. The change would be an extra initial Met, not a shift to a different frame.

   Neither visible AUG nor the exercise's assigned start establishes which position a real cell would use. The start was supplied as a premise; the fragment and these rules do not supply a biological initiation experiment.

### Case 5 — Compare each substitution with the reference

1. Each edit is made directly to the reference, so no variant contains another variant's edit:

   | Sequence | Complete coding DNA, 5′→3′ | Complete RNA, 5′→3′ |
   |---|---|---|
   | Reference | 5′–ATG GAA TGC TGA–3′ | 5′–AUG GAA UGC UGA–3′ |
   | S1: position 6 A→G | 5′–ATG GAG TGC TGA–3′ | 5′–AUG GAG UGC UGA–3′ |
   | S2: position 5 A→T | 5′–ATG GTA TGC TGA–3′ | 5′–AUG GUA UGC UGA–3′ |
   | S3: position 4 G→T | 5′–ATG TAA TGC TGA–3′ | 5′–AUG UAA UGC UGA–3′ |

2. Decoding from RNA base 1 gives:

   | Sequence | Peptide, N→C | First in-frame stop | Amino acids before it |
   |---|---|---|---|
   | Reference | N–Met–Glu–Cys–C | UGA, positions 10–12 | 3 |
   | S1 | N–Met–Glu–Cys–C | UGA, positions 10–12 | 3 |
   | S2 | N–Met–Val–Cys–C | UGA, positions 10–12 | 3 |
   | S3 | N–Met–C | UAA, positions 4–6 | 1 |

   In S3, UGC and the later UGA remain in the complete RNA. Neither extends the peptide after the earlier UAA.

3. **S1 preserves the amino-acid list:** GAA changes to GAG, and both map to Glu. **S2 replaces one amino acid:** GAA changes to GUA, so the second amino acid changes from Glu to Val. **S3 introduces an earlier stop:** GAA changes to UAA, ending this decoding after Met. These are comparisons of the assigned sequences, not predictions of protein performance.

4. An unchanged decoded amino-acid list establishes only that the supplied code and start produce the same list. This case does not determine whether either sequence is expressed, how much product is made, or whether an edit has other biological consequences. “Same decoded list” does not justify “no biological effect.”

### Case 6 — An insertion changes groups according to its length

1. Insert the stated bases after the unchanged initial AUG:

   - **I1 complete RNA: 5′–AUG CUU CGG AUA G–3′.**
   - **I3 complete RNA: 5′–AUG CAA UUC GGA UAG–3′.**

   In I1, the inserted C joins the first two bases of the old UUC to form CUU. The spaces show the newly assigned groups; they do not mark the old triplets.

2. The decodings are:

   | Sequence | Assigned groups in order | Amino-acid list, N→C | Stop or incomplete remainder |
   |---|---|---|---|
   | Reference | AUG / UUC / GGA / UAG | N–Met–Phe–Gly–C | First stop UAG at positions 10–12; no remainder before it |
   | I1 | AUG / CUU / CGG / AUA / G | N–Met–Leu–Arg–Ile–C | No in-frame stop is shown; single G at position 13 is an incomplete terminal triplet |
   | I3 | AUG / CAA / UUC / GGA / UAG | N–Met–Gln–Phe–Gly–C | First stop UAG at positions 13–15; no remainder before it |

   The G in I1 supplies only one base of the next possible codon. It is not an amino acid or a stop, and it must not be padded with imagined bases.

3. **I3 preserves the original downstream codon boundaries**, shifted by three positions. Its inserted CAA occupies positions 4–6; the original UUC, GGA and UAG then occupy positions 7–9, 10–12 and 13–15. I1 shifts the original downstream letters by only one position, so their old triplet boundaries no longer match the frame retained at base 1. The new groups CUU / CGG / AUA show the difference.

4. I1 changes the downstream grouping in this assigned frame, but that does not prove that every later amino acid must differ in every such example. Different codons can share an amino-acid mapping, and regrouped bases can also produce matching codons. For this finite I1 fragment, the supported list is Met–Leu–Arg–Ile with no displayed in-frame stop. Nothing supplied establishes a complete resulting protein, its expression or whether it would function.

### Case 7 — Distinguish a missing codon from a reached stop

1. Both fragments yield the decoded amino-acid list **N–Met–Thr–C** from AUG and ACA at positions 1–3 and 4–6.

   | Fragment | What follows ACA | What the supplied sequence establishes |
   |---|---|---|
   | F1 | GG at positions 7–8 | Two bases of an incomplete next triplet; no in-frame stop is shown |
   | F2 | UAA at positions 7–9, then GG at positions 10–11 | UAA is a reached in-frame stop; GG lies after it |

2. For F1, decoding reaches the GG but cannot form a complete codon from it. For F2, decoding has already ended at UAA before it reaches the later GG. The two trailing letters are still part of the supplied F2 RNA, but they are not a terminal partial codon reached during this peptide's decoding.

3. The same decoded amino-acid list can therefore accompany different termination evidence. F1 runs out of supplied bases without showing a stop. F2 contains an explicit in-frame stop after Thr. Equality of the two amino-acid lists does not erase that difference.

4. F1 does **not** justify a claim that a complete two-amino-acid protein has been specified. It supplies two decoded amino acids followed by an incomplete codon. F2 does justify saying that the stipulated decoding ends at its UAA after two amino acids; it does not establish expression or any particular peptide function. These are sequence-level conclusions within the exercise assumptions.

## Sources and scope

The fragments, edits, assigned starts, questions and worked answers above are original teaching examples. They use standard biological conventions described by the following references; no natural-sequence annotation, sequence software or biological experiment supplies additional evidence for these cases.

- [OpenStax Biology 2e, §15.2, Prokaryotic Transcription](https://openstax.org/books/biology-2e/pages/15-2-prokaryotic-transcription): template and coding strands, complementary transcription and RNA synthesis direction.
- [OpenStax Biology 2e, §15.1, The Genetic Code](https://openstax.org/books/biology-2e/pages/15-1-the-genetic-code): triplet codons, shared amino-acid mappings and stop codons.
- [NCBI, The Genetic Codes — 1. The Standard Code](https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi): the code mappings used here. NCBI's displayed code uses T where an RNA codon table uses U. Its discussion also distinguishes alternative initiation and other translation tables; this casebook supplies its own starts and uses table 1 rather than claiming a universal first-AUG rule.
- [OpenStax Microbiology, §11.4, Protein Synthesis (Translation)](https://openstax.org/books/microbiology/pages/11-4-protein-synthesis-translation), “Ribosomes”: RNA is read 5′→3′ while a polypeptide is synthesized N→C.

These references explain the conventions. The labelled inputs and assigned starts determine the answers here; they do not determine what an actual organism would express or how a resulting product would behave.
