import sys,base64,hashlib,tarfile,io,json
b=base64.b64decode(sys.argv[1],validate=True)
sha=lambda x:hashlib.sha256(x).hexdigest()
blob=lambda x:hashlib.sha1(b"blob "+str(len(x)).encode()+b"\0"+x).hexdigest()
assert len(b)==22580 and sha(b)=="cac431ce4429271ceefb9253ec4ffd408fa15f048418ee96c624b76c2b860d06"
assert blob(b)=="09234201fba72a021f735d607a1a0fc3c9fde384"
tf=tarfile.open(fileobj=io.BytesIO(b),mode="r:gz"); members=tf.getmembers()
assert len(members)==21 and all(m.isfile() for m in members)
data={m.name:tf.extractfile(m).read() for m in members}
assert len(data)==21
mf=data["packet-manifest.json"]
assert sha(mf)=="7bdbbeb3e2bf73ba6151c97775ce5539ddca8d22ba7c1958c6c1a906b7e667b9"
manifest=json.loads(mf)
assert set(data)=={f["path"] for f in manifest["files"]}|{"packet-manifest.json"}
for f in manifest["files"]:assert len(data[f["path"]])==f["bytes"] and sha(data[f["path"]])==f["sha256"],f["path"]
r=json.loads(data["run-r1/receiving.json"])
assert r["passed"] is True and r["candidate_blind"] is True and len(r["groups"])==6 and all(g["passed"] for g in r["groups"])
assert r["before"]==r["after"] and blob(data["source/receive_model.mjs"])=="70d4594862c147f074d4a1410daadf7e72e89ee0"
assert blob(data["run-r1/receiving.json"])=="7a04e825a9d9f912cafd982edd4620fd73955253"
assert data["run-r1.stderr"]==b""
driver=json.loads(data["execution-r1.json"])
print(json.dumps({"schema":"recall170-root-domain-archive-transport/1","accepted":True,"archiveBytes":len(b),"sha256":sha(b),"gitBlob":blob(b),"membersVerified":len(data),"manifestSha256":sha(mf),"receiptBytes":len(data["run-r1/receiving.json"]),"receiptSha256":sha(data["run-r1/receiving.json"]),"receiptGitBlob":blob(data["run-r1/receiving.json"]),"receiverGitBlob":blob(data["source/receive_model.mjs"]),"driver":driver}))
