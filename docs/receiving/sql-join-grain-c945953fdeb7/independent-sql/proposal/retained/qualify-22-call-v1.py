"""One fixed-fixture SQL join-grain qualification; fileless and no child process."""
import os
import sys
import time
import signal
import stat
import hashlib
import json
import re
import traceback
import base64
import math

START = time.monotonic()
FLOOR = 2 * 1024**3
MAX_FILE = 128 * 1024**2
MAX_HASHED = 256 * 1024**2
HASHED = 0
FILES = {}
DB = None
SQL_START = None
SQLITE = None
EXPECTED_PAYLOAD_SHA256 = "1647d97c4cc7ec09f8bc3d02f7bf3df1056e1bf53e667dd75e616a8eea12dd7b"
R = {"schema": "estate.recallweave.sql-join-grain.native-qualification.v1",
     "completed": False, "pid": os.getpid(), "filesystem_write_calls": 0,
     "child_process_calls": 0, "node_parser_browser_app_compiler_test_calls": 0,
     "connection_attempts": 0, "database_opened": False, "database_close_calls": 0,
     "database_close_returned": False, "database_closed_property_refused": False,
     "sql_execute_calls": 0, "sql_calls": [], "actual_trace": [],
     "trace_overflow": False, "progress_callbacks": 0, "progress_aborted": False}

def need(ok, reason):
    if not ok:
        raise RuntimeError(reason)

def expiry(signum, frame):
    raise TimeoutError("17-second fileless SQL qualification deadline")

def text_file(path, limit=65536):
    with open(path, "rb") as stream:
        raw = stream.read(limit + 1)
    need(len(raw) <= limit, "Bounded metadata file exceeded: " + path)
    return raw.decode("utf-8")

def fixed_stat(s):
    return {"bytes": s.st_size, "mode": stat.S_IMODE(s.st_mode),
            "mtime_ns": str(s.st_mtime_ns), "inode": str(s.st_ino),
            "device": str(s.st_dev)}

