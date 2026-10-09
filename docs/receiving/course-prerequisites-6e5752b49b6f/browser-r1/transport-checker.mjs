import sys,termios,base64,tarfile,io,json,hashlib
a=termios.tcgetattr(0);a[3]&=~termios.ECHO;termios.tcsetattr(0,termios.TCSANOW,a);print("READY",flush=True)
s=[]
for line in sys.stdin:
 if line.rstrip("\r\n")=="END":break
 s.append(line)
b=base64.b64decode("".join(s));assert len(b)==1649256;assert hashlib.sha256(b).hexdigest()=="6d9d841d4992dd8ec71456e3cfa03b05c872009f6c3d268fa0c34079440b1c3f"
g=lambda b:hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
t=tarfile.open(fileobj=io.BytesIO(b),mode="r:gz");ms=t.getmembers();assert len(ms)==145 and all(x.isfile() for x in ms);d={x.name:t.extractfile(x).read() for x in ms};assert len(d)==145
m=json.loads(d["manifest.json"]);assert len(m["members"])==144;assert {x["path"] for x in m["members"]}==set(d)-{"manifest.json"}
for x in m["members"]:
 v=d[x["path"]];assert len(v)==x["bytes"] and hashlib.sha256(v).hexdigest()==x["sha256"] and g(v)==x["gitBlob"],x["path"]
assert len(m["originalRecords"])==141
for x in m["originalRecords"]:
 v=d["original/"+x["path"]];assert len(v)==x["bytes"] and hashlib.sha256(v).hexdigest()==x["sha256"] and g(v)==x["gitBlob"],x["path"]
v=d["original/browser-receiving-r1.json"];assert len(v)==199224 and g(v)=="3e0d938ac4cd3273f363cce2aa9cc3446a1ed30e"
r=json.loads(v);assert r["accepted"] and len(r["groups"])==17 and all(x["passed"] for x in r["groups"]);assert r["sourceCommit"]=="1bbbc9007d29247c765965bbf1717088167c1cfb"
assert r["inputsUnchanged"] and r["finalEventsAccepted"] and r["ownProfileRemoved"] and not r["errors"];assert r["closeResponse"]=="confirmed"
ds=[(k,v)for k,v in d.items()if k.startswith("original/outputs-r1/downloads/")];assert len(ds)==20
downloadRecords=[]
for k,v in ds:
 x=json.loads(v);assert x["format"]=="recallweave-prerequisite-review/1";assert {"format","source","report"}==set(x);downloadRecords.append({"path":k,"bytes":len(v),"sha256":hashlib.sha256(v).hexdigest(),"gitBlob":g(v),"source":x["source"]})
print(json.dumps({"accepted":True,"scope":"Independent transported original archive verification only; no browser/product replay","archive":{"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"gitBlob":g(b)},"membersVerified":145,"manifestedPayloads":144,"originalFilesVerified":141,"manifest":{"bytes":len(d["manifest.json"]),"sha256":hashlib.sha256(d["manifest.json"]).hexdigest(),"gitBlob":g(d["manifest.json"])},"receipt":{"bytes":len(d["original/browser-receiving-r1.json"]),"sha256":hashlib.sha256(d["original/browser-receiving-r1.json"]).hexdigest(),"gitBlob":g(d["original/browser-receiving-r1.json"])},"groups":r["groups"],"sourceCommit":r["sourceCommit"],"downloadCount":len(ds),"downloads":downloadRecords,"browserClose":r["browserClose"],"observerClose":r["browserObserverClose"],"launcherClose":r["launcherClose"],"profileRemoved":r["ownProfileRemoved"],"inputsUnchanged":r["inputsUnchanged"],"finalEventsAccepted":r["finalEventsAccepted"],"elapsedMs":r["elapsedMs"]},ensure_ascii=True),flush=True)
