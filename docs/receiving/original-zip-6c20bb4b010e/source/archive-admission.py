"""Admission/extraction only for the original cf5799 offline delivery ZIP.

Authored, unexecuted against the archive. No browser/application launch.
Call admit_zip(original_bytes), then extract_new(admitted, absolute_new_stage).
After the separately reviewed consumer, call verify_extracted(stage, admitted,
    (receipt["stage_device"], receipt["stage_inode"])).
The caller retains this in-memory receipt and any partial stage on failure.
"""
import hashlib
import io
import json
import os
from pathlib import PurePosixPath
import re
import stat
import zipfile

ZIP_BYTES = 53535
ZIP_SHA256 = "a86d823d70be98d08fd804ce9d8bccdb071b586adf5c30c0784a96a5db2a03e9"
ZIP_GIT = "ae0f3ed4e067fd527b1db7e103270419242db0c2"
MEMBER_COUNT = 8
MANIFEST = "MANIFEST.sha256"
PROVENANCE = "SOURCE-PROVENANCE.json"
REQUIRED = {"START-HERE.html", MANIFEST, PROVENANCE, "courses/edit-distance.json"}
# Receiver resource bounds, not claims about the still-unread member lengths.
MAX_MEMBER_BYTES = 4 * 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024

def require(condition, message):
    if not condition:
        raise ValueError(message)

def pin(data):
    return {
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "git_blob": hashlib.sha1(
            b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        ).hexdigest(),
    }

def safe_name(name):
    require(isinstance(name, str) and bool(name), "empty/non-text member path")
    require(not any(ord(c) < 32 or ord(c) == 127 for c in name),
            "control character in member path")
    require("\\" not in name and ":" not in name, "nonportable member path")
    parts = name.split("/")
    require(all(p not in ("", ".", "..") for p in parts), "ambiguous member path")
    require(not PurePosixPath(name).is_absolute(), "absolute member path")
    require(PurePosixPath(name).as_posix() == name, "nonnormal member path")
    return parts

def unique_json_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate provenance JSON key")
        result[key] = value
    return result

def reject_json_constant(value):
    raise ValueError("non-finite provenance JSON value: " + value)

def admit_zip(archive):
    require(type(archive) is bytes, "original archive must be immutable bytes")
    archive_pin = pin(archive)
    require(archive_pin == {
        "bytes": ZIP_BYTES, "sha256": ZIP_SHA256, "git_blob": ZIP_GIT
    }, "original ZIP identity mismatch")
    members, source_modes = {}, {}
    with zipfile.ZipFile(io.BytesIO(archive), "r") as bundle:
        infos = bundle.infolist()
        require(len(infos) == MEMBER_COUNT, "expected exactly eight ZIP members")
        require(sum(i.file_size for i in infos) <= MAX_TOTAL_BYTES,
                "uncompressed total exceeds receiver bound")
        for info in infos:
            name = info.filename
            safe_name(name)
            require(info.orig_filename == name, "truncated ZIP member name")
            require(name not in members, "duplicate ZIP member")
            require(not info.is_dir(), "directory entry is not a file member")
            mode = (info.external_attr >> 16) & 0xffff
            kind = stat.S_IFMT(mode)
            require(kind in (0, stat.S_IFREG), "nonregular/symlink ZIP member")
            require(not (info.external_attr & 0x10), "DOS directory ZIP member")
            require(not (info.flag_bits & 1), "encrypted ZIP member")
            require(info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED),
                    "unsupported compression; do not substitute archive")
            require(0 <= info.file_size <= MAX_MEMBER_BYTES, "member exceeds bound")
            with bundle.open(info, "r") as stream:
                data = stream.read(MAX_MEMBER_BYTES + 1)
                require(len(data) == info.file_size, "member size/CRC admission failed")
                require(stream.read(1) == b"", "member exceeds declared size")
            members[name] = data
            source_modes[name] = mode
    require(REQUIRED <= set(members), "documented required member missing")
    for name in members:
        parts = safe_name(name)
        require(not any("/".join(parts[:i]) in members
                        for i in range(1, len(parts))), "file/directory path collision")

    checksums = {}
    manifest_text = members[MANIFEST].decode("utf-8", errors="strict")
    for line in manifest_text.splitlines():
        match = re.fullmatch(r"([0-9a-fA-F]{64}) ([ *])(.+)", line)
        require(match is not None, "unsupported checksum-manifest line")
        digest, _, name = match.groups()
        safe_name(name)
        require(name != MANIFEST and name not in checksums,
                "duplicate/self checksum-manifest entry")
        checksums[name] = digest.lower()
    require(set(checksums) == set(members) - {MANIFEST},
            "manifest must cover exactly the other seven members")
    member_pins = {name: pin(data) for name, data in members.items()}
    for name, expected_sha in checksums.items():
        require(member_pins[name]["sha256"] == expected_sha, "member SHA mismatch: " + name)
    provenance = json.loads(
        members[PROVENANCE].decode("utf-8", errors="strict"),
        object_pairs_hook=unique_json_pairs, parse_constant=reject_json_constant
    )
    require(isinstance(provenance, dict), "provenance is not a JSON object")
    return {
        "archive": archive,
        "archive_pin": archive_pin,
        "members": members,
        "member_pins": member_pins,
        "source_modes": source_modes,
        # Preserved for review; no unknown source fields are interpreted here.
        "provenance": provenance,
        "manifest_sha256": member_pins[MANIFEST]["sha256"],
    }

