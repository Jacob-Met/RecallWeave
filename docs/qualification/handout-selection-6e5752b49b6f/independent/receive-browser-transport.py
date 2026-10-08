import os,sys,json,termios,base64,gzip,io,tarfile,hashlib
specs=json.loads(sys.argv[1])
fd=sys.stdin.fileno()
old=termios.tcgetattr(fd)
raw=termios.tcgetattr(fd)
raw[3] &= ~(termios.ICANON|termios.ECHO)
raw[6][termios.VMIN]=1
raw[6][termios.VTIME]=0
termios.tcsetattr(fd,termios.TCSANOW,raw)
print("READY_NATIVE_ARCHIVE_BYTES",flush=True)
results=[]
try:
 for spec in specs:
  remaining=spec["base64Characters"]; chunks=[]
  while remaining:
   data=os.read(fd,min(65536,remaining))
   assert data,"unexpected input EOF"
   chunks.append(data); remaining-=len(data)
  encoded=b"".join(chunks)
  archive=base64.b64decode(encoded,validate=True)
  sha=lambda b:hashlib.sha256(b).hexdigest()
  blob=lambda b:hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
  assert len(archive)==spec["bytes"]
  assert sha(archive)==spec["sha256"]
  assert blob(archive)==spec["gitBlob"]
  tf=tarfile.open(fileobj=io.BytesIO(archive),mode="r:gz")
  members=tf.getmembers()
  assert len(members)==spec["memberCount"]
  assert len({m.name for m in members})==len(members)
  assert all(m.isfile() and m.mode==0o644 and m.uid==0 and m.gid==0 and m.mtime==0 for m in members)
  contents={m.name:tf.extractfile(m).read() for m in members}
  manifest_bytes=contents["manifest.json"]
  assert sha(manifest_bytes)==spec["manifestSha256"]
  manifest=json.loads(manifest_bytes)
  assert manifest["files"]==spec["files"]
  assert set(contents)==set(f["path"] for f in manifest["files"])|{"manifest.json"}
  for f in manifest["files"]:
   data=contents[f["path"]]
   assert len(data)==f["bytes"] and sha(data)==f["sha256"] and blob(data)==f["gitBlob"],f["path"]
  received={"name":spec["name"],"archiveBytes":len(archive),"sha256":sha(archive),"gitBlob":blob(archive),"memberCount":len(members),"payloadFiles":len(manifest["files"]),"manifestSha256":sha(manifest_bytes),"allMembersIndependentlyDecodedAndExact":True}
  if spec["name"]=="la7-readiness":
   r0=json.loads(contents["browser-readiness-r0/browser-receiving.json"])
   r1=json.loads(contents["browser-readiness-r1/browser-receiving.json"])
   d1=json.loads(contents["browser-readiness-r1/driver-result.json"])
   assert r0["accepted"] is False and r1["accepted"] is True and d1["exitCode"]==0
   assert r1["dom"]["loadedScripts"]==1
   assert r1["dom"]["choose"]=="Choose deck JSON \u2191"
   assert sha(contents["browser-readiness-r1/baseline-handout.png"])=="e8265da10e836691c1da22419f0c8b521a5f4e58673f8870782c1e41c8bae961"
   received["preservedStates"]={"r0Accepted":False,"r1Accepted":True,"r1NativeExitCode":0,"actualScriptCount":1,"authoritativeArrow":"\u2191"}
  else:
   receipt_path="handout-selection-root-r0/independent-browser-receiving.json"
   r=json.loads(contents[receipt_path])
   assert r["accepted"] is True and len(r["groups"])==7 and len(r["downloads"])==6
   assert r["before"]==r["after"] and r["browserExit"]["exitCode"]==0
   assert r["before"]["receiver"]["gitBlob"]=="991cdf14c6f6b0f599a460cc33612f46f2a03ef3"
   received["nativeReceipt"]={"bytes":len(contents[receipt_path]),"sha256":sha(contents[receipt_path]),"gitBlob":blob(contents[receipt_path]),"accepted":True,"groups":7,"physicalDownloads":6,"sourceRuntimeRecords":len(r["before"])}
  results.append(received)
 print(json.dumps({"schema":"hamon-independent-native-archive-transport/1","runtime":sys.version,"accepted":True,"archives":results}),flush=True)
finally:
 termios.tcsetattr(fd,termios.TCSANOW,old)
