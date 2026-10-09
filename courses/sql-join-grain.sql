-- SQL join grain: original RecallWeave worksheet.
-- Language target: SQLite 3.50.4 semantics. New lesson execution is unqualified at its initial source seal.
-- Use a fresh empty database. This file creates only its three fictional tables.
-- All twelve query texts match the sealed questions-only authority exactly.
-- Question12 asks an all-instances policy question; its literal query also runs on this fixed fixture.
-- No answer key or expected result is embedded in this worksheet.

PRAGMA foreign_keys = ON;

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

INSERT INTO projects(project_id, name) VALUES
  (1, 'Atlas'), (2, 'Birch'), (3, 'Cedar'), (4, 'Dune');

INSERT INTO work_sessions(session_id, project_id, minutes) VALUES
  (101, 1, 30), (102, 1, 30), (103, 1, 15),
  (201, 2, 20), (202, 2, 0);

INSERT INTO reviews(review_id, project_id, label) VALUES
  (11, 1, 'ready'), (12, 1, 'hold'),
  (21, 2, 'ready'), (22, 2, 'ready'), (23, 2, 'hold'),
  (31, 3, 'ready');

-- 01 | grain-01-pairs
-- Which complete ordered (session_id, review_id) rows are returned for project 1?
-- Columns: session_id, review_id
-- Types: INTEGER, INTEGER
-- A (original index 0): (101, 11); (101, 12); (102, 11); (102, 12); (103, 11); (103, 12)
-- B (original index 1): (101, 11); (102, 12)
-- C (original index 2): (101, 11); (102, 11); (103, 11)
-- D (original index 3): (101, 11); (101, 12); (102, 11); (102, 12)
SELECT e.session_id, r.review_id
FROM work_sessions AS e
JOIN reviews AS r ON r.project_id = e.project_id
WHERE e.project_id = 1
ORDER BY e.session_id, r.review_id;

-- 02 | grain-02-count-identities
-- Which ordered rows distinguish joined row occurrences from distinct session and review IDs? Columns: (project_id, joined_rows, session_ids, review_ids).
-- Columns: project_id, joined_rows, session_ids, review_ids
-- Types: INTEGER, INTEGER, INTEGER, INTEGER
-- A (original index 0): (1, 5, 3, 2); (2, 5, 2, 3); (3, 1, 0, 1); (4, 0, 0, 0)
-- B (original index 1): (1, 6, 3, 2); (2, 6, 2, 3); (3, 1, 0, 1); (4, 1, 0, 0)
-- C (original index 2): (1, 6, 6, 6); (2, 6, 6, 6); (3, 1, 1, 1); (4, 1, 1, 1)
-- D (original index 3): (1, 3, 3, 2); (2, 2, 2, 3); (3, 1, 0, 1); (4, 1, 0, 0)
SELECT p.project_id, COUNT(*) AS joined_rows,
       COUNT(DISTINCT e.session_id) AS session_ids,
       COUNT(DISTINCT r.review_id) AS review_ids
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;

-- 03 | grain-03-multiplied-sums
-- What ordered (project_id, joined_minutes) rows does this query produce? NULL denotes an SQL NULL, not a zero.
-- Columns: project_id, joined_minutes
-- Types: INTEGER, INTEGER or NULL
-- A (original index 0): (1, 75); (2, 20); (3, NULL); (4, NULL)
-- B (original index 1): (1, 150); (2, 60); (3, 0); (4, 0)
-- C (original index 2): (1, 150); (2, 60); (3, NULL); (4, NULL)
-- D (original index 3): (1, 45); (2, 20); (3, NULL); (4, NULL)
SELECT p.project_id, SUM(e.minutes) AS joined_minutes
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;

-- 04 | grain-04-distinct-values
-- Which single row is returned? The scalar subquery reads the original sessions directly. Columns: (joined_sum, distinct_value_sum, session_sum).
-- Columns: joined_sum, distinct_value_sum, session_sum
-- Types: INTEGER, INTEGER, INTEGER
-- A (original index 0): (150, 75, 75)
-- B (original index 1): (75, 45, 75)
-- C (original index 2): (150, 45, 45)
-- D (original index 3): (150, 45, 75)
SELECT SUM(e.minutes) AS joined_sum,
       SUM(DISTINCT e.minutes) AS distinct_value_sum,
       (SELECT SUM(minutes) FROM work_sessions
        WHERE project_id = 1) AS session_sum
FROM work_sessions AS e
JOIN reviews AS r ON r.project_id = e.project_id
WHERE e.project_id = 1;

-- 05 | grain-05-distinct-after-grouping
-- What ordered rows are returned when DISTINCT is applied to these already-grouped result rows? Columns: (project_id, counted_sessions).
-- Columns: project_id, counted_sessions
-- Types: INTEGER, INTEGER
-- A (original index 0): (1, 6); (2, 6); (3, 0); (4, 0)
-- B (original index 1): (1, 3); (2, 2); (3, 0); (4, 0)
-- C (original index 2): (1, 1); (2, 1); (3, 0); (4, 0)
-- D (original index 3): (1, 6); (2, 6)
SELECT DISTINCT p.project_id,
       COUNT(e.session_id) AS counted_sessions
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;

