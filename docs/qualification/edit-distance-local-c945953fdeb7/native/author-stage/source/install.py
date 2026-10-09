#!/usr/bin/env python3
"""Install the exact original eight-member offline package into a new Mac directory."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import stat
import subprocess
import sys
import zipfile

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
CAP = 2 * 1024 * 1024
MIN_DISK = 256 * 1024 * 1024
MIN_MEMORY = 2 * 1024 ** 3


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
    return data


def owned_bytes(root):
    total = 0
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError("Unexpected link in the owned preparation directory: " + str(path))
        if path.is_file():
            total += path.stat().st_size
        elif not path.is_dir():
            raise ValueError("Unexpected nonregular owned entry: " + str(path))
    return total


def admission(owned, destination):
    disk = min(shutil.disk_usage(owned).free, shutil.disk_usage(destination.parent).free)
    report = subprocess.run(
        ["/usr/bin/vm_stat"], capture_output=True, text=True, check=True, timeout=5
    ).stdout
    page = int(re.search(r"page size of (\d+) bytes", report).group(1))
    memory = sum(int(re.search(r"^" + re.escape(name) + r":\s+(\d+)", report, re.M).group(1))
                 for name in ("Pages free", "Pages inactive", "Pages speculative")) * page
    if disk < MIN_DISK or memory < MIN_MEMORY:
        raise ValueError("Native admission floor not met: disk=%d memory=%d" % (disk, memory))
    return {"free_disk": disk, "conservative_memory": memory,
            "minimum_free_disk": MIN_DISK, "minimum_conservative_memory": MIN_MEMORY}


def write_new(path, data, mode):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    if read_regular(path) != data:
        raise RuntimeError("Installed readback differed: " + str(path))
    if stat.S_IMODE(path.stat().st_mode) != mode:
        raise RuntimeError("Installed mode differed: " + str(path))


def main():
    parser = argparse.ArgumentParser(description="Install the unchanged offline edit-distance package.")
    parser.add_argument("--archive", required=True, help="Exact original qualified ZIP.")
    parser.add_argument("--destination", required=True, help="New absolute installation directory.")
    parser.add_argument("--owned-root", required=True, help="Existing absolute owned source/archive directory.")
    args = parser.parse_args()
    if sys.platform != "darwin":
        raise ValueError("This installer uses the existing macOS runtime and file opener")
    if not args.destination or not args.owned_root:
        raise ValueError("Destination and owned root must be nonempty")
    destination = Path(args.destination)
    owned = Path(args.owned_root)
    archive_path = Path(args.archive)
    source = Path(os.path.abspath(__file__)).parent
    if not destination.is_absolute() or not owned.is_absolute() or not archive_path.is_absolute():
        raise ValueError("Use absolute archive, destination and owned-root paths")
    if os.path.lexists(destination):
        raise FileExistsError("Destination already exists: " + str(destination))
    if owned.is_symlink() or not owned.is_dir() or destination.parent.is_symlink() or not destination.parent.is_dir():
        raise ValueError("Expected existing real source and destination-parent directories")
    if destination == owned or owned in destination.parents:
        raise ValueError("Use a new destination outside the owned preparation directory")
    if owned not in source.parents or owned not in archive_path.parents:
        raise ValueError("Source and archive must remain inside the declared owned root")
    if source.is_symlink() or set(path.name for path in source.iterdir()) != set(SOURCES):
        raise ValueError("Source input directory must contain exactly the five declared files")
    source_data = {name: read_regular(source / name, 262144) for name in SOURCES}
    inputs = json.loads(source_data["INPUTS.json"])
    if not isinstance(inputs, dict) or inputs.get("schema") != "recall-edit-distance-local-inputs/v1" or inputs.get("archive") != ARCHIVE:
        raise ValueError("Unrecognized original input identity")
    expected = inputs.get("members")
    if not isinstance(expected, dict) or set(expected) != set(MEMBERS):
        raise ValueError("Expected all eight original member identities")
    archive = read_regular(archive_path, ARCHIVE["bytes"])
    if pin(archive) != ARCHIVE:
        raise ValueError("The archive is not the exact original qualified ZIP")
    payload = {}
    with zipfile.ZipFile(io.BytesIO(archive)) as package:
        infos = package.infolist()
        if len(infos) != 8 or len({item.filename for item in infos}) != 8 or {item.filename for item in infos} != set(MEMBERS):
            raise ValueError("The original package must contain exactly eight unique members")
        for name in MEMBERS:
            if not isinstance(expected[name], dict):
                raise ValueError("Invalid original member identity: " + name)
            rel = PurePosixPath(name)
            item = package.getinfo(name)
            mode = item.external_attr >> 16
            if rel.is_absolute() or ".." in rel.parts or item.is_dir() or item.flag_bits & 1:
                raise ValueError("Unexpected archive path or encrypted member")
            if not stat.S_ISREG(mode) or format(mode, "o") != expected[name].get("zip_mode"):
                raise ValueError("Unexpected original archive mode: " + name)
            data = package.read(item)
            if pin(data) != {key: expected[name].get(key) for key in ARCHIVE}:
                raise ValueError("Original member identity mismatch: " + name)
            payload["app/" + name] = data
    manifest = {}
    for line in payload["app/MANIFEST.sha256"].decode("ascii").splitlines():
        digest, name = line.split(None, 1)
        if name in manifest or name == "MANIFEST.sha256" or name not in MEMBERS:
            raise ValueError("Unexpected original checksum entry")
        if hashlib.sha256(payload["app/" + name]).hexdigest() != digest:
            raise ValueError("Original checksum mismatch: " + name)
        manifest[name] = digest
    if set(manifest) != set(MEMBERS) - {"MANIFEST.sha256"}:
        raise ValueError("Expected all seven original checksum entries")
    python = Path(sys.executable).resolve(strict=True)
    python_data = read_regular(python, 4 * 1024 * 1024)
    runtime = {"configured": sys.executable, "resolved": str(python),
               "version": sys.version.split()[0], **pin(python_data)}
    template = source_data["launch.command.in"].decode("utf-8")
    if template.count("@PYTHON@") != 1 or template.count("@LAUNCHER@") != 1:
        raise ValueError("Launcher template tokens do not match the source contract")
    rendered = template.replace("@PYTHON@", shlex.quote(str(python))).replace(
        "@LAUNCHER@", shlex.quote(str(destination / "launch.py")))
    payload["Open RecallWeave.command"] = rendered.encode("utf-8")
    for name in ("launch.py", "README.md", "INPUTS.json"):
        payload[name] = source_data[name]
    payload["recovery/RecallWeave-edit-distance-offline.zip"] = archive
    for name, data in source_data.items():
        payload["recovery/source/" + name] = data
    modes = {name: 0o700 if name == "Open RecallWeave.command" else 0o444 for name in payload}
    guard = admission(owned, destination)
    size_before = owned_bytes(owned)
    marker = {
        "schema": "recall-edit-distance-local-installation/v1", "root": str(destination),
        "entry": "app/START-HERE.html", "archive": ARCHIVE, "python": runtime,
        "files": {name: {**pin(data), "mode": format(modes[name], "04o")}
                  for name, data in sorted(payload.items())},
        "source": {name: pin(data) for name, data in sorted(source_data.items())},
        "admission": guard, "combined_owned_cap": CAP, "owned_bytes_before": size_before,
        "original_byte_policy": "All eight app assets equal the qualified original ZIP; no source rebuild or reader replacement.",
        "reader_boundary": "Strict UTF-8 picker and combined-output corrections remain with #7/#181/#109/#159; not installed here.",
    }
    marker_data = (json.dumps(marker, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    planned_bytes = sum(len(data) for data in payload.values()) + len(marker_data)
    if size_before + planned_bytes > CAP:
        raise ValueError("Combined owned preparation and installation exceeds the 2 MiB cap")
    # mkdir is exclusive; failures preserve a newly created partial destination.
    destination.mkdir(mode=0o700)
    for name, data in payload.items():
        write_new(destination / name, data, modes[name])
    write_new(destination / "INSTALLATION.json", marker_data, 0o444)
    actual = owned_bytes(destination)
    if actual != planned_bytes:
        raise RuntimeError("Installation byte count differed after the final marker")
    print(json.dumps({
        "installed": str(destination), "entry": str(destination / "Open RecallWeave.command"),
        "application_entry": str(destination / "app" / "START-HERE.html"),
        "files": len(payload) + 1, "installed_bytes": actual,
        "combined_owned_bytes": size_before + actual, "marker": pin(marker_data),
        "python": runtime, "product_or_browser_invocations": 0,
    }, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError, zipfile.BadZipFile) as error:
        print(json.dumps({
            "error": str(error),
            "partial_destination_policy": "Preserve any newly created partial target; never overwrite or delete an existing installation.",
        }, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
