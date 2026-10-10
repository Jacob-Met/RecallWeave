#!/usr/bin/env python3
"""Build the exact, directly openable RecallWeave course pack using the stdlib."""
from hashlib import sha256
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
import json
import os
import re
import stat
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = "offline/recallweave-offline.zip"
FORMAT = "recallweave-offline-pack-v1"
MAX_MEMBER_BYTES = 1024 * 1024
MAX_ZIP_BYTES = 2 * 1024 * 1024
START_HERE = "RecallWeave offline course pack\n\n1. Extract the entire ZIP. Keep the RecallWeave folder together.\n2. Open catalog.html in a web browser with JavaScript enabled.\n3. Choose Open learner to open the sibling demo.html.\n4. Under Bring your own lesson, choose a JSON file from the courses folder\n   (or a course file downloaded from the catalog).\n5. Inspect the preview, then select Start this deck.\n\nOpening and previewing a file leaves the current lesson in place. Start this deck\nbegins a fresh session. The catalog and learner need no server, account or network.\nOptional links to other tools or the public download page may need a connection\nor a separate download.\n\nCourse files keep their original source and permission statements. Learning-model\nestimates are illustrative, not grades or evidence of learning efficacy.\nUse the learner's explicit download controls to keep a study record; reloading\nclears the tab's in-memory session.\n\nSHA256SUMS.json lists the byte length and SHA-256 hash of every other file in this\npack. It describes file integrity, not authorship or an authenticated signature.\n"


def read_regular(root, relative, limit=MAX_MEMBER_BYTES):
    """Read bounded original bytes; source/output links are never followed."""
    path = root
    parts = relative.split("/")
    for index, part in enumerate(parts):
        path = path / part
        mode = path.lstat().st_mode
        expected = stat.S_ISREG if index == len(parts) - 1 else stat.S_ISDIR
        if not expected(mode):
            raise ValueError(f"{relative} must be a regular file with real parent directories.")
    with path.open("rb") as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
            raise ValueError(f"{relative} must be a regular file.")
        data = source.read(limit + 1)
    if len(data) > limit:
        raise ValueError(f"{relative} exceeds the {limit}-byte input limit.")
    return data


def strict_json(text):
    def invalid_constant(value):
        raise ValueError(f"Non-JSON numeric constant: {value}")
    return json.loads(text, parse_constant=invalid_constant)


class CatalogData(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.count = 0
        self.inside = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if attributes.get("id") == "course-data":
            if tag != "script" or attributes.get("type") != "application/json":
                raise ValueError("catalog.html has an invalid course-data element.")
            self.count += 1
            self.inside = True

    def handle_endtag(self, tag):
        if tag == "script":
            self.inside = False

    def handle_data(self, data):
        if self.inside:
            self.parts.append(data)


def build_pack(root=ROOT):
    registry = read_regular(root, "catalog/courses.json")
    paths = strict_json(registry.decode("utf-8"))
    if not isinstance(paths, list) or not 1 <= len(paths) <= 128:
        raise ValueError("The catalog must register 1-128 course files.")
    if any(not isinstance(path, str) or
           not re.fullmatch(r"courses/[a-z0-9][a-z0-9-]*\.json", path)
           for path in paths):
        raise ValueError("Registered paths must name JSON files directly inside courses/.")
    if len(set(paths)) != len(paths):
        raise ValueError("Registered course paths must be unique.")

    members = {path: read_regular(root, path) for path in paths}
    sources = []
    for path in paths:
        text = members[path].decode("utf-8")
        strict_json(text)
        sources.append({"path": path, "text": text})
    members["catalog.html"] = read_regular(root, "catalog.html")
    members["demo.html"] = read_regular(root, "demo.html")
    catalog = members["catalog.html"].decode("utf-8")
    members["demo.html"].decode("utf-8")
    parser = CatalogData()
    parser.feed(catalog)
    parser.close()
    if parser.count != 1 or parser.inside:
        raise ValueError("catalog.html must contain one complete course-data script.")
    if strict_json("".join(parser.parts)) != sources:
        raise ValueError("catalog.html is stale: rebuild it from the registered original courses.")

    members["START-HERE.txt"] = START_HERE.encode("utf-8")
    manifest = {
        "format": FORMAT,
        "files": [
            {"path": path, "bytes": len(members[path]),
             "sha256": sha256(members[path]).hexdigest()}
            for path in sorted(members)
        ],
    }
    members["SHA256SUMS.json"] = (
        json.dumps(manifest, ensure_ascii=True, indent=2, allow_nan=False) + "\n"
    ).encode("utf-8")
    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED,
                         allowZip64=False) as archive:
        for path in sorted(members):
            entry = zipfile.ZipInfo("RecallWeave/" + path, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.create_version = 20
            entry.extract_version = 20
            entry.external_attr = (stat.S_IFREG | 0o644) << 16
            entry.compress_type = zipfile.ZIP_STORED
            entry.flag_bits = 0
            entry.extra = b""
            entry.comment = b""
            archive.writestr(entry, members[path])
    data = output.getvalue()
    if len(data) > MAX_ZIP_BYTES:
        raise ValueError(f"The complete pack exceeds the {MAX_ZIP_BYTES}-byte ZIP limit.")
    return data, len(paths)


def publish(data):
    destination = ROOT / OUTPUT
    parent = destination.parent
    if not stat.S_ISDIR(parent.lstat().st_mode):
        raise ValueError("offline/ must be a real directory.")
    if destination.exists() or destination.is_symlink():
        current = read_regular(ROOT, OUTPUT, MAX_ZIP_BYTES)
        if current == data:
            return False
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="wb", prefix=".recallweave-offline-",
                                         suffix=".tmp", dir=parent, delete=False) as target:
            temporary = Path(target.name)
            os.chmod(target.name, 0o644)
            target.write(data)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, destination)
        temporary = None
        if os.name == "posix":
            directory = os.open(parent, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return True


def main(args):
    if args not in ([], ["--check"]):
        print("Usage: python3 tools/build-offline-pack.py [--check]", file=sys.stderr)
        return 2
    try:
        data, count = build_pack()
        if args == ["--check"]:
            if read_regular(ROOT, OUTPUT, MAX_ZIP_BYTES) != data:
                raise ValueError("offline/recallweave-offline.zip is stale; rebuild the pack.")
            print(f"Offline pack matches {count} registered courses and the compiled pages.")
        else:
            changed = publish(data)
            verb = "Built" if changed else "Already current:"
            print(f"{verb} {OUTPUT} ({len(data)} bytes, {count} registered courses).")
        return 0
    except (OSError, ValueError) as error:
        print(f"Offline pack: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
