# Counting principles: order and reuse

Open [the offline explorer](counting-principles-explorer.html), or download [the twelve-question lesson](counting-principles.json) and select it with RecallWeave's existing course file picker. This is a separate course; it does not replace the bundled lesson or change the learner's model, scoring, question selection, review, or archive behavior.

The lesson asks a learner to define a complete outcome before calculating its count. It covers the product rule, distinct roles, selections that ignore order, selections with repeated types, empty and impossible selections, and the difference between counting groups and assigning probabilities.

## Four models

The explorer uses **n distinct label types** (A through H) and selects exactly **k items**. An ordered outcome assigns a label to each of k labeled positions. An unordered outcome records only the number of each label selected. When reuse is allowed, the supply of each type is unlimited. When reuse is forbidden, each type can appear at most once.

| Order | Reuse | Count for an ordinary nonempty case |
| --- | --- | --- |
| Matters | Allowed | n^k |
| Matters | Forbidden | P(n,k) = n! / (n − k)! |
| Ignored | Forbidden | C(n,k) = n! / (k! (n − k)!) |
| Ignored | Allowed | C(n + k − 1,k), for n > 0 |

The first two rows count position assignments; the third groups distinct-label assignments into classes of size k!. The last row counts nonnegative type counts whose sum is k. One encoding uses k identical item marks and n − 1 dividers. See the primary mathematical references below.

Handle the boundaries before using a factorial expression:

- **k = 0:** there is one empty outcome in every model, including n = 0.
- **n = 0 and k > 0:** there are no outcomes.
- **No reuse and k > n:** there are no outcomes.

These rules distinguish an empty selection, which is a valid outcome, from an impossible request, which has no outcomes. The counting interpretation of the empty product gives a count of one for a length-zero sequence over an empty alphabet.

## Use the explorer

Choose n from 0 to 8 and k from 0 to 6. Set whether order matters and whether a label may be reused, then choose **Count outcomes**. The table compares all four models using the same n and k. The highlighted cell and the result heading identify the applied model.

Changing n, k or either model choice immediately retires the prior result and disables its page download. Invalid decimal drafts are not silently truncated or interpreted as exponents. Leading zeroes and surrounding whitespace are accepted; decimal fractions, signs, exponent notation, non-ASCII digits and values outside the bounds are refused.

The outcome list uses A–H lexicographic order. With order ignored, labels are sorted inside each row; this is a canonical representation of a multiset, so repeated labels remain visible. For example, AAB and ABA name the same multiset, while AAB and ABB do not.

Each page contains at most 24 rows. **First**, **Previous**, **Next**, **Last**, and the page field reach all valid pages. The page field is applied with **Go**: an invalid page request reports an error and explicitly identifies the previously applied page that remains on screen. This does not change the counting model or mislabel the visible rows.

**Download this page · JSON** exports only the currently applied page: its exact input, model, total, formula, row range and every visible row. It is labeled as a page export, not a complete-outcome export. Other pages are generated from the same rules; there is no silent sample or omitted middle range. Each outcome has an exact one-based decimal ordinal. Counts and ordered-representation totals are decimal strings in the exported JSON.

The complete domain is bounded. The largest count is 8^6 = 262,144, and the page engine addresses the requested outcomes without first building that entire list. There is no background persistence, learner-session write, network request or dependency download.

The five example buttons set the labeled controls and apply them:

| Example | n | k | Model | Useful observation |
| --- | ---: | ---: | --- | --- |
| Distinct pairs | 3 | 2 | Order matters, no reuse | AB and BA are different assignments. |
| Repeated pairs | 2 | 2 | Order ignored, reuse | AA, AB and BB have different numbers of ordered representations. |
| Select nothing | 0 | 0 | Order ignored, no reuse | One empty outcome still exists. |
| Too few labels | 2 | 3 | Order ignored, no reuse | A valid request can have zero outcomes. |
| Many pages | 8 | 6 | Order matters, reuse | Distant pages and the partial last page remain available. |

### Ordered representations and probability

An unordered row reports how many ordered assignments produce it. For counts m₁ through mₙ summing to k, this is k! / (m₁! · … · mₙ!). For distinct labels every denominator is one. Repeated labels reduce the number of distinct assignments.

Take the deliberately small A/B example. Under two independent uniform draws with reuse, AA, AB, BA and BB each have probability 1/4. When order is discarded, the AB multiset collects two of those outcomes. The three multiset probabilities are therefore 1/4, 1/2 and 1/4, even though there are three multisets.

The explorer reports counts, not a claim that its displayed rows are equally likely under every possible random procedure. Circular arrangements, finite inventories with several copies, restrictions on particular positions, and nonuniform draws require another model.

## Teaching sequence and assessment

The four concepts have three questions each:

1. **Counting a complete choice:** multiply choices only when the stage counts apply to every earlier choice; inspect a complete ordered list.
2. **Order and distinct roles:** keep roles distinct, reduce choices without reuse, and justify uniform division when order is discarded.
3. **Unordered selections:** choose distinct groups, allow repeated types, and represent multisets once.
4. **Boundary and model checks:** separate empty from impossible outcomes and avoid inferring equal probabilities from equal display space.

Prerequisite links express this progression in the existing deck format. The learner may choose a different question order according to its current policy. No prompt or transfer assumes it will be shown directly after another question.

