from pathlib import Path
import base64,ctypes,datetime,hashlib,io,json,os,shutil,subprocess,sys,traceback,zipfile
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/"source-v2"
GIT=r"C:\Program Files\Git\cmd\git.exe"
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"gitBlob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def floor():
 m=ctypes.create_string_buffer(64);ctypes.c_uint32.from_buffer(m).value=64
 assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
 result={"diskBytes":shutil.disk_usage(ROOT).free,"memoryBytes":int.from_bytes(m.raw[16:24],"little")}
 assert result["diskBytes"]>=1073741824 and result["memoryBytes"]>=536870912,"Native receiving floor refused"
 return result
capacity=floor()
assert json.loads((ROOT/".owner.json").read_bytes())["owner"]=="hamon-ultra-ab529ac65023-20261008/root"
assert not SOURCE.exists(),"one-shot source already exists"
input_path=ROOT/"generation-input-v2.json"
input_bytes=input_path.read_bytes();info=json.loads(input_bytes)
assert info["previousNativeCandidate"]=="c0a0bbe335fd4ac45da76e9539958e495153fec7"
assert set(x["path"] for x in info["replacements"])=={"demo.html","README.md"}
assert len(info["inputPins"])==17
for replacement in info["replacements"]:
 assert pin(replacement["content"].encode("utf-8"))["gitBlob"]==replacement["gitBlob"]==info["inputPins"][replacement["path"]]["gitBlob"]
EVIDENCE=ROOT/"native-current-v2"
assert not EVIDENCE.exists(),"one-shot evidence already exists"
EVIDENCE.mkdir()
logpath=EVIDENCE/"producer-recomposition.log"
record={"schema":"recallweave-offline-pack-native-recomposition-v2","owner":info["owner"],"startedAt":utc(),"headroom":capacity,"python":sys.version,"main":info["main"],"mainTree":info["mainTree"],"previousQualifiedSource":info["previousQualifiedSource"],"input":pin(input_bytes),"sourceBoundary":info["sourceBoundary"],"preparationFailure":info.get("preparationFailure"),"commands":[]}
def run(args,cwd,expected=0):
 result=subprocess.run(args,cwd=str(cwd),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=90)
 item={"argv":args,"cwd":str(cwd),"exit":result.returncode,"stdout":result.stdout.decode("utf-8",errors="strict"),"stderr":result.stderr.decode("utf-8",errors="strict")}
 record["commands"].append(item)
 with logpath.open("ab") as f:f.write((json.dumps(item,ensure_ascii=False)+"\n").encode("utf-8"));f.flush();os.fsync(f.fileno())
 assert result.returncode==expected, item
 return item["stdout"].strip()
def git(*args,cwd=None):return run([GIT,"-c","core.autocrlf=false",*args],cwd or SOURCE)
def tree(ref):
 text=git("ls-tree","-r",ref)
 result={}
 for line in text.splitlines():
  fields,path=line.split("\t",1);mode,kind,digest=fields.split();result[path]={"mode":mode,"type":kind,"gitBlob":digest}
 return result
