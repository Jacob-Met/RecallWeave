# Hash tables: follow the probe

Open [the offline explorer](hash-tables-explorer.html) directly in a browser. Edit a short history of integer-set operations and inspect every visited slot. Download [the original twelve-question course](hash-tables.json), then open [RecallWeave](../demo.html), choose the JSON under **Bring your own lesson**, inspect the preview and select **Start this deck**.

The course uses the existing learner, first-answer review, practice and study-note flows. Its four concepts are home slots and collisions, probe order and stopping, deletion and duplicates, and capacity and cost. All questions, examples and explanations are original. They require arithmetic with remainders and zero-based indices; no programming language or external account is required.

## A small, explicit model

This explorer stores an **integer set**: a key is either present once or absent. It has no values to update and no duplicate-key copies.

- Capacity is an integer from **3 to 17**, fixed for the entire history.
- Keys are integers from **−9999 to 9999**. Negative zero is the same key as zero.
- A history starts empty and contains **0–24 operations**, in the supplied order.
- The home slot is the nonnegative remainder of the key divided by capacity: an index from 0 through capacity − 1.
- Linear probing checks the home slot, then the next slot, wrapping from the final slot to 0.
- A probe counts one inspected slot, including an empty or deleted slot.
- Each operation inspects at most one complete cycle. The table does not resize.

For example, with capacity 7, both 24 and −4 have home slot 3:

- 24 = 3 × 7 + 3.
- −4 = −1 × 7 + 3.

This deliberate remainder rule makes each example easy to work through. It is not a recommendation for distributing arbitrary application keys, a cryptographic hash, or a performance benchmark.

## Three slot states

| State | Meaning | What a search does |
| --- | --- | --- |
| Never-used empty | This slot has not held a key in the current history. | Stops: the key is absent. |
| Occupied | This slot currently holds one integer key. | Stops on equality; otherwise continues. |
| Deleted | A key was removed from this slot. | Continues; another key may lie farther along. |

A never-used empty slot is evidence of absence because insertion would have stopped there. A tombstone does not offer that evidence. This model never turns a used slot back into never-used empty.

Deleting a found key replaces it with a tombstone. A failed find or delete changes no slot. Finding a key does not modify the table.

### Follow the deletion example

Use capacity 7 and these operations:

~~~
insert 10
insert 17
insert 24
delete 17
find 24
insert 31
~~~

The three insertions put 10, 17 and 24 into slots 3, 4 and 5. Deleting 17 leaves slot 4 marked deleted. The last two operations expose the reason for that marker:

| Operation | Slots inspected | Result |
| --- | --- | --- |
| Find 24 | 3 (10), 4 (deleted), 5 (24) | Found at 5 after three probes. |
| Insert 31 | 3 (10), 4 (deleted), 5 (24), 6 (empty) | Absence proved at 6; first tombstone 4 reused after four probes. |

Marking slot 4 never-used empty would make the find incorrectly stop before key 24.

## Reusing a tombstone needs a duplicate check

Insertion remembers the **first** deleted slot but keeps probing. A later matching key means **present**, with no mutation. Only a never-used empty slot or one complete cycle proves that the key is absent. If absence is proved, insertion uses the remembered tombstone, or otherwise the empty slot that stopped the search.

For a counterexample, start empty with capacity 7:

~~~
insert 10
insert 17
insert 24
delete 10
insert 24
~~~

The last insertion probes 3 (deleted), 4 (17), then 5 (24). Slot 3 stays deleted and slot 5 keeps the single existing 24. Filling the first tombstone immediately would create an unwanted duplicate.

## A complete cycle still terminates

Use capacity 3 and insert 0, 3 and 6. All home slots are 0, and the keys occupy 0, 1 and 2.

- Insert 9 inspects 0, 1 and 2, reports **full**, and leaves the table unchanged.
- Insert 6 inspects those same slots but reports **present** at 2.
- Delete 3, then insert 9: the insertion remembers deleted slot 1, finishes its three-slot cycle, proves absence, and fills slot 1.