def runtime_pin(path, role):
    global HASHED
    requested = os.path.abspath(path)
    resolved = os.path.realpath(requested)
    if resolved in FILES:
        FILES[resolved]["roles"].append(role)
        return resolved
    need(len(FILES) < 16, "Runtime file-count cap")
    before = os.stat(resolved, follow_symlinks=False)
    need(stat.S_ISREG(before.st_mode) and 0 < before.st_size <= MAX_FILE,
         "Runtime file type/size refused: " + resolved)
    need(HASHED + before.st_size <= MAX_HASHED, "Total runtime byte-read cap")
    sha = hashlib.sha256()
    git = hashlib.sha1(b"blob " + str(before.st_size).encode("ascii") + b"\0")
    count = 0
    fd = os.open(resolved, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        need(fixed_stat(os.fstat(fd)) == fixed_stat(before), "Opened runtime changed")
        while True:
            raw = os.read(fd, 524288)
            if not raw:
                break
            count += len(raw)
            HASHED += len(raw)
            need(count <= before.st_size and HASHED <= MAX_HASHED, "Runtime read grew")
            sha.update(raw)
            git.update(raw)
        need(fixed_stat(os.fstat(fd)) == fixed_stat(before), "Runtime changed while hashing")
    finally:
        os.close(fd)
    need(count == before.st_size and os.path.realpath(requested) == resolved and
         fixed_stat(os.stat(resolved, follow_symlinks=False)) == fixed_stat(before),
         "Runtime path/identity changed")
    FILES[resolved] = {"path": resolved, "requested_path": requested, "roles": [role],
                       **fixed_stat(before), "sha256": sha.hexdigest(), "git_blob": git.hexdigest()}
    return resolved

def optional_value(path):
    try:
        return text_file(path, 8192).strip()
    except FileNotFoundError:
        return None

def resources(label):
    mem = {}
    for line in text_file("/proc/meminfo").splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            mem[key] = value.strip()
    need(re.fullmatch(r"\d+ kB", mem.get("MemAvailable", "")), "MemAvailable unavailable")
    available = int(mem["MemAvailable"].split()[0]) * 1024
    group_lines = text_file("/proc/self/cgroup").splitlines()
    groups = [line.split(":", 2)[2] for line in group_lines if line.startswith("0::")]
    need(len(group_lines) == 1 and len(groups) == 1 and groups[0].startswith("/") and
         all(part not in (".", "..") for part in groups[0].split("/")),
         "Single unified cgroup v2 membership required; hybrid layouts refused")
    mounts = []
    for line in text_file("/proc/self/mountinfo", 262144).splitlines():
        left, separator, right = line.partition(" - ")
        fields = left.split()
        if separator and right.split()[0] == "cgroup2":
            mounts.append((fields[3], fields[4], line))
    need(len(mounts) == 1 and mounts[0][:2] == ("/", "/sys/fs/cgroup"),
         "Standard visible cgroup v2 mount required; no fallback")
    root = "/sys/fs/cgroup"
    current = root + (groups[0].rstrip("/") if groups[0] != "/" else "")
    rows = []
    budgets = [available]
    pid_budgets = []
    while True:
        need(len(rows) < 16, "Cgroup ancestor depth cap")
        row = {"path": current}
        for filename in ("memory.current", "memory.max", "memory.high",
                         "pids.current", "pids.max", "cpu.max"):
            row[filename] = optional_value(current + "/" + filename)
        memory_pair = (row["memory.current"], row["memory.max"])
        need(all(x is None for x in memory_pair) or all(x is not None for x in memory_pair),
             "Incomplete memory-controller pair")
        if row["memory.current"] is not None:
            usage = int(row["memory.current"])
            need(usage >= 0, "Negative memory usage")
            for filename in ("memory.max", "memory.high"):
                raw_limit = row[filename]
                if raw_limit is not None and raw_limit != "max":
                    limit = int(raw_limit)
                    need(limit >= 0, "Negative memory limit")
                    headroom = max(0, limit - usage)
                    row[filename + "_headroom_bytes"] = headroom
                    budgets.append(headroom)
        pid_pair = (row["pids.current"], row["pids.max"])
        need(all(x is None for x in pid_pair) or all(x is not None for x in pid_pair),
             "Incomplete PID-controller pair")
        if row["pids.current"] is not None and row["pids.max"] != "max":
            pid_budgets.append(max(0, int(row["pids.max"]) - int(row["pids.current"])))
        rows.append(row)
        if current == root:
            break
        current = os.path.dirname(current)
        need(current == root or current.startswith(root + "/"), "Cgroup root escape")
    disk = os.statvfs("/home/jacob")
    free = disk.f_bavail * disk.f_frsize
    result = {"label": label, "elapsed_seconds": time.monotonic() - START,
              "home_free_bytes": free, "MemAvailable_bytes": available,
              "visible_cgroup_v2": groups[0], "selected_mount_record": mounts[0][2],
              "ancestors": rows, "effective_available_bytes": min(budgets),
              "visible_pid_headroom": min(pid_budgets) if pid_budgets else None,
              "affinity_cpu_count": len(os.sched_getaffinity(0)),
              "disk_floor_bytes": FLOOR, "memory_floor_bytes": FLOOR,
              "scope": "Current MemAvailable and all visible memory.max/high headrooms; not a future reservation or a claim about hidden ancestors."}
    R.setdefault("resources", []).append(result)
    need(free >= FLOOR and result["effective_available_bytes"] >= FLOOR,
         "Unchanged 2 GiB disk/effective-memory admission refused")
    return result


def typed_value(value):
    if value is None:
        return {"value": None, "type": "NULL"}
    if type(value) is int:
        return {"value": value, "type": "INTEGER", "decimal": str(value)}
    if type(value) is float:
        return {"value": value if math.isfinite(value) else repr(value),
                "type": "REAL", "hex": value.hex()}
    if type(value) is str:
        return {"value": value[:512], "type": "TEXT", "characters": len(value),
                "truncated": len(value) > 512}
    if type(value) is bytes:
        return {"type": "BLOB", "bytes": len(value), "hex_prefix": value[:256].hex(),
                "truncated": len(value) > 256}
    return {"type": type(value).__name__, "repr_prefix": repr(value)[:512]}

def expected_cell_matches(value, expected, kind):
    if kind == "NULL":
        return value is None and expected is None
    if kind == "INTEGER":
        return type(value) is int and type(expected) is int and value == expected
    if kind == "REAL":
        return (type(value) is float and math.isfinite(value) and
                type(expected) in (int, float) and math.isfinite(float(expected)) and
                value.hex() == float(expected).hex())
    return False

def trace_callback(sql):
    if len(R["actual_trace"]) >= 32 or len(sql.encode("utf-8")) > 8192:
        R["trace_overflow"] = True
        return
    R["actual_trace"].append(sql)

def progress_callback():
    R["progress_callbacks"] += 1
    abort = (R["trace_overflow"] or
             R["progress_callbacks"] >= 1000 or
             time.monotonic() - SQL_START >= 5)
    if abort:
        R["progress_aborted"] = True
    return 1 if abort else 0

def readonly_authorizer(action, arg1, arg2, database, source):
    key = str(action)
    counts = R.setdefault("readonly_authorizer_action_counts", {})
    counts[key] = counts.get(key, 0) + 1
    allowed = action in (SQLITE.SQLITE_SELECT, SQLITE.SQLITE_READ,
                         SQLITE.SQLITE_FUNCTION, SQLITE.SQLITE_RECURSIVE)
    if action == SQLITE.SQLITE_FUNCTION:
        allowed = arg2 in ("count", "sum", "avg", "coalesce")
    if not allowed:
        denied = R.setdefault("readonly_authorizer_denials", [])
        if len(denied) < 16:
            denied.append({"action": action, "arg1": arg1, "arg2": arg2,
                           "database": database, "source": source})
    return SQLITE.SQLITE_OK if allowed else SQLITE.SQLITE_DENY

def run_statement(sql, phase, identifier, expected=None, expected_change=None):
    need(R["sql_execute_calls"] < 22, "Frozen SQL statement-count cap")
    need(time.monotonic() - SQL_START < 5 and not R["trace_overflow"],
         "SQL interval or trace cap refused before next statement")
    entry = {"index": R["sql_execute_calls"], "phase": phase, "id": identifier,
             "literal_sql": sql, "started_seconds": time.monotonic() - START,
             "execute_returned": False, "cursor_closed": False, "completed": False}
    R["sql_calls"].append(entry)
    R["sql_execute_calls"] += 1
    cursor = DB.cursor()
    before_changes = DB.total_changes
    entry["total_changes_before"] = before_changes
    try:
        cursor.execute(sql)
        entry["execute_returned"] = True
        columns = [x[0] for x in cursor.description] if cursor.description else []
        entry["columns"] = columns
        row_limit = expected["row_count"] + 1 if expected is not None else 1
        need(1 <= row_limit <= 9, "Frozen result-row cap")
        rows = cursor.fetchmany(row_limit)
        entry["observed_rows"] = [[typed_value(v) for v in row] for row in rows]
        entry["row_count_observed"] = len(rows)
        entry["end_of_rows_observed"] = len(rows) < row_limit
        entry["rowcount_attribute"] = cursor.rowcount
        entry["total_changes_after"] = DB.total_changes
        entry["in_transaction_after"] = DB.in_transaction
        need(entry["end_of_rows_observed"], "Result exceeds frozen bounded row count")
        need(DB.in_transaction is False, "Unexpected open transaction")
        if expected is None:
            need(columns == [] and rows == [], "Setup statement returned unexpected rows")
            need(DB.total_changes - before_changes == expected_change,
                 "Setup total_changes delta mismatch")
        else:
            entry["expected_columns"] = expected["columns"]
            entry["expected_typed_rows"] = expected["typed_ordered_rows"]
            need(columns == expected["columns"], "Exact result column labels differ")
            need(len(rows) == expected["row_count"], "Exact ordered result row count differs")
            for row_index, (actual, wanted) in enumerate(zip(rows, expected["typed_ordered_rows"])):
                need(len(actual) == len(wanted["values"]) == len(wanted["types"]),
                     "Exact row width differs")
                for column_index, (actual_value, wanted_value, wanted_type) in enumerate(
                        zip(actual, wanted["values"], wanted["types"])):
                    need(expected_cell_matches(actual_value, wanted_value, wanted_type),
                         "Typed cell differs at " + identifier + "/" +
                         str(row_index) + "/" + str(column_index))
            need(DB.total_changes == before_changes, "Read statement changed total_changes")
        entry["completed"] = True
    finally:
        cursor.close()
        entry["cursor_closed"] = True
        entry["elapsed_seconds"] = time.monotonic() - START - entry["started_seconds"]

def close_database():
    global DB
    if DB is None:
        return
    connection = DB
    DB = None
    R["total_changes_before_close"] = connection.total_changes
    R["in_transaction_before_close"] = connection.in_transaction
    R["database_close_calls"] += 1
    connection.close()
    R["database_close_returned"] = True
    try:
        returned = connection.total_changes
    except SQLITE.ProgrammingError as exc:
        R["database_closed_property_refused"] = True
        R["closed_property_observation"] = {
            "property": "total_changes", "type": type(exc).__name__,
            "message": str(exc), "SQL_statement_executed": False}
    else:
        R["closed_property_observation"] = {
            "property": "total_changes", "unexpected_value": returned,
            "SQL_statement_executed": False}
        raise RuntimeError("Closed database property unexpectedly remained available")

def main():
    global DB, SQL_START, SQLITE
    need(sys.platform == "linux" and os.getuid() == os.geteuid() == 1000,
         "Known ordinary Linux UID1000 required")
    need(sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode,
         "Isolated no-site no-bytecode entry required")
    need(os.path.realpath(sys.executable) == os.path.realpath("/usr/bin/python3") ==
         os.path.realpath("/proc/self/exe"), "Known absolute interpreter binding")
    need(len(sys.argv) == 2 and len(sys.argv[1]) <= 87384, "One bounded payload argument")
    raw_payload = base64.b64decode(sys.argv[1].encode("ascii"), validate=True)
    need(len(raw_payload) <= 65536 and
         hashlib.sha256(raw_payload).hexdigest() == EXPECTED_PAYLOAD_SHA256,
         "Exact frozen payload identity required")
    payload = json.loads(raw_payload.decode("utf-8"))
    R["payload"] = {"bytes": len(raw_payload), "sha256": EXPECTED_PAYLOAD_SHA256,
                    "authority": payload["authority"]}
    need(payload["authority"]["git_blob"] == "f35ee7aa2f7820dafcd552c62b730e715c956560",
         "Only root independent authority")
    resources("before-runtime")
    runtime = payload["runtime"]
    need(len(runtime["expected_files"]) == 8, "Eight measured runtime files required")
    keys = ("path", "requested_path", "bytes", "mode", "mtime_ns", "inode",
            "device", "sha256", "git_blob")
    for expected_file in runtime["expected_files"]:
        actual_path = runtime_pin(expected_file["requested_path"], "frozen intake runtime identity")
        actual = FILES[actual_path]
        need(all(actual[key] == expected_file[key] for key in keys),
             "Measured runtime file changed: " + expected_file["path"])
    need(sys.version == runtime["python"]["version"] and
         sys.implementation.name == runtime["python"]["implementation"],
         "Observed Python runtime changed")
    import sqlite3
    import sqlite3.dbapi2
    import _sqlite3
    SQLITE = sqlite3
    R["runtime"] = {"python": sys.version, "sqlite": sqlite3.sqlite_version,
                    "sqlite_threadsafety": sqlite3.threadsafety,
                    "runtime_files": list(FILES.values()), "bytes_hashed": HASHED,
                    "node_executed": False}
    need(sqlite3.sqlite_version == runtime["sqlite"]["sqlite_version"] and
         list(sqlite3.sqlite_version_info) == runtime["sqlite"]["sqlite_version_info"] and
         sqlite3.threadsafety == runtime["sqlite"]["threadsafety"],
         "Observed SQLite runtime changed")
    for module in (sqlite3, sqlite3.dbapi2, _sqlite3):
        role = "module " + module.__name__
        original = [x for x in runtime["expected_files"] if role in x["roles"]]
        need(len(original) == 1 and os.path.realpath(module.__file__) == original[0]["path"],
             "Loaded SQLite module path differs")
        cached = getattr(module, "__cached__", None)
        if cached:
            cache_role = "existing bytecode candidate " + module.__name__
            original_cache = [x for x in runtime["expected_files"] if cache_role in x["roles"]]
            need(len(original_cache) == 1 and
                 os.path.realpath(cached) == original_cache[0]["path"],
                 "SQLite bytecode candidate path differs")
    mapped = []
    for line in text_file("/proc/self/maps", 1048576).splitlines():
        fields = line.split(None, 5)
        if len(fields) == 6 and fields[5].startswith("/") and re.match(
                r"lib(?:sqlite3|python[^/]*)\.so", os.path.basename(fields[5])):
            need(not fields[5].endswith(" (deleted)"), "Deleted mapped runtime library")
            if fields[5] not in mapped:
                mapped.append(fields[5])
    need(sorted(mapped) == sorted(runtime["sqlite"]["matching_mapped_libraries"]),
         "Matching mapped SQLite/Python libraries differ")
    R["runtime"]["matching_mapped_libraries"] = mapped
    queries = payload["queries"]
    need(len(queries) == 12 and len(payload["schema_statements"]) == 3 and
         len(payload["insert_statements"]) == 3 and len(payload["setup_pragmas"]) == 1,
         "Frozen fixed fixture/schedule counts")
    expected_counts = {"queries": 12, "rows": 0, "cells": 0,
                       "INTEGER": 0, "REAL": 0, "NULL": 0}
    for query in queries:
        need(query["row_count"] == len(query["typed_ordered_rows"]) <= 8,
             "Expected row count binding")
        for row in query["typed_ordered_rows"]:
            need(len(row["values"]) == len(row["types"]) == len(query["columns"]),
                 "Expected result width binding")
            expected_counts["rows"] += 1
            expected_counts["cells"] += len(row["values"])
            for kind in row["types"]:
                need(kind in ("INTEGER", "REAL", "NULL"), "Unexpected frozen type")
                expected_counts[kind] += 1
    need(expected_counts == payload["expected_counts"] ==
         {"queries": 12, "rows": 36, "cells": 91, "INTEGER": 87, "REAL": 2, "NULL": 2},
         "Exact root expected totals")
    resources("before-database")
    SQL_START = time.monotonic()
    R["connection_attempts"] = 1
    DB = sqlite3.connect(":memory:", timeout=1.0, detect_types=0,
                         isolation_level=None, check_same_thread=True,
                         cached_statements=0, uri=False, autocommit=True)
    R["database_opened"] = True
    need(DB.autocommit is True and DB.in_transaction is False and DB.total_changes == 0 and
         DB.row_factory is None and DB.text_factory is str,
         "Fresh memory database/autocommit/default type binding")
    R["database"] = {"name": ":memory:", "autocommit": DB.autocommit,
                     "detect_types": 0, "cached_statements": 0,
                     "initial_total_changes": DB.total_changes,
                     "initial_in_transaction": DB.in_transaction}
    limits = [("SQLITE_LIMIT_LENGTH", 65536), ("SQLITE_LIMIT_SQL_LENGTH", 8192),
              ("SQLITE_LIMIT_COLUMN", 16), ("SQLITE_LIMIT_ATTACHED", 0)]
    R["database"]["limits"] = []
    for name, cap in limits:
        category = getattr(sqlite3, name)
        previous_limit = DB.setlimit(category, cap)
        actual_limit = DB.getlimit(category)
        R["database"]["limits"].append({"name": name, "previous": previous_limit,
                                        "requested": cap, "actual": actual_limit})
        need(actual_limit <= cap, "SQLite private connection limit not applied")
    DB.set_trace_callback(trace_callback)
    DB.set_progress_handler(progress_callback, 1000)
    try:
        for index, sql in enumerate(payload["setup_pragmas"]):
            run_statement(sql, "original-setup", "pragma-" + str(index), expected_change=0)
        run_statement(payload["receiver_setup_extension"]["foreign_keys_readback"]["literal_sql"],
                      "declared-setup-readback", "foreign_keys",
                      expected=payload["receiver_setup_extension"]["foreign_keys_readback"])
        run_statement(payload["receiver_setup_extension"]["temp_store_set"],
                      "receiver-filelessness-control", "temp_store-memory", expected_change=0)
        run_statement(payload["receiver_setup_extension"]["temp_store_readback"]["literal_sql"],
                      "receiver-filelessness-readback", "temp_store",
                      expected=payload["receiver_setup_extension"]["temp_store_readback"])
        for index, sql in enumerate(payload["schema_statements"]):
            run_statement(sql, "original-setup", "schema-" + str(index), expected_change=0)
        fixture_counts = payload["original_fixture_row_counts"]
        for index, (sql, table) in enumerate(zip(payload["insert_statements"],
                                                ("projects", "work_sessions", "reviews"))):
            run_statement(sql, "original-setup", "insert-" + str(index),
                          expected_change=fixture_counts[table])
        baseline = DB.total_changes
        R["total_changes_after_setup"] = baseline
        need(baseline == payload["expected_total_changes_after_setup"] == 15,
             "Original15-row setup total_changes differs")
        resources("after-setup")
        DB.set_authorizer(readonly_authorizer)
        for query in queries:
            run_statement(query["literal_sql"], "original-query", query["id"],
                          expected=query)
            need(DB.total_changes == baseline, "Fixture changed after a query")
        R["total_changes_after_queries"] = DB.total_changes
        need(DB.total_changes == baseline and not R.get("readonly_authorizer_denials"),
             "Read-only query interval changed or refused")
        expected_trace = (payload["setup_pragmas"] +
                          [payload["receiver_setup_extension"]["foreign_keys_readback"]["literal_sql"]] +
                          [payload["receiver_setup_extension"]["temp_store_set"],
                           payload["receiver_setup_extension"]["temp_store_readback"]["literal_sql"]] +
                          payload["schema_statements"] + payload["insert_statements"] +
                          [query["literal_sql"] for query in queries])
        need(R["actual_trace"] == expected_trace and
             len(R["actual_trace"]) == R["sql_execute_calls"] == 22,
             "Exact backend statement schedule differs")
        need(not R["trace_overflow"] and not R["progress_aborted"] and
             time.monotonic() - SQL_START < 5, "SQL deadline/progress/trace limit")
        observed_counts = {"queries": 0, "rows": 0, "cells": 0,
                           "INTEGER": 0, "REAL": 0, "NULL": 0}
        for actual_call in R["sql_calls"]:
            if actual_call["phase"] != "original-query":
                continue
            need(actual_call["completed"], "A scheduled query did not complete")
            observed_counts["queries"] += 1
            observed_counts["rows"] += actual_call["row_count_observed"]
            for observed_row in actual_call["observed_rows"]:
                observed_counts["cells"] += len(observed_row)
                for cell in observed_row:
                    need(cell["type"] in ("INTEGER", "REAL", "NULL"),
                         "Unexpected actual result cell type")
                    observed_counts[cell["type"]] += 1
        need(observed_counts == expected_counts, "Actual aggregate result counts differ")
        R["query_counts"] = observed_counts
        R["expected_query_counts"] = expected_counts
        R["all12_queries_exact_values_types_columns_order"] = True
        R["sql_interval_seconds"] = time.monotonic() - SQL_START
    finally:
        close_database()
    need(R["database_close_calls"] == 1 and R["database_close_returned"] and
         R["database_closed_property_refused"], "Actual memory connection closure required")
    need(R["actual_trace"] == expected_trace and len(R["actual_trace"]) == 22,
         "Connection closure emitted unexpected backend SQL")
    for path, actual in FILES.items():
        need(fixed_stat(os.stat(path, follow_symlinks=False)) ==
             {key: actual[key] for key in ("bytes", "mode", "mtime_ns", "inode", "device")} and
             os.path.realpath(actual["requested_path"]) == path,
             "Runtime path/stat changed after qualification")
    R["runtime"]["post_stat_and_alias_match"] = True
    resources("after-close")
    R["completed"] = True

signal.signal(signal.SIGALRM, expiry)
signal.setitimer(signal.ITIMER_REAL, 17)
print("SQL_JOIN_GRAIN_READY " + json.dumps({"pid": os.getpid()}, separators=(",", ":")), flush=True)
status = 1
try:
    main()
    status = 0
except BaseException as exc:
    R["failure"] = {"type": type(exc).__name__, "message": str(exc),
                    "traceback": traceback.format_exc()[-8192:]}
    if DB is not None:
        try:
            close_database()
        except BaseException as close_exc:
            R["closure_failure"] = {"type": type(close_exc).__name__,
                                    "message": str(close_exc)}
    signal.setitimer(signal.ITIMER_REAL, 1)
R["elapsed_seconds_before_output"] = time.monotonic() - START
R["self_closure"] = "Require the real matching external tool completion; this receipt precedes exit."
body = json.dumps(R, ensure_ascii=True, allow_nan=False, separators=(",", ":"))
if len(body.encode("utf-8")) > 65536:
    print("SQL_JOIN_GRAIN_FAILURE " + json.dumps({"pid": os.getpid(), "completed": False,
          "failure": "64 KiB receipt cap", "elapsed_seconds": time.monotonic() - START}), flush=True)
    sys.exit(1)
print("SQL_JOIN_GRAIN_RECEIPT " + body, flush=True)
sys.exit(status)
