from pathlib import Path, PurePosixPath
import base64, ctypes, datetime, hashlib, json, re, shutil, traceback

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "source-v2"
def sha(data): return hashlib.sha256(data).hexdigest()
def blob(data): return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def pin(data): return {"bytes":len(data),"sha256":sha(data),"gitBlob":blob(data)}
memory=ctypes.create_string_buffer(64)
ctypes.c_uint32.from_buffer(memory).value=64
assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(memory))
available_memory=int.from_bytes(memory.raw[16:24],"little")
free=shutil.disk_usage(ROOT).free
assert free>=1073741824 and available_memory>=536870912,"Native receiving floor refused"
info=json.loads((ROOT/"log-input.json").read_bytes())
expected=json.loads((ROOT/"source-expectations.json").read_bytes())
assert expected["checkout"]==info["checkout"]=="302159b5bb992a5c2d8b79849d270b352c856087"
assert expected["tree"]==info["sourceTree"]=="881dadfcfe2ee0e28a85b009581a8a4d0f5701d1"
assert not (ROOT/"decode-receipt.json").exists()
record={"schema":"recallweave-offline-pack-pr152-decoding-v2","startedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sourceHead":info["sourceHead"],"checkout":info["checkout"],"tree":info["sourceTree"],
        "runs":info["runs"],"jobs":info["jobs"],"headroom":{"diskBytes":free,"memoryBytes":available_memory},
        "logs":{},"packets":{},"reports":{}}
logs={}
for entry in info["logs"]:
    data=Path(entry["path"]).read_bytes()
    assert len(data)==entry["expectedBytes"],entry["name"]+" log transport length"
    assert blob(data)==entry["expectedGitBlob"],entry["name"]+" exact raw log Git blob"
    text=data.decode("utf-8")
    assert re.search(r"(?m)^\S+Z "+info["checkout"]+r"\s*$",text),entry["name"]+" exact checkout"
    record["logs"][entry["name"]]=pin(data)
    logs[entry["name"]]=text

def decode(name,marker):
    text=logs[name]
    starts=re.findall(re.escape(marker)+r"_BUNDLE_BEGIN (\{[^\r\n]+\})",text)
    assert len(starts)==1
    header=json.loads(starts[0])
    assert header["bytes"]<=2097152 and header["fileBytes"]<=2097152
    assert len(re.findall(re.escape(marker)+r"_BUNDLE_END(?:\r?$)",text,re.M))==1
    chunks=re.findall(re.escape(marker)+r"_BUNDLE_CHUNK (\d+) ([A-Za-z0-9+/=]+)(?:\r?$)",text,re.M)
    assert len(chunks)==header["chunks"] and len({int(index) for index,_ in chunks})==len(chunks)
    parts={int(index):part for index,part in chunks}
    assert set(parts)==set(range(header["chunks"]))
    payload=base64.b64decode("".join(parts[index] for index in range(header["chunks"])),validate=True)
    assert len(payload)==header["bytes"] and sha(payload)==header["sha256"]
    packet=json.loads(payload)
    assert packet["version"]==1 and isinstance(packet["files"],list)
    directory=ROOT/(name+"-files")
    assert not directory.exists()
    checked=[]; names=set(); data_by_path={}
    for entry in packet["files"]:
        path=entry["path"]; pieces=path.split("/")
        assert isinstance(path,str) and path and "\\" not in path and ":" not in path
        assert not path.startswith("/") and all(piece not in ("",".","..") and not piece.endswith((" ",".")) for piece in pieces)
        assert PurePosixPath(path).as_posix()==path
        folded=path.casefold(); assert folded not in names; names.add(folded)
        data=base64.b64decode(entry["base64"],validate=True)
        assert len(data)==entry["bytes"] and sha(data)==entry["sha256"]
        assert len(data)<=1048576
        checked.append({"path":path,**pin(data)})
        data_by_path[path]=data
    assert sum(entry["bytes"] for entry in checked)==header["fileBytes"]
    directory.mkdir()
    for path,data in data_by_path.items():
        target=directory/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    reports=[(path,json.loads(data)) for path,data in data_by_path.items() if "/" not in path and path.endswith("receiving.json")]
    assert len(reports)==1
    report_path,report=reports[0]
    assert report["status"]=="passed"
    for key in ["pageErrors","unexpectedRequests","harnessErrors"]: assert report[key]==[]
    assert report["browserExit"]=={"code":0,"signal":None}
    assert not report.get("cleanupError")
    record["packets"][name]={"header":header,"files":checked,"reportPath":report_path}
    record["reports"][name]={"schema":report.get("schema"),"checks":report["checks"],"downloads":report["downloads"],
        "sourceSha256":report["sourceSha256"],"sourceGitBlobs":report.get("sourceGitBlobs"),
        "checkout":report.get("checkout"),"browser":report["browser"],"browserExit":report["browserExit"],
        "objectUrlCleanup":report.get("objectUrlCleanup"),"documentAuditCount":len(report["documentAudits"]),
        "learnerHandoff":report.get("learnerHandoff")}
    return report,data_by_path

