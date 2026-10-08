import os,sys,json,hashlib,subprocess,datetime,time,signal,re
from pathlib import Path
root=Path("/home/jacob/hamon-answer-feedback-receiving-ab529ac65023").resolve(strict=True)
assert len(sys.argv)==3,"Use STAGE SOURCE_DIRECTORY"
stage,source_name=sys.argv[1:]
assert re.fullmatch(r"[a-z][a-z0-9-]{0,40}",stage) and re.fullmatch(r"[a-z][a-z0-9-]{0,40}",source_name)
source=(root/source_name).resolve(strict=True)
assert source.parent==root and source.is_dir()
output=root/(stage+"-receiving")
log=root/(stage+"-console.log")
receipt_path=root/(stage+"-controller.json")
assert not output.exists() and not log.exists() and not receipt_path.exists(),"Use a fresh owned receiving stage"
disk=os.statvfs(root)
free=disk.f_bavail*disk.f_frsize
memory={}
for line in Path("/proc/meminfo").read_text().splitlines():
 if line.startswith("MemAvailable:"): memory["availableBytes"]=int(line.split()[1])*1024
assert free>=1073741824 and memory["availableBytes"]>=536870912,"Browser resource hold"
manifest=json.loads((root/"source-transfer.json").read_bytes())
carried=[entry for entry in manifest["files"] if entry["path"].startswith("baseline-source/")]
before={}
for entry in carried:
 rel=entry["path"][len("baseline-source/"):]
 before[rel]=hashlib.sha256((source/rel).read_bytes()).hexdigest()
assert before["tools/check_answer_feedback_browser.mjs"]=="811ce3c0b40f38ece73272746fec0d789e23b00af8bae092559cedc6be396566","Receiver differs from frozen native source"
if stage=="baseline":
 for entry in carried:
  rel=entry["path"][len("baseline-source/"):]
  assert before[rel]==entry["sha256"],"Baseline source changed: "+rel
command=["/usr/bin/node",str(source/"tools/check_answer_feedback_browser.mjs"),"--root",str(source),"--browser","/snap/bin/chromium","--output",str(output),"--emit-bundle"]
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
tick=time.monotonic()
stop_reason=None
with log.open("xb") as stream:
 process=subprocess.Popen(command,cwd=source,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
 print(json.dumps({"stage":stage,"nodePid":process.pid,"started":started,"command":command,"freeDiskBytes":free,"availableMemoryBytes":memory["availableBytes"]}),flush=True)
 while process.poll() is None:
  if time.monotonic()-tick>360: stop_reason="Owned receiving exceeded 360 seconds"
  if log.stat().st_size>6*1024*1024: stop_reason="Owned receiving console exceeded 6 MiB"
  if stop_reason:
   os.killpg(process.pid,signal.SIGTERM)
   try: process.wait(timeout=5)
   except subprocess.TimeoutExpired:
    os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=5)
   break
  time.sleep(0.2)
 stream.flush();os.fsync(stream.fileno())
returncode=process.returncode
elapsed=time.monotonic()-tick
after={rel:hashlib.sha256((source/rel).read_bytes()).hexdigest() for rel in before}
report_path=output/"browser-receiving.json"
report=json.loads(report_path.read_bytes()) if report_path.exists() else None
raw=log.read_bytes()
receipt={"version":1,"stage":stage,"source":str(source),"command":command,"started":started,"ended":datetime.datetime.now(datetime.timezone.utc).isoformat(),"elapsedSeconds":elapsed,"nodePid":process.pid,"returncode":returncode,"stopReason":stop_reason,"freeDiskBytesAtStart":free,"availableMemoryBytesAtStart":memory["availableBytes"],"sourceBefore":before,"sourceAfter":after,"sourceUnchanged":before==after,"console":{"path":str(log),"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()},"browserReport":str(report_path) if report else None,"browserStatus":report.get("status") if report else None,"passed":sum(x["status"]=="passed" for x in report.get("checks",[])) if report else 0,"failed":sum(x["status"]=="failed" for x in report.get("checks",[])) if report else 0,"error":report.get("error") if report else "Browser report absent","remainingOwnedProfiles":[str(p) for p in root.glob("recallweave-answer-feedback-chrome-*")]}
with receipt_path.open("x") as f: json.dump(receipt,f,indent=2);f.write("\n")
print(json.dumps(receipt))
sys.exit(returncode if returncode is not None and returncode>=0 else 1)
