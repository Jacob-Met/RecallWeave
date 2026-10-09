"""Fixed author integrity controls; original LP installation and inputs are read-only."""
from __future__ import annotations
import contextlib
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import shlex
import signal
import stat
import subprocess
import sys
import time
from types import SimpleNamespace

AUTHOR = Path("/Users/me/Developer/recallweave-lp-local-e3a41d2b3368")
SOURCE = AUTHOR / "source"
CONTROL = AUTHOR / "author-controls-20261009-v1"
INSTALLED = Path("/Users/me/Applications/RecallWeave-LP-e3a41d2b3368")
PYTHON = Path("/Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python")
PYTHON_SHA = "b118e5bb2b1c1279976ccd12b1bbe03353ae4199ab4a329ea2c33eb908be70fb"
CONSTANTS = json.loads(r'''{"helpers":[{"path":"install.py","bytes":9591,"sha256":"e0bbda4e6bfbb195fce3ce94fd9cb570fa62f825189baa3d2cdc065349081083","gitBlob":"578bf23d7fe21038425d941904a0bd2984911329"},{"path":"open.py","bytes":7894,"sha256":"dc3ba241fba5728267f529b730e525908d7f0cb059d5c626b144dac75c6a3043","gitBlob":"ff9f27fa217e9966b7b9fc89af4cd1c1e374eefc"},{"path":"Open LP Explorer.command.in","bytes":126,"sha256":"d838e833285d68a52982f20998466912d0d808e7ea51546288f3fce07b7b3578","gitBlob":"754ecdda95f88c1af36bbd13fd0c54f77d06ce26"},{"path":"README.md","bytes":3425,"sha256":"5c50a3305ec587fbd6210d993ca76efeeb9e3283e0fd44c8b8b8ad4fb22796dc","gitBlob":"926be15e47edf5e8110252c7d22e7acee761ef94"},{"path":"LP-ASSETS.json","bytes":89373,"sha256":"0edca06da25ac75ead7ab6891b219a5ae9facad24ef3ceaa599e42b0e78f850b","gitBlob":"4871e0ea555a21a754d9dc49508df2309fb34f63"},{"path":"RELEASE.json","bytes":934,"sha256":"2328e2f3fba72cc067eeb8b29f7c0c28e83deb94cd95304ed489e45c3ffaecae","gitBlob":"124e505cd7f0eb0cb505baac861e91458cb4dcb4"}],"assets":[{"path":"courses/linear-programming.json","bytes":13211,"sha256":"d251a3bc174d109d185d600871f8890d81722aed5c190f759b604d162685c5c5","gitBlob":"626390853e90df96de34f061e7a4f5114c36d067"},{"path":"courses/linear-programming.md","bytes":8028,"sha256":"fa3a0f5a133189ef3a52cd933060245703185f2fcd69327207128dae06fe4e5d","gitBlob":"717653e782acd1d23113117d70cdc7c0a5cd301b"},{"path":"courses/linear-programming-explorer.html","bytes":64651,"sha256":"a0e64d648b19b0d3cea8fbf321cc318d811acfc7e376e5553ba41e7fcb2cb66f","gitBlob":"de1719274b8acf7b9c161e993b7b9dc1ac93d812"}]}''')
HELPERS = {x["path"]: x for x in CONSTANTS["helpers"]}
ASSETS = {x["path"]: x for x in CONSTANTS["assets"]}
ENTRY = "courses/linear-programming-explorer.html"
SOURCE_COMMIT = "b5e46d4f8c3013259c0baa81507652d900cb5074"
SOURCE_TREE = "988b548df0dee45259e54341b56beba1a054ccc9"
MAX_NEW_BYTES = 2097152
MAX_FILE_BYTES = 262144
MAX_CONTROL_SECONDS = 20
written = 0
started = time.monotonic()
created_control = False
result = {
    "schema": "recallweave.lp-mac-local-author-controls/1",
    "freezeGitBlob": "e238077513d265ced0f6744a25ed234e481f3cde",
    "sourceIndexGitBlob": "4c0fd0581663240fa6285fad462bad9698208960",
    "sourceReviewGitBlob": "3052dfef905d5171a41dbc361ddb4fac08777c91",
    "startedUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "pid": os.getpid(), "python": sys.version, "pythonExecutable": sys.executable,
    "source": str(SOURCE), "installed": str(INSTALLED), "controlRoot": str(CONTROL),
    "controls": [], "error": None, "preservationError": None, "passed": False,
    "method": "Exact helper bodies executed in-process. Opener subprocess boundary is replaced only by a recording spy. No native child or desktop opener is launched by these controls.",
    "actualInstalledShebang": "Separate root/independent receiving evidence required.",
    "browserUse": "Separate foundation receiving scope.",
}

