#!/usr/bin/env python3
"""Install the exact qualified LP explorer into a new Mac application folder."""
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shlex
import stat
import sys

SOURCE_COMMIT = "b5e46d4f8c3013259c0baa81507652d900cb5074"
SOURCE_TREE = "988b548df0dee45259e54341b56beba1a054ccc9"
PAYLOAD_BYTES = 89373
PAYLOAD_SHA256 = "0edca06da25ac75ead7ab6891b219a5ae9facad24ef3ceaa599e42b0e78f850b"
RELEASE_BYTES = 934
RELEASE_SHA256 = "2328e2f3fba72cc067eeb8b29f7c0c28e83deb94cd95304ed489e45c3ffaecae"
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


class Refusal(ValueError):
    """Inputs or destination are not admitted for this installation."""


def pairs(items: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in items:
        if key in result:
            raise Refusal("Duplicate JSON field: " + key)
        result[key] = value
    return result


def read_regular(path: Path, maximum: int) -> bytes:
    for parent in path.parents:
        if not stat.S_ISDIR(parent.lstat().st_mode):
            raise Refusal("A source parent is not an ordinary directory: " + str(parent))
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode):
        raise Refusal("Expected an ordinary file: " + str(path))
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "rb") as stream:
        opened = os.fstat(stream.fileno())
        if (before.st_dev, before.st_ino) != (opened.st_dev, opened.st_ino):
            raise Refusal("A source file changed while it was opened.")
        body = stream.read(maximum + 1)
        after = os.fstat(stream.fileno())
    identity = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_mode)
    if len(body) > maximum or identity(before) != identity(after) or identity(after) != identity(path.lstat()):
        raise Refusal("A source file changed or exceeds its permitted size: " + str(path))
    return body


def admit_payload(body: bytes) -> dict[str, bytes]:
    if len(body) != PAYLOAD_BYTES or hashlib.sha256(body).hexdigest() != PAYLOAD_SHA256:
        raise Refusal("The carrier is not the exact qualified LP asset carrier.")
    payload = json.loads(body.decode("utf-8"), object_pairs_hook=pairs)
    if (type(payload) is not dict or set(payload) != {"schema", "sourceCommit", "sourceTree", "files"}
            or payload["schema"] != "recallweave.lp.local-assets/1"
            or payload["sourceCommit"] != SOURCE_COMMIT
            or payload["sourceTree"] != SOURCE_TREE
            or type(payload["files"]) is not list or len(payload["files"]) != 3):
        raise Refusal("The carrier has an unexpected release identity.")
    assets = {}
    for member in payload["files"]:
        if type(member) is not dict or set(member) != {"path", "bytes", "sha256", "gitBlob", "utf8"}:
            raise Refusal("An asset record has unexpected fields.")
        name = member["path"]
        if type(name) is not str or name not in ASSETS or name in assets or type(member["utf8"]) is not str:
            raise Refusal("Unexpected or repeated asset path.")
        expected = ASSETS[name]
        body = member["utf8"].encode("utf-8")
        git_blob = hashlib.sha1(("blob " + str(len(body)) + "\0").encode() + body).hexdigest()
        if (any(member[key] != expected[key] for key in expected)
                or len(body) != expected["bytes"]
                or hashlib.sha256(body).hexdigest() != expected["sha256"]
                or git_blob != expected["gitBlob"]):
            raise Refusal("An asset differs from the qualified source: " + name)
        assets[name] = body
    if set(assets) != set(ASSETS):
        raise Refusal("The complete LP asset set is required.")
    return assets


def write_new(path: Path, body: bytes, mode: int) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(body)
        stream.flush()
        os.fchmod(stream.fileno(), mode)
        os.fsync(stream.fileno())


def main() -> int:
    parser = argparse.ArgumentParser(description="Install the qualified LP explorer in a new folder.")
    parser.add_argument("--destination", type=Path, required=True, help="An absolute new folder under an existing parent.")
    parser.add_argument("--payload", type=Path, help="Exact LP-ASSETS.json; defaults to the file beside this installer.")
    args = parser.parse_args()
    made_directory = False
    destination = args.destination
    try:
        if sys.platform != "darwin":
            raise Refusal("This local entry installer is qualified for macOS.")
        if not destination.is_absolute() or ".." in destination.parts:
            raise Refusal("Use an absolute new destination without parent traversal.")
        if os.path.lexists(destination):
            raise Refusal("The destination already exists. Its files have not been changed.")
        for parent in destination.parents:
            if not stat.S_ISDIR(parent.lstat().st_mode):
                raise Refusal("The destination parent must already be an ordinary directory.")
        if destination.parent.stat().st_uid != os.geteuid():
            raise Refusal("The destination parent is not owned by the current user.")
        source_root = Path(__file__).absolute().parent
        payload_path = args.payload.absolute() if args.payload is not None else source_root / "LP-ASSETS.json"
        payload_bytes = read_regular(payload_path, PAYLOAD_BYTES)
        assets = admit_payload(payload_bytes)
        sources = {name: read_regular(source_root / name, 262144) for name in SOURCE_NAMES}
        if sources["LP-ASSETS.json"] != payload_bytes:
            raise Refusal("The source and selected asset carrier differ.")
        release = sources["RELEASE.json"]
        if len(release) != RELEASE_BYTES or hashlib.sha256(release).hexdigest() != RELEASE_SHA256:
            raise Refusal("The exact release manifest is required.")
        template = sources["Open LP Explorer.command.in"].decode("utf-8")
        if template.count("@@PYTHON@@") != 1:
            raise Refusal("The launcher template is invalid.")
        launcher = template.replace("@@PYTHON@@", shlex.quote(sys.executable)).encode("utf-8")
        compile(sources["open.py"], str(source_root / "open.py"), "exec")

        installed = {"site/" + name: (body, 0o644) for name, body in assets.items()}
        installed.update({"open.py": (sources["open.py"], 0o644),
                          "Open LP Explorer.command": (launcher, 0o755),
                          "README.md": (sources["README.md"], 0o644),
                          "RELEASE.json": (release, 0o644)})
        installed.update({"recovery/" + name: (body, 0o600) for name, body in sources.items()})
        destination.mkdir(mode=0o700)
        made_directory = True
        for relative in ("site", "site/courses", "recovery"):
            (destination / relative).mkdir(mode=0o700)
        for name, (body, mode) in installed.items():
            write_new(destination / name, body, mode)
        files = {}
        for name, (expected_body, mode) in installed.items():
            path = destination / name
            body = read_regular(path, len(expected_body))
            if body != expected_body or stat.S_IMODE(path.lstat().st_mode) != mode:
                raise Refusal("An installed write did not verify: " + name)
            files[name] = {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(), "mode": mode}
        receipt = {"schema": "recallweave.lp.local-installation/1",
                   "installedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   "destination": str(destination), "sourceCommit": SOURCE_COMMIT,
                   "sourceTree": SOURCE_TREE, "releaseSha256": RELEASE_SHA256,
                   "payloadSha256": PAYLOAD_SHA256, "python": sys.executable,
                   "pythonVersion": sys.version.split()[0],
                   "entryUrl": (destination / "site" / ENTRY).as_uri(), "files": files}
        marker = (json.dumps(receipt, ensure_ascii=True, indent=2) + "\n").encode("utf-8")
        write_new(destination / "INSTALLATION.json", marker, 0o644)
        print(json.dumps(receipt, ensure_ascii=True, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("LP Explorer was not installed: " + str(exc), file=sys.stderr)
        if made_directory:
            print("The incomplete new folder is retained for inspection: " + str(destination),
                  file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
