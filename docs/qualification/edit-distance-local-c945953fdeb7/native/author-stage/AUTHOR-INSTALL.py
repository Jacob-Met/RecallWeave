import datetime, hashlib, json, os, re, shutil, signal, stat, subprocess, sys, time
from pathlib import Path
ROOT=Path("/Users/me/Developer/recallweave-edit-distance-local-c945953fdeb7")
TARGET=Path("/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7")
PYTHON="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"
CAP=2*1024*1024
record={"schema":"recall.edit-distance.author-install-and-refusal.v1","started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"controller_pid":os.getpid(),"root":str(ROOT),"target":str(TARGET),"calls":[],"guards":[],"ordinary_learner_session_reserved_for_independent":True}
def pin(data):
    return {"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()}
def inventory(root):
    found={}
    for p in sorted(root.rglob("*")):
        s=p.lstat()
        if stat.S_ISDIR(s.st_mode):continue
        if not stat.S_ISREG(s.st_mode):raise AssertionError("Unexpected owned entry "+str(p))
        data=p.read_bytes()
        found[str(p.relative_to(root))]={**pin(data),"mode":oct(stat.S_IMODE(s.st_mode)),"mtime_ns":s.st_mtime_ns}
    return found
def guard(name):
    disk=shutil.disk_usage(ROOT).free
    text=subprocess.run(["/usr/bin/vm_stat"],capture_output=True,text=True,check=True,timeout=5).stdout
    page=int(re.search(r"page size of (\d+) bytes",text).group(1))
    memory=sum(int(re.search(r"^"+re.escape(k)+r":\s+(\d+)",text,re.M).group(1)) for k in ["Pages free","Pages inactive","Pages speculative"])*page
    total=sum(p.stat().st_size for root in [ROOT,TARGET] if root.exists() for p in root.rglob("*") if p.is_file())
    value={"name":name,"disk_free":disk,"conservative_memory":memory,"owned_bytes":total,"owned_cap":CAP}
    record["guards"].append(value)
    assert disk>=256*1024*1024 and memory>=2*1024**3 and total<=CAP,value
    return value
def call(name,argv):
    guard(name)
    started=time.monotonic()
    proc=subprocess.Popen(argv,cwd="/tmp",stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
    timed_out=False
    try:out,err=proc.communicate(timeout=20)
    except subprocess.TimeoutExpired:
        timed_out=True
        os.killpg(proc.pid,signal.SIGTERM)
        try:out,err=proc.communicate(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid,signal.SIGKILL);out,err=proc.communicate(timeout=3)
    result={"name":name,"argv":argv,"cwd":"/tmp","pid":proc.pid,"exit":proc.returncode,"seconds":time.monotonic()-started,"timed_out":timed_out,"stdout":out.decode("utf-8"),"stderr":err.decode("utf-8"),"stdout_identity":pin(out),"stderr_identity":pin(err)}
    record["calls"].append(result)
    assert not timed_out,result
    return result
status=0
try:
    guard("before-source-admission")
    assert not os.path.lexists(TARGET)
    before=inventory(ROOT)
    record["preparation_before"]=before
    preparation=json.loads((ROOT/"SOURCE-PREPARATION.json").read_bytes())
    for x in preparation["source_files"]:
        assert before["source/"+x["path"]]=={k:x[k] for k in ["bytes","sha256","git_blob","mode","mtime_ns"]}
    for name,value in preparation["original_after"].items():assert before[name]==value
    assert pin((ROOT/"INDEPENDENT-CONTRACT.md").read_bytes())["git_blob"]=="499f3a7e240b3eb14a0b2911b4300ba7b77e95c9"
    argv=[PYTHON,"-I","-B",str(ROOT/"source/install.py"),"--archive",str(ROOT/"originals/RecallWeave-edit-distance-offline.zip"),"--destination",str(TARGET),"--owned-root",str(ROOT)]
    installed=call("new-exclusive-install",argv)
    assert installed["exit"]==0 and not installed["stderr"],installed
    reported=json.loads(installed["stdout"])
    assert reported["installed"]==str(TARGET) and reported["files"]==19 and reported["product_or_browser_invocations"]==0
    first=inventory(TARGET)
    assert len(first)==19 and reported["installed_bytes"]==sum(x["bytes"] for x in first.values())
    marker_bytes=(TARGET/"INSTALLATION.json").read_bytes()
    assert pin(marker_bytes)==reported["marker"]
    marker=json.loads(marker_bytes)
    assert set(first)==set(marker["files"])|{"INSTALLATION.json"}
    for name,value in marker["files"].items():
        assert {k:first[name][k] for k in ["bytes","sha256","git_blob"]}=={k:value[k] for k in ["bytes","sha256","git_blob"]}
        assert first[name]["mode"]==oct(int(value["mode"],8))
    originals=json.loads((ROOT/"ORIGINALS.json").read_bytes())
    for name,value in originals["files"].items():
        assert (TARGET/"app"/name).read_bytes()==value["content"].encode("utf-8")
    assert (TARGET/"recovery/RecallWeave-edit-distance-offline.zip").read_bytes()==(ROOT/"originals/RecallWeave-edit-distance-offline.zip").read_bytes()
    for p in (ROOT/"source").iterdir():assert (TARGET/"recovery/source"/p.name).read_bytes()==p.read_bytes()
    record["installation_report"]=reported
    record["installation_marker"]=pin(marker_bytes)
    record["installed_before_refusal"]=first
    refused=call("existing-installation-refusal",argv)
    assert refused["exit"]==1 and not refused["stdout"],refused
    diagnostic=json.loads(refused["stderr"])
    assert "Destination already exists: "+str(TARGET)==diagnostic["error"]
    after=inventory(TARGET)
    assert after==first
    after_preparation=inventory(ROOT)
    assert after_preparation==before
    record["installed_after_refusal"]=after
    record["preparation_after"]=after_preparation
    record["original_app_files_exact"]=8
    record["installed_files_unchanged_by_refusal"]=19
    record["preparation_files_unchanged"]=len(before)
    record["ordinary_learner_or_notes_invocations"]=0
    record["terminal"]={"passed":True,"author_cases":["exclusive installation","existing-target refusal"],"ordinary_browser_receiving_pending":True}
except Exception as exc:
    status=1
    record["terminal"]={"passed":False,"error_type":type(exc).__name__,"error":str(exc),"product_failure_not_relabelled":True}
finally:
    closure=[]
    for item in record["calls"]:
        p=subprocess.run(["/bin/ps","-p",str(item["pid"]),"-o","pid=,ppid=,pgid=,command="],capture_output=True,text=True,timeout=5)
        closure.append({"pid":item["pid"],"actual_exit":item["exit"],"ps_exit":p.returncode,"stdout":p.stdout,"stderr":p.stderr})
        if p.returncode!=1 or p.stdout.strip():status=1
    record["owned_child_closure"]=closure
    if status and record["terminal"].get("passed"):
        record["terminal"]={"passed":False,"error":"An owned installer child remains visible","prior_cases_preserved":True}
    record["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        guard("before-receipt-retention")
        data=(json.dumps(record,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
        total=record["guards"][-1]["owned_bytes"]
        assert total+len(data)<=CAP
        path=ROOT/"AUTHOR-RECEIPT.json"
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,"wb") as stream:stream.write(data);stream.flush();os.fsync(stream.fileno())
        assert path.read_bytes()==data
        print(json.dumps({"utc":record["finished_utc"],"terminal":record["terminal"],"calls":[{k:x[k] for k in ["name","pid","exit","seconds","timed_out"]} for x in record["calls"]],"receipt":pin(data),"installed_marker":record.get("installation_marker"),"installed_files":len(record.get("installed_after_refusal",{})),"installed_bytes":record.get("installation_report",{}).get("installed_bytes"),"owned_child_closure":closure,"owned_bytes_after_receipt":total+len(data),"learner_browser_invocations":0},separators=(",",":")))
    except Exception as exc:
        status=1
        print(json.dumps({"receipt_retention_error":str(exc),"complete_preserved_record":record},ensure_ascii=False),file=sys.stderr)
raise SystemExit(status)
