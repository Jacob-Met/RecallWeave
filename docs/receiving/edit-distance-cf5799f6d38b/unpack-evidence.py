#!/usr/bin/env python3
"""Verify and extract the exact authored native evidence archive; no third-party packages."""
import argparse,base64,gzip,hashlib,json,pathlib
parser=argparse.ArgumentParser()
parser.add_argument("archive",type=pathlib.Path)
parser.add_argument("manifest",type=pathlib.Path)
parser.add_argument("output",type=pathlib.Path)
args=parser.parse_args()
manifest=json.loads(args.manifest.read_text())
raw=gzip.decompress(base64.b64decode(args.archive.read_bytes(),validate=False))
packet=json.loads(raw)
# Check the exact archive and every constituent before creating output.
expected=manifest.get("archive_sha256",manifest.get("sha256"))
if expected is None:raise SystemExit("Manifest has no archive hash")
if hashlib.sha256(raw).hexdigest()!=expected:raise SystemExit("Archive hash mismatch")
rows=packet["files"]
if len(raw)!=manifest["raw_bytes"] or len(rows)!=manifest["files"]:
 raise SystemExit("Archive size/count mismatch")
if [{k:v for k,v in row.items() if k!="content"} for row in rows]!=manifest["rows"]:
 raise SystemExit("Archive constituent manifest mismatch")
seen=set()
for row in rows:
 path=pathlib.PurePosixPath(row["path"])
 if path.is_absolute() or ".." in path.parts or not path.parts or row["path"] in seen:
  raise SystemExit("Unsafe or duplicate path")
 seen.add(row["path"])
 data=row["content"].encode("utf-8")
 git=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
 if len(data)!=row["bytes"] or hashlib.sha256(data).hexdigest()!=row["sha256"] or git!=row["git_blob"]:
  raise SystemExit("File identity mismatch: "+row["path"])
args.output.mkdir(parents=False,exist_ok=False)
for row in rows:
 dest=args.output/row["path"];dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_bytes(row["content"].encode("utf-8"))
print(json.dumps({"verified_files":len(rows),"archive_sha256":hashlib.sha256(raw).hexdigest(),"output":str(args.output)}))
