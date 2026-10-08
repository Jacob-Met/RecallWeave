# SQL query foundations

This optional original course teaches how a SQL query changes a small, fully specified set of rows. It covers duplicate rows, ordered filtering, NULL, aggregate counts, grouping, and the effect of placing a left-join predicate in `ON` or `WHERE`. It has twelve questions across four concepts: `rows`, `nulls`, `groups`, and `joins`.

## Use the explorer

Open [sql-query-explorer.html](sql-query-explorer.html) directly in a browser. It works as one saved file: no server, package installation, account, or network connection is needed. Choose an example, optionally predict its result row count, and select **Show SQLite result**. Example 2 offers thresholds 0, 10, 20, and 30. Example 12 also lets you move that threshold between `WHERE` and `ON`.

The controls select twenty-two prepared queries. The displayed SQL is read-only. Every saved result is obtained by executing the exact displayed query with SQLite during the build; the browser does not simulate a SQL engine. Use **Download practice · SQL** for the original table setup and all prepared queries if you want to edit queries in an actual SQLite scratch database. The file is intended for a new empty database, for example `sqlite3 :memory: < sql-query-practice.sql`.

**Download course · JSON** saves the exact [sql-query-foundations.json](sql-query-foundations.json) file. It follows the published `recallweave-deck/1` format and works with the learner's local deck picker and the separate deck authoring page.

Predictions remain in the current page only. They are not stored, sent, or included in the downloaded course. The page requests a download only after the corresponding button is activated.

## Learn with this course