def must(condition, message):
    if not condition:
        raise AssertionError(message)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def meta(s):
    return {"bytes": s.st_size, "mode": stat.S_IMODE(s.st_mode), "uid": s.st_uid,
            "device": s.st_dev, "inode": s.st_ino,
            "mtimeNs": s.st_mtime_ns, "ctimeNs": s.st_ctime_ns}

def ordinary_parents(path):
    for parent in path.parents:
        must(stat.S_ISDIR(parent.lstat().st_mode), "non-ordinary parent: " + str(parent))

def read_file(path, maximum=MAX_FILE_BYTES):
    ordinary_parents(path)
    before = path.lstat()
    must(stat.S_ISREG(before.st_mode), "non-ordinary file: " + str(path))
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "rb") as stream:
        opened = os.fstat(stream.fileno())
        must((before.st_dev, before.st_ino) == (opened.st_dev, opened.st_ino), "opened identity differs")
        raw = stream.read(maximum + 1)
        after = os.fstat(stream.fileno())
    must(len(raw) <= maximum and meta(before) == meta(after) == meta(path.lstat()), "file changed or size bound: " + str(path))
    pin = meta(before)
    pin.update({"sha256": sha(raw), "gitBlob": hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()})
    return raw, pin

def admitted_directory(path):
    ordinary_parents(path)
    s = path.lstat()
    must(stat.S_ISDIR(s.st_mode) and s.st_uid == os.geteuid(), "directory ownership/type differs: " + str(path))
    return meta(s)

def write_new(path, raw, mode=0o600):
    global written
    must(path.is_relative_to(CONTROL) and len(raw) <= MAX_FILE_BYTES, "owned write path/size bound")
    must(written + len(raw) <= MAX_NEW_BYTES, "aggregate control byte bound")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(raw)
        stream.flush()
        os.fchmod(stream.fileno(), mode)
        os.fsync(stream.fileno())
    written += len(raw)
    actual, pin = read_file(path)
    must(actual == raw and pin["mode"] == mode, "owned write readback differs")
    return {"path": str(path), "bytes": len(raw), "sha256": sha(raw)}

def save(name, value):
    raw = (json.dumps(value, ensure_ascii=True, indent=2, allow_nan=False) + "\n").encode("ascii")
    return write_new(CONTROL / name, raw)

def input_snapshot():
    pins, bodies = {}, {}
    for name, expected in HELPERS.items():
        raw, pin = read_file(SOURCE / name)
        must(all(pin[key] == expected[key] for key in ("bytes", "sha256", "gitBlob")), "source identity differs: " + name)
        pins[name], bodies[name] = pin, raw
    raw, pin = read_file(PYTHON)
    must(len(raw) == 118560 and sha(raw) == PYTHON_SHA, "existing Python identity differs")
    pins["existingPython"] = pin
    _, pins["authorControlSource"] = read_file(Path(__file__).absolute())
    return pins, bodies

def snapshot(root):
    files, bodies, directories = {}, {}, {}
    stack = [(root, "")]
    while stack:
        path, relative = stack.pop()
        directories[relative] = admitted_directory(path)
        with os.scandir(path) as entries:
            children = list(entries)
        must(len(children) <= 20 and len(files) + len(directories) <= 24, "bounded installation inventory")
        for child in children:
            rel = relative + "/" + child.name if relative else child.name
            s = child.stat(follow_symlinks=False)
            if stat.S_ISDIR(s.st_mode):
                must(rel in {"site", "site/courses", "recovery"}, "unexpected installation directory: " + rel)
                stack.append((Path(child.path), rel))
            else:
                raw, pin = read_file(Path(child.path))
                files[rel], bodies[rel] = pin, raw
    must(set(directories) == {"", "site", "site/courses", "recovery"}, "installation directory set differs")
    return {"directories": directories, "files": files}, bodies

