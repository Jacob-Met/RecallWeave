#!/usr/bin/env python3
"""Open one verified, unchanged RecallWeave edit-distance installation."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys

ARCHIVE = {
    "bytes": 53535,
    "sha256": "a86d823d70be98d08fd804ce9d8bccdb071b586adf5c30c0784a96a5db2a03e9",
    "git_blob": "ae0f3ed4e067fd527b1db7e103270419242db0c2",
}
MEMBERS = (
    "AI-DISCLOSURE.md", "MANIFEST.sha256", "SOURCE-PROVENANCE.json",
    "START-HERE.html", "courses/edit-distance-explorer.html",
    "courses/edit-distance.json", "courses/edit-distance.md", "demo.html",
)
SOURCES = ("install.py", "launch.py", "launch.command.in", "README.md", "INPUTS.json")
REQUIRED = (
    {"Open RecallWeave.command", "launch.py", "README.md", "INPUTS.json",
     "recovery/RecallWeave-edit-distance-offline.zip"}
    | {"app/" + name for name in MEMBERS}
    | {"recovery/source/" + name for name in SOURCES}
)


def pin(data):
    return {
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "git_blob": hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest(),
    }


def read_regular(path, limit=1024 * 1024):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        before = os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_size > limit:
            raise ValueError("Expected a bounded regular file: " + str(path))
        data = stream.read(limit + 1)
        after = os.fstat(stream.fileno())
    fields = ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns")
    if len(data) > limit or len(data) != before.st_size or any(
        getattr(before, key) != getattr(after, key) for key in fields
    ):
        raise ValueError("File changed while reading: " + str(path))
    return data, stat.S_IMODE(before.st_mode)


def installed_file(root, relative):
    rel = PurePosixPath(relative)
    if rel.is_absolute() or ".." in rel.parts or not rel.parts:
        raise ValueError("Invalid installed path")
    current = root
    for part in rel.parts[:-1]:
        current = current / part
        if current.is_symlink() or not current.is_dir():
            raise ValueError("Expected an unchanged installed directory: " + str(current))
    return root.joinpath(*rel.parts)


def verify(root):
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Expected the original installation directory")
    raw, _ = read_regular(root / "INSTALLATION.json", 65536)
    marker = json.loads(raw)
    if not isinstance(marker, dict) or marker.get("schema") != "recall-edit-distance-local-installation/v1":
        raise ValueError("Unrecognized installation marker")
    if marker.get("root") != str(root) or marker.get("archive") != ARCHIVE:
        raise ValueError("Installation identity does not match this location")
    runtime = marker.get("python")
    python = Path(sys.executable).resolve(strict=True)
    runtime_data, _ = read_regular(python, 4 * 1024 * 1024)
    if not isinstance(runtime, dict) or runtime.get("resolved") != str(python) or runtime.get("version") != sys.version.split()[0]:
        raise ValueError("The recorded Python runtime is no longer selected")
    if pin(runtime_data) != {key: runtime.get(key) for key in ARCHIVE}:
        raise ValueError("The recorded Python runtime bytes changed")
    files = marker.get("files")
    if not isinstance(files, dict) or set(files) != REQUIRED:
        raise ValueError("Installation manifest does not describe the complete package")
    for relative, expected in files.items():
        if not isinstance(expected, dict) or set(expected) != {"bytes", "sha256", "git_blob", "mode"}:
            raise ValueError("Invalid installed file identity: " + relative)
        data, mode = read_regular(installed_file(root, relative))
        if pin(data) != {key: expected.get(key) for key in ARCHIVE}:
            raise ValueError("Installed file changed: " + relative)
        if format(mode, "04o") != expected.get("mode"):
            raise ValueError("Installed permissions changed: " + relative)
    recovered, _ = read_regular(installed_file(root, "recovery/RecallWeave-edit-distance-offline.zip"))
    if pin(recovered) != ARCHIVE:
        raise ValueError("The original recovery archive changed")
    inputs_raw, _ = read_regular(root / "INPUTS.json")
    inputs = json.loads(inputs_raw)
    if not isinstance(inputs, dict) or inputs.get("archive") != ARCHIVE or not isinstance(inputs.get("members"), dict) or set(inputs["members"]) != set(MEMBERS):
        raise ValueError("Original input identities changed")
    for name in MEMBERS:
        if not isinstance(inputs["members"][name], dict):
            raise ValueError("Invalid original member identity: " + name)
        data, _ = read_regular(installed_file(root, "app/" + name))
        if pin(data) != {key: inputs["members"][name].get(key) for key in ARCHIVE}:
            raise ValueError("Original application file changed: " + name)
    return marker, pin(raw)


def main():
    parser = argparse.ArgumentParser(description="Open the verified local edit-distance package.")
    parser.add_argument("--no-open", action="store_true",
                        help="Report the verified local entry without requesting a browser.")
    args = parser.parse_args()
    root = Path(os.path.abspath(__file__)).parent
    _, marker_pin = verify(root)
    entry = root / "app" / "START-HERE.html"
    result = {
        "installation": str(root), "entry": str(entry), "entry_uri": entry.as_uri(),
        "marker": marker_pin, "original_archive": ARCHIVE, "opened": False,
    }
    if not args.no_open:
        opened = subprocess.run(
            ["/usr/bin/open", entry.as_uri()], capture_output=True, text=True, timeout=10
        )
        if opened.returncode != 0:
            raise RuntimeError("The macOS file opener refused the entry: " + opened.stderr[:4096].strip())
        result["opened"] = True
        result["open_status"] = "macOS accepted the request; this is not a browser-use receipt"
    if args.no_open:
        print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    else:
        print("RecallWeave is opening in your browser. Keep your study notes before closing the lesson.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
