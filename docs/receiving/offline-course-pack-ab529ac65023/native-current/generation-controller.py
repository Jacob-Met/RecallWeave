from pathlib import Path
import base64, ctypes, datetime, hashlib, json, os, shutil, stat, subprocess, sys, time, traceback

BASE = Path(__file__).resolve().parent
SOURCE = BASE / "source-v1"
INPUT = BASE / "generation-input-v1.json"
GIT = r"C:\Program Files\Git\cmd\git.exe"
PREFIX = "docs/receiving/offline-course-pack-ab529ac65023/native-current"
FLOOR = 1024 * 1024 * 1024
MEMORY_FLOOR = 512 * 1024 * 1024
EXPECTED_INPUT_BYTES = 605569
EXPECTED_INPUT_SHA = "bcff80fd0aebda7d7007337927a69425183b0eacc95042407630476416c5b36a"

class MemoryStatus(ctypes.Structure):
    _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong),
                ("total_phys", ctypes.c_ulonglong), ("available_phys", ctypes.c_ulonglong),
                ("total_page", ctypes.c_ulonglong), ("available_page", ctypes.c_ulonglong),
                ("total_virtual", ctypes.c_ulonglong), ("available_virtual", ctypes.c_ulonglong),
                ("extended_virtual", ctypes.c_ulonglong)]

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def pin(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": sha(data), "gitBlob": blob(data)}

def checked_bytes(entry):
    data = entry["content"].encode("utf-8")
    assert len(data) == entry["bytes"] and sha(data) == entry["sha256"]
    assert blob(data) == entry["gitBlob"]
    return data

memory = MemoryStatus()
memory.length = ctypes.sizeof(memory)
assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(memory))
free = shutil.disk_usage(BASE).free
assert free >= FLOOR and memory.available_phys >= MEMORY_FLOOR, "Native capacity floor refused"
assert not SOURCE.exists(), "Source destination already exists; preserve and inspect"
owner = json.loads((BASE / ".owner.json").read_text(encoding="utf-8"))
assert owner["owner"] == "hamon-ultra-ab529ac65023-20261008/root"
raw = INPUT.read_bytes()
assert len(raw) == EXPECTED_INPUT_BYTES and sha(raw) == EXPECTED_INPUT_SHA
payload = json.loads(raw)
assert len(payload["files"]) == 17
assert len({entry["path"] for entry in payload["files"]}) == 17
for entry in payload["files"]:
    assert entry["path"] and not entry["path"].startswith("/") and "\\" not in entry["path"]
    assert all(part not in ("", ".", "..") for part in entry["path"].split("/"))
    checked_bytes(entry)
baseline_demo = checked_bytes(payload["baselineDemo"])
record = {
    "schema": "recallweave-offline-pack-windows-generation-v1",
    "status": "running", "startedAt": now(), "owner": payload["owner"],
    "device": owner["device"], "python": sys.version, "pythonExecutable": sys.executable,
    "platform": sys.platform, "root": str(SOURCE), "sourceKind": payload["sourceKind"],
    "publicSource": payload["publicSource"], "publicMergedLearner": payload["publicMergedLearner"],
    "publicMergedTree": payload["publicMergedTree"],
    "linuxCapacityDeferrals": payload["linuxCapacityDeferrals"],
    "headroom": {"freeBytes": free, "minimumDiskBytes": FLOOR,
                 "availableMemoryBytes": memory.available_phys, "minimumMemoryBytes": MEMORY_FLOOR},
    "input": {"bytes": len(raw), "sha256": sha(raw)},
    "commands": [], "sourceFiles": {},
}
logs = []

def run(args, expected=0):
    start = time.monotonic()
    result = subprocess.run([str(arg) for arg in args], cwd=SOURCE, capture_output=True)
    entry = {"command": [str(arg) for arg in args], "expectedExit": expected,
             "exit": result.returncode, "seconds": round(time.monotonic() - start, 3),
             "stdout": result.stdout.decode("utf-8", "replace"),
             "stderr": result.stderr.decode("utf-8", "replace"),
             "stdoutBytes": len(result.stdout), "stdoutSha256": sha(result.stdout),
             "stderrBytes": len(result.stderr), "stderrSha256": sha(result.stderr),
             "stdoutBase64": base64.b64encode(result.stdout).decode("ascii"),
             "stderrBase64": base64.b64encode(result.stderr).decode("ascii")}
    record["commands"].append(entry)
    logs.append(json.dumps(entry, ensure_ascii=False, indent=2) + "\n")
    assert result.returncode == expected, "Unexpected status: " + repr(args)
    return result.stdout.decode("utf-8").strip()

def git(*args):
    return run([GIT, *args])

