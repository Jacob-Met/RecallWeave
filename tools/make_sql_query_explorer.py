"""Build the original SQL course and offline explorer using real SQLite results."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]
COURSES = ROOT / "courses"
SOURCE = COURSES / "sql-query-foundations.source.json"
TEMPLATE = COURSES / "sql-query-explorer.template.html"
THRESHOLDS = (0, 10, 20, 30)


def cell_text(value):
    if value is None:
        return "NULL"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("Result cells must be finite numbers, text, or NULL")
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def rows_text(rows):
    return "; ".join("(" + ", ".join(map(cell_text, row)) + ")" for row in rows) if rows else "(no rows)"


def execute(db, sql):
    # The catalog contains authored single SELECTs, on this disposable fixture only.
    if not sql.lstrip().upper().startswith("SELECT "):
        raise ValueError("A prepared query must be a SELECT")
    cursor = db.execute(sql)
    if cursor.description is None:
        raise ValueError("A prepared query must return columns")
    return {
        "sql": sql,
        "columns": [column[0] for column in cursor.description],
        "rows": [list(row) for row in cursor.fetchall()],
    }


def embedded_json(value):
    # A downloaded course remains literal text even if an author later adds markup.
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
            .replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


def build():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    if source["format"] != "recallweave-sql-source/1":
        raise ValueError("Unsupported SQL course source format")
    db = sqlite3.connect(":memory:")
    try:
        db.executescript(source["setup_sql"])
        db.execute("PRAGMA query_only = ON")
        tables = {}
        for name in ("stations", "readings"):
            result = execute(db, f"SELECT * FROM {name} ORDER BY id;")
            tables[name] = {"name": name, "columns": result["columns"], "rows": result["rows"]}

        questions = source["questions"]
        if len(questions) != 12 or len({q["id"] for q in questions}) != 12:
            raise ValueError("The authored course requires twelve unique questions")
        references = {reference["id"] for reference in source["references"]}
        items = []
        lessons = []
        practice = ["-- RecallWeave: original fictional SQL practice fixture.",
                    "-- Run in a NEW empty SQLite scratch database, for example:",
                    "-- sqlite3 :memory: < sql-query-practice.sql", "", source["setup_sql"].rstrip(), ""]
        for question in questions:
            actual = execute(db, question["sql"])
            options = question["options"]
            if (type(question["answer"]) is not int or not 0 <= question["answer"] < len(options)
                    or len(options) != 4 or len(question["distractor_notes"]) != len(options)):
                raise ValueError(f"{question['id']}: four deliberate answer options are required")
            for option in options:
                for row in option:
                    if len(row) != len(question["columns"]):
                        raise ValueError(f"{question['id']}: an option has the wrong column count")
                    for value in row:
                        cell_text(value)
            if not set(question["references"]).issubset(references):
                raise ValueError(f"{question['id']}: an unknown reference was used")
            if actual["columns"] != question["columns"] or actual["rows"] != options[question["answer"]]:
                raise ValueError(f"{question['id']}: SQLite result does not match the authored answer")
            rendered_options = [rows_text(option) for option in options]
            if len(set(rendered_options)) != len(options):
                raise ValueError(f"{question['id']}: answer options must remain distinct")
            table_text = "\n".join(
                f"{name}({', '.join(tables[name]['columns'])}): {rows_text(tables[name]['rows'])}."
                for name in question["tables"]
            )
            prompt = ("Using SQLite and only these fictional rows:\n" + table_text
                      + "\nNULL is unknown; 0 is a known value.\n" + question["question"]
                      + "\nSQL:\n" + question["sql"]
                      + "\nEach tuple is one result row. Columns: (" + ", ".join(question["columns"]) + ").")
            items.append({
                "id": question["id"], "concept": question["concept"],
                "prerequisites": question["prerequisites"], "prompt": prompt,
                "options": rendered_options, "answer": question["answer"],
                "explanation": question["explanation"], "transfer": question["transfer"],
            })
            variants = [{"key": "default", **actual, "explanation": question["explanation"]}]
            default = "default"
            if question["id"] == "sql-02-filter":
                if question["sql"].count("value >= 20") != 1:
                    raise ValueError("The filter example needs one threshold expression")
                variants = []
                for threshold in THRESHOLDS:
                    result = execute(db, question["sql"].replace("value >= 20", f"value >= {threshold}"))
                    variants.append({"key": str(threshold), "threshold": threshold, **result,
                                     "explanation": f"The value >= {threshold} predicate returns {len(result['rows'])} reading rows. "
                                     "It tests value, not station_id. Reading 2's NULL value never passes these comparisons. "
                                     + ("Reading 5's known zero passes this threshold." if threshold == 0
                                        else "Reading 5's known zero is below this threshold.")})
                default = "20"
            elif question["id"] == "sql-12-left-where":
                clause = "ON r.station_id = s.id\nWHERE r.value >= 20"
                if question["sql"].count(clause) != 1:
                    raise ValueError("The left-join example needs its explicit WHERE predicate")
                variants = []
                for placement in ("where", "on"):
                    for threshold in THRESHOLDS:
                        replacement = (f"ON r.station_id = s.id\nWHERE r.value >= {threshold}" if placement == "where"
                                       else f"ON r.station_id = s.id AND r.value >= {threshold}")
                        result = execute(db, question["sql"].replace(clause, replacement))
                        note = ("WHERE tests the joined rows. A NULL value cannot pass this threshold, so a station "
                                "without a passing reading is absent." if placement == "where" else
                                "ON tests which readings match while this LEFT JOIN keeps every station. "
                                "A NULL reading_id marks a station with no reading that meets the threshold.")
                        variants.append({"key": f"{placement}-{threshold}", "threshold": threshold,
                                         "placement": placement, **result, "explanation": note
                                         + " Reading 6 has no matching station and is not part of this left join."})
                default = "where-20"
            lessons.append({"id": question["id"], "title": question["title"], "concept": question["concept"],
                            "defaultVariant": default, "variants": variants, "references": question["references"],
                            "transfer": question["transfer"]})
            for variant in variants:
                practice.extend([f"-- {question['title']} ({variant['key']})", variant["sql"], ""])

        deck = {"format": "recallweave-deck/1", **{key: source[key] for key in ("title", "attribution", "license", "concepts")},
                "items": items}
        deck_text = json.dumps(deck, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if len(deck_text.encode("utf-8")) > 262144:
            raise ValueError("Course exceeds the published import size limit")
        catalog = {"format": "recallweave-sql-catalog/1", "tables": list(tables.values()), "lessons": lessons,
                   "references": source["references"], "sourceSha256": hashlib.sha256(source_bytes).hexdigest()}
        page = TEMPLATE.read_text(encoding="utf-8")
        for marker, value in (("@@SQL_CATALOG@@", catalog), ("@@SQL_COURSE@@", deck_text),
                              ("@@SQL_PRACTICE@@", "\n".join(practice))):
            if page.count(marker) != 1:
                raise ValueError(f"Template needs exactly one {marker} marker")
            page = page.replace(marker, embedded_json(value))
        return {COURSES / "sql-query-foundations.json": deck_text,
                COURSES / "sql-query-explorer.html": page}, sum(len(lesson["variants"]) for lesson in lessons)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check the saved artifacts without writing them")
    options = parser.parse_args()
    artifacts, queries = build()
    if options.check:
        stale = [path.name for path, expected in artifacts.items()
                 if not path.is_file() or path.read_text(encoding="utf-8") != expected]
        if stale:
            raise SystemExit("Out of date: " + ", ".join(stale) + "; run python3 tools/make_sql_query_explorer.py")
    else:
        for path, expected in artifacts.items():
            path.write_text(expected, encoding="utf-8")
    print(f"SQL_BUILD OK questions=12 prepared_queries={queries} engine=SQLite-{sqlite3.sqlite_version} "
          f"mode={'check' if options.check else 'write'}")


if __name__ == "__main__":
    main()
