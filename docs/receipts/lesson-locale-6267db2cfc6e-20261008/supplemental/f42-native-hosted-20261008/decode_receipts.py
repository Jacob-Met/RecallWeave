#!/usr/bin/env python3
"""Decode and verify the additive RecallWeave issue81 evidence supplement."""
import argparse, base64, gzip, hashlib, json
from pathlib import Path, PurePosixPath

def digest(data):
    return hashlib.sha256(data).hexdigest()

def safe_path(root, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or not relative.parts or ".." in relative.parts:
        raise ValueError("Unsafe evidence path")
    return root.joinpath(*relative.parts)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "SUPPLEMENT_MANIFEST.json").read_text(encoding="utf-8"))
    for item in manifest["publication_files"]:
        data = safe_path(root, item["relative_path"]).read_bytes()
        if len(data) != item["bytes"] or digest(data) != item["sha256"]:
            raise ValueError("Publication-file mismatch: " + item["relative_path"])
    output = args.output
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError("Use a new or empty output directory")
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for item in manifest["carriers"]:
        envelope = json.loads(safe_path(root, item["envelope_path"]).read_text(encoding="utf-8"))
        data = base64.b64decode(envelope["payload_base64"], validate=True)
        decoded = gzip.decompress(data)
        if len(data) != item["carrier"]["bytes"] or digest(data) != item["carrier"]["sha256"]:
            raise ValueError("Compressed carrier mismatch: " + item["archive_member"])
        if len(decoded) != item["decoded"]["bytes"] or digest(decoded) != item["decoded"]["sha256"]:
            raise ValueError("Decoded receipt mismatch: " + item["archive_member"])
        json.loads(decoded.decode("utf-8"))
        destination = safe_path(output, item["archive_member"])
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("xb") as stream:
            stream.write(data)
        results.append({"archive_member": item["archive_member"], "bytes": len(data), "sha256": digest(data)})
    print(json.dumps({"decoded": results, "count": len(results)}, sort_keys=True))

if __name__ == "__main__":
    main()
