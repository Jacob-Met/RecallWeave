#!/usr/bin/env python3
"""Receive the immutable offline ZIP and this companion; standard library only."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile

ROOT = Path(__file__).resolve().parent

def require(ok, message):
    if not ok:
        raise ValueError(message)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def main():
    if len(sys.argv) != 2:
        raise ValueError("Usage: python -B verify.py PATH_TO_RecallWeave-offline-ranked-voting-7b1ebea7.zip")
    manifest = json.loads((ROOT / "MANIFEST.json").read_text(encoding="utf-8"))
    for name, expected in manifest["files"].items():
        p = ROOT / name
        require(p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(ROOT), "Missing regular payload: " + name)
        data = p.read_bytes()
        require(len(data) == expected["bytes"] and sha(data) == expected["sha256"], "Changed companion payload: " + name)
    pins = json.loads((ROOT / "SOURCE-PINS.json").read_text(encoding="utf-8"))
    for name, expected in pins["files"].items():
        require(blob((ROOT / name).read_bytes()) == expected["git_blob"], "Published blob differs: " + name)
    zpath = Path(sys.argv[1])
    data = zpath.read_bytes()
    expected = pins["offline_zip"]
    require(len(data) == expected["bytes"] and sha(data) == expected["sha256"] and blob(data) == expected["git_blob"], "Offline ZIP identity differs")
    with zipfile.ZipFile(zpath) as z:
        names = z.namelist()
        require(len(names) == len(set(names)) == 48, "Offline ZIP member set differs")
        require(all(not PurePosixPath(n).is_absolute() and ".." not in PurePosixPath(n).parts and "\\" not in n for n in names), "Unsafe ZIP path")
        require(z.testzip() is None, "Offline ZIP CRC failure")
        checks = json.loads(z.read("RecallWeave/SHA256SUMS.json"))["files"]
        require(len(checks) == 47 and set(names) == {"RecallWeave/" + p["path"] for p in checks} | {"RecallWeave/SHA256SUMS.json"}, "Offline checksum coverage differs")
        for entry in checks:
            b = z.read("RecallWeave/" + entry["path"])
            require(len(b) == entry["bytes"] and sha(b) == entry["sha256"], "Offline payload differs: " + entry["path"])
        raw_course = z.read("RecallWeave/courses/ranked-voting.json")
        require(raw_course == (ROOT / "evidence/ranked-voting.json").read_bytes(), "Course differs from published source")
        require(sha(z.read("RecallWeave/demo.html")) == "b9fc516195776c8ceca2d00cd1167765b32c32cef68f91c7b772dcc3c85e62b7", "Qualified learner differs")
    course = json.loads(raw_course)
    result = json.loads((ROOT / "evidence/browser-current.json").read_text(encoding="utf-8"))
    receipt = json.loads((ROOT / "evidence/native-receipt.json").read_text(encoding="utf-8"))
    review = json.loads((ROOT / "evidence/independent-math-review.json").read_text(encoding="utf-8"))
    require(result["status"] == "passed" and len(result["groups"]) == 4 and all(g["status"] == "passed" for g in result["groups"]), "Native groups differ")
    require(not result["pageErrors"] and not result["fatal"] and all(u.startswith("file:") for u in result["requests"]), "Native browser boundary differs")
    require(review["status"] == "passed" and not review["blocking_findings"] and len(review["question_keys"]) == 16, "Independent math review differs")
    for name in ["desktop-study-notes.txt", "mobile-offline-study-notes.txt"]:
        raw = (ROOT / "evidence" / name).read_bytes()
        expected = next(x for x in receipt["qualifiedDownloads"] if x["path"].endswith("/" + name))
        require(len(raw) == expected["bytes"] and sha(raw) == expected["sha256"], "Actual study-note identity differs")
        text = raw.decode("utf-8")
        for q in course["items"]:
            for part in [q["prompt"], q["options"][q["answer"]], q["explanation"], q["transfer"]]:
                require(part in text, "Study notes omit course content: " + q["id"])
        for part in [course["attribution"], course["license"], "15 of 16", "1 of 1 practice"]:
            require(part in text, "Study notes omit retained session content")
    print(json.dumps({
        "status": "passed", "companion_payloads_verified": len(manifest["files"]),
        "published_blobs_verified": len(pins["files"]), "offline_members": len(names),
        "offline_payloads_verified": len(checks), "courses": 44, "ranked_voting_questions": len(course["items"]),
        "retained_actual_note_downloads": 2, "native_groups": 4,
        "qualification": "Artifact custody and recorded native/math evidence; no new browser run"
    }, indent=2))

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, StopIteration, zipfile.BadZipFile) as exc:
        print("Receiving failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