def expected_inventory(sources):
    expected = {}
    for name, pin in ASSETS.items():
        expected["site/" + name] = {**pin, "mode": 0o644}
    for name in ("open.py", "README.md", "RELEASE.json"):
        expected[name] = {**HELPERS[name], "mode": 0o644}
    for name, pin in HELPERS.items():
        expected["recovery/" + name] = {**pin, "mode": 0o600}
    command = sources["Open LP Explorer.command.in"].decode("utf-8").replace(
        "@@PYTHON@@", shlex.quote(str(PYTHON))).encode("utf-8")
    must(command.startswith(b"#!/bin/zsh\n") and b" -B " in command, "expected launcher binding")
    expected["Open LP Explorer.command"] = {
        "bytes": len(command), "sha256": sha(command),
        "gitBlob": hashlib.sha1(b"blob " + str(len(command)).encode("ascii") + b"\0" + command).hexdigest(),
        "mode": 0o755,
    }
    return expected

def admit_installation(sources):
    inventory, bodies = snapshot(INSTALLED)
    expected = expected_inventory(sources)
    must(set(inventory["files"]) == set(expected) | {"INSTALLATION.json"}, "actual complete installed file set differs")
    for name, pin in expected.items():
        must(all(inventory["files"][name][k] == pin[k] for k in ("bytes", "sha256", "gitBlob", "mode")),
             "independent installed source pin differs: " + name)
    marker = json.loads(bodies["INSTALLATION.json"])
    fixed = {
        "schema": "recallweave.lp.local-installation/1", "destination": str(INSTALLED),
        "sourceCommit": SOURCE_COMMIT, "sourceTree": SOURCE_TREE,
        "releaseSha256": HELPERS["RELEASE.json"]["sha256"],
        "payloadSha256": HELPERS["LP-ASSETS.json"]["sha256"],
        "python": str(PYTHON), "pythonVersion": "3.13.7",
        "entryUrl": (INSTALLED / "site" / ENTRY).as_uri(),
    }
    must(all(marker.get(k) == v for k, v in fixed.items()), "genuine installation marker binding differs")
    must(marker.get("files") == {name: {k: pin[k] for k in ("bytes", "sha256", "mode")}
                                for name, pin in expected.items()}, "genuine marker inventory differs")
    return inventory, bodies, marker

class BoundedText(io.StringIO):
    def __init__(self, maximum):
        super().__init__()
        self.maximum, self.bytes_written = maximum, 0
    def write(self, value):
        size = len(value.encode("utf-8"))
        if self.bytes_written + size > self.maximum:
            raise RuntimeError("author control stream bound")
        self.bytes_written += size
        return super().write(value)

def call_main(raw, file, argv, spy=False):
    namespace = {"__name__": "lp_integrity_author_control", "__file__": str(file), "__package__": None}
    exec(compile(raw, str(file), "exec"), namespace)
    calls = []
    if spy:
        def record(command, **kwargs):
            calls.append({"argv": command, "kwargs": kwargs})
            return SimpleNamespace(returncode=0)
        namespace["subprocess"] = SimpleNamespace(run=record, DEVNULL=subprocess.DEVNULL,
                                                   TimeoutExpired=subprocess.TimeoutExpired)
    before_argv = sys.argv
    stdout, stderr = BoundedText(65536), BoundedText(16384)
    at = time.monotonic()
    try:
        sys.argv = [str(file)] + list(argv)
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = namespace["main"]()
    finally:
        sys.argv = before_argv
    record = {"argv": [str(file)] + list(argv), "method": "in-process exact main",
              "exit": code, "elapsedSeconds": time.monotonic() - at, "dispatchCalls": calls}
    for name, stream in (("stdout", stdout), ("stderr", stderr)):
        text = stream.getvalue()
        raw = text.encode("utf-8")
        record[name] = {"text": text, "bytes": len(raw), "sha256": sha(raw)}
    return record

def clone_specimen(name, installed_bodies, marker, missing_marker=False):
    root = CONTROL / name
    root.mkdir(mode=0o700)
    for relative in ("site", "site/courses", "recovery"):
        (root / relative).mkdir(mode=0o700)
    for relative, raw in installed_bodies.items():
        if relative == "INSTALLATION.json":
            continue
        write_new(root / relative, raw, marker["files"][relative]["mode"])
    if not missing_marker:
        derived = dict(marker)
        derived["destination"] = str(root)
        derived["entryUrl"] = (root / "site" / ENTRY).as_uri()
        write_new(root / "INSTALLATION.json",
            (json.dumps(derived, ensure_ascii=True, indent=2) + "\n").encode("ascii"), 0o644)
    return root

