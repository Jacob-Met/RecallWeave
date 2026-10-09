# SQL NULL: membership and absence

This original twelve-question lesson develops a specific sequel to [SQL query foundations](https://github.com/Jacob-Met/RecallWeave/blob/ec07bf3989132130759e5c00c6cb02eef19709d3/courses/sql-query-foundations.md): predict what membership and absence tests do when either side can contain SQL NULL. Work through the actual rows, choose a policy for missing request codes, and distinguish a predicate that works on one fixture from a predicate justified for every allowed right-hand relation.

The three files belong together:

- [Importable course](sql-null-membership.json), using the unchanged `recallweave-deck/1` format.
- This worked guide, with all questions, complete outcomes and a general policy argument.
- [Plain SQL worksheet](sql-null-membership.sql), containing the original setup and twelve numbered SELECT statements.

All tables, values, questions and explanations are original fictional teaching material. The reference dialect is **SQLite 3.53.1**. This lesson assumes basic SELECT, WHERE, equality, SQL NULL and subqueries. It does not teach a production schema, transaction isolation, query performance, text collation, coercion or another engine's dialect.

## Open the lesson and keep your notes

Save `sql-null-membership.json` as a separate local file. Open an existing RecallWeave learner, choose it under **Bring your own lesson**, inspect the title **SQL NULL: membership and absence**, **12 questions** and **4 concepts**, then select **Start this deck**. Starting explicitly replaces that tab's prior lesson state. The adaptive question order may differ from the fixed order in this guide; each question restates its needed givens.

For the existing local edit-distance installation, use its ordinary **Open RecallWeave.command** entry, follow **Open the unchanged RecallWeave learner**, then choose this separate course file. Its app and original edit-distance assets are unchanged; this new course is not installed into that package or added to its catalog. Opening a saved standalone `demo.html` and selecting the course is the same documented learner operation.

After the twelve first answers, review the feedback and write an explanation of your own. Use **Download study notes (.txt)** to keep the actual question order, selected answers, supplied explanations, transfer prompts and your writing. The lesson remains in tab memory; a reload returns to the learner's bundled lesson. Keep the course and downloaded notes as separate files. Notes are a readable record, and this lesson does not add a restore or automatic-save mechanism.

## Execute the worksheet

The worksheet is plain SQL with comments. It creates `requests` and `blocked` once, then performs twelve read-only SELECT statements against the fictional data. Use a **fresh in-memory database**, as shown, rather than an existing database with these table names.

With an already installed [SQLite command-line shell](https://www.sqlite.org/cli.html), from the repository root:

```sh
sqlite3 -batch -bail -echo -header -csv -nullvalue NULL :memory: < courses/sql-null-membership.sql
```

The shell's echo option keeps each numbered query visible, including those that return no rows. The explicit NULL display helps distinguish an unknown value from an empty field. The expected-row comments are part of the worksheet so you can compare the whole result.

The original SQL is also usable through [Python's standard sqlite3 module](https://docs.python.org/3.12/library/sqlite3.html), with no third-party package. The native receiving record identifies the exact engine/runtime actually used; it does not claim that a separate SQLite shell executable was tested. All query text is in the worksheet, so no application, browser or saved personal database is involved in executing it.

## Complete fixture and notation

```sql
CREATE TABLE requests (id INTEGER PRIMARY KEY, code INTEGER);
CREATE TABLE blocked (code INTEGER);
INSERT INTO requests (id, code) VALUES (1, 7), (2, 9), (3, NULL);
INSERT INTO blocked (code) VALUES (7), (NULL), (7);
```

`requests` has three rows. `blocked` has three rows, including two copies of 7 and one NULL. All results below are complete in the query's stated order. **0** means false, **1** means true and **NULL** is an SQL NULL value. `[]` means no result rows. A JSON `null` in a worksheet comment or receipt represents SQL NULL.

A `WHERE` expression must be true to keep its row; false and unknown are both excluded. An absence requirement must also say how to handle a missing *outer* code. The worked questions progressively separate these choices.

## Worked questions

The A–D labels below are the original file order. The learner shuffles displayed options and retains their original identities, so match the answer text when reviewing a session.

### 01. A known operand can settle an unknown expression

SQLite represents false as 0, true as 1, and an unknown SQL result as NULL. What single row does this query return, in the displayed column order?

```sql
SELECT NOT NULL AS negated_unknown,
       0 AND NULL AS false_and_unknown,
       1 OR NULL AS true_or_unknown;
```

- **A.** (NULL, NULL, NULL)
- **B.** (0, 0, 1)
- **C.** (NULL, 0, 1)
- **D.** (1, 0, 1)

**Answer: C.** NOT NULL remains unknown. False already settles an AND expression as false, while true already settles an OR expression as true. The returned row is (NULL, 0, 1); these are three SQL values, not strings or a count of rows.

| negated_unknown | false_and_unknown | true_or_unknown |
| --- | --- | --- |
| NULL | 0 | 1 |

**Try next:** Evaluate NULL AND 1 and NULL OR 0. Explain why neither of those has the deciding known operand used in this question.

### 02. The excluded-middle expression can remain unknown

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

Which ordered list of ids does this query return?

```sql
SELECT id FROM requests
WHERE (code = 7) OR NOT (code = 7)
ORDER BY id;
```

- **A.** [1, 2, 3]
- **B.** [1, 2]
- **C.** [1]
- **D.** [] (no rows)

**Answer: B.** For code 7, the predicate is true OR false; for code 9 it is false OR true. For the missing code, both code = 7 and its negation are unknown, so their OR is unknown. WHERE keeps only true rows, leaving ids 1 and 2. The classical P OR NOT P identity does not force an unknown SQL predicate to true.

| id |
| --- |
| 1 |
| 2 |

**Try next:** Design a WHERE condition that keeps all three requests while still distinguishing a known comparison result from an unknown one.

### 03. A definite match is not poisoned by another NULL

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

What are all returned rows (id, in_set, not_in_set), in order? NULL denotes SQL NULL, not a string.

```sql
SELECT id,
       code IN (SELECT code FROM blocked) AS in_set,
       code NOT IN (SELECT code FROM blocked) AS not_in_set
FROM requests
ORDER BY id;
```

- **A.** [(1, 1, 0), (2, NULL, NULL), (3, NULL, NULL)]
- **B.** [(1, 1, 0), (2, 0, 1), (3, 0, 1)]
- **C.** [(1, NULL, NULL), (2, NULL, NULL), (3, NULL, NULL)]
- **D.** [(1, 1, 0), (2, 0, 1), (3, 1, 0)]

**Answer: A.** Request 1 has a definite match on 7, so IN is true and NOT IN is false even though another blocked row is NULL. Request 2 has no definite match but comparison with the blocked NULL is unknown. Request 3 also has unknown comparisons with this nonempty relation. Thus the last two rows have NULL for both operators. The duplicate 7 does not add output rows.

| id | in_set | not_in_set |
| --- | --- | --- |
| 1 | 1 | 0 |
| 2 | NULL | NULL |
| 3 | NULL | NULL |

**Try next:** Remove the blocked NULL and predict which cells change. Then keep only the blocked NULL and predict the complete result again.

### 04. NOT IN can reject every request

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

Which ordered list of ids does this query return?

```sql
SELECT id FROM requests
WHERE code NOT IN (SELECT code FROM blocked)
ORDER BY id;
```

- **A.** [2]
- **B.** [2, 3]
- **C.** [3]
- **D.** [] (no rows)

**Answer: D.** Request 1 produces false for NOT IN. Requests 2 and 3 produce unknown rather than true because the nonempty right-hand relation contains NULL. WHERE admits none of those values, so no rows are returned. Replacing this expression with NOT EXISTS would change the selected outer NULL policy as well as the treatment of the right-hand NULL.

No result rows (`[]`). Column: `id`.

**Try next:** State whether a missing request code should be kept, rejected or reported separately before choosing an absence query.

### 05. An empty relation is not a NULL-valued row

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

The subquery's WHERE 0 returns no rows. What are all returned rows (id, in_empty, not_in_empty), in order?

```sql
SELECT id,
       code IN (SELECT code FROM blocked WHERE 0) AS in_empty,
       code NOT IN (SELECT code FROM blocked WHERE 0) AS not_in_empty
FROM requests
ORDER BY id;
```

- **A.** [(1, 0, 1), (2, 0, 1), (3, NULL, NULL)]
- **B.** [(1, 0, 1), (2, 0, 1), (3, 0, 1)]
- **C.** [(1, NULL, NULL), (2, NULL, NULL), (3, NULL, NULL)]
- **D.** [(1, 1, 0), (2, 1, 0), (3, 1, 0)]

**Answer: B.** The subquery returns no rows, including no NULL-valued row. IN is false and NOT IN is true for an empty right-hand relation, even when the outer value is NULL. Every request therefore produces (0, 1). An empty relation is different from a relation containing one NULL.

| id | in_empty | not_in_empty |
| --- | --- | --- |
| 1 | 0 | 1 |
| 2 | 0 | 1 |
| 3 | 0 | 1 |

**Try next:** Compare an empty subquery with SELECT NULL. Explain why both may look blank in a display while producing different membership results.

### 06. Filtering right-hand NULLs has a boundary

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

Which ordered list of ids does this query return after removing NULL from the right-hand relation?

```sql
SELECT id FROM requests
WHERE code NOT IN (SELECT code FROM blocked WHERE code IS NOT NULL)
ORDER BY id;
```

- **A.** [2]
- **B.** [2, 3]
- **C.** [] (no rows)
- **D.** [1]

**Answer: A.** Filtering the right-hand relation leaves two 7 values and no NULL. Request 1 is a definite match; request 2 is a definite nonmatch; the outer NULL still produces unknown against this nonempty right side. Only id 2 survives WHERE. This result does not prove that filtering the right side always excludes outer NULLs: if that filtered relation is empty, NOT IN is true for the outer NULL too.

| id |
| --- |
| 2 |

**Try next:** Use a right-hand relation containing only NULL. Predict what the filtered NOT IN does to the missing request code.

### 07. EXISTS observes rows, not projected values

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

What single row (has_row, has_no_rows) does this query return? Both subqueries project the literal NULL.

```sql
SELECT EXISTS(SELECT NULL FROM blocked WHERE code = 7) AS has_row,
       EXISTS(SELECT NULL FROM blocked WHERE 0) AS has_no_rows;
```

- **A.** (NULL, NULL)
- **B.** (2, 0)
- **C.** (1, 0)
- **D.** (0, 0)

**Answer: C.** EXISTS checks whether the subquery returns any row, not whether its projected value is non-NULL and not how many rows it returns. The first subquery returns two rows whose projected values are NULL, so EXISTS is 1. The second returns no row, so EXISTS is 0.

| has_row | has_no_rows |
| --- | --- |
| 1 | 0 |

**Try next:** Replace SELECT NULL with SELECT 99 in both subqueries. Explain why the EXISTS values do not change.

### 08. Equality-based absence includes a missing outer key

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

Which ordered list of request ids does the correlated absence query return?

```sql
SELECT r.id FROM requests AS r
WHERE NOT EXISTS (
  SELECT 1 FROM blocked AS b WHERE b.code = r.code
)
ORDER BY r.id;
```

- **A.** [] (no rows)
- **B.** [2]
- **C.** [3]
- **D.** [2, 3]

**Answer: D.** The correlated equality finds rows for request 1. It finds none for code 9 and none for the outer NULL: b.code = NULL is never true, including when b.code itself is NULL. NOT EXISTS is therefore true for ids 2 and 3. If the policy excludes missing request codes, add an explicit outer IS NOT NULL condition.

| id |
| --- |
| 2 |
| 3 |

**Try next:** Write the additional condition needed to exclude unknown request codes while preserving known absent codes.

### 09. An aggregate row is still a row

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

The subquery below uses COUNT(*) without GROUP BY. Which ordered list of request ids does the whole query return?

```sql
SELECT r.id FROM requests AS r
WHERE NOT EXISTS (
  SELECT COUNT(*) FROM blocked AS b WHERE b.code = r.code
)
ORDER BY r.id;
```

- **A.** [] (no rows)
- **B.** [2, 3]
- **C.** [2]
- **D.** [1, 2, 3]

**Answer: A.** COUNT(*) without GROUP BY returns one aggregate result row even when its filtered input has zero rows. For the three requests the inner counts would be 2, 0 and 0, but every inner query still returns a row. EXISTS is true each time and NOT EXISTS is false, so the outer query returns no rows. Counting zero matches is not the same as returning zero rows.

No result rows (`[]`). Column: `id`.

**Try next:** Replace the aggregate subquery with SELECT 1 using the same WHERE. Explain why the zero-match case now differs.

### 10. Make the outer-key policy explicit

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

The required policy is to consider only known request codes and keep a request if no blocked code equals it. Which ordered list of ids does this explicit policy return?

```sql
SELECT r.id FROM requests AS r
WHERE r.code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code = r.code)
ORDER BY r.id;
```

- **A.** [2, 3]
- **B.** [2]
- **C.** [] (no rows)
- **D.** [1]

**Answer: B.** The outer IS NOT NULL test explicitly excludes request 3. For the two known codes, NOT EXISTS keeps exactly a code with no equal blocked row: 7 is found and 9 is absent. The result is id 2. A blocked NULL cannot create a true equality match for a known code.

| id |
| --- |
| 2 |

**Try next:** Predict this explicit policy when blocked has no rows and when blocked contains only NULL.

### 11. Choose a predicate for every allowed relation

SQLite. requests AS r has rows (id, code) = (1, 7), (2, 9), (3, NULL). blocked(code) may be ANY finite collection of integers and NULLs, including no rows or duplicate rows. Select exactly those requests whose code is non-NULL and for which no blocked row has an equal code under =. Which predicate, placed after WHERE, implements this policy for EVERY allowed blocked relation?

- **A.** r.code NOT IN (SELECT b.code FROM blocked AS b WHERE b.code IS NOT NULL)
- **B.** NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code = r.code AND b.code IS NOT NULL)
- **C.** r.code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code = r.code)
- **D.** r.code IS NOT NULL AND r.code NOT IN (SELECT b.code FROM blocked AS b)

**Answer: C.** Only the predicate with both the outer IS NOT NULL guard and equality-based NOT EXISTS implements the stated policy for every allowed right side. The guard rejects a missing request code. For a known code, the subquery returns a row exactly when an equal blocked integer exists, so NOT EXISTS is the required absence test. Duplicates do not change row existence and blocked NULLs do not make equality true. A right-filtered NOT IN admits the missing outer code when its filtered right side is empty; unguarded NOT EXISTS admits that missing code; guarded unfiltered NOT IN can reject a known absent code when a blocked NULL makes its predicate unknown.

The worksheet enumerates four named example right-hand relations and reports each candidate predicate's value for every request. It evaluates these finite cases with the following SQL:

```sql
WITH scenarios(name, ord) AS (
  VALUES ('empty', 1), ('only-null', 2), ('known-seven', 3), ('mixed', 4)
), trial_blocks(scenario, code) AS (
  VALUES ('only-null', NULL), ('known-seven', 7),
         ('mixed', 7), ('mixed', NULL), ('mixed', 7)
)
SELECT s.name AS scenario, r.id,
       r.code NOT IN (
         SELECT b.code FROM trial_blocks AS b
         WHERE b.scenario = s.name AND b.code IS NOT NULL
       ) AS option_a,
       NOT EXISTS (
         SELECT 1 FROM trial_blocks AS b
         WHERE b.scenario = s.name AND b.code = r.code AND b.code IS NOT NULL
       ) AS option_b,
       r.code IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM trial_blocks AS b
         WHERE b.scenario = s.name AND b.code = r.code
       ) AS option_c,
       r.code IS NOT NULL AND r.code NOT IN (
         SELECT b.code FROM trial_blocks AS b WHERE b.scenario = s.name
       ) AS option_d
FROM scenarios AS s CROSS JOIN requests AS r
ORDER BY s.ord, r.id;
```

| scenario | id | option_a | option_b | option_c | option_d |
| --- | --- | --- | --- | --- | --- |
| empty | 1 | 1 | 1 | 1 | 1 |
| empty | 2 | 1 | 1 | 1 | 1 |
| empty | 3 | 1 | 1 | 0 | 0 |
| only-null | 1 | 1 | 1 | 1 | NULL |
| only-null | 2 | 1 | 1 | 1 | NULL |
| only-null | 3 | 1 | 1 | 0 | 0 |
| known-seven | 1 | 0 | 0 | 0 | 0 |
| known-seven | 2 | 1 | 1 | 1 | 1 |
| known-seven | 3 | NULL | 1 | 0 | 0 |
| mixed | 1 | 0 | 0 | 0 | 0 |
| mixed | 2 | 1 | 1 | 1 | NULL |
| mixed | 3 | NULL | 1 | 0 | 0 |

**Try next:** Give a smallest counterexample to each rejected predicate, then explain why one correctly chosen example cannot prove the accepted predicate for every finite right side.

### 12. NULL-matching identity is a different policy

SQLite. The complete fictional table requests(id, code) has rows (1, 7), (2, 9), (3, NULL). Table blocked(code) has exactly three rows: 7, NULL, 7. No other rows exist.

This query compares ordinary = matching with SQLite IS matching, which treats two NULLs as matching. What are all returned rows (id, ordinary_absence, null_matching_absence), in order?

```sql
SELECT r.id,
       NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code = r.code)
         AS ordinary_absence,
       NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code IS r.code)
         AS null_matching_absence
FROM requests AS r
ORDER BY r.id;
```

- **A.** [(1, 0, 0), (2, 1, 1), (3, 0, 0)]
- **B.** [(1, 0, 0), (2, 1, 1), (3, NULL, NULL)]
- **C.** [(1, 0, 0), (2, 1, 1), (3, 1, 1)]
- **D.** [(1, 0, 0), (2, 1, 1), (3, 1, 0)]

**Answer: D.** Both matching rules find the blocked 7 for request 1 and find no 9 for request 2. Ordinary equality never finds a match for the outer NULL, while SQLite IS matches it to the blocked NULL. The third row is therefore (3, 1, 0). IS expresses a different NULL-matching policy; it is not an automatic substitute for an explicit requirement to exclude all missing outer codes.

| id | ordinary_absence | null_matching_absence |
| --- | --- | --- |
| 1 | 0 | 0 |
| 2 | 1 | 1 |
| 3 | 1 | 0 |

**Try next:** Remove every blocked NULL and compare the two absence predicates again for a missing request code. Explain why an outer IS NOT NULL policy is different from NULL-matching equality.

## Why the accepted absence policy is general

For question 11, predicate C is:

```sql
r.code IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM blocked AS b WHERE b.code = r.code
)
```

Take any one request row. If its code is NULL, the first condition is false, so the row is excluded. If the code is a known integer, the first condition is true. The subquery then returns a row exactly when the finite blocked relation contains an equal integer. A blocked NULL never makes that equality true. Negating row existence therefore keeps exactly the known codes with no equal blocked code.

This argument covers any allowed finite right side, including no rows and duplicate rows. The twelve rows in the worksheet's Q11 comparison are illustrations and counterexamples, not an exhaustive enumeration of all possible relations.

| Rejected predicate | Allowed counterexample | What goes wrong |
| --- | --- | --- |
| A: right-filtered `NOT IN` | Empty blocked relation, request 3 | The filtered right side is empty, so the missing outer code passes `NOT IN`. |
| B: unguarded `NOT EXISTS` | Empty blocked relation, request 3 | No equality match exists, but the required outer non-NULL condition is absent. |
| D: guarded unfiltered `NOT IN` | Blocked contains only NULL, request 2 (code 9) | The known absent code receives an unknown `NOT IN` result and is wrongly excluded. |

A policy that deliberately treats two missing values as matching is different again. SQLite `IS` supplies that behavior for the integer/NULL values used here, but it does not reject a missing outer code when the right side has no corresponding NULL. State the intended policy before selecting a predicate.

## Sources, permissions and scope

The [SQLite expression documentation](https://www.sqlite.org/lang_expr.html) supplies the operator, IN/NOT IN, EXISTS and boolean-context semantics. The [SQLite SELECT documentation](https://www.sqlite.org/lang_select.html) supplies WHERE filtering and the single aggregate row without GROUP BY. The [SQLite shell documentation](https://www.sqlite.org/cli.html) documents the command shown above. These links are references; no source exercise or documentation passage is reproduced.

Original lesson material may be used, adapted and redistributed with attribution to RecallWeave contributors. AI assistance was used in drafting and checking the original content. The linked sources retain their own terms.

The [receiving record](https://github.com/Jacob-Met/RecallWeave/issues/257) separates independent content authority, actual SQLite outcomes, unchanged parser admission and the ordinary learner/physical-notes handoff. Structural validity does not establish subject accuracy or learning efficacy. This lesson introduces no provider call, account, browser storage, new learner mechanism or default-course change.