try:
 assert git("rev-parse",info["previousNativeCandidate"]+"^{tree}",cwd=ROOT/"source-v1")==info["previousNativeTree"]
 git("worktree","add","--detach",str(SOURCE),info["previousNativeCandidate"],cwd=ROOT/"source-v1")
 original=tree("HEAD");assert len(original)==18
 original_zip=(SOURCE/"offline/recallweave-offline.zip").read_bytes();assert pin(original_zip)==info["previousZip"]
 for path,expected in original.items():
  p=SOURCE/path;assert p.is_file() and not p.is_symlink();assert pin(p.read_bytes())["gitBlob"]==expected["gitBlob"],path
 for replacement in info["replacements"]:(SOURCE/replacement["path"]).write_bytes(replacement["content"].encode("utf-8"))
 observed={path:pin((SOURCE/path).read_bytes()) for path in info["inputPins"]}
 for path,expected in info["inputPins"].items():assert observed[path]["gitBlob"]==expected["gitBlob"],path
 record["inputPins"]=observed
 git("add","--","README.md","demo.html")
 git("commit","-m","Freeze exact merged locale learner for offline pack recomposition")
 record["inputFreezeCommit"]=git("rev-parse","HEAD");record["inputFreezeTree"]=git("rev-parse","HEAD^{tree}")
 floor()
 run([sys.executable,"tools/build-offline-pack.py","--check"],SOURCE,expected=1)
 assert (SOURCE/"offline/recallweave-offline.zip").read_bytes()==original_zip
 record["staleCheckPreservedPreviousZip"]=True
 run([sys.executable,"tools/build-offline-pack.py"],SOURCE)
 current_zip=(SOURCE/"offline/recallweave-offline.zip").read_bytes()
 assert current_zip!=original_zip and len(current_zip)<=2097152
 run([sys.executable,"tools/build-offline-pack.py","--check"],SOURCE)
 assert current_zip==(SOURCE/"offline/recallweave-offline.zip").read_bytes()
 assert observed=={path:pin((SOURCE/path).read_bytes()) for path in info["inputPins"]}
 with zipfile.ZipFile(io.BytesIO(original_zip)) as old,zipfile.ZipFile(io.BytesIO(current_zip)) as new:
  assert old.namelist()==new.namelist() and len(new.namelist())==15
  changed=[]
  for old_member,new_member in zip(old.infolist(),new.infolist()):
   for key in ["filename","compress_type","date_time","create_system","create_version","extract_version","flag_bits","external_attr","internal_attr","extra","comment"]:assert getattr(old_member,key)==getattr(new_member,key),(old_member.filename,key)
   if old.read(old_member.filename)!=new.read(new_member.filename):changed.append(new_member.filename)
  assert set(changed)=={"RecallWeave/demo.html","RecallWeave/SHA256SUMS.json"}
  assert new.read("RecallWeave/demo.html")==(SOURCE/"demo.html").read_bytes()
  record["archiveMembers"]=[{"path":x.filename,**pin(new.read(x.filename))} for x in new.infolist()]
  record["archiveChangedMembers"]=changed
 record["all17InputsUnchangedDuringProducer"]=True
 record["previousZip"]=info["previousZip"];record["artifact"]=pin(current_zip)
 git("add","--","offline/recallweave-offline.zip");git("commit","-m","Regenerate offline pack from exact merged locale learner")
 record["candidateCommit"]=git("rev-parse","HEAD");record["candidateTree"]=git("rev-parse","HEAD^{tree}")
 after=tree("HEAD")
 changed_source=[p for p in original if after[p]!=original[p]]
 assert set(changed_source)=={"README.md","demo.html","offline/recallweave-offline.zip"}
 record["preservedNativeLeaves"]=len(original)-len(changed_source);record["changedNativePaths"]=changed_source
 record["status"]="passed";record["finishedAt"]=utc()
except BaseException as e:
 record["status"]="failed";record["finishedAt"]=utc();record["error"]=repr(e);record["traceback"]=traceback.format_exc()
 (EVIDENCE/"producer-recomposition.json").write_bytes((json.dumps(record,ensure_ascii=False,indent=2)+"\n").encode("utf-8"))
 raise
receipt=(json.dumps(record,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
(EVIDENCE/"producer-recomposition.json").write_bytes(receipt)
(EVIDENCE/"generation-controller.py").write_bytes(Path(__file__).read_bytes())
dest=SOURCE/"docs/receiving/offline-course-pack-ab529ac65023/native-current-v2";dest.mkdir(parents=True)
for name in ["producer-recomposition.log","producer-recomposition.json","generation-controller.py"]:(dest/name).write_bytes((EVIDENCE/name).read_bytes())
for args in [["add","--","docs/receiving/offline-course-pack-ab529ac65023/native-current-v2"],["commit","-m","Retain native locale learner pack recomposition receiving"]]:
 result=subprocess.run([GIT,"-c","core.autocrlf=false",*args],cwd=str(SOURCE),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
def get(*args):return subprocess.run([GIT,*args],cwd=str(SOURCE),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout.decode("utf-8").strip()
custody=get("rev-parse","HEAD");custody_tree=get("rev-parse","HEAD^{tree}")
assert not get("status","--porcelain")
files=[]
for rel in ["offline/recallweave-offline.zip",*[str(Path("docs/receiving/offline-course-pack-ab529ac65023/native-current-v2")/name).replace("\\","/") for name in ["producer-recomposition.log","producer-recomposition.json","generation-controller.py"]]]:
 data=(SOURCE/rel).read_bytes();files.append({"path":rel,**pin(data),"base64":base64.b64encode(data).decode("ascii")})
transfer={"schema":"recallweave-offline-pack-native-transfer-v2","custodyCommit":custody,"custodyTree":custody_tree,"candidateCommit":record["candidateCommit"],"candidateTree":record["candidateTree"],"main":info["main"],"artifact":record["artifact"],"files":files}
transfer_bytes=(json.dumps(transfer,ensure_ascii=False,separators=(",",":"))+"\n").encode("utf-8")
(ROOT/"generation-transfer-v2.json").write_bytes(transfer_bytes)
print(json.dumps({"status":"passed","candidateCommit":record["candidateCommit"],"candidateTree":record["candidateTree"],"inputFreezeCommit":record["inputFreezeCommit"],"custodyCommit":custody,"custodyTree":custody_tree,"previousZip":info["previousZip"],"artifact":record["artifact"],"changedMembers":record["archiveChangedMembers"],"inputPins":len(observed),"transfer":pin(transfer_bytes),"files":[{k:v for k,v in f.items() if k!="base64"} for f in files]}))