There need not be a never-used empty slot for an operation to terminate. There must be an explicit cycle bound. “Full” means that insertion has established absence and found no usable slot; a table containing a tombstone still has a usable slot.

## Use the explorer

Choose a worked example and **Load example**, or edit capacity and the operation text. Loading an example deliberately replaces the editor and restarts its trace. Each nonblank line has an operation and one integer, such as `insert -8`. Commands are case-insensitive; tokens with a decimal point or exponent are not accepted by the text editor.

**Apply operations** checks the complete draft, then starts a fresh empty-table trace. Editing alone does not change the applied trace. Invalid input leaves it intact, with an explicit message. **Revert edits** restores the last applied editor text.

- **Next step** and **Previous step** move through an initial frame, the actual probes and each operation's result.
- Probe frames show the table before the operation changes it. Only the result frame can apply an insertion or deletion.
- **Restart trace** returns to the same applied history's empty table.
- **Show final table** skips to the last result.
- **Inspect operation** jumps to its first probe; it does not change the history.
- **See every operation result** opens the complete probe orders and outcomes.
- **Download applied trace (.json)** saves that applied history and its results. It is a readable record, not a file this explorer restores.
- **Download lesson (.json)** saves the exact original course for RecallWeave's existing explicit import flow.

The controls use ordinary keyboard focus and native buttons, selects and text fields. Slot states are written out as well as styled. The ordered table wraps across rows on smaller screens; indices keep their original order. A long complete-results table has its own labeled horizontal scrolling region.

All computation takes place in this tab. Reloading returns to the built-in example. Nothing is uploaded or automatically saved to browser storage. A download creates a separate file through the browser's normal save flow. Without JavaScript, the page still provides a worked example and direct course/guide links.

## What the counts mean

The occupied fraction is the number of live keys divided by capacity. Deleted slots contain no live key, but still lengthen some probe paths. Layout and deletion history matter as well as the live count.

The displayed count is the exact number of inspected slots for this operation. It excludes drawing, validation and serialization. This bounded model may inspect every slot, so its worst-case probe count is the capacity. Expected fast hashing needs assumptions about key distribution and capacity management; the fixed small examples do not measure average application performance.

## Source and reproducible build

New files are isolated from the existing learner, importer, learning model, catalog and other courses:

| File | Purpose |
| --- | --- |
| `courses/hash-tables.json` | Original checked lesson deck. |
| `courses/hash-tables-explorer.template.html` | Page structure and styles. |
| `src/hash-tables.mjs` | Pure bounded integer-set model. |
| `src/hash-tables-ui.mjs` | Local editor, trace controls and downloads. |
| `tools/make_hash_tables_explorer.mjs` | Deterministic standalone builder. |
| `courses/hash-tables-explorer.html` | Generated page; open directly. |
| `tests/hash-tables.test.mjs` | Focused model, course and generation regression checks. |
| `tests/hash-tables-independent/` | Separately authored mathematical reference, literal witnesses and full-result receiver. |

From the repository root with existing Node 20 or later:

~~~sh
node tools/make_hash_tables_explorer.mjs
node tools/make_hash_tables_explorer.mjs --check
node --test tests/hash-tables.test.mjs
~~~

The builder validates the deck with the existing `src/deck.mjs` contract, embeds the exact deck text, and combines only the new model, UI and template. It has no package install step. `--check` reads without rewriting the generated page and fails on any mismatch. The checked-in HTML needs no build or server when used by a learner.

### Rerun the independent mathematical receiver

The three files in `tests/hash-tables-independent/` were authored separately from the product model and retained unchanged. With Node 20 or later, from the repository root:

~~~sh
node tests/hash-tables-independent/receive-model.mjs --module src/hash-tables.mjs --out /tmp/recallweave-hash-receiving
~~~

