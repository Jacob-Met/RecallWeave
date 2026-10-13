# Bloom filters: what the bits can prove

A Bloom filter can cheaply rule out a key without keeping the key itself. A positive answer needs more care. This lesson uses tiny arrays that you can check by hand to distinguish what the bits establish from what they merely permit.

Open RecallWeave’s `demo.html`, choose [bloom-filters.json](bloom-filters.json) under **Bring your own lesson**, inspect the preview, then select **Start this deck**. The learner may change question order and shuffle answer choices. Match answers by meaning, review the explanations, retry missed questions and download your study notes when you want to keep them. The questions stand on their own; this guide supplies a connected worked example and the complete answer key.

## The model used here

We use a plain bit-array Bloom filter. Initially every bit is 0. Inserting a key sets the positions returned by its fixed hash functions to 1. Querying uses the same functions: a 0 in any required position means **definitely absent from the represented set**; all required positions set means **maybe present**. Different keys can share positions, and even one key’s two positions can coincide. Bits are neither counters nor stored identities.

The absence guarantee assumes all relevant inserts completed, the query uses the same configuration, and their set bits were retained. It does not extend a stale index to records that were never added to it. A concurrent update requires an appropriate synchronization boundary before this argument applies.

This basic model and the distinction between a known bit state and randomly constructed states are discussed in Christensen, Roginsky and Jimeno’s [2010 paper hosted by NIST](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=903775), especially its introduction and equations 2–4. The [official Linux documentation](https://www.kernel.org/doc/html/latest/bpf/map_bloom_filter.html) supplies a concrete secondary-lookup use case and notes the synchronization and deletion limits of its Bloom-filter implementation. The finite examples and questions below are original.

## An eight-bit filter, step by step

Number positions from 0 through 7. Give A positions `(1, 4)` and B positions `(4, 6)`.

| State | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Initially | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| After A | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| After A and B | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 |
| After inserting A again | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 |

There are three set bits after two distinct keys. Reinserting A leaves the state unchanged. A different key D mapping to `(4, 1)` would also add no bits. Therefore a bit count is not an exact distinct-key count, and repeated insertion is not a record of multiplicity.

Now query three keys under this unchanged mapping:

| Key | Query positions | Observations | Meaning |
|---|---|---|---|
| B, which was inserted | `(4, 6)` | Both 1 | Maybe present, consistent with its actual membership |
| X, known never inserted | `(1, 6)` | Both 1 | False positive |
| Y | `(3, 6)` | Bit 3 is 0 | Definitely absent from the fully represented set |

For Y, the zero is decisive. Its completed insertion would have set bit 3. For X, the positive answer cannot distinguish its own insertion from bits left by other keys. Repeating the same query with fixed bits and hashes gives the same answer.

## Changes and combinations need their assumptions

### Clearing a shared bit can lose a real member

Suppose A is removed from the exact set and B remains. Clearing A’s positions 1 and 4 leaves only position 6 set. Querying B now sees the zero at position 4 and incorrectly returns absent. The plain filter has no per-key ownership information with which to repair that decision.

Leaving the old bits in place preserves the absence guarantee for the remaining subset, though it can retain more false positives. If deletion matters, use a suitable deletion-capable design or rebuild from the retained exact set. This course does not specify or implement a counting Bloom filter.

### Compatible OR represents the union’s insertions

With the same length, numbering and hash mapping, OR of the A-only array `{1, 4}` and B-only array `{4, 6}` gives `{1, 4, 6}`. That is exactly the array produced by inserting both keys into one empty filter. Their identities still are not recoverable, and false positives still exist.

Equal length alone is insufficient. If the second filter uses a different seed, its set bits may not be where the first mapping queries its keys. OR never clears a bit, but that fact does not repair a mismatch in what the positions mean.

### AND does not make membership exact

The A-only and B-only exact sets have empty intersection. Their arrays nevertheless share bit 4. Their AND therefore has that bit set. A never-inserted C with positions `(4, 4)` passes the AND query.

This is a counterexample to exact intersection membership. It is **not** a claim that a compatible AND loses true intersection members: a key truly inserted in both inputs has all its required bits in both, hence also in their AND. Preserving true members and excluding every nonmember are different requirements.

## Two probability experiments that must stay separate

### One fixed eight-bit state

Fix the array with set positions `{1, 4, 6}`. For this calculation only, model a known nonmember’s two query positions as independent uniform draws from all eight positions, with replacement, independent of the fixed array.

There are 64 equally likely ordered pairs. Each coordinate has three acceptable values, so nine pairs pass:

| First position | Accepted second positions | Number |
|---|---|---:|
| 1 | 1, 4, 6 | 3 |
| 4 | 1, 4, 6 | 3 |
| 6 | 1, 4, 6 | 3 |

The conditional false-positive probability is `9/64 = (3/8)²`. Repeated positions such as `(4, 4)` belong in this count. If the model forced distinct positions, the sample space would differ.

This probability model does not cause a deterministic hash function to redraw its output on every call. Once a particular key, configuration and bit state are fixed, its query result is fixed too.

### A randomly constructed two-bit filter

Start from two zero bits. Insert one key with two independent uniform draws from `{0, 1}`, allowing repetition. Then query a distinct known nonmember with another two independent uniform draws, independent of the insertion draws. All 16 sequences of four draws are equally likely.

| Insertion pair | Set positions | Accepted query pairs | Accepted outcomes |
|---|---|---|---:|
| 00 | `{0}` | 00 | 1 |
| 01 | `{0, 1}` | 00, 01, 10, 11 | 4 |
| 10 | `{0, 1}` | 00, 01, 10, 11 | 4 |
| 11 | `{1}` | 11 | 1 |

The total is `10/16 = 5/8`. Equivalently, average the four state-specific probabilities: `(1/4 + 1 + 1 + 1/4) / 4 = 5/8`.

The average fraction of set bits is `3/4`. Squaring that average gives `9/16`, which differs from `5/8`. The random occupancy must remain inside the square until after each state’s query probability is computed. This exact finite experiment illustrates the conditioning issue; it is not a general performance estimate for a deployed hash function or workload.

## Use the result for the right decision

Imagine importing documents while preserving every genuinely new ID. A correctly maintained filter can rule out some IDs immediately. A maybe answer should lead to an exact ID-set check before declaring a duplicate. Discarding on maybe would silently discard some new documents; repeating a fixed query would not resolve the ambiguity.

This lesson establishes membership semantics for its stated model. It does not benchmark speed, choose a production filter size, estimate an unknown workload’s false-positive rate, or replace an exact collection where the exact identities are needed.

## Answer key

The identifiers are stable even when the learner changes order. Each answer links the conclusion to its decisive step.

### 1. bf-insert

**{1, 4, 6}**

Each insertion sets bits; it does not add to a counter or toggle an existing 1. A sets 1 and 4. B leaves 4 set and adds 6, so exactly the three distinct positions {1, 4, 6} are 1.

### 2. bf-reinsert

**The bit array stays unchanged.**

Both target bits are already 1. Setting them to 1 again changes nothing. The bit array alone cannot distinguish one insertion of A from repeated insertions of A.

### 3. bf-same-position

**Only bit 2 becomes 1, and a later query for C checks that bit twice.**

Different hash functions may return the same position for a key. This model permits that collision. Both writes set bit 2 to 1, and both query checks find it set; insertion does not choose a replacement position.

### 4. bf-cardinality

**They cannot distinguish H1 from H2: both leave exactly {1, 4} set.**

H1 contains one distinct key and H2 contains two, yet both histories produce the same two set bits. This explicit pair of histories shows that the bit array does not determine an exact distinct-key count.

### 5. bf-false-positive

**Maybe present: this is a false positive.**

Insertions of A and B leave {1, 4, 6} set, so both positions of X are 1. The known insertion history says X is absent. A positive answer for this nonmember is a false positive.

### 6. bf-zero-witness

**Y was not among those completed insertions, because bit 3 is 0.**

If Y had been inserted, that completed insertion would have set bit 3. No allowed operation subsequently clears it. The observed 0 therefore rules out Y in the set represented by this filter; one set bit does not outweigh that witness.

### 7. bf-guarantee

**Query with the same mapping after completed insertions, while retaining every bit those insertions set.**

The proof is direct: insertion sets every position the later query will inspect, and those positions remain 1. A changed mapping, erased shared bit or incomplete update breaks that proof. The guarantee is conditional on the filter being maintained correctly.

### 8. bf-saturation

**Every query returns maybe present; the array can no longer rule out any key.**

Whichever positions a query selects, both are 1. This does not establish that every key was inserted: enough collisions can fill the array. The filter has lost its ability to reject nonmembers under this query rule.

### 9. bf-naive-delete

**It returns definitely absent because shared bit 4 was cleared: a false negative.**

Clearing positions 1 and 4 leaves only bit 6 set. B requires both 4 and 6, so its query now fails even though B remains in the exact set. Plain bits do not record which other keys still need a position.

### 10. bf-union

**Set bits {1, 4, 6}, exactly the array obtained by inserting both A and B into one empty filter.**

OR retains any position set in either input. That is the same rule as accumulating the inserts for their set union: {1, 4} union {4, 6} is {1, 4, 6}. False positives remain possible and no identities are recovered.

### 11. bf-configuration

**Equal length is insufficient; the second filter’s members may be missed under the first mapping.**

OR preserves existing 1s, but those 1s may be at positions unrelated to where the first mapping queries the second filter’s keys. Matching size alone does not establish a common meaning for each bit. Use compatible mappings and bit numbering for this union operation.

### 12. bf-intersection

**The AND leaves bit 4 set, so C returns maybe; it is not an exact test of set intersection.**

Both input arrays have bit 4 set, so their AND keeps it. Both query positions for C are 4; the query therefore passes even though C belongs to neither set. This counterexample rules out interpreting AND as exact intersection membership. It does not claim that a compatible AND loses true intersection members.

### 13. bf-fixed-probability

**9 of 64**

Each query position has three acceptable values. Repetition is allowed, so there are 3 times 3 = 9 accepted ordered pairs out of 8 times 8 = 64. The conditional false-positive probability for this fixed state and stated query model is 9/64.

### 14. bf-random-construction

**10/16 = 5/8**

The four insertion pairs are 00, 01, 10 and 11. Pairs 00 and 11 each leave one bit set, accepting 1 of 4 query pairs. Pairs 01 and 10 fill both bits, accepting all 4 query pairs each. Thus 1 + 4 + 4 + 1 = 10 of the 16 outcomes are false positives. Averaging each state’s query probability differs from squaring the average occupancy.

### 15. bf-fixed-key

**No. The same fixed key checks the same positions and returns the same result each time.**

The 9/64 calculation describes the stated random-position model, not fresh randomness generated by an unchanged deterministic lookup. A fixed key with fixed hashes and fixed bits has a fixed answer. Repetition alone does not resample the experiment.

### 16. bf-exact-lookup

**Check the exact ID set before classifying it as a duplicate.**

A nonmember can produce a positive filter result through shared bits. An exact set lookup distinguishes a real duplicate from that false positive. Repeating unchanged queries cannot resolve the ambiguity, and clearing bits can damage other keys’ answers.

## Reuse and verification

Original lesson content is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), attributed to Jacob / HAMON. Referenced works retain their own rights. No source exercises or prose are reproduced.

Run `node --test tests/bloom-filters-course.test.mjs` for exact finite-state checks and the unchanged learner’s import, adaptive selection, missed-answer practice and complete study-note export. The accompanying receiving record identifies the exact course and learner source used for actual browser receiving; it does not imply that a hosted deployment has adopted this source.
