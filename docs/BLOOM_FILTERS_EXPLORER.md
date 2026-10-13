# Explore shared Bloom-filter bits

Open `courses/bloom-filters-explorer.html` directly in a browser. This complete
page includes its model, interface and the original sixteen-question Bloom
lesson; no local server, account, storage or network connection is needed for
its controls and download. Reference links need a connection. Reopening the
page restores the initial A + B example.

## Try the examples

The current exact set starts with A and B. Their declared positions are
A → (1, 4) and B → (4, 6), so bits 1, 4 and 6 are set. X → (1, 6) passes both
positions but is absent from the separately displayed exact set: a false
positive. Query Y → (3, 6) to see a zero witness. Querying changes no bits.
Inserting X afterward changes exact membership even though all its bits were
already set. Repeating an insertion changes neither membership nor bits.

Seven named keys have fixed toy mappings. D → (4, 1) shares A's positions;
C → (4, 4) and Z → (2, 2) demonstrate repeated positions. These are declared
examples, not a production hash function or uniformly sampled key population.
Every key inserted in the live state remains detectable because the live
controls only insert or reset the whole example. The exact member list is
teaching information; an ordinary Bloom filter stores no such list.

The deletion section previews a copy. Removing A from the A + B example by
clearing positions 1 and 4 would make B fail, since it still needs bit 4.
Rebuilding from remaining exact member B sets 4 and 6 correctly. No removal
preview changes the live bits, exact members, query or fixed-state experiment.
An example that happens to miss no remaining keys does not justify general
clear-bit deletion. An empty live set disables the removal picker and hides
obsolete previews.

## Keep the two probability models separate

The 8 × 8 table conditions on the current fixed eight-bit array. Each of the
two query positions of a hypothetical nonmember is independently uniform on
0–7, with replacement. All 64 ordered pairs count, including diagonal pairs.
If s bits are set, exactly s² pairs pass. The starting three-bit state accepts
9/64. This is not the fraction of the seven named keys that pass: their
positions are fixed, while this experiment samples positions independently.

The next table is a separate two-bit filter with one inserted key and two
hash positions per key. Its two insertion draws and two nonmember query draws
are independent and uniform on {0, 1}. The insertion outcomes (0,0), (0,1),
(1,0), (1,1) accept respectively 1, 4, 4, 1 of four query pairs. Ten of the
sixteen equally likely four-draw outcomes pass, giving 5/8. The mean fraction
of set bits is 3/4, whose square is 9/16; it loses the construction variation
and does not equal this exact expectation. This experiment never changes in
response to the eight-bit live controls.

The page provides an exact embedded lesson download. Bring it to the existing
RecallWeave learner using its JSON file chooser. Its sixteen questions also
cover compatible union/intersection and exact backing lookups; the explorer
does not add those operations to its small live model. Experiments do not
modify the downloaded deck or record learner answers.

## Source and build

The modular source is `src/bloom-filters.mjs`, `src/bloom-filters-ui.mjs` and
`courses/bloom-filters-explorer.template.html`. The builder embeds those
modules and the exact original `courses/bloom-filters.json`, validated through
the maintained `src/deck.mjs` parser. It follows the repository's existing
standalone explorer build pattern:

```sh
node tools/make_bloom_filters_explorer.mjs
node tools/make_bloom_filters_explorer.mjs --check
node --test tests/bloom-filters-explorer.test.mjs
```

Run from any working directory using the builder's full path if necessary.
`--check` compares the generated page without writing. The new companion is
registered under the Bloom course in `catalog/companions.json`; the unchanged
`tools/build-site-directory.mjs` regenerates `explore.html`. The maintained
offline ZIP builder packages decks, catalog and learner, so this standalone
explorer is delivered separately and does not alter the frozen lesson pack.

The six model tests compare all 128 subsets of the seven toy keys with an
independent cell-array oracle, all applicable removal previews, all 256 bit
arrays and their 64 ordered query pairs, and all sixteen binary four-draw
outcomes. They also check immutable results and malformed toy input refusal.
These finite model checks do not establish production performance, hash
quality or learning efficacy. Actual interface and download receiving is
recorded separately at the offered source revision.

## Attribution

Examples, questions, explanatory text and implementation are original work by
Jacob Metoyer / HAMON, shared under CC BY 4.0. Primary references are the
[NIST publication record for Christensen, Roginsky and Jimeno](https://www.nist.gov/publications/new-analysis-false-positive-rate-bloom-filter)
and the [official Linux Bloom filter map documentation](https://www.kernel.org/doc/html/latest/bpf/map_bloom_filter.html).
Their own rights remain unchanged. The worked sixteen-question lesson guide
at `courses/bloom-filters.md` gives the original source context and fuller
composition examples.