def complete(id, record):
    record["id"], record["passed"] = id, True
    result["controls"].append(record)
    result.setdefault("controlReceipts", []).append(save(id + ".json", record))

def timed_out(signum, frame):
    raise RuntimeError("20-second bounded author control deadline")

try:
    must(sys.platform == "darwin" and os.geteuid() == 501 and Path.home() == Path("/Users/me"),
         "fixed Mac/account differs")
    must(sys.executable == str(PYTHON) and sys.version_info[:3] == (3, 13, 7) and sys.dont_write_bytecode,
         "admitted Python/-B binding differs")
    admitted_directory(AUTHOR)
    admitted_directory(SOURCE)
    must(not os.path.lexists(CONTROL), "existing author-control root refused unchanged")
    signal.signal(signal.SIGALRM, timed_out)
    signal.setitimer(signal.ITIMER_REAL, MAX_CONTROL_SECONDS)
    inputs_before, source_bodies = input_snapshot()
    installed_before, installed_bodies, marker = admit_installation(source_bodies)
    result["inputsBefore"], result["installedBefore"] = inputs_before, installed_before
    CONTROL.mkdir(mode=0o700)
    created_control = True
    result["startReceipt"] = save("CONTROL-START.json", {
        "schema": result["schema"], "pid": result["pid"], "sourceIndexGitBlob": result["sourceIndexGitBlob"],
        "inputsBefore": inputs_before, "installedBefore": installed_before,
        "plannedControls": ["A2", "A3", "A4", "A6", "A5"],
    })

    original = source_bodies["LP-ASSETS.json"]
    offset = original.index(b"recallweave-deck/1")
    changed = original[:offset] + b"R" + original[offset + 1:]
    before_payload, after_payload = json.loads(original), json.loads(changed)
    expected_payload = json.loads(original)
    expected_payload["files"][0]["utf8"] = expected_payload["files"][0]["utf8"].replace(
        "recallweave-deck/1", "Recallweave-deck/1", 1)
    must(after_payload == expected_payload and len(changed) == len(original), "exact one-asset carrier mutation differs")
    altered_path = CONTROL / "LP-ASSETS-tampered.json"
    write_new(altered_path, changed)
    negative_destination = CONTROL / "tampered-carrier-destination"
    record = call_main(source_bodies["install.py"], SOURCE / "install.py",
                       ["--destination", str(negative_destination), "--payload", str(altered_path)])
    record["mutation"] = {"offset": offset, "beforeByte": original[offset], "afterByte": changed[offset],
                          "originalSha256": sha(original), "changedSha256": sha(changed),
                          "declaredMemberDigestsUnchanged": True}
    record["destinationAbsentAfter"] = not os.path.lexists(negative_destination)
    must(record["exit"] == 2 and record["destinationAbsentAfter"], "tampered carrier was not refused before mkdir")
    complete("A2-tampered-carrier", record)

    existing = CONTROL / "existing-destination"
    existing.mkdir(mode=0o700)
    sentinel = existing / "sentinel.txt"
    write_new(sentinel, b"Keep this author control sentinel unchanged.\n")
    _, sentinel_before = read_file(sentinel)
    directory_before = admitted_directory(existing)
    record = call_main(source_bodies["install.py"], SOURCE / "install.py",
                       ["--destination", str(existing)])
    _, sentinel_after = read_file(sentinel)
    record["before"] = {"directory": directory_before, "sentinel": sentinel_before}
    record["after"] = {"directory": admitted_directory(existing), "sentinel": sentinel_after}
    record["namesAfter"] = sorted(p.name for p in existing.iterdir())
    must(record["exit"] == 2 and record["before"] == record["after"] and record["namesAfter"] == ["sentinel.txt"],
         "existing destination was not refused unchanged")
    complete("A3-existing-destination", record)

    incomplete = clone_specimen("missing-marker", installed_bodies, marker, missing_marker=True)
    incomplete_before, _ = snapshot(incomplete)
    record = call_main(source_bodies["open.py"], incomplete / "open.py", [], spy=True)
    incomplete_after, _ = snapshot(incomplete)
    record["specimenUnchanged"] = incomplete_before == incomplete_after
    record["markerAbsent"] = not os.path.lexists(incomplete / "INSTALLATION.json")
    must(record["exit"] == 2 and not record["dispatchCalls"] and record["specimenUnchanged"] and record["markerAbsent"],
         "missing marker did not refuse before desktop dispatch")
    complete("A4-missing-marker", record)

    valid = clone_specimen("dispatch-and-tamper", installed_bodies, marker)
    valid_before, _ = snapshot(valid)
    record = call_main(source_bodies["open.py"], valid / "open.py", [], spy=True)
    valid_after, _ = snapshot(valid)
    exact_call = {"argv": ["/usr/bin/open", (valid / "site" / ENTRY).as_uri()],
                  "kwargs": {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "timeout": 10, "check": False}}
    record["specimenUnchanged"] = valid_before == valid_after
    must(record["exit"] == 0 and record["dispatchCalls"] == [exact_call] and record["specimenUnchanged"],
         "verified ordinary dispatch intent differs")
    complete("A6-valid-dispatch-spy", record)

    target = valid / "site/courses/linear-programming.json"
    original_course, course_before = read_file(target)
    must(original_course.startswith(b"{"), "frozen course mutation preimage differs")
    descriptor = os.open(target, os.O_RDWR | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "r+b") as stream:
        stream.write(b"[")
        stream.flush()
        os.fsync(stream.fileno())
    changed_course, course_after = read_file(target)
    must(changed_course == b"[" + original_course[1:], "exact installed asset mutation differs")
    changed_before, _ = snapshot(valid)
    record = call_main(source_bodies["open.py"], valid / "open.py", [], spy=True)
    changed_after, _ = snapshot(valid)
    record["mutation"] = {"relativePath": "site/courses/linear-programming.json", "offset": 0,
                          "beforeByte": 123, "afterByte": 91, "before": course_before, "after": course_after}
    record["specimenUnchangedByOpener"] = changed_before == changed_after
    must(record["exit"] == 2 and not record["dispatchCalls"] and record["specimenUnchangedByOpener"],
         "changed installed asset did not refuse before desktop dispatch")
    complete("A5-tampered-installed-asset", record)
