import os,sys,json,hashlib,stat,time,re,subprocess,io,zipfile,base64,zlib
from pathlib import Path
ROOT=Path("/Users/me/Developer/recallweave-edit-distance-receiving-c945953fdeb7")
INSTALL=Path("/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7")
SOURCE=Path("/Users/me/Developer/recallweave-edit-distance-local-c945953fdeb7/source")
ORIGINALS=Path("/Users/me/Developer/recallweave-edit-distance-local-c945953fdeb7/ORIGINALS.json")
def pin(b):
 return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def identity(p):
 s=p.lstat(); assert stat.S_ISREG(s.st_mode) and not p.is_symlink(),str(p)
 b=p.read_bytes(); t=p.lstat(); assert (s.st_ino,s.st_size,s.st_mtime_ns)==(t.st_ino,t.st_size,t.st_mtime_ns) and len(b)==s.st_size
 return {**pin(b),"mode":format(stat.S_IMODE(s.st_mode),"04o"),"mtime_ns":str(s.st_mtime_ns)}
def census(p):
 return {str(q.relative_to(p)):identity(q) for q in sorted(p.rglob("*")) if q.is_file()}
def size(p,exclude_browser=False):
 return sum(q.lstat().st_size for q in p.rglob("*") if q.is_file() and not q.is_symlink() and not (exclude_browser and "browser" in q.relative_to(p).parts[:1]))
def guard():
 vm=subprocess.run(["/usr/bin/vm_stat"],capture_output=True,text=True,timeout=5,check=True).stdout
 pages=int(re.search(r"page size of (\d+) bytes",vm).group(1)); counts={a:int(b) for a,b in re.findall(r"^(Pages [^:]+):\s+(\d+)\.",vm,re.M)}
 mem=pages*sum(counts[k] for k in ["Pages free","Pages inactive","Pages speculative"])
 fs=os.statvfs(ROOT); disk=fs.f_bavail*fs.f_frsize
 out={"time_ns":str(time.time_ns()),"disk_free_bytes":disk,"conservative_memory_bytes":mem,"owned_static_bytes":size(ROOT,True),"owned_browser_bytes":size(ROOT/"browser")}
 assert disk>=256*1024**2 and mem>=2*1024**3 and out["owned_static_bytes"]<=2*1024**2 and out["owned_browser_bytes"]<=96*1024**2,out
 return out
for p in [ROOT/"FINAL-NATIVE-CLOSURE.json",ROOT/"NATIVE-CUSTODY.json",ROOT/"NATIVE-CARRIER.zip.b64"]:
 assert not p.exists(),str(p)