offline,offline_files=decode("offline","RECALLWEAVE_OFFLINE_PACK")
catalog,catalog_files=decode("catalog","RECALLWEAVE_CATALOG")
assert len(offline["checks"])==6 and len(offline["downloads"])==2
assert len(catalog["checks"])==11 and len(catalog["downloads"])==25
assert set(offline["sourceSha256"])==set(expected["expectedOfflineSource"])
if offline.get("sourceGitBlobs") is not None:
    assert set(offline["sourceGitBlobs"])==set(expected["expectedOfflineSource"])
    for path,value in offline["sourceGitBlobs"].items():
        assert value==expected["expectedOfflineSource"][path]["gitBlob"],path
    record["offlineSourceGitPinsExact"]=True
for field,value in [("tests",688),("pass",688),("fail",0),("skipped",0)]:
    values=re.findall(r"# "+field+r" (\d+)\r?$",logs["node"],re.M)
    assert values and int(values[-1])==value
record["node"]={"tests":688,"passed":688,"failed":0,"skipped":0}
download=next(row for row in offline["downloads"] if row["filename"]=="recallweave-offline.zip")
zip_bytes=offline_files[download["path"]]
assert zip_bytes==(SOURCE/"offline/recallweave-offline.zip").read_bytes()
assert pin(zip_bytes)=={"bytes":428521,"sha256":"28c1bf4ee1f21d74f9bf5d7e7e38f7a3a3a97fb72c71467323204dfd9cc2e6c9","gitBlob":"23041c1de2e33889c44daf4b5e1c75b698286236"}
record["downloadedZipEqualsNativeQualifiedBytes"]=True
for path,data in offline_files.items():
    prefix="extracted offline pack é/RecallWeave/"
    if path.startswith(prefix):
        relative=path[len(prefix):]
        if relative in ["START-HERE.txt","SHA256SUMS.json"]: continue
        assert data==(SOURCE/relative).read_bytes(),relative
record["extractedOriginalSourceBytesExact"]=True
assert offline.get("extractionBefore")==offline.get("extractionAfter") and offline.get("extractionBefore")
record["extractedSnapshotUnchanged"]=True
for label,report,files in [("offline",offline,offline_files),("catalog",catalog,catalog_files)]:
    guids=[]
    for row in report["downloads"]:
        data=files[row["path"]]
        assert len(data)==row["bytes"] and sha(data)==row["sha256"]
        guid=row["browserGuid"];assert isinstance(guid,str) and guid;guids.append(guid)
        if row["filename"].endswith(".json"):
            original=SOURCE/"courses"/row["filename"]
            assert original.is_file() and data==original.read_bytes(),row["filename"]
    assert len(guids)==len(set(guids))
record["all27DownloadsHaveUniquePerRunGuidsAndExactOriginalBytes"]=True
known={path:pin((SOURCE/path).read_bytes())["sha256"] for path in json.loads((SOURCE/"catalog/courses.json").read_bytes())}
for path in ["catalog.html","demo.html","catalog/courses.json","tools/build-offline-pack.py","offline/index.html","offline/recallweave-offline.zip"]:
    known[path]=sha((SOURCE/path).read_bytes())
record["additionalExpectedSourcePaths"]={}
for name,report in [("offline",offline),("catalog",catalog)]:
    missing=[]
    for path,value in report["sourceSha256"].items():
        assert path in expected["allTreeLeaves"],path
        if path in known: assert value==known[path],path
        else: missing.append({"path":path,"gitBlob":expected["allTreeLeaves"][path]["gitBlob"],"observedSha256":value})
    record["additionalExpectedSourcePaths"][name]=missing
record["status"]="decoded_and_physical_artifacts_verified"
record["finishedAt"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
content=(json.dumps(record,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
(ROOT/"decode-receipt.json").write_bytes(content)
print(json.dumps({"status":record["status"],"checkout":record["checkout"],"tree":record["tree"],"node":record["node"],
      "logs":record["logs"],"packets":{name:{"header":value["header"],"files":len(value["files"]),"reportPath":value["reportPath"]} for name,value in record["packets"].items()},
      "reports":{name:{"checks":len(value["checks"]),"downloads":len(value["downloads"]),"sourcePins":len(value["sourceSha256"]),"sourceGitBlobs":value["sourceGitBlobs"] is not None,
          "checkout":value["checkout"],"auditCount":value["documentAuditCount"],"objectUrlCleanup":value["objectUrlCleanup"],"learnerHandoff":value["learnerHandoff"]} for name,value in record["reports"].items()},
      "additionalExpectedSourcePaths":record["additionalExpectedSourcePaths"],"receipt":pin(content)}))