1. Save the course using the explorer's **Download course · JSON** button, or download [sql-query-foundations.json](sql-query-foundations.json).
2. Open the learner using the [project README's local-server instructions](../README.md), or open a saved copy of the standalone [demo.html](../demo.html) directly in your browser.
3. Under **Bring your own lesson**, use **Choose a deck file** to select `sql-query-foundations.json`. Confirm the title **SQL query foundations — rows, NULLs, groups, and joins**, **12 questions**, and **4 concepts**. **Preview question prompts** shows every question before you begin.
4. Select **Start this deck** to begin the SQL lesson. Previewing the file leaves your current lesson intact; starting it replaces the current first answers and practice progress.
5. Answer all twelve questions, then open items under **Review the connections** to revisit your first answers, correct answers, explanations, and transfer ideas. If you missed a connection, the practice button offers a second pass. Practice records retries separately and keeps your first answers and model estimates unchanged.

Use **Download study notes (.txt)** on the completed learning trace to keep readable questions, first answers, explanations, and any recorded practice answers.

### Keep and restore your learning trace

After completing the twelve first answers, open **Keep or restore a learning trace** and select **Download trace (.json)**. You can save before practice, during paused practice, or after practice finishes. Keep both this trace file and the unchanged SQL course JSON.

To return in a fresh tab or after a reload, choose the same SQL course file and select **Start this deck**. Open **Keep or restore a learning trace**, use **Choose a saved learning trace (.json, up to 2 MiB)** to select the saved trace, inspect its preview, then select **Restore these answers**. **Resume practice** continues any remaining retries. A trace for another course or a changed course version is refused.

The selected lesson stays in the current tab until you reload or choose another deck. This trace flow requires a completed first session; it preserves any subsequent practice progress. The study-notes text file is a readable record, while the trace JSON is the file used for restoration.

## Work from these exact rows

The tables are fictional and have no implied physical units. `id` is the primary key in each table. A reading's `station_id` and `value` can be NULL.

| stations.id | name |
|---:|---|
| 1 | North |
| 2 | South |
| 3 | East |
| 4 | West |

| readings.id | station_id | value |
|---:|---:|---:|
| 1 | 1 | 10 |
| 2 | 1 | NULL |
| 3 | 2 | 20 |
| 4 | 2 | 20 |
| 5 | 2 | 0 |
| 6 | NULL | 30 |

The distinction between reading 2 and reading 6 matters: one lacks a measurement; the other lacks a station assignment. Reading 5's zero is known. A NULL reading ID in a left-join result, by contrast, identifies an added placeholder: the table's actual reading IDs are never NULL.

## Worked answer map

Every question includes its complete source tables, exact SQL, result columns, explanation, and a further query to consider. A tuple in an answer denotes one output row. Empty results are written `(no rows)`. Numeric values such as `16` and `16.0` are treated as numerically equivalent; this is not a storage-type quiz.

| Item | Result to explain | Main distinction |
|---|---|---|
| 01 · Rows | `(20); (20); (0)` | Selecting a column does not automatically remove duplicates. |
| 02 · Filter | IDs `3, 4, 6` at threshold 20 | A predicate about `value` does not also require a station ID. |
| 03 · Order | `(6, 30); (3, 20); (4, 20)` | The explicit ID tie-break orders the two values of 20. |
| 04 · `= NULL` | No rows | The comparison is unknown rather than true. |
| 05 · `IS NULL` | ID `2` | The named measurement column is tested. |
| 06 · Aggregates | `(6, 5, 16)` | Six rows contain five known values totaling 80. |
| 07 · Groups | NULL: `(1, 1, 30)`; station 1: `(2, 1, 10)`; station 2: `(3, 3, 40)` | Group counts, known-value counts, and sums measure different things. |
| 08 · `HAVING` | `(2, 2, 40)` | The zero is filtered before qualifying rows are counted. |
| 09 · Unknown value | Station `1` | A NULL group key does not imply a NULL measurement. |
| 10 · Inner join | Count `5` in one result row | Two North matches plus three South matches. |
| 11 · Left join counts | `(7, 5)` in one result row | Seven output rows contain five actual reading IDs. |
| 12 · Left join filter | `("South", 3, 20); ("South", 4, 20)` | A WHERE predicate can discard stations preserved by the left join. |

For item 12 at threshold 20, placing the predicate in `ON` instead returns five rows: a North placeholder, South's two matches, and one placeholder each for East and West. At threshold 30 the `WHERE` version is empty while the `ON` version retains all four stations as placeholders. Reading 6 never joins to a station in either version. These are fixture-specific outputs, verified by SQLite.

The authored source records a reason for each distractor. Canonical correct-answer indices are balanced across the four positions, and the app retains ownership of its existing option shuffling. Course practice and knowledge estimates keep the app's existing semantics; this content makes no claim of measured learning effectiveness.

## Primary references and scope

The explanations use original wording. SQLite's own documentation provides the language reference:

- [SELECT](https://sqlite.org/lang_select.html): duplicate handling, row filtering, grouping, ordering, limits, and outer joins.
- [SQL expressions](https://sqlite.org/lang_expr.html): comparisons with NULL and `IS NULL`.
- [Aggregate functions](https://sqlite.org/lang_aggfunc.html): `COUNT(*)`, `COUNT(value)`, `AVG`, and `SUM`.

The query in item 7 explicitly relies on SQLite's default ascending NULL-first order. Every multirow teaching result has an explicit `ORDER BY`; the examples do not promise an implicit storage order. The course does not cover database administration, schema migrations, access control, transactions, query optimization, or every SQL dialect.

## Maintain and receive the exact artifacts

The single authored query/data/answer source is [sql-query-foundations.source.json](sql-query-foundations.source.json). The generator uses Python's existing standard-library `sqlite3`, creates an in-memory database, and checks each manually selected correct option against the real result before producing either artifact. Incorrect answers, invalid/multiple statements, and stale saved outputs fail visibly. `--check` does not replace files.

```sh
python3 -B tools/make_sql_query_explorer.py
python3 -B tools/make_sql_query_explorer.py --check
node --test tests/sql-query-foundations.test.mjs
```

The focused Node tests use the published deck validator, adaptive selection, answer order, review, practice, and study-note functions without editing them. They also require the actual SQLite build and check that the downloaded course matches the course file byte for byte. SQLite version information belongs in receiving logs, so equal query results produce the same artifacts across qualified SQLite versions.

For actual browser receiving, use Node 22+ and an already installed Chrome/Chromium executable:

```sh
node tools/check_sql_query_browser.mjs --browser /path/to/chromium --output /path/to/exclusive-receiving-directory
```

This runner opens one isolated browser profile and a temporary loopback server, checks the prepared-query controls and actual download bytes, then closes the server and receives a fresh direct-file page. Its output directory must be new. It never opens a personal browser profile. This command receives the separate query explorer. The SQL course was also received through the published learner's actual local file input, preview, explicit start, all twelve questions, review, practice, notes downloads, and fresh-document trace restoration on both modular and standalone surfaces. See the [SQL-through-picker receiving packet](../docs/receiving/sql-picker-3dab0b9d2ce9/README.md) for exact source pins, native results, screenshots, and scope.
