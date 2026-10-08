"""Verify every sealed browser artifact; optionally print one or extract to a new directory."""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--cat", dest="member")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    index = json.loads((root / "browser-evidence-index.json").read_text())
    encoded = (root / "browser-evidence.tar.gz.base64").read_bytes()
    sha = lambda raw: hashlib.sha256(raw).hexdigest()
    if sha(encoded) != index["encoded_sha256"] or len(encoded) != index["encoded_bytes"]:
        raise ValueError("Encoded browser evidence changed")
    compressed = base64.b64decode(b"".join(encoded.split()), validate=True)
    if len(compressed) != index["compressed_bytes"] or sha(compressed) != index["compressed_sha256"]:
        raise ValueError("Compressed browser evidence changed")
    found = {}
    with tarfile.open(fileobj=io.BytesIO(gzip.decompress(compressed)), mode="r:") as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            if not member.isfile() or path.is_absolute() or ".." in path.parts or member.name in found:
                raise ValueError("Unexpected browser evidence member")
            raw = archive.extractfile(member).read()
            if index["files"].get(member.name) != {"sha256": sha(raw), "size": len(raw)}:
                raise ValueError("Raw browser evidence changed: " + member.name)
            found[member.name] = raw
    if set(found) != set(index["files"]) or len(found) != index["file_count"]:
        raise ValueError("Browser evidence file set changed")
    if sum(map(len, found.values())) != index["raw_bytes"]:
        raise ValueError("Browser evidence total byte count changed")
    if args.output is not None:
        args.output.mkdir(parents=True, exist_ok=False)
        for name, raw in found.items():
            path = args.output.joinpath(*PurePosixPath(name).parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
    if args.member is not None:
        if args.member not in found:
            raise ValueError("No such sealed browser artifact")
        sys.stdout.buffer.write(found[args.member])
    else:
        print(json.dumps({"verified": True, "files": len(found),
                          "raw_bytes": sum(map(len, found.values())),
                          "native_exit_code": index["native_exit_code"],
                          "extracted_to": None if args.output is None else str(args.output.resolve())},
                         indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
