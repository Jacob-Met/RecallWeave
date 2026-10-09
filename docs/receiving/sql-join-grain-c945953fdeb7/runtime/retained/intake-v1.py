"""Fileless ThinkPad runtime metadata intake; no SQL, app, parser or compiler."""
import os
import sys
import time
import signal
import stat
import hashlib
import json
import re
import selectors
import subprocess
import traceback

START = time.monotonic()
FLOOR = 2 * 1024**3
MAX_FILE = 128 * 1024**2
MAX_HASHED = 256 * 1024**2
HASHED = 0
FILES = {}
CHILD = None
R = {"schema": "estate.thinkpad.sql-runtime-intake.v1",
     "completed": False, "pid": os.getpid(), "filesystem_writes": 0,
     "sql_connections": 0, "sql_statements": 0, "application_calls": 0,
     "parser_test_compiler_browser_calls": 0, "node_version_calls": 0}

def need(ok, reason):
    if not ok:
        raise RuntimeError(reason)

def expiry(signum, frame):
    raise TimeoutError("17-second fileless intake deadline")

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
    need(len(groups) == 1 and groups[0].startswith("/") and
         all(part not in (".", "..") for part in groups[0].split("/")),
         "Standard unified cgroup v2 membership required; no fallback")
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

def run_node(path):
    global CHILD
    argv = [path, "--version"]
    out = {"argv": argv, "cwd": "/", "limit_seconds": 2,
           "stdout": "", "stderr": "", "timed_out": False, "truncated": False,
           "streams_complete": False,
           "new_session_requested": True}
    R["node"]["invocation"] = out
    start = time.monotonic()
    CHILD = subprocess.Popen(argv, cwd="/", stdin=subprocess.DEVNULL,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             start_new_session=True,
                             env={"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"})
    R["node_version_calls"] += 1
    out["pid"] = CHILD.pid
    selector = selectors.DefaultSelector()
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    try:
        selector.register(CHILD.stdout, selectors.EVENT_READ, "stdout")
        selector.register(CHILD.stderr, selectors.EVENT_READ, "stderr")
        while selector.get_map():
            remaining = 2 - (time.monotonic() - start)
            if remaining <= 0:
                out["timed_out"] = True
                raise TimeoutError("Node version child deadline")
            for key, _ in selector.select(min(remaining, 0.1)):
                data = os.read(key.fd, 4096)
                if not data:
                    selector.unregister(key.fileobj)
                    continue
                buffer = buffers[key.data]
                room = 4096 - len(buffer)
                buffer.extend(data[:room])
                if len(data) > room:
                    out["truncated"] = True
                    raise RuntimeError("Node version stream exceeded 4096 bytes")
        out["streams_complete"] = True
        CHILD.wait(timeout=max(0.01, 2 - (time.monotonic() - start)))
    finally:
        selector.close()
        if CHILD.poll() is None:
            os.killpg(CHILD.pid, signal.SIGKILL)
            CHILD.wait(timeout=1)
        out["exit_code"] = CHILD.returncode
        out["poll_returncode"] = CHILD.poll()
        out["owned_child_waited_and_reaped"] = CHILD.returncode is not None
        out["elapsed_seconds"] = time.monotonic() - start
        for name, buffer in buffers.items():
            out[name] = bytes(buffer).decode("utf-8", errors="backslashreplace")
            out[name + "_hex"] = bytes(buffer).hex()
        CHILD.stdout.close()
        CHILD.stderr.close()
    need(out["exit_code"] == 0 and not out["timed_out"] and not out["truncated"] and
         re.fullmatch(r"v\d+\.\d+\.\d+\r?\n", out["stdout"]) is not None,
         "Node version observation refused; no retry")
    R["node"]["version"] = out["stdout"].strip()

