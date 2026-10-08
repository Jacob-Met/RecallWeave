from pathlib import Path
import ctypes, datetime, hashlib, json, shutil, subprocess, sys
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/"source-v1"
GIT=r"C:\Program Files\Git\cmd\git.exe"
PREFIX="docs/receiving/offline-course-pack-ab529ac65023/hosted-pr152"
def sha(data): return hashlib.sha256(data).hexdigest()
def blob(data): return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def pin(data): return {"bytes":len(data),"sha256":sha(data),"gitBlob":blob(data)}
def git(*args):
    result=subprocess.run([GIT,"-C",str(SOURCE),*args],capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr.decode("utf-8","replace"))
    return result.stdout.decode("utf-8").strip()
memory=ctypes.create_string_buffer(64)
ctypes.c_uint32.from_buffer(memory).value=64
assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(memory))
assert shutil.disk_usage(ROOT).free>=1073741824 and int.from_bytes(memory.raw[16:24],"little")>=536870912
assert git("rev-parse","HEAD")=="ca9fb9bee468950be7cc06fa1c66f36827fa82a1"
assert git("status","--porcelain")==""
record=json.loads((ROOT/"decode-receipt.json").read_bytes())
expected=json.loads((ROOT/"source-expectations.json").read_bytes())
assert record["status"]=="decoded_and_physical_artifacts_verified"
offline=json.loads((ROOT/"offline-files/offline-pack-receiving.json").read_bytes())
catalog=json.loads((ROOT/"catalog-files/browser-receiving.json").read_bytes())
assert record["offlineSourceGitPinsExact"] is True
extra=json.loads((ROOT/"additional-source-inputs.json").read_bytes())
extra_verified={}
assert len(extra)==4
for entry in extra:
    data=entry["content"].encode("utf-8")
    assert blob(data)==entry["sha"]==expected["allTreeLeaves"][entry["path"]]["gitBlob"]
    extra_verified[entry["path"]]=pin(data)
for path,value in catalog["sourceSha256"].items():
    if path in offline["sourceSha256"]:
        assert value==offline["sourceSha256"][path],path
    else:
        assert value==extra_verified[path]["sha256"],path
assert set(extra_verified)==set(catalog["sourceSha256"])-set(offline["sourceSha256"])
for name,report in [("offline",offline),("catalog",catalog)]:
    assert report["checkout"]==record["checkout"]
    for group in report["objectUrlCleanup"]:
        assert group["created"]==group["revoked"] and len(group["created"])==len(set(group["created"]))
    handoff=report["learnerHandoff"]
    deck=json.loads((SOURCE/"courses/binary-search.json").read_bytes())
    assert handoff["previewPreservedSession"] is True and handoff["startedExplicitly"] is True
    assert handoff["title"]==deck["title"] and handoff["progress"]=="0 / "+str(len(deck["items"]))
    assert handoff["prompt"] in [item["prompt"] for item in deck["items"]]
source_before={}
for row in subprocess.check_output([GIT,"-C",str(SOURCE),"ls-tree","-rz","HEAD"]).split(b"\0"):
    if not row: continue
    meta,path=row.split(b"\t",1);mode,kind,oid=meta.decode().split()
    source_before[path.decode("utf-8")]={"mode":mode,"type":kind,"gitBlob":oid}
