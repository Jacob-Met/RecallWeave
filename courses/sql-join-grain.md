# SQL join grain: keep each original record in the right total

A join can repeat a perfectly valid record. If a project has several work sessions and several independent reviews, joining both child tables does not give one row per project or one row per session. It produces combinations of session and review records. An aggregate then reads those joined combinations.

This original twelve-question lesson develops that distinction beyond the existing [SQL foundations](sql-query-foundations.md). You will identify what one row represents, separate record identity from equal numeric values, follow totals through grouping and later joins, and distinguish a general guarantee from an equality that happens in one dataset.

The three lesson files are the [importable course](sql-join-grain.json), this worked guide, and the [plain SQL worksheet](sql-join-grain.sql). They add content to the existing learner; they do not change its parser, question selection, answer shuffling, review or export behavior.

## Use the worksheet and course

The worksheet contains the complete original setup, all twelve exact queries and all four original option positions as comments. It embeds no worked answer key. Predict each result before reading the corresponding section below.

If an SQLite command-line program is already available, run the file in a new in-memory database from the repository root:

```sh
sqlite3 -header -column :memory: < courses/sql-join-grain.sql
```

The file enables foreign keys, creates three uniquely named tables and inserts only the fictional rows shown below. It is intended for a fresh empty database; it does not drop or replace existing tables. The SQLite shell's display of NULL and REAL values may differ from the tuple notation in this guide. The exact semantic values and types are stated here.

To use the separate course:

1. Save [sql-join-grain.json](sql-join-grain.json) as a local JSON file.
2. Open the existing [standalone learner](../demo.html) or use the [project's existing local instructions](../README.md).
3. Under **Bring your own lesson**, choose the saved course file. Its title is **SQL join grain — keep each original record in the right total**, with twelve questions and four concepts.
4. Inspect the preview and then explicitly select **Start this deck**. The original option labels in this guide refer to authored A/B/C/D positions, not the learner's shuffled display positions.
5. Complete the first-answer session, open **Review the connections**, and use the existing **Download study notes (.txt)** control to retain your questions, choices, explanations and writing.

These are instructions for the existing controls. At this lesson's initial source seal, its SQL, parser and learner use had not been executed. Source-derived outputs are not runtime observations; actual qualification and source identity belong in the separate receiving evidence. No installed course catalog, offline package or current learner installation is modified by these files.

## Complete fictional data and keys

A project ID identifies a project. A session ID identifies one work session. A review ID identifies one review. The two child tables independently refer to a project; no row links a particular review to a particular session.

| project_id | name |
|---:|---|
| 1 | Atlas |
| 2 | Birch |
| 3 | Cedar |
| 4 | Dune |

| session_id | project_id | minutes |
|---:|---:|---:|
| 101 | 1 | 30 |
| 102 | 1 | 30 |
| 103 | 1 | 15 |
| 201 | 2 | 20 |
| 202 | 2 | 0 |

| review_id | project_id | label |
|---:|---:|---|
| 11 | 1 | ready |
| 12 | 1 | hold |
| 21 | 2 | ready |
| 22 | 2 | ready |
| 23 | 2 | hold |
| 31 | 3 | ready |

Sessions 101 and 102 are separate records even though each has thirty minutes. Reviews 21 and 22 are separate records even though both labels are `ready`. The lesson deliberately retains those equal values. A record's value is not its identity.

Project 3 has one review and no sessions. Project 4 has neither. Session 202 records a known zero, which remains a real session. Every stored value in these tables is non-NULL; NULL values in the taught left-join results come from missing child matches.

The exact schema is:

```sql
CREATE TABLE projects (
  project_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE work_sessions (
  session_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  minutes INTEGER NOT NULL CHECK (typeof(minutes) = 'integer' AND minutes >= 0)
);

CREATE TABLE reviews (
  review_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  label TEXT NOT NULL
);
```

The worksheet also executes `PRAGMA foreign_keys = ON;` before its setup. The hypothetical instances in question 12 satisfy the stated keys and references, contain nonnegative integer minutes, and keep every intermediate sum within SQLite's signed 64-bit integer range. No null-key, floating amount, integer-overflow, custom-function or collation behavior is part of that question.

## Read the outputs precisely

A tuple denotes one result row. Semicolons separate rows in the declared order. `NULL` denotes SQL NULL, not zero or an empty string. The query's selected expressions determine its columns; no output column or implicit storage order is omitted.

Every count and non-NULL sum here is an SQLite INTEGER. Question 03 includes two NULL sums. Both average values in question 11 are REAL; the answer notation `19.0` names the same numeric value as `19`, but the source type remains REAL. The fixed values are small and exactly representable; no rounded floating comparison or tolerant integer match is needed for the authored examples.

The ordered first-question pair output is unique by `(session_id, review_id)`; every other multirow output is unique by its selected `project_id`. Single-row aggregate queries need no row-order convention.

## Worked questions

### 01. One joined row is a pair of records

Which complete ordered (session_id, review_id) rows are returned for project 1?

```sql
SELECT e.session_id, r.review_id
FROM work_sessions AS e
JOIN reviews AS r ON r.project_id = e.project_id
WHERE e.project_id = 1
ORDER BY e.session_id, r.review_id;
```

**Original choice A (index 0).** Expected result: `(101, 11); (101, 12); (102, 11); (102, 12); (103, 11); (103, 12)`.

The join condition connects a session to every review with the same project_id. Project 1 has three sessions and two reviews, so each of its three session IDs appears with both review IDs. The six ordered pairs are the actual joined-row identities. Nothing in these tables pairs a particular session with just one review, and an equality join does not zip records by their positions.

**Write the connection:** Write a sentence naming the two record IDs that identify one joined row, and explain why project_id alone does not identify that row.

### 02. Count joined occurrences and entity identities separately

Which ordered rows distinguish joined row occurrences from distinct session and review IDs? Columns: (project_id, joined_rows, session_ids, review_ids).

```sql
SELECT p.project_id, COUNT(*) AS joined_rows,
       COUNT(DISTINCT e.session_id) AS session_ids,
       COUNT(DISTINCT r.review_id) AS review_ids
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
```

**Original choice B (index 1).** Expected result: `(1, 6, 3, 2); (2, 6, 2, 3); (3, 1, 0, 1); (4, 1, 0, 0)`.

Project 1 contributes 3 x 2 joined pairs, and project 2 contributes 2 x 3. COUNT(*) counts those six row occurrences in each group. Distinct non-NULL session IDs and review IDs still identify three/two records and two/three records respectively. Project 3 has one actual review and a NULL session placeholder; project 4 has a NULL placeholder for both children. Each still contributes one joined row, but a NULL child ID is not an actual child record.

**Write the connection:** Explain why the project 3 and project 4 joined-row counts are the same even though their numbers of actual review records differ.

### 03. Sum sees the repeated joined input

What ordered (project_id, joined_minutes) rows does this query produce? NULL denotes an SQL NULL, not a zero.

```sql
SELECT p.project_id, SUM(e.minutes) AS joined_minutes
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
```

**Original choice C (index 2).** Expected result: `(1, 150); (2, 60); (3, NULL); (4, NULL)`.

Project 1's original minutes are 30 + 30 + 15 = 75, but every session appears twice after the review join, so SUM reads 150. Project 2's 20 + 0 = 20 appears three times, producing 60. Neither project 3 nor project 4 has an actual session value. Their left-join rows contain NULL for e.minutes, so the uncoalesced SUM is NULL. The result is neither a per-session total nor a count of independent review/session work.

**Write the connection:** Describe separately the effect of repeated session rows and the effect of an absent session value in this result.

### 04. Distinct values are not distinct records

Which single row is returned? The scalar subquery reads the original sessions directly. Columns: (joined_sum, distinct_value_sum, session_sum).

```sql
SELECT SUM(e.minutes) AS joined_sum,
       SUM(DISTINCT e.minutes) AS distinct_value_sum,
       (SELECT SUM(minutes) FROM work_sessions
        WHERE project_id = 1) AS session_sum
FROM work_sessions AS e
JOIN reviews AS r ON r.project_id = e.project_id
WHERE e.project_id = 1;
```

**Original choice D (index 3).** Expected result: `(150, 45, 75)`.

SUM reads every joined minute occurrence and returns 150. SUM(DISTINCT e.minutes) first collapses equal numeric values: only 15 and 30 remain, totaling 45. That also collapses the two separate 30-minute sessions, 101 and 102. The scalar subquery reads the three original session records once each and returns 75. Distinct values and distinct entity identities answer different questions.

**Write the connection:** Explain why two equal minute amounts can both belong in a total when their session IDs differ.

### 05. Output DISTINCT acts after the aggregate

What ordered rows are returned when DISTINCT is applied to these already-grouped result rows? Columns: (project_id, counted_sessions).

```sql
SELECT DISTINCT p.project_id,
       COUNT(e.session_id) AS counted_sessions
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
```

**Original choice A (index 0).** Expected result: `(1, 6); (2, 6); (3, 0); (4, 0)`.

GROUP BY first produces one aggregate result row for each project. In each populated group, COUNT(e.session_id) has already counted six non-NULL joined copies. SELECT DISTINCT then removes duplicate complete output rows, but project_id already makes these four rows distinct. It does not revisit the aggregate inputs or reduce the count to the number of session identities. The two projects without sessions each retain a zero count.

**Write the connection:** Describe the stage at which output DISTINCT acts, and why it cannot change a count already calculated from repeated input rows.

### 06. Preserve the selected record ID before deduplication

What single (session_total) row remains when the subquery retains session_id before removing repeated joined copies?

```sql
SELECT SUM(minutes) AS session_total
FROM (
  SELECT DISTINCT e.session_id, e.project_id, e.minutes
  FROM work_sessions AS e
  JOIN reviews AS r ON r.project_id = e.project_id
  WHERE e.project_id = 1
) AS selected_sessions;
```

**Original choice B (index 1).** Expected result: `(75)`.

The inner join produces repeated copies of each selected session record. The subquery keeps session_id as well as project_id and minutes, so DISTINCT removes copies of the same full record while retaining sessions 101 and 102 as different records. SUM then reads 30, 30 and 15 once each, giving 75. This query still selects only sessions that match a review; it does not guarantee preservation of unreviewed sessions in another fixture.

**Write the connection:** State which selected entity key the subquery preserves, and explain the remaining restriction imposed by its inner join.

### 07. A prior summary can be repeated by the next join

The session table is grouped first, but its total is then joined to raw reviews and summed again. What ordered (project_id, minutes) rows result?

```sql
WITH session_totals AS (
  SELECT project_id, SUM(minutes) AS minutes
  FROM work_sessions
  GROUP BY project_id
)
SELECT p.project_id, COALESCE(SUM(s.minutes), 0) AS minutes
FROM projects AS p
LEFT JOIN session_totals AS s ON s.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
```

**Original choice C (index 2).** Expected result: `(1, 150); (2, 60); (3, 0); (4, 0)`.

session_totals initially contains one row for each project with sessions: 75 for project 1 and 20 for project 2. Joining those rows to raw reviews repeats the entire first total twice and the second total three times. The outer SUM therefore returns 150 and 60. COALESCE changes the two absent totals to zero; it does not undo multiplication. Aggregating one input does not prevent a later join from repeating its aggregate.

**Write the connection:** Name the row grain before and after the join to raw reviews. Identify the later operation that repeats a previously computed total.

### 08. Bring both children to one row per project

Both child tables now have one grouped row per project before the joins. What ordered rows result? Columns: (project_id, session_count, session_minutes, review_count).

```sql
WITH session_totals AS (
  SELECT project_id, COUNT(*) AS session_count,
         SUM(minutes) AS session_minutes
  FROM work_sessions GROUP BY project_id
), review_totals AS (
  SELECT project_id, COUNT(*) AS review_count
  FROM reviews GROUP BY project_id
)
SELECT p.project_id,
       COALESCE(s.session_count, 0) AS session_count,
       COALESCE(s.session_minutes, 0) AS session_minutes,
       COALESCE(r.review_count, 0) AS review_count
FROM projects AS p
LEFT JOIN session_totals AS s ON s.project_id = p.project_id
LEFT JOIN review_totals AS r ON r.project_id = p.project_id
ORDER BY p.project_id;
```

**Original choice D (index 3).** Expected result: `(1, 3, 75, 2); (2, 2, 20, 3); (3, 0, 0, 1); (4, 0, 0, 0)`.

Each common-table expression groups its own child table by project_id, so it has at most one row per project. The joins therefore attach one session summary and one review summary to each unique project row. Project 1 has three sessions totaling 75 and two reviews; project 2 has two sessions totaling 20 and three reviews. Project 3 contributes one review and no sessions. Project 4 has neither. COALESCE explicitly represents the absent child counts and minutes as zero.

**Write the connection:** Explain how a one-row-per-project guarantee for each child summary prevents this particular multiplication.

### 09. Count summary rows or sum their stored counts

This join has one row per project. What single row distinguishes projects, present rollups and original sessions? Columns: (project_rows, projects_with_sessions, total_sessions).

```sql
WITH session_totals AS (
  SELECT project_id, COUNT(*) AS session_count
  FROM work_sessions GROUP BY project_id
)
SELECT COUNT(*) AS project_rows,
       COUNT(s.session_count) AS projects_with_sessions,
       COALESCE(SUM(s.session_count), 0) AS total_sessions
FROM projects AS p
LEFT JOIN session_totals AS s ON s.project_id = p.project_id;
```

**Original choice A (index 0).** Expected result: `(4, 2, 5)`.

There are four unique project rows after the join. Only two projects have a session_totals row, so COUNT(s.session_count) is two. The non-NULL session_count values are three and two; summing those stored counts recovers five original sessions. A count of grouped rows measures the number of represented projects, not the number of original records summarized by those rows.

**Write the connection:** Describe the different questions answered by counting project rows, counting present summary rows, and summing the summary's session_count.

### 10. Use existence when the requirement is only membership

A project qualifies if it has at least one 'ready' review. What ordered rows does this EXISTS filter return? Columns: (project_id, session_count, session_minutes).

```sql
SELECT e.project_id, COUNT(*) AS session_count,
       SUM(e.minutes) AS session_minutes
FROM work_sessions AS e
WHERE EXISTS (
  SELECT 1 FROM reviews AS r
  WHERE r.project_id = e.project_id AND r.label = 'ready'
)
GROUP BY e.project_id
ORDER BY e.project_id;
```

**Original choice B (index 1).** Expected result: `(1, 3, 75); (2, 2, 20)`.

EXISTS is a predicate on each original session. Project 1 has a ready review, and project 2 has two ready reviews, but either positive number makes the predicate true just once for the session being considered. The three and two original session records remain, totaling 75 and 20. Project 3 has a ready review but no row in work_sessions to retain, so this session-based query does not emit a project 3 group.

**Write the connection:** Explain why checking that a ready review exists does not require producing one output session copy for every ready review.

### 11. Unequal repetition changes the weights of an average

The first average reads joined session/review pairs; the scalar subquery reads original sessions. Which single (joined_mean, session_mean) row is returned? Both columns are SQLite REAL values; numerically equal decimal spellings mean the same value.

```sql
SELECT AVG(e.minutes) AS joined_mean,
       (SELECT AVG(minutes) FROM work_sessions) AS session_mean
FROM work_sessions AS e
JOIN reviews AS r ON r.project_id = e.project_id;
```

**Original choice C (index 2).** Expected result: `(17.5, 19.0)`.

The joined rows contain six copies associated with project 1 and six with project 2: their minute sums are 150 and 60, so the first average is 210 / 12 = 17.5. The original five sessions sum to 95, giving 95 / 5 = 19.0. Sessions in project 2 receive a repetition factor of three instead of two, which changes their weight. Repetition can leave an average unchanged in other data; this specific unequal weighting changes it.

**Write the connection:** Describe how review counts act as repetition weights here. Distinguish this mechanism from a claim that every join must change every average.

### 12. Prove a sufficient condition across all eligible instances

This question concerns every finite table instance satisfying the stated keys and references, not just the displayed rows. Minutes remain nonnegative integers, and every intermediate sum fits SQLite's signed 64-bit integer range. Define the true total for each project as the sum of its original work_sessions rows, with zero for none. Which ONE additional condition guarantees that the query below returns those true totals for EVERY such instance satisfying that condition? It asks for a sufficient condition, not a necessary condition for accidental equality in one fixture.

```sql
SELECT p.project_id, COALESCE(SUM(e.minutes), 0) AS minutes
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
```

**Original choice D (index 3).** Every project has at most one review.

On the displayed fixed fixture, the same literal query returns `(1, 150); (2, 60); (3, 0); (4, 0)`. That fixed result is a separate fact from the universal condition question.

At most one review per project is sufficient. With zero matching reviews, LEFT JOIN supplies one NULL review placeholder per incoming session row; with one review, each incoming session matches once. Every original session minute value is therefore summed once, and a project with no sessions becomes zero through COALESCE. The other proposed conditions permit multiple reviews and do not stop repetition. This is an all-instances guarantee, not a claim that the condition is necessary for one fixture to happen to give the right total.

**Write the connection:** In your own words, separate an all-instances sufficient-condition guarantee from an observed equality for a particular dataset.

## The general-policy proof and a concrete counterexample

Question12 concerns every eligible finite instance satisfying the selected additional condition. It is not asking whether a condition happens to hold in the displayed data. Nor does it ask for a necessary condition for one particular sum to be correct.

For a project with sessions, the first left join contributes each session row. When that project has zero reviews, the second left join retains the row with one NULL review placeholder. When it has one review, the row matches that review once. Under the **at-most-one-review** condition, each original session amount therefore enters the sum once.

A project with no sessions still has a project row. Its session amount is NULL, and `COALESCE` gives the explicitly defined empty total of zero. The stated safe-integer assumption prevents a separate overflow refusal from obscuring this row-count argument.

The following complete alternative instance refutes each of the other three proposed guarantees. It uses the same schema:

| projects.project_id | name |
|---:|---|
| 1 | Counterexample |

| work_sessions.session_id | project_id | minutes |
|---:|---:|---:|
| 1 | 1 | 10 |
| 2 | 1 | 20 |

| reviews.review_id | project_id | label |
|---:|---:|---|
| 1 | 1 | ready |
| 2 | 1 | hold |

This project has at least one review, its session minute values are different, and its review label strings are different. All three incorrect conditions are satisfied simultaneously. Yet the two sessions each match both reviews: the fixed question 12 query totals `10 + 10 + 20 + 20 = 60`, while the original sessions total `10 + 20 = 30`.

That one valid instance disproves each corresponding all-instances claim. It does not say that every instance satisfying one of those conditions must fail. Conversely, an individual dataset can give the correct total without the sufficient condition—for example, repetition does not change a zero total. Observed equality is not a proof that repetition is absent.

The correct option is a condition under which the given query is guaranteed to preserve these totals. It is not advice to remove legitimate review records from an actual system. Question 08 instead demonstrates a representation that permits many reviews while retaining one row per project in each child summary.

## Follow the row grain through each operation

For a fixed project, let `m` be its number of sessions, `n` its number of reviews, and `S` the sum of its original session minutes.

An inner join between these two child collections contributes `m × n` pairs. If either collection is empty, that inner join contributes no pair for the project. Starting from the project table and left joining both collections produces `max(m, 1) × max(n, 1)` joined rows instead. Placeholder rows preserve the project; they are not additional session or review records.

When `m > 0`, the raw two-child left join repeats each real session `max(n, 1)` times. Its minute sum is therefore `S × max(n, 1)`. When `m = 0`, the uncoalesced sum is NULL, and an explicit empty-total policy can map that to zero. These are logical result correspondences, not a claim about the engine's physical execution order.

Three distinct questions therefore need different expressions:

- **How many joined row occurrences are present?** Count the joined rows.
- **How many original records are represented?** Identify the appropriate non-NULL record key, retaining the intended selected subset.
- **What total belongs to the intended entities?** Ensure each entity's value enters the aggregate with the intended multiplicity.

`SUM(DISTINCT minutes)` answers a different question: the sum of distinct minute values. It cannot distinguish two legitimate records that carry the same amount. `SELECT DISTINCT` after an aggregate acts on already-computed output rows; it cannot undo an earlier multiplication inside the aggregate.

Grouping both independent children to one row per project makes their later join compatible with that same project grain. Grouping only one child is insufficient if the resulting total is subsequently repeated and summed again. After grouping, counting the summary rows and summing a count stored inside those rows also answer different questions.

An existence predicate can retain a session because a qualifying review is present without adding one session copy for every matching review. The scope of its outer query still matters: a query starting from sessions cannot emit a project that has no session.

For averages, repeated records become weights. In the displayed data, project 1's sessions receive two copies and project 2's sessions receive three. The weighted numerator and denominator give a different value from the original-session mean. Equal repetition factors, constant values or other particular data can leave a mean unchanged; this lesson makes no claim that every join changes every average.

## Scope, sources and attribution

This is original teaching content about SQLite result multiplicity. It is not database administration, schema migration, a query optimizer, a performance benchmark, a financial reconciliation method or an assurance about a real dataset's business keys.

Primary language references are SQLite's [SELECT documentation](https://www.sqlite.org/lang_select.html), [aggregate functions](https://www.sqlite.org/lang_aggfunc.html), and [EXISTS expression](https://www.sqlite.org/lang_expr.html#the_exists_operator). They support the join, grouping, DISTINCT, count/sum/average and predicate semantics; the fictional tables, questions, counterexample and worked arguments here are original. The source target is SQLite 3.50.4 semantics. A later runtime observation must identify its actual engine and remain distinct from a hand-derived result.

The existing SQL foundations, transactions, window functions, functional dependencies, foreign keys, recursive queries, conflict serializability and NULL-membership courses retain their owners and sources. This lesson does not edit the learner, importer, authoring studio, notes exporter, catalog or offline pack.

Original course material may be used, adapted and redistributed with attribution to RecallWeave contributors. The linked documentation retains its own terms and is not reproduced here.
