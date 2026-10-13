#!/usr/bin/env python3
"""Verify the Bloom companion and exact received offline pack without running a browser."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile

ROOT = Path(__file__).resolve().parent
def require(ok, message):
    if not ok:
        raise ValueError(message)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("offline_zip", type=Path, help="the separately delivered 45-course ZIP")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "SHA256SUMS.json").read_bytes())
    names = [e["path"] for e in manifest["files"]]
    require(len(names) == len(set(names)), "duplicate companion path")
    actual = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file() and p.name != "SHA256SUMS.json")
    require(actual == sorted(names), "companion inventory differs")
    for e in manifest["files"]:
        p = PurePosixPath(e["path"])
        require(not p.is_absolute() and ".." not in p.parts and "\\" not in e["path"], "unsafe companion path")
        b = (ROOT / e["path"]).read_bytes()
        require(len(b) == e["bytes"] and hashlib.sha256(b).hexdigest() == e["sha256"], "companion differs: " + e["path"])
    source = json.loads((ROOT / "SOURCE.json").read_bytes())
    for e in source["files"]:
        b = (ROOT / e["path"]).read_bytes()
        require(hashlib.sha1(b"blob " + str(len(b)).encode() + b"\0" + b).hexdigest() == e["gitBlob"], "Git blob differs: " + e["path"])
    pack = args.offline_zip.read_bytes()
    require(len(pack) == 1469562 and hashlib.sha256(pack).hexdigest() == "62ce643c995aea29dc6da7f837532822ac25c7c2fc7ad3dac6b36e7b69c605b6", "offline ZIP differs")
    deck_raw = (ROOT / "bloom-filters.json").read_bytes()
    deck = json.loads(deck_raw)
    native = json.loads((ROOT / "native/browser-results/result.json").read_bytes())
    require(native["status"] == "passed" and len(native["groups"]) == 4 and all(g["status"] == "passed" for g in native["groups"]), "native result differs")
    require(native["pageErrors"] == [] and len(native["requests"]) == 7 and all(r.startswith("file:") for r in native["requests"]), "native request scope differs")
    require(native["sourceBodiesUnchanged"] and len(native["downloads"]) == 4, "native source/download binding differs")
    for e in native["downloads"]:
        b = (ROOT / "native" / e["path"]).read_bytes()
        require(len(b) == e["bytes"] and hashlib.sha256(b).hexdigest() == e["sha256"], "download differs")
        if e["path"].endswith(".json"):
            require(b == deck_raw, "downloaded deck differs")
        else:
            text = b.decode()
            for question in deck["items"]:
                for value in [question["prompt"], question["explanation"], question["transfer"], question["options"][question["answer"]]]:
                    require(value in text, "downloaded notes omit course content")
            require("15 of 16 connections correct on the first try." in text and "1 correct on retry." in text, "note outcome differs")
    for name in ["mobile-offline-question.png", "desktop-review.png"]:
        e = next(e for e in native["screenshots"] if e["path"].endswith("/" + name))
        b = (ROOT / "images" / name).read_bytes()
        require(len(b) == e["bytes"] and hashlib.sha256(b).hexdigest() == e["sha256"], "screenshot differs")
    with zipfile.ZipFile(args.offline_zip) as z:
        entries = z.namelist()
        require(len(entries) == len(set(entries)) == 49 and z.testzip() is None, "ZIP members/CRC differ")
        require(all(not PurePosixPath(n).is_absolute() and ".." not in PurePosixPath(n).parts for n in entries), "unsafe ZIP path")
        checks = json.loads(z.read("RecallWeave/SHA256SUMS.json"))["files"]
        require(len(checks) == 48, "ZIP checksum count differs")
        for e in checks:
            b = z.read("RecallWeave/" + e["path"])
            require(len(b) == e["bytes"] and hashlib.sha256(b).hexdigest() == e["sha256"], "ZIP payload differs")
        require(z.read("RecallWeave/courses/bloom-filters.json") == deck_raw, "ZIP course differs")
        require(sum(n.startswith("RecallWeave/courses/") and n.endswith(".json") for n in entries) == 45, "course count differs")
        learner = z.read("RecallWeave/demo.html")
        e = next(e for e in native["inputs"] if e["path"] == "source/demo.html")
        require(len(learner) == e["bytes"] and hashlib.sha256(learner).hexdigest() == e["sha256"], "received learner differs")
    print(json.dumps({"ok": True, "companionPayloads": len(names), "publishedGitBlobs": len(source["files"]),
                      "zipMembers": 49, "zipChecksums": 48, "courses": 45, "contentEntries": 16,
                      "actualRetainedDownloads": 4,
                      "qualification": "Exact custody and retained evidence only; no new browser execution."}, indent=2))

if __name__ == "__main__":
    main()