def main():
    need(sys.platform == "linux" and os.getuid() == 1000 and os.geteuid() == 1000,
         "Known ordinary Linux UID1000 required")
    need(sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode,
         "Isolated, no-site, no-bytecode entry required")
    need(len(sys.argv) == 2 and sys.argv[1] == "/usr/bin/python3",
         "Only the previously executed absolute interpreter path")
    need(os.path.realpath(sys.argv[1]) == os.path.realpath(sys.executable) ==
         os.path.realpath("/proc/self/exe"), "Exact selected interpreter binding")
    R["bootstrap_path"] = sys.argv[1]
    R["host"] = {"uid": os.getuid(), "euid": os.geteuid(),
                 "sysname": os.uname().sysname, "release": os.uname().release,
                 "machine": os.uname().machine}
    before = resources("before")
    runtime_pin(sys.executable, "actual Python executable")
    R["python"] = {"version": sys.version, "executable": sys.executable,
                   "implementation": sys.implementation.name,
                   "isolated": sys.flags.isolated, "no_site": sys.flags.no_site,
                   "dont_write_bytecode": sys.dont_write_bytecode}
    import sqlite3
    import sqlite3.dbapi2
    import _sqlite3
    R["sqlite"] = {"sqlite_version": sqlite3.sqlite_version,
                   "sqlite_version_info": list(sqlite3.sqlite_version_info),
                   "threadsafety": sqlite3.threadsafety,
                   "connection_created": False, "statement_executed": False}
    for module in (sqlite3, sqlite3.dbapi2, _sqlite3):
        runtime_pin(module.__file__, "module " + module.__name__)
        cached = getattr(module, "__cached__", None)
        if cached and os.path.isfile(cached):
            runtime_pin(cached, "existing bytecode candidate " + module.__name__)
    shared = []
    for line in text_file("/proc/self/maps", 1048576).splitlines():
        fields = line.split(None, 5)
        if len(fields) != 6 or not fields[5].startswith("/"):
            continue
        path = fields[5]
        if re.match(r"lib(?:sqlite3|python[^/]*)\.so", os.path.basename(path)):
            need(not path.endswith(" (deleted)"), "Mapped runtime file was deleted")
            if path not in shared:
                shared.append(path)
                runtime_pin(path, "actual mapped SQLite/Python shared library")
    R["sqlite"]["matching_mapped_libraries"] = shared
    R["sqlite"]["pin_scope"] = "Executable, sqlite3 facade/source/cache, _sqlite3 extension and matching loaded shared libraries; no SQL capability or full OS-library qualification."
    candidates = []
    chosen = None
    for path in ("/usr/bin/node", "/usr/local/bin/node", "/bin/node"):
        record = {"path": path, "present_regular_executable": False}
        candidates.append(record)
        if os.path.isfile(path) and os.access(path, os.X_OK):
            with open(path, "rb") as stream:
                record["elf_magic"] = stream.read(4).hex()
            need(record["elf_magic"] == "7f454c46", "Node candidate is not a regular ELF executable")
            record["present_regular_executable"] = True
            chosen = runtime_pin(path, "selected existing Node executable")
            break
    R["node"] = {"candidate_observations": candidates, "selected": chosen,
                 "lookup_scope": "Only the three explicit system paths; no PATH/home search or global Node-absence claim.",
                 "module_scope": "No Node application or database modules imported."}
    if chosen:
        before_node = resources("before-node")
        need(before_node["visible_pid_headroom"] is None or before_node["visible_pid_headroom"] >= 1,
             "No observed cgroup PID headroom for the single Node version child")
        run_node(chosen)
    for path, row in FILES.items():
        need(fixed_stat(os.stat(path, follow_symlinks=False)) ==
             {key: row[key] for key in ("bytes", "mode", "mtime_ns", "inode", "device")} and
             os.path.realpath(row["requested_path"]) == path,
             "Runtime file changed after metadata observation")
    R["runtime_files"] = list(FILES.values())
    R["runtime_files_stable_during_hash_read_and_post_metadata_stat_match"] = True
    R["bytes_hashed"] = HASHED
    resources("after")
    R["completed"] = True

signal.signal(signal.SIGALRM, expiry)
signal.setitimer(signal.ITIMER_REAL, 17)
print("THINKPAD_RUNTIME_READY " + json.dumps({"pid": os.getpid()}, separators=(",", ":")), flush=True)
status = 1
try:
    main()
    status = 0
except BaseException as exc:
    if CHILD is not None and CHILD.poll() is None:
        try:
            os.killpg(CHILD.pid, signal.SIGKILL)
            CHILD.wait(timeout=1)
        except BaseException as close_exc:
            R["owned_child_cleanup_error"] = type(close_exc).__name__ + ": " + str(close_exc)
    R["failure"] = {"type": type(exc).__name__, "message": str(exc),
                    "traceback": traceback.format_exc()[-8192:]}
    R["runtime_files"] = list(FILES.values())
    R["bytes_hashed"] = HASHED
    signal.setitimer(signal.ITIMER_REAL, 1)
R["elapsed_seconds_before_output"] = time.monotonic() - START
R["self_closure"] = "This receipt precedes exit; require the real matching tool completion."
body = json.dumps(R, ensure_ascii=True, allow_nan=False, separators=(",", ":"))
if len(body.encode("utf-8")) > 65536:
    print("THINKPAD_RUNTIME_FAILURE " + json.dumps({"pid": os.getpid(), "completed": False,
          "failure": "64 KiB receipt cap", "elapsed_seconds": time.monotonic() - START}), flush=True)
    sys.exit(1)
print("THINKPAD_RUNTIME_RECEIPT " + body, flush=True)
sys.exit(status)
