-- SQL NULL: membership and absence
-- Original lesson material by RecallWeave contributors, estate-c945953fdeb7.
-- You may use, adapt and redistribute with attribution to RecallWeave contributors.
-- AI assistance was used in authoring. Primary semantics: https://www.sqlite.org/lang_expr.html
-- and https://www.sqlite.org/lang_select.html . Reference dialect: SQLite 3.53.1.
-- Run the complete file once in a fresh :memory: database. It creates only fictional tables.
-- Example with an installed SQLite shell:
-- sqlite3 -batch -bail -echo -header -csv -nullvalue NULL :memory: < sql-null-membership.sql
-- Expected-row comments use JSON notation: null represents SQL NULL, never a string.
-- The guide distinguishes the universal policy argument in Q11 from finite illustrations.

CREATE TABLE requests (id INTEGER PRIMARY KEY, code INTEGER);
CREATE TABLE blocked (code INTEGER);
INSERT INTO requests (id, code) VALUES (1, 7), (2, 9), (3, NULL);
INSERT INTO blocked (code) VALUES (7), (NULL), (7);

-- Q01 / null-member-01
-- Expected columns: ["negated_unknown","false_and_unknown","true_or_unknown"]
-- Expected rows:
-- [null,0,1]
SELECT NOT NULL AS negated_unknown,
       0 AND NULL AS false_and_unknown,
       1 OR NULL AS true_or_unknown;

-- Q02 / null-member-02
-- Expected columns: ["id"]
-- Expected rows:
-- [1]
-- [2]
SELECT id FROM requests
WHERE (code = 7) OR NOT (code = 7)
ORDER BY id;

-- Q03 / null-member-03
-- Expected columns: ["id","in_set","not_in_set"]
-- Expected rows:
-- [1,1,0]
-- [2,null,null]
-- [3,null,null]
SELECT id,
       code IN (SELECT code FROM blocked) AS in_set,
       code NOT IN (SELECT code FROM blocked) AS not_in_set
FROM requests
ORDER BY id;

-- Q04 / null-member-04
-- Expected columns: ["id"]
-- Expected rows:
-- []
SELECT id FROM requests
WHERE code NOT IN (SELECT code FROM blocked)
ORDER BY id;

-- Q05 / null-member-05
-- Expected columns: ["id","in_empty","not_in_empty"]
-- Expected rows:
-- [1,0,1]
-- [2,0,1]
-- [3,0,1]
SELECT id,
       code IN (SELECT code FROM blocked WHERE 0) AS in_empty,
       code NOT IN (SELECT code FROM blocked WHERE 0) AS not_in_empty
FROM requests
ORDER BY id;

-- Q06 / null-member-06
-- Expected columns: ["id"]
-- Expected rows:
-- [2]
SELECT id FROM requests
WHERE code NOT IN (SELECT code FROM blocked WHERE code IS NOT NULL)
ORDER BY id;

-- Q07 / null-member-07
-- Expected columns: ["has_row","has_no_rows"]
-- Expected rows:
-- [1,0]
SELECT EXISTS(SELECT NULL FROM blocked WHERE code = 7) AS has_row,
       EXISTS(SELECT NULL FROM blocked WHERE 0) AS has_no_rows;

-- Q08 / null-member-08
-- Expected columns: ["id"]
-- Expected rows:
-- [2]
-- [3]
SELECT r.id FROM requests AS r
WHERE NOT EXISTS (
  SELECT 1 FROM blocked AS b WHERE b.code = r.code
)
ORDER BY r.id;

-- Q09 / null-member-09
-- Expected columns: ["id"]
-- Expected rows:
-- []
SELECT r.id FROM requests AS r
WHERE NOT EXISTS (
  SELECT COUNT(*) FROM blocked AS b WHERE b.code = r.code
)
ORDER BY r.id;

-- Q10 / null-member-10
-- Expected columns: ["id"]
-- Expected rows:
-- [2]
SELECT r.id FROM requests AS r
WHERE r.code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code = r.code)
ORDER BY r.id;

-- Q11 / null-member-11
-- Expected columns: ["scenario","id","option_a","option_b","option_c","option_d"]
-- These four finite relations illustrate the candidate policies, not a proof of universality.
-- Expected rows:
-- ["empty",1,1,1,1,1]
-- ["empty",2,1,1,1,1]
-- ["empty",3,1,1,0,0]
-- ["only-null",1,1,1,1,null]
-- ["only-null",2,1,1,1,null]
-- ["only-null",3,1,1,0,0]
-- ["known-seven",1,0,0,0,0]
-- ["known-seven",2,1,1,1,1]
-- ["known-seven",3,null,1,0,0]
-- ["mixed",1,0,0,0,0]
-- ["mixed",2,1,1,1,null]
-- ["mixed",3,null,1,0,0]
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

-- Q12 / null-member-12
-- Expected columns: ["id","ordinary_absence","null_matching_absence"]
-- Expected rows:
-- [1,0,0]
-- [2,1,1]
-- [3,1,0]
SELECT r.id,
       NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code = r.code)
         AS ordinary_absence,
       NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.code IS r.code)
         AS null_matching_absence
FROM requests AS r
ORDER BY r.id;