-- 06 | grain-06-retain-record-id
-- What single (session_total) row remains when the subquery retains session_id before removing repeated joined copies?
-- Columns: session_total
-- Types: INTEGER
-- A (original index 0): (45)
-- B (original index 1): (75)
-- C (original index 2): (150)
-- D (original index 3): (90)
SELECT SUM(minutes) AS session_total
FROM (
  SELECT DISTINCT e.session_id, e.project_id, e.minutes
  FROM work_sessions AS e
  JOIN reviews AS r ON r.project_id = e.project_id
  WHERE e.project_id = 1
) AS selected_sessions;

-- 07 | grain-07-one-rollup-is-not-enough
-- The session table is grouped first, but its total is then joined to raw reviews and summed again. What ordered (project_id, minutes) rows result?
-- Columns: project_id, minutes
-- Types: INTEGER, INTEGER
-- A (original index 0): (1, 75); (2, 20); (3, 0); (4, 0)
-- B (original index 1): (1, 150); (2, 60); (3, NULL); (4, NULL)
-- C (original index 2): (1, 150); (2, 60); (3, 0); (4, 0)
-- D (original index 3): (1, 45); (2, 20); (3, 0); (4, 0)
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

-- 08 | grain-08-two-rollups
-- Both child tables now have one grouped row per project before the joins. What ordered rows result? Columns: (project_id, session_count, session_minutes, review_count).
-- Columns: project_id, session_count, session_minutes, review_count
-- Types: INTEGER, INTEGER, INTEGER, INTEGER
-- A (original index 0): (1, 6, 150, 6); (2, 6, 60, 6); (3, 0, 0, 1); (4, 0, 0, 0)
-- B (original index 1): (1, 3, 45, 2); (2, 2, 20, 2); (3, 0, 0, 1); (4, 0, 0, 0)
-- C (original index 2): (1, 3, 75, 2); (2, 2, 20, 3)
-- D (original index 3): (1, 3, 75, 2); (2, 2, 20, 3); (3, 0, 0, 1); (4, 0, 0, 0)
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

-- 09 | grain-09-counting-rollup-rows
-- This join has one row per project. What single row distinguishes projects, present rollups and original sessions? Columns: (project_rows, projects_with_sessions, total_sessions).
-- Columns: project_rows, projects_with_sessions, total_sessions
-- Types: INTEGER, INTEGER, INTEGER
-- A (original index 0): (4, 2, 5)
-- B (original index 1): (4, 4, 4)
-- C (original index 2): (4, 5, 5)
-- D (original index 3): (2, 2, 5)
WITH session_totals AS (
  SELECT project_id, COUNT(*) AS session_count
  FROM work_sessions GROUP BY project_id
)
SELECT COUNT(*) AS project_rows,
       COUNT(s.session_count) AS projects_with_sessions,
       COALESCE(SUM(s.session_count), 0) AS total_sessions
FROM projects AS p
LEFT JOIN session_totals AS s ON s.project_id = p.project_id;

-- 10 | grain-10-existence-without-copying
-- A project qualifies if it has at least one 'ready' review. What ordered rows does this EXISTS filter return? Columns: (project_id, session_count, session_minutes).
-- Columns: project_id, session_count, session_minutes
-- Types: INTEGER, INTEGER, INTEGER
-- A (original index 0): (1, 3, 75); (2, 4, 40)
-- B (original index 1): (1, 3, 75); (2, 2, 20)
-- C (original index 2): (1, 3, 75); (2, 2, 20); (3, 0, 0)
-- D (original index 3): (1, 2, 45); (2, 2, 20)
SELECT e.project_id, COUNT(*) AS session_count,
       SUM(e.minutes) AS session_minutes
FROM work_sessions AS e
WHERE EXISTS (
  SELECT 1 FROM reviews AS r
  WHERE r.project_id = e.project_id AND r.label = 'ready'
)
GROUP BY e.project_id
ORDER BY e.project_id;

-- 11 | grain-11-unequal-repetition
-- The first average reads joined session/review pairs; the scalar subquery reads original sessions. Which single (joined_mean, session_mean) row is returned? Both columns are SQLite REAL values; numerically equal decimal spellings mean the same value.
-- Columns: joined_mean, session_mean
-- Types: REAL, REAL
-- A (original index 0): (19.0, 19.0)
-- B (original index 1): (19.0, 17.5)
-- C (original index 2): (17.5, 19.0)
-- D (original index 3): (21.0, 19.0)
SELECT AVG(e.minutes) AS joined_mean,
       (SELECT AVG(minutes) FROM work_sessions) AS session_mean
FROM work_sessions AS e
JOIN reviews AS r ON r.project_id = e.project_id;

-- 12 | grain-12-general-condition
-- This question concerns every finite table instance satisfying the stated keys and references, not just the displayed rows. Minutes remain nonnegative integers, and every intermediate sum fits SQLite's signed 64-bit integer range. Define the true total for each project as the sum of its original work_sessions rows, with zero for none. Which ONE additional condition guarantees that the query below returns those true totals for EVERY such instance satisfying that condition? It asks for a sufficient condition, not a necessary condition for accidental equality in one fixture.
-- Columns: project_id, minutes
-- Types: INTEGER, INTEGER
-- A (original index 0): Every project has at least one review.
-- B (original index 1): Within each project, all session minute values are different.
-- C (original index 2): Within each project, all review label strings are different.
-- D (original index 3): Every project has at most one review.
SELECT p.project_id, COALESCE(SUM(e.minutes), 0) AS minutes
FROM projects AS p
LEFT JOIN work_sessions AS e ON e.project_id = p.project_id
LEFT JOIN reviews AS r ON r.project_id = p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