except Exception as exc:
    result["error"] = {"type": type(exc).__name__, "message": str(exc)}
finally:
    if sys.platform == "darwin":
        signal.setitimer(signal.ITIMER_REAL, 0)
    if "inputsBefore" in result:
        try:
            after_inputs, _ = input_snapshot()
            after_installed, _, _ = admit_installation(source_bodies)
            result["inputsAfter"], result["installedAfter"] = after_inputs, after_installed
            result["inputsUnchanged"] = after_inputs == result["inputsBefore"]
            result["genuineInstallationUnchanged"] = after_installed == result["installedBefore"]
        except Exception as exc:
            result["preservationError"] = {"type": type(exc).__name__, "message": str(exc)}
result["elapsedSeconds"] = time.monotonic() - started
result["ownedBytesWrittenBeforeFinalReceipt"] = written
result["passed"] = bool(len(result["controls"]) == 5 and not result["error"]
                        and not result["preservationError"] and result.get("inputsUnchanged")
                        and result.get("genuineInstallationUnchanged")
                        and result["elapsedSeconds"] <= MAX_CONTROL_SECONDS)
result["scope"] = "Five fixed author-control invocations, exact source admission and preservation only; actual installed shebang and browser receiving remain separate. All owned negative specimens and original failures are retained."
if created_control:
    try:
        receipt = save("AUTHOR-CONTROLS.json", result)
    except Exception as exc:
        result["passed"] = False
        result["receiptError"] = {"type": type(exc).__name__, "message": str(exc)}
        receipt = None
else:
    receipt = None
summary = {"schema": result["schema"], "pid": result["pid"], "passed": result["passed"],
           "completedControlIds": [x["id"] for x in result["controls"]],
           "inputsUnchanged": result.get("inputsUnchanged"),
           "genuineInstallationUnchanged": result.get("genuineInstallationUnchanged"),
           "elapsedSeconds": result["elapsedSeconds"], "receipt": receipt,
           "error": result["error"], "preservationError": result["preservationError"],
           "receiptError": result.get("receiptError"), "scope": result["scope"]}
print(json.dumps(summary, ensure_ascii=True, allow_nan=False))
raise SystemExit(0 if result["passed"] else 3)
