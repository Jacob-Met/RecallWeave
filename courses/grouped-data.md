# When groups and totals disagree

Open [grouped-data-explorer.html](grouped-data-explorer.html) directly in a browser. It is a complete offline explorer: no server, build step, account or internet connection is needed. The companion [grouped-data.json](grouped-data.json) is a twelve-question RecallWeave course.

The lesson is for a learner who can work with fractions and percentages. It connects four ideas: a rate's denominator, the composition of a pooled sample, a chosen reference mix, and the difference between describing recorded outcomes and asking a causal question. The examples and wording are original. No study or participant data is used.

## Explore the counts

Choose a teaching example, then edit the successes and total attempts for each option in each group. Inputs must be whole numbers from 0 through 1,000,000, with successes no greater than attempts. An empty input is invalid. A valid total of zero means that the corresponding rate is unavailable.

The first fictional example is:

| Group | Option A | Option B |
| --- | ---: | ---: |
| Newcomers | 42 successes / 70 attempts = 60% | 5 / 10 = 50% |
| Experienced players | 18 / 20 = 90% | 72 / 90 = 80% |
| Pooled sample | 60 / 90 = 66⅔% | 77 / 100 = 77% |

A has the higher observed rate in each group. B has the higher pooled rate. All six quantities follow from the same counts.

Each option's pooled rate is the number of its successes divided by the number of its attempts:

```
pooled rate = (newcomer successes + experienced successes)
            / (newcomer attempts + experienced attempts)
```

Equivalently, it is a weighted average of that option's group rates, using its own group proportions. Experienced players supply 20/90 of A's attempts and 90/100 of B's. B places more of its sample weight on the higher-rate group. An unweighted average of the two group percentages would describe a different mix.

The explorer calls a pattern a **strict reversal** only when both available group comparisons point strictly one way and the pooled comparison points strictly the other. A subgroup tie, a pooled tie, opposing group directions and missing group rates are shown separately. Rates displayed to two decimal places can look equal even when their exact fractions differ; the comparison labels retain the exact direction.

## Choose one common mix

Move the reference slider to give both options the same proportion of experienced players. It applies the original observed group rates to those chosen weights:

```
reference rate = (1 − experienced share) × newcomer rate
               + experienced share × experienced rate
```

At a 50% / 50% reference mix, the first example gives A 75% and B 65%. At 80% experienced, it gives A 84% and B 74%. The recorded counts and their pooled fractions do not change.

If A has a strictly larger rate in every included group, applying the same nonnegative weights to A and B cannot make B larger. This follows by taking the same weighted average of the positive within-group differences. Different option-specific sample weights are what permit the initial reversal.

A missing positive-weight rate prevents that option's reference calculation. In the empty-group example, A has no newcomer attempts and an experienced rate of 9/10. A 50% newcomer reference is unavailable; a 0% newcomer / 100% experienced reference can use 9/10 without inventing a newcomer rate. Moving from 0% to 1% newcomer weight makes that absent information necessary again.

The reference mix expresses a comparison you have chosen. It is not a uniquely correct replacement for the original samples.

## Keep or share what you inspected

**Download this comparison** saves the current counts, the common experienced-group percentage, and the resulting observed/reference summary. Exact rates and differences have integer numerator and denominator strings; numeric `value` fields are display approximations. Unavailable quantities are `null`. The format is `recallweave-grouped-data/1`.

The file contains locally supplied teaching counts, without verified sample provenance. It has no personal identifier, timestamp or hidden dataset. It is a readable snapshot; this explorer does not import comparison files or automatically restore a previous visit.

**Download the course** saves the original twelve-question JSON byte for byte. It does not encode your edits as new questions. Both downloads become unavailable while a count is invalid; repairing the fields or restoring an example makes the current result available again. A failed download preparation keeps the inputs available for retry.

The browser controls the destination of downloaded files. Nothing is automatically saved to browser storage or sent to a service.

## Work through the optional course

The JSON uses the existing `recallweave-deck/1` format and its published validator. Its questions include calculation, transfer, missing-rate support, and interpretation; explanations and transfer prompts accompany every answer. The source key was independently answered before being revealed to the reviewer, then its option order was revised to remove a cyclic key pattern. Correct answer text and mathematical premises were retained.

Open [RecallWeave](../demo.html). Under **Bring your own lesson**, choose the downloaded **grouped-data.json** file. Inspect the title, twelve-question preview and attribution, then choose **Start this deck** to begin. Selecting a file only opens its preview; starting the deck explicitly replaces the current lesson. After the first round, use the learning trace, practice for missed questions and **Download study notes (.txt)** to revisit the original answers and explanations.

The numerical explorer and the learner open as separate pages. The explorer's edited counts do not change the course questions. You can use either page independently.

The learner's model estimates are model state, not grades or evidence that the lesson improves learning. The numerical explorer does not model learning at all.

## Interpretation and references

Pooled rates describe the recorded samples. Group rates describe the recorded subgroups. Reference rates describe a selected common mix. Choosing among these descriptive questions does not establish what changing an option would cause. Assignment, common causes and variable timing matter; a group defined by a consequence of the option can lie on the pathway relevant to a total-effect question.

The causal distinction and strict-reversal terminology are informed by [Judea Pearl, *Understanding Simpson's Paradox*, UCLA technical report R-414, December 2013](https://ftp.cs.ucla.edu/pub/stat_ser/r414.pdf). Additional teaching material is linked at [Penn State STAT 555, Tables and Count Data](https://online.stat.psu.edu/stat555/node/10/). The receiving evidence records which source bodies were retrieved. Examples, derivations and wording here are original; no reference passages, figures or observed study tables are reproduced.

No uncertainty interval, significance test, treatment effect or population inference is computed. The examples are descriptive teaching material.

## Build and qualification

The generated HTML combines only the uniquely named explorer template, numerical module, UI module and original course:

```sh
node tools/build-grouped-data.mjs
node tools/build-grouped-data.mjs --check
node --test tests/grouped-data*.test.mjs
```

The existing learner app, default deck, importer, authoring page and standalone learner builder remain separate. The build checks the course with the shared validator and refuses an unexpected inline-module boundary before replacing output. Course markup is encoded as data, and display strings use DOM text nodes.

Exact source, independent mathematical/content receiving, learner-module receiving, browser evidence and any failed attempts are recorded under [docs/receiving/grouped-data-58d79b68](../docs/receiving/grouped-data-58d79b68/).
