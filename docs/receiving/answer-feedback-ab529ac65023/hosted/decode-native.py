import pathlib,json,base64,hashlib,re,os
root=pathlib.Path(__file__).resolve().parent
assert os.statvfs(root).f_bavail*os.statvfs(root).f_frsize>=1073741824,"capacity floor"
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda b:hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
receipt={"version":1,"head":"811361031818be4d7015ef95bcdaa06e1e96944d","checkout":"f6c39a1f545a8f25a16b48cae1e03f4d4e12f58d","tree":"d8e2ffc2b085927aa4c2ad706a817560da489d37","runs":{}}
for stage,prefix,run,job in [("feedback","RECALLWEAVE_ANSWER_FEEDBACK",37827172607,113482899903),("catalog","RECALLWEAVE_CATALOG",37827172278,113482908188)]:
 raw=(root/(stage+".log")).read_bytes(); text=raw.decode(); lines=text.splitlines()
 starts=[json.loads(x.split(prefix+"_BUNDLE_BEGIN ",1)[1]) for x in lines if prefix+"_BUNDLE_BEGIN " in x]
 assert len(starts)==1; h=starts[0]
 chunks=[x.split(prefix+"_BUNDLE_CHUNK ",1)[1].split(" ",1) for x in lines if prefix+"_BUNDLE_CHUNK " in x]
 assert [int(x[0]) for x in chunks]==list(range(h["chunks"]))
 assert sum(prefix+"_BUNDLE_END" in x for x in lines)==1
 b=base64.b64decode("".join(x[1] for x in chunks),validate=True)
 assert len(b)==h["bytes"] and sha(b)==h["sha256"] and len(b)<=2097152
 packet=json.loads(b); assert packet["version"]==1
 out=root/stage;out.mkdir(exist_ok=True);paths=set();files=[];total=0
 for f in packet["files"]:
  p=pathlib.PurePosixPath(f["path"]);assert not p.is_absolute() and ".." not in p.parts and f["path"] not in paths
  paths.add(f["path"]);fb=base64.b64decode(f["base64"],validate=True)
  assert len(fb)==f["bytes"] and sha(fb)==f["sha256"]
  fp=out/p;fp.parent.mkdir(parents=True,exist_ok=True);fp.write_bytes(fb);total+=len(fb)
  files.append({"path":f["path"],"bytes":len(fb),"sha256":sha(fb),"git_blob":git(fb)})
 assert total==h["fileBytes"]
 report=json.loads((out/"browser-receiving.json").read_text())
 receipt["runs"][stage]={"run":run,"job":job,"log":{"bytes":len(raw),"sha256":sha(raw),"git_blob":git(raw)},"packet":h,"files":files}
 print(json.dumps({"stage":stage,"reportKeys":list(report),"status":report.get("status"),"checks":report.get("checks"),"downloads":report.get("downloads"),"sourceSha256":report.get("sourceSha256"),"browserExit":report.get("browserExit"),"cleanupError":report.get("cleanupError"),"pageErrors":report.get("pageErrors"),"harnessErrors":report.get("harnessErrors"),"unexpectedRequests":report.get("unexpectedRequests")}))
raw=(root/"node.log").read_bytes();text=raw.decode()
assert "# tests 542" in text and "# pass 542" in text and "# fail 0" in text
receipt["runs"]["node"]={"run":37827172260,"job":113482898771,"tests":542,"passed":542,"failed":0,"log":{"bytes":len(raw),"sha256":sha(raw),"git_blob":git(raw)}}
(root/"packet-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