Each question explicitly states whether positions or roles matter and whether reuse is allowed. Distractors exercise a concrete modeling mistake, such as adding stage counts, allowing an already-used person to fill another role, ignoring order too early, counting all available objects rather than the requested size, or dividing unequal-sized groups uniformly.

### Answer key and original transfer solutions

The following key uses stable question IDs. Option numbers are one-based here; the JSON stores zero-based indices.

| Question ID | Correct option | Reason |
| --- | ---: | --- |
| counting-product-1 | 2 | Four backgrounds times three symbols gives 12 complete badges. |
| counting-product-2 | 4 | Three labeled positions with four reusable types gives 4³ = 64. |
| counting-product-3 | 1 | AA, AB, BA and BB are the four different ordered outcomes. |
| counting-order-1 | 3 | Six choices for facilitator, then five for recorder, gives 30. |
| counting-order-2 | 2 | Seven, six and five remaining choices give 210. |
| counting-order-3 | 1 | Every distinct pair has two orders, giving 12 / 2 = 6. |
| counting-unordered-1 | 4 | Sixty ordered triples represent each selection six times, giving 10. |
| counting-unordered-2 | 3 | Nonnegative counts of three types summing to four give C(6,4) = 15. |
| counting-unordered-3 | 1 | AAA, AAB, ABB and BBB represent the four multisets. |
| counting-boundary-1 | 2 | Selecting zero items has one empty outcome in all four models. |
| counting-boundary-2 | 4 | Three different labels cannot be selected from only two types. |
| counting-boundary-3 | 3 | The AB multiset collects both AB and BA, giving probabilities 1/4, 1/2, 1/4. |

**counting-product-1 transfer.** The three background branches have 2, 4 and 4 permitted symbols. Add their complete possibilities: 2 + 4 + 4 = **10**. Multiplying 3 × 4 would incorrectly give the first background two extra symbols. The explorer's uniform-type models do not represent this extra restriction.

**counting-product-2 transfer.** Four labeled positions each have three choices, giving 3 × 3 × 3 × 3 = **81**.

**counting-product-3 transfer.** The full list is **AAA, AAB, ABA, ABB, BAA, BAB, BBA, BBB**. There are eight rows, agreeing with 2³ = **8**.

**counting-order-1 transfer.** Once the facilitator is fixed, only the recorder is chosen. Any of the other five volunteers can take that role, giving **5** assignments.

**counting-order-2 transfer.** After three different illustrations are selected, four remain for the fourth position. The new total is 7 × 6 × 5 × 4 = **840**.

**counting-order-3 transfer.** Three different labels can be ordered in 3! = **6** ways. The 24 ordered triples therefore represent 24 / 6 = **4** unordered selections.

**counting-unordered-1 transfer.** C(6,2) = **15**. Every selected pair determines a unique complementary set of four excluded designs, so C(6,4) also equals **15**.

**counting-unordered-2 transfer.** Three item marks and three dividers encode the counts of four types. Choose the locations of the three item marks among six positions: C(6,3) = **20**. Adjacent dividers represent a type with count zero.

**counting-unordered-3 transfer.** The multisets are **AAAA, AAAB, AABB, ABBB, BBBB**. The A count can be 4, 3, 2, 1 or 0, giving **5** possibilities.

**counting-boundary-1 transfer.** Selecting zero items from five types has **1** empty outcome. Selecting one item from zero types has **0** outcomes because no label can fill it.

**counting-boundary-2 transfer.** Allowing reuse gives **8** ordered outcomes and **4** unordered multisets. Reuse removes the shortage; ignoring order then identifies assignments with the same counts.

**counting-boundary-3 transfer.** Two independent uniform draws from A, B and C have nine equally likely ordered outcomes. AA has one ordered representation, giving **1/9**; AB has two, giving **2/9**.

## Build and focused checks

No external JavaScript dependency is required. From the repository root:

```sh
node tools/build-counting-principles.mjs
node tools/build-counting-principles.mjs --check
node --test tests/counting-principles.test.mjs
```

The builder validates the exact course with the published `src/deck.mjs` contract and embeds that course, the core and the UI into the generated HTML. It does not bundle or alter learner code. The generated file can be opened directly without a local server.

The focused tests compare actual formulas and paginated outcomes with a separate filtered-position-assignment oracle; check distant addresses at the maximum input; distinguish all zero cases; check multiset representations; reject invalid numeric and page inputs; and parse the generated script and course. Browser controls, rendered layout, downloads and actual learner consumption require their own native receiving; the arithmetic suite alone is not a browser claim.

## Primary references and terms

- [OpenStax, *Precalculus 2e*, §11.5, “Counting Principles”](https://openstax.org/books/precalculus-2e/pages/11-5-counting-principles): product counts, permutations, combinations and repeated-object representation counts.
- [Lehman, Leighton and Meyer, *Mathematics for Computer Science* (2015), chapter 14](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf): §§14.3–14.6, including the division rule, subset count, repeated-type selection count and multinomial representation count.

The formulas are standard mathematical facts. Questions, scenarios, explanations, transfer prompts and worked answers here are original; no reference exercise, passage or figure is reproduced. This original course content is CC0-1.0. Referenced materials retain their own terms. The explorer is part of the repository's code.
