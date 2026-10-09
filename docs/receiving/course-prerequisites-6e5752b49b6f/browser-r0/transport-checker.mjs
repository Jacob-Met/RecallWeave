import sys,termios,base64,tarfile,io,json,hashlib
a=termios.tcgetattr(0);a[3]&=~termios.ECHO;termios.tcsetattr(0,termios.TCSANOW,a);print("READY",flush=True)
s=[]
for line in sys.stdin:
 if line.rstrip("\r\n")=="END":break
 s.append(line)
b=base64.b64decode("".join(s));assert len(b)==280775;assert hashlib.sha256(b).hexdigest()=="5e378c30438b0146656e89a490f4acd14dd6f01b26efdf927fce8ffc4b0a32e3"
g=lambda b:hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
assert g(b)=="b85e6475452ecaa92e96bd649a7f6da81a645fde"
t=tarfile.open(fileobj=io.BytesIO(b),mode="r:gz");ms=t.getmembers();assert len(ms)==51 and all(x.isfile() for x in ms);d={x.name:t.extractfile(x).read() for x in ms};assert len(d)==51
m=json.loads(d["manifest.json"]);assert len(m["members"])==50;assert {x["path"] for x in m["members"]}==set(d)-{"manifest.json"}
for x in m["members"]:
 v=d[x["path"]];assert len(v)==x["bytes"] and hashlib.sha256(v).hexdigest()==x["sha256"] and g(v)==x["gitBlob"],x["path"]
assert len(m["originalRecords"])==47
for x in m["originalRecords"]:
 v=d["original/"+x["path"]];assert len(v)==x["bytes"] and hashlib.sha256(v).hexdigest()==x["sha256"] and g(v)==x["gitBlob"],x["path"]
matches=[(k,v)for k,v in d.items()if g(v)=="f502ea10b8ea5ee0efb09302e66b5a4245ad6a7e"];assert len(matches)==1
k,v=matches[0];r=json.loads(v);assert r["accepted"] is False and len(r["groups"])==1 and r["sourceCommit"]=="1bbbc9007d29247c765965bbf1717088167c1cfb"
ds=[k for k in d if "/downloads/" in k];assert len(ds)==0
print(json.dumps({"accepted":True,"scope":"Independent archive preservation of original FAILED R0; no product/browser rerun or new functional acceptance","archive":{"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"gitBlob":g(b)},"membersVerified":51,"manifestedPayloads":50,"originalFilesVerified":47,"manifest":{"bytes":len(d["manifest.json"]),"sha256":hashlib.sha256(d["manifest.json"]).hexdigest(),"gitBlob":g(d["manifest.json"])},"originalReceipt":{"path":k,"bytes":len(v),"sha256":hashlib.sha256(v).hexdigest(),"gitBlob":g(v)},"originalAccepted":r["accepted"],"originalGroups":r["groups"],"originalFailure":r.get("failure"),"originalDownloads":len(ds),"sourceCommit":r["sourceCommit"],"preservation":r.get("inputsUnchanged"),"profileRemoved":r.get("ownProfileRemoved"),"browserClose":r.get("browserClose")},ensure_ascii=True),flush=True)
