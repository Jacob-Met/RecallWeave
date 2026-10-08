import base64
from datetime import datetime,timezone
import hashlib,io,json,os
from pathlib import Path,PurePosixPath
import zipfile
ROOT=Path(__file__).resolve().parent
def sha(b):return hashlib.sha256(b).hexdigest()
def exclusive(p,b):
    with p.open("xb") as f:f.write(b);f.flush();os.fsync(f.fileno())
def encode(x):return (json.dumps(x,ensure_ascii=False,indent=2,allow_nan=False)+"\n").encode()
files={}
for name in ("README.md","receive_artifact.py","receive_artifact_v2.py","attempt-1-failure.json","package_artifact.py"):
    files[name]=(ROOT/name).read_bytes()
for folder in ("retained-source","qualified-df386b65"):
    for p in sorted((ROOT/folder).rglob("*")):
        if p.is_file():
            name=p.relative_to(ROOT).as_posix()
            if name.endswith(".pyc") or "__pycache__" in p.parts:raise RuntimeError("unexpected_generated_dependency")
            files[name]=p.read_bytes()
for name in files:
    p=PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts:raise RuntimeError("unsafe_member")
manifest={"schema":"hamon.union_find_artifact_receiving.manifest.v1",
    "created_at":datetime.now(timezone.utc).isoformat(),
    "producer_commit":"df386b650c481b33bf8a960b50a704e4d75d5934",
    "files":{n:{"bytes":len(b),"sha256":sha(b)} for n,b in sorted(files.items())}}
m=encode(manifest)
exclusive(ROOT/"artifact-receiving-manifest.json",m)
files["artifact-receiving-manifest.json"]=m
out=io.BytesIO()
with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name,b in sorted(files.items()):
        info=zipfile.ZipInfo(name,(2026,10,8,17,56,0))
        info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
        z.writestr(info,b,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
raw=out.getvalue()
capsule={"schema":"hamon.base64_zip_evidence.v1","filename":"union-find-artifact-receiving-df386b65-44df5c2e45ae.zip",
    "encoding":"base64","bytes":len(raw),"sha256":sha(raw),"manifest_file":"artifact-receiving-manifest.json",
    "payload_count":len(files)-1,"base64":base64.b64encode(raw).decode()}
encoded=(json.dumps(capsule,separators=(",",":"))+"\n").encode()
if len(encoded)>200*1024:raise RuntimeError("capsule_too_large")
exclusive(ROOT/capsule["filename"],raw)
exclusive(ROOT/"union-find-artifact-receiving-df386b65-44df5c2e45ae.json",encoded)
r=(ROOT/"qualified-df386b65/artifact-receiving.json").read_bytes()
print(json.dumps({"archive_bytes":len(raw),"archive_sha256":sha(raw),"capsule_bytes":len(encoded),
    "capsule_sha256":sha(encoded),"payload_count":len(files)-1,"manifest_bytes":len(m),
    "manifest_sha256":sha(m),"receipt_bytes":len(r),"receipt_sha256":sha(r)},sort_keys=True))