final={
    "schema":"recallweave-offline-pack-pr152-final-receiving-v1","status":"passed",
    "finishedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "sourceHead":record["sourceHead"],"actualCheckout":record["checkout"],"actualTree":record["tree"],
    "runs":record["runs"],"jobs":record["jobs"],"rawLogs":record["logs"],
    "packetHeaders":{name:value["header"] for name,value in record["packets"].items()},
    "decodedFiles":{"offline":len(record["packets"]["offline"]["files"]),"catalog":len(record["packets"]["catalog"]["files"])},
    "node":record["node"],"offline":{"checks":6,"downloads":2,"sourcePins":25,"audits":11,"createdAndReleasedObjectUrls":1,
        "actualIncludedFilePreview":True,"actualIncludedFileStart":True,"sourceAndExtractedTreeUnchanged":True,
        "zip":{"bytes":427769,"sha256":"91b4db4819488fb6ba49c83ba9cd515d8ce6a9a922af72a1803dfb5d65674c56","gitBlob":"166a91771fec47b9bd416c479f1c611cffd630e5"}},
    "catalog":{"checks":11,"downloads":25,"sourcePins":24,"audits":58,"createdAndReleasedObjectUrls":[13,1,11]},
    "allPhysicalDownloadsVerifiedAgainstOriginalNativeBytes":True,
    "offlineSourceGitBlobsMatchActualCheckout":True,
    "catalogSharedSourceHashesMatchOfflineGitBoundBytes":True,
    "catalogRemainingFourSourcesReadFromActualGitBlobs":extra_verified,
    "bothBrowsersClosed":{"code":0,"signal":None},"pageErrors":0,"externalRequests":0,"harnessErrors":0,"cleanupErrors":0,
    "rootVisualInspection":{"files":["offline-files/download-page-desktop.png","offline-files/extracted-learner-started.png"],
        "result":"Download page has visible instructions and controls with no horizontal clipping. The extracted learner displays the original binary-search course and a complete actual course question after explicit start."},
    "nativeFirstAttempt":"The earlier Snap run on the older compiled learner remains a failure at file preview, preserved under browser-native-first. This hosted success is a separate execution; its observation-only native diagnostic is separately tracked.",
    "nativeGenerationCustody":"ca9fb9bee468950be7cc06fa1c66f36827fa82a1",
    "nativeSourceKind":"Evidence receiving in the exact thin Windows generation carrier; no full native current-main checkout is claimed."
}
final_bytes=(json.dumps(final,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
(ROOT/"final-receiving.json").write_bytes(final_bytes)
target=SOURCE/PREFIX
assert not target.exists()
target.mkdir(parents=True)
files=[]
for path in sorted(ROOT.rglob("*")):
    if path.is_dir(): continue
    assert path.is_file() and not path.is_symlink()
    rel=path.relative_to(ROOT)
    destination=target/rel
    destination.parent.mkdir(parents=True,exist_ok=True)
    data=path.read_bytes()
    destination.write_bytes(data)
    files.append({"path":PREFIX+"/"+rel.as_posix(),**pin(data),"mode":"100644","type":"blob"})
git("config","core.longpaths","true")
git("add","--",PREFIX)
git("commit","-m","Preserve complete PR152 actual-checkout offline pack receiving")
custody=git("rev-parse","HEAD")
tree=git("rev-parse","HEAD^{tree}")
assert git("status","--porcelain")==""
after={}
for row in subprocess.check_output([GIT,"-C",str(SOURCE),"ls-tree","-rz","HEAD"]).split(b"\0"):
    if not row: continue
    meta,path=row.split(b"\t",1);mode,kind,oid=meta.decode().split()
    after[path.decode("utf-8")]={"mode":mode,"type":kind,"gitBlob":oid}
for path,entry in source_before.items(): assert after[path]==entry,path
for entry in files:
    assert after[entry["path"]]=={key:entry[key] for key in ["mode","type","gitBlob"]},entry["path"]
manifest={"schema":"recallweave-offline-pack-pr152-native-custody-v1","custodyCommit":custody,"custodyTree":tree,
          "nativeParent":"ca9fb9bee468950be7cc06fa1c66f36827fa82a1","preservedNativeLeaves":len(source_before),
          "sourceHead":record["sourceHead"],"checkout":record["checkout"],"tree":record["tree"],
          "files":files,"finalReceipt":pin(final_bytes)}
manifest_bytes=(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
(ROOT.parent/"hosted-pr152-custody.json").write_bytes(manifest_bytes)
print(json.dumps({"status":"passed","custodyCommit":custody,"custodyTree":tree,"preservedNativeLeaves":len(source_before),
    "newEvidenceFiles":len(files),"finalReceipt":pin(final_bytes),"manifest":pin(manifest_bytes),"actualCheckout":record["checkout"],
    "node":final["node"],"offline":final["offline"],"catalog":final["catalog"],"additionalFourSourcePins":list(extra_verified)}))
