#!/usr/bin/env python3
"""Materialize only eight pinned historical inputs from an existing Git object store.

This prepares an isolated receiver directory; it does not fetch or execute tests.
The output directory must not already exist. No current checkout file is changed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("Choose a new output directory; existing output is never overwritten.")
    pin_bytes = (HERE / "historical/source-pins.json").read_bytes()
    pins = json.loads(pin_bytes)
    prepared = []
    for row in pins["files"]:
        path = Path(row["path"])
        if path.is_absolute() or ".." in path.parts:
            raise SystemExit("Refusing an unexpected manifest path.")
        found = subprocess.run(["git", "-C", str(args.repository), "cat-file", "blob", row["git_blob"]], capture_output=True, check=True)
        data = found.stdout
        blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if blob != row["git_blob"] or hashlib.sha256(data).hexdigest() != row["sha256"] or len(data) != row["bytes"]:
            raise SystemExit("Pinned input mismatch: " + row["path"])
        prepared.append((path, data))
    receiver = (HERE / "historical/receive_baseline.mjs").read_bytes()
    args.output.mkdir(parents=True, exist_ok=False)
    for path, data in prepared:
        target = args.output / "baseline" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as output:
            output.write(data)
    for name, data in (("source-pins.json", pin_bytes), ("receive_baseline.mjs", receiver)):
        with (args.output / name).open("xb") as output:
            output.write(data)
    print(json.dumps({"prepared": len(prepared), "source_head": pins["source_head"], "output": str(args.output), "tests_executed": False}))


if __name__ == "__main__":
    main()