def open_absolute_directory(path):
    """Descriptor-relative, no-follow traversal. Local POSIX receiving only."""
    require(os.name == "posix", "this extraction helper is POSIX-only")
    require(hasattr(os, "O_NOFOLLOW") and hasattr(os, "O_DIRECTORY"),
            "required no-follow directory primitives unavailable")
    require(type(path) is str and path.startswith("/") and path != "/",
            "caller must supply an absolute nonroot directory")
    parts = path[1:].split("/")
    require(all(p not in ("", ".", "..") for p in parts), "nonnormal stage directory")
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    fd = os.open("/", flags)
    try:
        for part in parts:
            next_fd = os.open(part, flags, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd
    except BaseException:
        os.close(fd)
        raise

def child_directory(root_fd, parts):
    fd = os.dup(root_fd)
    try:
        for part in parts:
            next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                              dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd
    except BaseException:
        os.close(fd)
        raise

def expected_directories(names):
    result = {""}
    for name in names:
        parts = safe_name(name)
        result.update("/".join(parts[:i]) for i in range(1, len(parts)))
    return result

def verify_extracted(stage, admitted, expected_stage_identity=None):
    admitted = admit_zip(admitted["archive"])
    require(expected_stage_identity is None
            or (type(expected_stage_identity) is tuple
                and len(expected_stage_identity) == 2),
            "invalid expected stage identity")
    root_fd = open_absolute_directory(stage)
    try:
        root_stat = os.fstat(root_fd)
        require(expected_stage_identity is None
                or (root_stat.st_dev, root_stat.st_ino) == expected_stage_identity,
                "stage identity changed since extraction")
        require(root_stat.st_uid == os.geteuid()
                and stat.S_IMODE(root_stat.st_mode) == 0o700,
                "stage owner/mode mismatch")
        directories = expected_directories(admitted["members"])
        all_paths = set(admitted["members"]) | (directories - {""})
        for directory in sorted(directories):
            fd = child_directory(root_fd, directory.split("/") if directory else [])
            try:
                directory_stat = os.fstat(fd)
                require(directory_stat.st_uid == os.geteuid()
                        and stat.S_IMODE(directory_stat.st_mode) == 0o700,
                        "extracted directory owner/mode mismatch")
                prefix = directory + "/" if directory else ""
                expected = {p[len(prefix):].split("/", 1)[0]
                            for p in all_paths if p.startswith(prefix)}
                require(set(os.listdir(fd)) == expected,
                        "unexpected/missing extracted entry: " + directory)
            finally:
                os.close(fd)
        readback = {}
        for name, expected in sorted(admitted["member_pins"].items()):
            parts = safe_name(name)
            parent_fd = child_directory(root_fd, parts[:-1])
            try:
                fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent_fd)
                with os.fdopen(fd, "rb") as stream:
                    before = os.fstat(stream.fileno())
                    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1,
                            "readback not a single-link regular file")
                    require(before.st_uid == os.geteuid()
                            and stat.S_IMODE(before.st_mode) == 0o600,
                            "readback owner/mode mismatch")
                    data = stream.read(expected["bytes"] + 1)
                    after = os.fstat(stream.fileno())
                require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
                        == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns),
                        "file changed during readback")
                readback[name] = pin(data)
                require(readback[name] == expected, "extracted byte mismatch: " + name)
            finally:
                os.close(parent_fd)
        return {"stage_device": root_stat.st_dev, "stage_inode": root_stat.st_ino,
                "archive": admitted["archive_pin"], "members": readback}
    finally:
        os.close(root_fd)

def extract_new(admitted, stage):
    """No writes until complete admission. Existing stage always refuses."""
    # Re-admit the original immutable bytes, not mutable caller-provided member maps.
    admitted = admit_zip(admitted["archive"])
    require(type(stage) is str and stage.startswith("/") and stage != "/",
            "caller must choose a new absolute private stage")
    require(stage == str(PurePosixPath(stage)), "nonnormal stage path")
    parent, _, leaf = stage.rpartition("/")
    safe_name(leaf)
    require(bool(parent), "stage must have an existing nonroot parent")
    parent_fd = open_absolute_directory(parent)
    stage_fd = None
    try:
        os.mkdir(leaf, mode=0o700, dir_fd=parent_fd)  # Exclusive; never reuse.
        stage_fd = os.open(leaf, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                           dir_fd=parent_fd)
        original = os.fstat(stage_fd)
        require(original.st_uid == os.geteuid()
                and stat.S_IMODE(original.st_mode) == 0o700,
                "new stage owner/mode mismatch")
        dirs = expected_directories(admitted["members"]) - {""}
        for directory in sorted(dirs, key=lambda name: (name.count("/"), name)):
            parts = directory.split("/")
            fd = child_directory(stage_fd, parts[:-1])
            try:
                os.mkdir(parts[-1], mode=0o700, dir_fd=fd)
            finally:
                os.close(fd)
        for name, data in sorted(admitted["members"].items()):
            parts = safe_name(name)
            fd = child_directory(stage_fd, parts[:-1])
            try:
                output = os.open(parts[-1], os.O_WRONLY | os.O_CREAT | os.O_EXCL
                                 | os.O_NOFOLLOW, 0o600, dir_fd=fd)
                with os.fdopen(output, "wb") as stream:
                    require(stream.write(data) == len(data), "short member write")
            finally:
                os.close(fd)
        receipt = verify_extracted(
            stage, admitted, (original.st_dev, original.st_ino)
        )
        return receipt
    finally:
        if stage_fd is not None:
            os.close(stage_fd)
        os.close(parent_fd)