try:
    SOURCE.mkdir()
    for entry in payload["files"]:
        path = SOURCE / entry["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        data = baseline_demo if entry["path"] == "demo.html" else checked_bytes(entry)
        path.write_bytes(data)
    git("init")
    git("config", "core.autocrlf", "false")
    git("config", "core.filemode", "false")
    git("config", "user.name", payload["owner"])
    git("config", "user.email", "hamon-ultra-ab529ac65023-20261008@users.noreply.github.com")
    git("add", "--", *[entry["path"] for entry in payload["files"]])
    git("commit", "-m", "Freeze exact offline producer inputs for native Windows receiving")
    record["nativeInputCommit"] = git("rev-parse", "HEAD")
    record["nativeInputTree"] = git("rev-parse", "HEAD^{tree}")
    run([sys.executable, "tools/build-offline-pack.py"])
    baseline_archive = pin(SOURCE / "offline/recallweave-offline.zip")
    for key in ["bytes", "sha256", "gitBlob"]:
        assert baseline_archive[key] == payload["baselineArchive"][key], key
    record["crossPlatformBaseline"] = {
        "status": "passed", "observedArchive": baseline_archive,
        "reference": payload["baselineArchive"],
        "meaning": "Actual Windows Python 3.11 output exactly equals the retained Linux Python 3.14.4 artifact",
    }
    run([sys.executable, "tools/build-offline-pack.py", "--check"])
    git("add", "--", "offline/recallweave-offline.zip")
    git("commit", "-m", "Preserve exact cross-platform offline archive")
    record["nativeBaselineCommit"] = git("rev-parse", "HEAD")
    current_demo = next(entry for entry in payload["files"] if entry["path"] == "demo.html")
    (SOURCE / "demo.html").write_bytes(checked_bytes(current_demo))
    before_stale = pin(SOURCE / "offline/recallweave-offline.zip")
    run([sys.executable, "tools/build-offline-pack.py", "--check"], expected=1)
    assert pin(SOURCE / "offline/recallweave-offline.zip") == before_stale
    record["staleCheckPreservedArchive"] = True
    run([sys.executable, "tools/build-offline-pack.py"])
    run([sys.executable, "tools/build-offline-pack.py", "--check"])
    current_archive = pin(SOURCE / "offline/recallweave-offline.zip")
    assert current_archive["bytes"] == 427769
    assert current_archive["sha256"] != baseline_archive["sha256"]
    record["currentArchive"] = current_archive
    for entry in payload["files"]:
        observed = pin(SOURCE / entry["path"])
        assert observed == {key: entry[key] for key in ["bytes", "sha256", "gitBlob"]}
        record["sourceFiles"][entry["path"]] = observed
    git("diff", "--check")
    git("add", "--", "demo.html", "offline/recallweave-offline.zip")
    assert set(git("diff", "--cached", "--name-only").splitlines()) == {"demo.html", "offline/recallweave-offline.zip"}
    git("commit", "-m", "Build offline archive from the exact merged learner")
    record["nativeCandidateCommit"] = git("rev-parse", "HEAD")
    record["nativeCandidateTree"] = git("rev-parse", "HEAD^{tree}")
    assert git("status", "--porcelain") == ""
    record["status"] = "passed"
    record["finishedAt"] = now()
    record["freeBytesAfter"] = shutil.disk_usage(BASE).free
    logdata = "".join(logs).encode("utf-8")
    record["log"] = {"path": PREFIX + "/producer-recomposition.log",
                     "bytes": len(logdata), "sha256": sha(logdata)}
    evidence = SOURCE / PREFIX
    evidence.mkdir(parents=True)
    (evidence / "producer-recomposition.log").write_bytes(logdata)
    (evidence / "producer-recomposition.json").write_bytes((json.dumps(record, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    (evidence / "generation-controller.py").write_bytes(Path(__file__).read_bytes())
    final_paths = [PREFIX + "/" + name for name in ["producer-recomposition.log", "producer-recomposition.json", "generation-controller.py"]]
    git("add", "--", *final_paths)
    git("commit", "-m", "Preserve native producer recomposition and platform parity receiving")
    custody_commit = git("rev-parse", "HEAD")
    custody_tree = git("rev-parse", "HEAD^{tree}")
    assert git("status", "--porcelain") == ""
    exports = []
    for rel in ["offline/recallweave-offline.zip", *final_paths]:
        data = (SOURCE / rel).read_bytes()
        exports.append({"path": rel, "bytes": len(data), "sha256": sha(data),
                        "gitBlob": blob(data), "base64": base64.b64encode(data).decode("ascii")})
    packet = (json.dumps({"schema": "recallweave-offline-pack-native-current-transfer-v1",
                         "nativeCandidateCommit": record["nativeCandidateCommit"],
                         "custodyCommit": custody_commit, "custodyTree": custody_tree,
                         "files": exports}, indent=2) + "\n").encode("utf-8")
    transfer = BASE / "generation-transfer-v1.json"
    with transfer.open("xb") as handle:
        handle.write(packet)
    summary = {"status": "passed", "nativeInputCommit": record["nativeInputCommit"],
               "nativeBaselineCommit": record["nativeBaselineCommit"],
               "nativeCandidateCommit": record["nativeCandidateCommit"],
               "nativeCandidateTree": record["nativeCandidateTree"],
               "custodyCommit": custody_commit, "custodyTree": custody_tree,
               "baselineArchive": baseline_archive, "currentArchive": current_archive,
               "all17SourceFilesExact": True, "transfer": str(transfer),
               "transferBytes": len(packet), "transferSha256": sha(packet),
               "freeBytesAfter": record["freeBytesAfter"],
               "evidence": [{key: value for key, value in entry.items() if key != "base64"} for entry in exports]}
    (BASE / "generation-summary-v1.json").write_bytes((json.dumps(summary, indent=2) + "\n").encode())
    print(json.dumps(summary))
except BaseException:
    record["status"] = "failed"
    record["finishedAt"] = now()
    record["error"] = traceback.format_exc()
    (BASE / "generation-failure-v1.json").write_bytes((json.dumps(record, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    (BASE / "generation-failure-v1.log").write_bytes("".join(logs).encode("utf-8"))
    raise
