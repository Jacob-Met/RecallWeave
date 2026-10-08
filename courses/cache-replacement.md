# Cache decisions: FIFO, LRU and capacity

Open [the offline explorer](cache-replacement.html) to see exactly what each policy keeps after the same requests. The page works directly from a file. It does not contact a service, store a session, or change the RecallWeave learner.

## Try the first comparison

Leave the requests as `A B A C B` and the capacity at **2**, then choose **Run comparison**. Both caches start empty. **Next** advances the shared inspection cursor; **Back** returns to a retained state. These controls inspect the same experiment rather than sending the requests again.

At request three, both policies have had two misses and one hit. Their contents have different orders:

| After request | FIFO, oldest inserted first | LRU, least recently used first |
| --- | --- | --- |
| A | A | A |
| B | A, B | A, B |
| A | A, B | B, A |
| C | B, C | A, C |
| B | B, C | C, B |

FIFO does not refresh its insertion order on a hit. It evicts A for C, so the final B hits. LRU refreshes A on its hit, then evicts B for C, so the final B misses. **FIFO has three misses; LRU has four.** This trace does not establish a winner for other requests. Changing only the final B to A reverses the advantage.

A card's contents, hit count and miss count belong to the **selected prefix**. The capacity table uses the **complete sequence**, starting empty separately for every row. For example, inspecting request three does not change the table to a three-request experiment.

## When more FIFO capacity causes more misses

Choose **The FIFO capacity anomaly**, then **Run comparison**. The exact sequence is:

`1 2 3 4 1 2 5 1 2 3 4 5`

These are twelve separate page IDs. A digit is just a name; the page named 5 does not take five slots.

| Capacity | FIFO misses | LRU misses |
| --- | ---: | ---: |
| 1 | 12 | 12 |
| 2 | 12 | 12 |
| 3 | 9 | 10 |
| 4 | 10 | 8 |
| 5 | 5 | 5 |

FIFO's miss positions at capacity three are 1–7, 10 and 11. At capacity four they are 1–4 and 7–12. The larger FIFO cache changes the eviction history enough to incur an extra miss on this sequence. It does not mean every increase is harmful: capacity five retains all five distinct pages after their first requests.

This classic example is credited to L. A. Bélády, R. A. Nelson and G. S. Shedler. The original lesson wording and worked traces here are new; no textbook text or figures are reproduced.

## Why the LRU capacity comparison is different

After any prefix, LRU retains the most recently requested distinct pages, up to its capacity. For the same prefix, the two-page resident set is included in the three-page set. A request that hits in the smaller LRU cache therefore also hits in the larger one. Adding LRU capacity cannot increase misses for the same sequence under this model; equal counts are possible.

For example, after `A B A C`, capacity two holds A, C, while capacity three holds B, A, C. This inclusion argument compares **LRU at different capacities**. It does not compare LRU with FIFO, predict a workload, or establish measured performance.

## Input and download contract

- Enter up to 24 single-character IDs from **A–H or 1–8**. Separate them with whitespace or commas. IDs are literal: A and 1 differ; lowercase and multi-character names are refused.
- Choose a whole-number capacity from one to five pages.
- An empty sequence is valid. Both caches and both counts stay empty or zero, all stepping controls are disabled, and no undefined hit-rate percentage is displayed.
- Changing either input retires the old result immediately. Choose **Run comparison** again to accept the new experiment. Presets also wait for Run.
- **Download experiment** saves the accepted input, both complete immutable traces, the capacity table and the currently displayed step in `cache-replacement-experiment.json`. Viewing a different step does not change the experiment's trace.
- Downloads are local files. The lab does not retain them or automatically save state.

The JSON envelope is `recallweave-cache-experiment/1`, containing `shownStep` and `result`. The result format is `recallweave-cache-trace/1`; `input` records the literal references and capacity. Each policy has an empty `initial` array, ordered `steps`, and `totals`. Its `order` field is exactly `oldest-inserted-first` for FIFO and `least-recently-used-first` for LRU; the arrays use that declared display order. A step records its one-based number, requested page, before/after order, hit boolean, evicted page or null, and cumulative hit/miss counts. `capacityComparison` records full-sequence misses at capacities one through five.

## Study the original course

Use **Download the lesson**, or save [cache-replacement.json](cache-replacement.json). Open [RecallWeave](../demo.html), choose **Bring your own lesson**, select that JSON file and inspect its title, source credit and twelve-question/four-concept preview. The existing learner starts the course only after **Start this deck**.

The lesson asks you to predict evictions, follow the anomaly, justify LRU's inclusion property and separate a trace count from a timing claim. The normal learner controls provide answer feedback, a review of first tries, targeted practice and study notes. The lab's course download preserves the exact checked source bytes. The shared importer, learner model and archive formats are unchanged.

## Model limits and sources

This is a finite, fully associative page-cache model. All pages take one slot, any page can use any slot, and every run starts empty. There are no dirty pages, prefetches, concurrent requests, address-to-set mappings or unequal miss costs. We count hits and misses; we do not time code or simulate a processor cache. The educational outcomes are worked examples, not evidence of learning efficacy.

Algorithm background and the FIFO anomaly are described in the authors' primary text: Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau, [*Operating Systems: Three Easy Pieces*, chapter 22, “Beyond Physical Memory: Policies”](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf), especially the FIFO discussion and recency-based policies. The course and guide contain original wording and derivations with AI assistance, released under CC0-1.0. Referenced materials retain their own terms. RecallWeave's [AI disclosure](../AI-DISCLOSURE.md) remains applicable.

## Maintain this separate lab

The pure core is `cache-replacement-core.mjs`; the DOM adapter and local course loader are `cache-replacement-ui.mjs` and `cache-replacement-entry.mjs`. Serve the repository and open `cache-replacement.template.html` for the modular version. No package installation is needed for the application or native tests.

From the repository root:

```bash
node --test tests/cache-replacement.test.mjs
node tools/build-cache-replacement.mjs
node tools/build-cache-replacement.mjs --check
```

The new builder reads the existing deck validator and the lab's own inputs. It changes only the standalone lab file. It does not rebuild the shared learner demo or any other owner's course.

An optional real-browser receiver uses an already available Playwright module and Chromium executable. It creates its own context, temporary local server and output directory:

```bash
node tools/check-cache-replacement-browser.mjs --playwright /path/to/playwright/index.mjs --browser /path/to/chromium --output /new/owned/receipt-directory
```

Playwright is a receiving dependency only. It is not included in, or required by, the offline lab.
