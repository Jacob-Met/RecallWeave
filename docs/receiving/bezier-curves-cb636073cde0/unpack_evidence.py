"""Decode and verify a receiving archive into a new directory."""
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile

def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: unpack_evidence.py ARCHIVE.tar.xz.base64 NEW_DIRECTORY")
    archive, destination = Path(sys.argv[1]), Path(sys.argv[2])
    encoded = archive.read_bytes()
    data = base64.b64decode(b"".join(encoded.split()), validate=True)
    identity = json.loads(archive.with_name("archive-manifest.json").read_bytes())
    archive_sha = identity.get("archive_sha256") or identity["archive"]["sha256"]
    if hashlib.sha256(data).hexdigest() != archive_sha:
        raise ValueError("Archive digest mismatch")
    expected = {item["path"]: item for item in identity["files"]}
    checked = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:xz") as bundle:
        for member in bundle:
            name = PurePosixPath(member.name)
            if not member.isfile() or name.is_absolute() or ".." in name.parts or str(name) in checked:
                raise ValueError("Unsafe or repeated archive member")
            if member.name not in expected:
                raise ValueError("Unexpected archive member")
            content = bundle.extractfile(member).read()
            record = expected[member.name]
            if len(content) != record["bytes"] or hashlib.sha256(content).hexdigest() != record["sha256"]:
                raise ValueError("Evidence member mismatch: " + member.name)
            checked[member.name] = content
    if checked.keys() != expected.keys():
        raise ValueError("Missing archive members")
    destination.mkdir()
    for name, content in checked.items():
        output = destination.joinpath(*PurePosixPath(name).parts)
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("xb") as handle:
            handle.write(content)
    print(f"Verified {len(checked)} files in {destination}")

if __name__ == "__main__":
    main()
