#!/usr/bin/env python3
"""Verify and open the installed, self-contained RecallWeave LP explorer."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

SOURCE_COMMIT = "b5e46d4f8c3013259c0baa81507652d900cb5074"
SOURCE_TREE = "988b548df0dee45259e54341b56beba1a054ccc9"
RELEASE_BYTES = 934
RELEASE_SHA256 = "2328e2f3fba72cc067eeb8b29f7c0c28e83deb94cd95304ed489e45c3ffaecae"
PAYLOAD_SHA256 = "0edca06da25ac75ead7ab6891b219a5ae9facad24ef3ceaa599e42b0e78f850b"
ENTRY = "courses/linear-programming-explorer.html"
SOURCE_NAMES = ("install.py", "open.py", "Open LP Explorer.command.in",
                "README.md", "LP-ASSETS.json", "RELEASE.json")
ASSETS = {
    "courses/linear-programming.json": {
        "bytes": 13211,
        "sha256": "d251a3bc174d109d185d600871f8890d81722aed5c190f759b604d162685c5c5",
        "gitBlob": "626390853e90df96de34f061e7a4f5114c36d067"
    },
    "courses/linear-programming.md": {
        "bytes": 8028,
        "sha256": "fa3a0f5a133189ef3a52cd933060245703185f2fcd69327207128dae06fe4e5d",
        "gitBlob": "717653e782acd1d23113117d70cdc7c0a5cd301b"
    },
    "courses/linear-programming-explorer.html": {
        "bytes": 64651,
        "sha256": "a0e64d648b19b0d3cea8fbf321cc318d811acfc7e376e5553ba41e7fcb2cb66f",
        "gitBlob": "de1719274b8acf7b9c161e993b7b9dc1ac93d812"
    }
}
INSTALLED_NAMES = (tuple("site/" + name for name in ASSETS)
                   + ("open.py", "Open LP Explorer.command", "README.md", "RELEASE.json")
                   + tuple("recovery/" + name for name in SOURCE_NAMES))


class Refusal(ValueError):
    """The installed package does not match the recorded release."""


def pairs(items: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in items:
        if key in result:
            raise Refusal("Duplicate JSON field: " + key)
        result[key] = value
    return result


def load_json(body: bytes) -> dict:
    def invalid_constant(value: str) -> None:
        raise Refusal("Invalid JSON number: " + value)
    result = json.loads(body.decode("utf-8"), object_pairs_hook=pairs,
                        parse_constant=invalid_constant)
    if type(result) is not dict:
        raise Refusal("Expected a JSON object.")
    return result


def read_regular(path: Path, maximum: int) -> tuple[bytes, os.stat_result]:
    for parent in path.parents:
        if not stat.S_ISDIR(parent.lstat().st_mode):
            raise Refusal("A package parent is not an ordinary directory: " + str(parent))
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode):
        raise Refusal("Expected an ordinary file: " + str(path))
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "rb") as stream:
        opened = os.fstat(stream.fileno())
        if (before.st_dev, before.st_ino) != (opened.st_dev, opened.st_ino):
            raise Refusal("A file changed while it was opened.")
        body = stream.read(maximum + 1)
        after = os.fstat(stream.fileno())
    identity = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_mode)
    if len(body) > maximum or identity(before) != identity(after) or identity(after) != identity(path.lstat()):
        raise Refusal("A file changed or exceeds its permitted size: " + str(path))
    return body, after


def verify(root: Path) -> dict:
    marker_bytes, _ = read_regular(root / "INSTALLATION.json", 32768)
    marker = load_json(marker_bytes)
    entry_url = (root / "site" / ENTRY).as_uri()
    if (marker.get("schema") != "recallweave.lp.local-installation/1"
            or marker.get("sourceCommit") != SOURCE_COMMIT
            or marker.get("sourceTree") != SOURCE_TREE
            or marker.get("releaseSha256") != RELEASE_SHA256
            or marker.get("payloadSha256") != PAYLOAD_SHA256
            or marker.get("destination") != str(root)
            or marker.get("entryUrl") != entry_url):
        raise Refusal("The installation marker does not describe this release and location.")
    files = marker.get("files")
    if type(files) is not dict or set(files) != set(INSTALLED_NAMES):
        raise Refusal("The recorded installation inventory is incomplete.")
    bodies = {}
    for name in INSTALLED_NAMES:
        pin = files[name]
        if (type(pin) is not dict or set(pin) != {"bytes", "sha256", "mode"}
                or type(pin["bytes"]) is not int or not 0 <= pin["bytes"] <= 262144
                or type(pin["mode"]) is not int or not 0 <= pin["mode"] <= 0o777
                or type(pin["sha256"]) is not str
                or re.fullmatch(r"[0-9a-f]{64}", pin["sha256"]) is None):
            raise Refusal("An installation file record is invalid: " + name)
        body, metadata = read_regular(root / name, pin["bytes"])
        if (len(body) != pin["bytes"]
                or hashlib.sha256(body).hexdigest() != pin["sha256"]
                or stat.S_IMODE(metadata.st_mode) != pin["mode"]):
            raise Refusal("An installed file changed: " + name)
        bodies[name] = body
    release = bodies["RELEASE.json"]
    if len(release) != RELEASE_BYTES or hashlib.sha256(release).hexdigest() != RELEASE_SHA256:
        raise Refusal("The fixed release manifest changed.")
    if bodies["recovery/RELEASE.json"] != release:
        raise Refusal("The recovery release differs from the installed release.")
    if hashlib.sha256(bodies["recovery/LP-ASSETS.json"]).hexdigest() != PAYLOAD_SHA256:
        raise Refusal("The original asset carrier changed.")
    for name, expected in ASSETS.items():
        body = bodies["site/" + name]
        git_blob = hashlib.sha1(("blob " + str(len(body)) + "\0").encode() + body).hexdigest()
        if (len(body) != expected["bytes"]
                or hashlib.sha256(body).hexdigest() != expected["sha256"]
                or git_blob != expected["gitBlob"]):
            raise Refusal("An asset is not the original qualified LP file: " + name)
    return {"schema": "recallweave.lp.local-check/1", "sourceCommit": SOURCE_COMMIT,
            "sourceTree": SOURCE_TREE, "releaseSha256": RELEASE_SHA256,
            "fileUrl": entry_url, "filesVerified": len(files), "files": files,
            "assetPaths": list(ASSETS)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Open the installed RecallWeave LP explorer.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Verify the package without opening it.")
    mode.add_argument("--no-open", action="store_true", help="Verify and report its exact file URL.")
    args = parser.parse_args()
    try:
        root = Path(__file__).absolute().parent
        result = verify(root)
        result["mode"] = "check" if args.check else "no-open" if args.no_open else "open"
        result["openRequested"] = False
        if not args.check and not args.no_open:
            if sys.platform != "darwin":
                raise Refusal("Use the Mac entry on macOS, or open the verified HTML yourself.")
            opened = subprocess.run(["/usr/bin/open", result["fileUrl"]],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                    timeout=10, check=False)
            result["openRequested"] = True
            result["openExit"] = opened.returncode
            if opened.returncode:
                raise Refusal("The Mac opener declined the file. Run --no-open to see its address.")
        print(json.dumps(result, ensure_ascii=True, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.TimeoutExpired) as exc:
        print("LP Explorer could not open: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