before_guard=guard()
receipt=json.loads((ROOT/"results/receipt.json").read_bytes())
prior=json.loads((ROOT/"results/identity-after.json").read_bytes())
current={"installed":census(INSTALL),"source":census(SOURCE),"original_capsule":identity(ORIGINALS),"runtime":{
 "node":identity(Path("/opt/homebrew/bin/node").resolve()),
 "python":identity(Path("/Library/Frameworks/Python.framework/Versions/3.13/bin/python3").resolve()),
 "chrome_entry":identity(Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome").resolve())}}
assert current==prior,"received identity changed"
pids=sorted({60387,60415,60430,*[x["pid"] for x in receipt["browser"]["tracked_processes"]]})
ps=subprocess.run(["/bin/ps","-axo","pid=,ppid=,command="],capture_output=True,text=True,timeout=5,check=True).stdout
entries=[{"pid":int(m[1]),"ppid":int(m[2]),"command":m[3]} for l in ps.splitlines() if (m:=re.match(r"^\s*(\d+)\s+(\d+)\s+(.+)$",l))]
remaining=[e for e in entries if e["pid"] in pids]
assert not remaining,remaining
paths=[p for p in sorted(ROOT.rglob("*")) if p.is_file() and "browser" not in p.relative_to(ROOT).parts[:1]]
download=Path(receipt["groups"]["R3"]["physical_path"]); assert identity(download)==receipt["groups"]["R3"]["physical"]
paths.append(download)
files={str(p.relative_to(ROOT)):p.read_bytes() for p in paths}
original_pin_map={r:identity(ROOT/r) for r in files}
closure={"schema":"recallweave-installed-receiving-native-closure-v1","time_ns":str(time.time_ns()),"purpose":"read-only settled identity/process check and byte-preserving custody; no launcher/browser/product calls",
 "receiver_receipt":pin(files["results/receipt.json"]),"groups":{k:v["pass"] for k,v in receipt["groups"].items()},
 "checked_pids":pids,"remaining_owned_processes":remaining,"installed_files":len(current["installed"]),"source_files":len(current["source"]),
 "received_identities_unchanged":current==prior,"actual_download_unchanged":True,
 "native_controller_execution":json.loads(files["EXECUTION.json"]),"original_browser_exit":receipt["browser"]["actual_exit"],
 "chrome_stdout":pin(files.get("results/chrome.stdout.txt",b"")),"chrome_stderr":pin(files.get("results/chrome.stderr.txt",b"")),
 "guard":before_guard,"excluded_private_profile":"retained in place; not transported because it is browser cache/profile data",
 "no_extra_application_or_browser_calls":True,"custody_process_pid":os.getpid(),"custody_process_exit_pending_tool_observation":True}
closure_bytes=(json.dumps(closure,ensure_ascii=False,indent=2)+"\n").encode()
files["FINAL-NATIVE-CLOSURE.json"]=closure_bytes
custody={"schema":"recallweave-installed-receiving-native-custody-v1","native_root":str(ROOT),"file_count":len(files),"total_bytes":sum(map(len,files.values())),
 "files":{r:pin(b) for r,b in sorted(files.items())},
 "physical_download_alias":"browser/downloads/recallweave-study-notes-2026-10-09.txt",
 "custody_self_in_carrier":True,"native_original_identity":original_pin_map}
custody_bytes=(json.dumps(custody,ensure_ascii=False,indent=2)+"\n").encode(); files["NATIVE-CUSTODY.json"]=custody_bytes
buf=io.BytesIO()
with zipfile.ZipFile(buf,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for r,b in sorted(files.items()):
  info=zipfile.ZipInfo(r,(2026,10,9,8,6,24)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o100644<<16
  z.writestr(info,b)
archive=buf.getvalue(); carrier=base64.b64encode(archive)+b"\n"
projected=size(ROOT,True)+len(closure_bytes)+len(custody_bytes)+len(carrier)
assert projected<=2*1024**2,{"projected_static_bytes":projected}
guard()
for path,b in [(ROOT/"FINAL-NATIVE-CLOSURE.json",closure_bytes),(ROOT/"NATIVE-CUSTODY.json",custody_bytes),(ROOT/"NATIVE-CARRIER.zip.b64",carrier)]:
 with path.open("xb") as f:f.write(b)
 os.chmod(path,0o400); assert path.read_bytes()==b
for r,meta in original_pin_map.items():assert identity(ROOT/r)==meta, r
final_guard=guard()
texts={r:{"pin":pin(b),"content":b.decode("utf-8")} for r,b in files.items() if not r.endswith(".png")}
text_carrier=base64.b64encode(zlib.compress(json.dumps(texts,ensure_ascii=False,separators=(",",":")).encode(),9)).decode()
print(json.dumps({"accepted":True,"final_guard":final_guard,"closure":pin(closure_bytes),"native_custody":pin(custody_bytes),
 "carrier":pin(carrier),"zip":pin(archive),"file_count":len(files),"total_bytes":sum(map(len,files.values())),
 "binary_files":{r:pin(b) for r,b in files.items() if r.endswith(".png")},"text_members_zlib_base64":text_carrier,
 "chrome_stderr_utf8":files.get("results/chrome.stderr.txt",b"").decode("utf-8"),"custody_pid":os.getpid(),
 "no_application_or_browser_calls":True},ensure_ascii=False))
