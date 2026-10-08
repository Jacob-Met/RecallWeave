import os,json,hashlib,subprocess,datetime
from pathlib import Path
root=Path("/home/jacob/hamon-answer-feedback-receiving-ab529ac65023").resolve(strict=True)
v=os.statvfs(root)
assert v.f_bavail*v.f_frsize>=1073741824,"Source preparation held by capacity"
data=(root/"source-transfer.json").read_bytes()
assert hashlib.sha256(data).hexdigest()=="dd5d6be370933a1f4ad71c8acff3c46043426252f99a5f1f8a6e93fe6fe4b58e","Transfer bytes differ"
packet=json.loads(data)
assert packet["version"]==1
paths=set()
for entry in packet["files"]:
 rel=Path(entry["path"])
 assert not rel.is_absolute() and ".." not in rel.parts and "." not in rel.parts
 assert entry["path"] not in paths
 paths.add(entry["path"])
 p=root/rel
 assert p.is_relative_to(root) and not p.exists()
 b=entry["content"].encode("utf-8")
 assert len(b)==entry["bytes"] and hashlib.sha256(b).hexdigest()==entry["sha256"]
 assert hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()==entry["git_blob"]
for entry in packet["files"]:
 p=root/entry["path"];p.parent.mkdir(parents=True,exist_ok=True)
 with p.open("xb") as f: f.write(entry["content"].encode("utf-8"))
def run(args):
 r=subprocess.run(args,cwd=root,capture_output=True,text=True,timeout=40)
 if r.returncode: raise RuntimeError(json.dumps({"command":args,"returncode":r.returncode,"stdout":r.stdout,"stderr":r.stderr}))
 return {"command":args,"returncode":r.returncode,"stdout":r.stdout,"stderr":r.stderr}
init=run(["git","init","-b","receiving/answer-feedback-ab529ac65023"])
run(["git","add","--","."])
commit=run(["git","-c","user.name=HAMON mac_production","-c","user.email=hamon-ultra-ab529ac65023@localhost","commit","-m","Freeze exact RecallWeave first-pass feedback receiver before native baseline"])
head=run(["git","rev-parse","HEAD"])["stdout"].strip()
print(json.dumps({"sourceFreezeCommit":head,"files":len(packet["files"]),"sourceTransferSha256":"dd5d6be370933a1f4ad71c8acff3c46043426252f99a5f1f8a6e93fe6fe4b58e"}),flush=True)
checks=[run(["/usr/bin/node","--check",str(root/"baseline-source/tools/check_answer_feedback_browser.mjs")]),run(["python3",str(root/"baseline-source/tools/make_demo.py")])]
for entry in packet["files"]:
 b=(root/entry["path"]).read_bytes()
 assert len(b)==entry["bytes"] and hashlib.sha256(b).hexdigest()==entry["sha256"],entry["path"]
tracked=run(["git","status","--porcelain"])["stdout"]
assert not tracked,"Standalone builder or syntax check changed frozen source"
receipt={"version":1,"time":datetime.datetime.now(datetime.timezone.utc).isoformat(),"sourceFreezeCommit":head,"transferSha256":"dd5d6be370933a1f4ad71c8acff3c46043426252f99a5f1f8a6e93fe6fe4b58e","checks":checks,"allSourceBytesUnchanged":True,"freeDiskBytes":v.f_bavail*v.f_frsize,"browserExecuted":False}
with (root/"native-source-preflight.json").open("x") as f:json.dump(receipt,f,indent=2);f.write("\n")
print(json.dumps(receipt))