Choose a new output directory; the command refuses an existing one. It uses only Node's standard modules. It regenerates a deterministic corpus, checks six literal worked histories and three deliberately faulty reference subjects, then compares the product's complete results and trace against its independent reference.

Coverage is explicit: all 97 reachable three-slot tables over keys 0, 3, 6 and 1, with all 1,164 outgoing insert/find/delete operations, plus empty and signed-key histories for every capacity from 3 through 17. There are 1,245 scenarios in total, 41 admission/immutability controls and 173 home-index checks. This finite coverage does not mean every possible history over every permitted key is enumerated.

The generated `corpus.json` has SHA-256 `5bc1f16bdc968ebad9b3748eb278f43daf837962d83496a89a12a7b307fd52a2`. The output directory retains that corpus, explicit receiver counterexamples and a source-bound JSON receipt. No browser or network is required. These independent checks are separate from the seven focused regression tests above.

### Public model API

`src/hash-tables.mjs` exports:

- `LIMITS`: `minCapacity`, `maxCapacity`, `minKey`, `maxKey`, `maxOperations`.
- `validateScenario(value)`: returns a deep-frozen canonical copy.
- `homeIndex(key, capacity)`: returns the nonnegative home index.
- `runScenario(value)`: returns the complete immutable result and explicit trace.

A scenario is `{ capacity, operations }`, with operations `{ type, key }` where type is `insert`, `find` or `delete`. Both objects require exactly those own string keys. Plain objects may have `Object.prototype` or a null prototype. Arrays and other object prototypes are not accepted as scenario/operation objects.

Invalid shape, an extra field, an unknown operation, a non-number, nonfinite number or fractional number throws `TypeError`. An otherwise valid integer or operation count outside the declared bounds throws `RangeError`. Messages identify the relevant field. Numeric negative zero becomes zero. Inputs are not mutated.

The result has `scenario`, `initialSlots`, `operations`, `finalSlots` and `trace`. Each slot is `{ kind: 'empty' }`, `{ kind: 'deleted' }` or `{ kind: 'occupied', key }`.

Each operation result contains:

~~~js
{
  operationIndex, operation: { type, key }, home,
  before, probes, status, index, after
}
~~~

Each probe is `{ index, slot, decision, firstDeleted }`. Decisions are `collision`, `match`, `empty-stop`, `remember-deleted` and `skip-deleted`. `firstDeleted` is the insertion candidate after that observation, or `null`; it stays null for finds and deletes.

Statuses are `inserted`, `present` or `full` for insert; `found` or `absent` for find; and `deleted` or `absent` for delete. Result `index` is the affected/matching slot, or null for full/absent.

The flattened trace starts with `{ kind: 'initial', operationIndex: null, probeIndex: null, slots }`. Each operation then contributes one `probe` frame per inspected slot, with zero-based operation/probe indices and its pre-operation slots, followed by a `result` frame with a null probe index and its post-operation slots. This makes each visible step inspectable without hiding mutations inside a probe.

## Sources and permission

Algorithm background was checked against these primary references:

1. Paul E. Black, [“hash table,” NIST Dictionary of Algorithms and Data Structures](https://xlinux.nist.gov/dads/HTML/hashtab.html), entry modified 20 April 2022: key-to-slot mapping, collisions and collision-resolution families.
2. Pat Morin, [*Open Data Structures*, section 5.2, “LinearHashTable: Linear Probing”](https://opendatastructures.org/ods-python/5_2_LinearHashTable_Linear_.html): cyclic probing, distinct never-used/deleted states, membership checks before insertion and capacity assumptions.

Morin's full data structure includes resizing and stronger capacity invariants. This lesson deliberately uses a fixed bounded table and an explicit full-cycle stop, so its counts and behavior are stated independently.

The wording, questions, distractors, examples and explorer are original. No reference exercises, prose or figures are reproduced. The course content is dedicated under **CC0-1.0**; referenced materials retain their own terms. Attribution and the permission statement are embedded in the JSON deck and travel with it into RecallWeave's existing learner and study notes.
