import base64, datetime, hashlib, json, os, pathlib, platform, pwd, re, shlex, signal, stat, subprocess, sys, time
AUTHOR=pathlib.Path("/Users/me/Developer/recallweave-lp-local-e3a41d2b3368")
SOURCE=AUTHOR/"source"
EVIDENCE=AUTHOR/"evidence"
INSTALL=pathlib.Path("/Users/me/Applications/RecallWeave-LP-e3a41d2b3368")
CONTROL_SOURCE=AUTHOR/"author-integrity-controls.py"
CONTROL_ROOT=AUTHOR/"author-controls-20261009-v1"
PYTHON="/Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python"
SOURCE_PREPARATION_SHA="a75aef5374a2bbb0e493b7f805a3eaf6e06ce93b537edc40688e196bfea3e7cd"
SOURCE_PREPARATION_BYTES=15542
CONTROL_BYTES=20990
CONTROL_SHA="5fb07172ab8ab0c6da8183c98ac38181c4593f762e2f59bf20a9cfe183987ff3"
CONTROL_GIT="f597c6e7db13c57c72b9527df286ca1a47231fc4"
report={"schema":"recallweave.lp.mac.install-and-author-controls/1","started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"pid":os.getpid(),"writes":[],"errors":[],"installer_invocations":0,"author_control_invocations":0,"desktop_opener_invocations":0,"browser_invocations":0,"children":[]}
child=None
def alarm(signum,frame): raise TimeoutError("45s installation and author-control wall guard")
signal.signal(signal.SIGALRM,alarm)
signal.alarm(15)
def sha(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()
def same_stat(s): return (s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_mode,s.st_uid)
def file_pin(path,max_bytes=2097152):
 p=pathlib.Path(path); before=p.lstat()
 if not stat.S_ISREG(before.st_mode): raise RuntimeError("nonordinary file: "+str(p))
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 with os.fdopen(fd,"rb") as f:
  opened=os.fstat(f.fileno())
  if same_stat(before)!=same_stat(opened): raise RuntimeError("file changed at open")
  b=f.read(max_bytes+1); after=os.fstat(f.fileno())
 if len(b)>max_bytes or same_stat(before)!=same_stat(after) or same_stat(after)!=same_stat(p.lstat()): raise RuntimeError("file changed or too large")
 return {"path":str(p),"resolved":str(p.resolve()),"bytes":len(b),"sha256":sha(b),"gitBlob":blob(b),"mode":stat.S_IMODE(before.st_mode),"uid":before.st_uid,"mtime_ns":before.st_mtime_ns,"device":before.st_dev,"inode":before.st_ino}
def command(argv):
 p=subprocess.run(argv,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=3,check=False)
 if p.returncode or len(p.stdout)>65536 or len(p.stderr)>8192: raise RuntimeError("read command failed: "+repr(argv))
 return p.stdout.decode("utf-8","strict").strip()
def write_new(path,body,mode=0o600):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
 with os.fdopen(fd,"wb") as f:
  f.write(body); f.flush(); os.fchmod(f.fileno(),mode); os.fsync(f.fileno())
 found=file_pin(path)
 if found["bytes"]!=len(body) or found["sha256"]!=sha(body) or found["mode"]!=mode: raise RuntimeError("new write verification failed")
 report["writes"].append(found)
def runtime_match(expected,path=None):
 actual=file_pin(path or expected["path"])
 for key in ("bytes","sha256","mtime_ns","device","inode"):
  if actual[key]!=expected[key]: raise RuntimeError("runtime mismatch "+str(path or expected["path"])+" "+key)
 if actual["resolved"]!=expected["resolved"]: raise RuntimeError("runtime resolution mismatch")
 return actual

def read_exact(path,expected):
 p=file_pin(path)
 for key in ("bytes","sha256","gitBlob"):
  if p[key]!=expected[key]: raise RuntimeError("source identity failed "+str(path)+" "+key)
 return p,pathlib.Path(path).read_bytes()
def gate(label,preparation):
 a=pwd.getpwuid(os.getuid())
 identity={"system":platform.system(),"hostname":platform.node(),"uid":os.getuid(),"euid":os.geteuid(),"account":a.pw_name,"home":a.pw_dir}
 previous=preparation["identity"]
 if any(identity[k]!=previous[k] for k in identity): raise RuntimeError("fresh Mac account differs")
 io=command(["/usr/sbin/ioreg","-rd1","-c","IOPlatformExpertDevice"])
 if re.findall(r'"IOPlatformUUID"\s*=\s*"([^"]+)"',io)!=[previous["uuid"]]: raise RuntimeError("hardware UUID differs")
 identity["uuid"]=previous["uuid"]
 identity["bootSessionUuid"]=command(["/usr/sbin/sysctl","-n","kern.bootsessionuuid"])
 if identity["bootSessionUuid"]!="47865B22-BECE-4090-92BD-88664552E3A6": raise RuntimeError("boot-session UUID differs")
 identity["rawBootTime"]=command(["/usr/sbin/sysctl","-n","kern.boottime"])
 vm=command(["/usr/bin/vm_stat"]); page=re.search(r"page size of (\d+) bytes",vm)
 if not page: raise RuntimeError("memory page size unavailable")
 counts={}
 for name in ("Pages free","Pages inactive","Pages speculative"):
  match=re.search(r"^"+re.escape(name)+r":\s*(\d+)\.",vm,re.M)
  if not match: raise RuntimeError("memory count unavailable")
  counts[name]=int(match.group(1))
 memory=int(page.group(1))*sum(counts.values())
 fs=os.statvfs("/Users/me"); free=fs.f_bavail*fs.f_frsize
 row={"label":label,"at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"identity":identity,"pageBytes":int(page.group(1)),"counts":counts,"memoryFreeInactiveSpeculativeBytes":memory,"diskFreeUserBytes":free,"floors":{"memory":2147483648,"disk":268435456}}
 report.setdefault("admissions",[]).append(row)
 if memory<2147483648 or free<268435456: raise RuntimeError("fresh 2GiB memory or256MiB disk admission refused")
 for expected in preparation["parents"]:
  p=pathlib.Path(expected["path"]); s=p.lstat()
  for ancestor in (p,*p.parents):
   if not stat.S_ISDIR(ancestor.lstat().st_mode): raise RuntimeError("nonordinary ancestor")
  if (s.st_uid,s.st_dev,s.st_ino,oct(stat.S_IMODE(s.st_mode)))!=(expected["uid"],expected["device"],expected["inode"],expected["mode"]): raise RuntimeError("parent identity differs")
 if sys.executable!=PYTHON or not sys.dont_write_bytecode or sys.version_info[:3]!=(3,13,7): raise RuntimeError("executing Python differs")
 return {name:runtime_match(pin) for name,pin in preparation["runtime_after"].items()}
def source_snapshot(preparation):
 out={}
 for name,expected in preparation["source_after"].items():
  actual=file_pin(SOURCE/name)
  if actual!=expected: raise RuntimeError("retained source metadata differs "+name)
  out[name]=actual
 return out
def group_absent(pid):
 try: os.killpg(pid,0); return False
 except ProcessLookupError: return True
def child_run(label,argv,timeout):
 global child
 env=os.environ.copy(); env["PYTHONDONTWRITEBYTECODE"]="1"
 started=time.monotonic()
 child=subprocess.Popen(argv,cwd=SOURCE,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,start_new_session=True)
 row={"label":label,"argv":argv,"pid":child.pid,"started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"timeout_seconds":timeout}
 report["children"].append(row)
 try: stdout,stderr=child.communicate(timeout=timeout)
 except subprocess.TimeoutExpired:
  row["timed_out"]=True
  os.killpg(child.pid,signal.SIGKILL); stdout,stderr=child.communicate(timeout=2)
 row.update({"exit":child.returncode,"wall_seconds":time.monotonic()-started,"stdout_bytes":len(stdout),"stdout_sha256":sha(stdout),"stderr_bytes":len(stderr),"stderr_sha256":sha(stderr),"reaped":child.poll() is not None,"owned_process_group_absent":group_absent(child.pid)})
 if len(stdout)>65536 or len(stderr)>16384: raise RuntimeError("child output bound exceeded")
 row["stdout_utf8"]=stdout.decode("utf-8","strict"); row["stderr_utf8"]=stderr.decode("utf-8","strict")
 write_new(EVIDENCE/(label+".stdout"),stdout)
 write_new(EVIDENCE/(label+".stderr"),stderr)
 if row.get("timed_out") or child.returncode!=0 or not row["owned_process_group_absent"]: raise RuntimeError(label+" did not close successfully")
 return stdout
def installed_snapshot(expected_bodies,expected_modes):
 files={}; directories={}; total=0
 def walk(p,relative):
  nonlocal total
  s=p.lstat()
  if not stat.S_ISDIR(s.st_mode) or s.st_uid!=501 or stat.S_IMODE(s.st_mode)!=0o700: raise RuntimeError("installed directory identity differs")
  directories[relative]={"mode":stat.S_IMODE(s.st_mode),"uid":s.st_uid,"device":s.st_dev,"inode":s.st_ino}
  names=sorted(os.listdir(p))
  if len(names)>20: raise RuntimeError("installed entry bound")
  for name in names:
   path=p/name; rel=(relative+"/"+name).lstrip("./") if relative!="." else name
   ss=path.lstat()
   if stat.S_ISDIR(ss.st_mode):
    if rel not in ("recovery","site","site/courses"): raise RuntimeError("unexpected installed directory")
    walk(path,rel)
   else:
    if rel not in expected_bodies: raise RuntimeError("unexpected installed file "+rel)
    pin=file_pin(path,262144)
    if pin["uid"]!=501 or pin["mode"]!=expected_modes[rel] or pin["bytes"]!=len(expected_bodies[rel]) or pin["sha256"]!=sha(expected_bodies[rel]) or pin["gitBlob"]!=blob(expected_bodies[rel]): raise RuntimeError("installed file differs "+rel)
    files[rel]=pin; total+=pin["bytes"]
 walk(INSTALL,".")
 if set(files)!=set(expected_bodies) or set(directories)!={".","recovery","site","site/courses"} or total>1048576: raise RuntimeError("installed complete inventory differs")
 return {"files":files,"directories":directories,"totalBytes":total}
try:
 preparation_raw=(EVIDENCE/"SOURCE-PREPARATION.json").read_bytes()
 if len(preparation_raw)!=SOURCE_PREPARATION_BYTES or sha(preparation_raw)!=SOURCE_PREPARATION_SHA: raise RuntimeError("source preparation receipt identity differs")
 preparation=json.loads(preparation_raw)
 if preparation["status"]!="source_materialized_and_node_observed": raise RuntimeError("source preparation incomplete")
 report["sourcePreparation"]={"gitBlob":"1445a8f35cf428779599f5013cdb8e096f0e3e00","sha256":SOURCE_PREPARATION_SHA,"bytes":SOURCE_PREPARATION_BYTES}
 report["runtime_before"]=gate("before-positive-installation",preparation)
 report["source_before"]=source_snapshot(preparation)
 for p in (AUTHOR,SOURCE,EVIDENCE):
  s=p.lstat()
  if not stat.S_ISDIR(s.st_mode) or s.st_uid!=501 or stat.S_IMODE(s.st_mode)!=0o700: raise RuntimeError("owned source directory differs")
 pending=[INSTALL,CONTROL_SOURCE,CONTROL_ROOT,EVIDENCE/"install-and-author-controls.py",EVIDENCE/"POSITIVE-INSTALLATION-AND-CONTROLS.json",EVIDENCE/"positive-install.stdout",EVIDENCE/"positive-install.stderr",EVIDENCE/"author-controls.stdout",EVIDENCE/"author-controls.stderr"]
 report["new_destinations"]=[{"path":str(p),"lexists":os.path.lexists(p)} for p in pending]
 if any(p["lexists"] for p in report["new_destinations"]): raise RuntimeError("new installation/controller path already exists")
 controls=sys.argv[2].encode("utf-8")
 if len(controls)!=CONTROL_BYTES or sha(controls)!=CONTROL_SHA or blob(controls)!=CONTROL_GIT: raise RuntimeError("author control source identity differs")
 compile(controls,str(CONTROL_SOURCE),"exec")
 sources={name:(SOURCE/name).read_bytes() for name in preparation["source_after"]}
 for name,raw in sources.items():
  if sha(raw)!=preparation["source_after"][name]["sha256"]: raise RuntimeError("source reread differs")
 carrier=json.loads(sources["LP-ASSETS.json"])
 contract_pin=next(p for p in preparation["writes"] if p["path"]==str(EVIDENCE/"ROOT-CONTRACT.json"))
 _,contract_raw=read_exact(EVIDENCE/"ROOT-CONTRACT.json",contract_pin)
 contract=json.loads(contract_raw)
 original_assets={x["path"]:x for x in contract["assets"]}
 expected_bodies={}; expected_modes={}
 for member in carrier["files"]:
  b=member["utf8"].encode("utf-8"); pin=original_assets[member["path"]]
  if len(b)!=pin["bytes"] or sha(b)!=pin["sha256"] or blob(b)!=pin["gitBlob"]: raise RuntimeError("independent original asset differs")
  expected_bodies["site/"+member["path"]]=b; expected_modes["site/"+member["path"]]=0o644
 if len(expected_bodies)!=3: raise RuntimeError("three exact original assets required")
 for name in ("open.py","README.md","RELEASE.json"):
  expected_bodies[name]=sources[name]; expected_modes[name]=0o644
 for name,raw in sources.items():
  expected_bodies["recovery/"+name]=raw; expected_modes["recovery/"+name]=0o600
 expected_bodies["Open LP Explorer.command"]=sources["Open LP Explorer.command.in"].decode().replace("@@PYTHON@@",shlex.quote(PYTHON)).encode()
 expected_modes["Open LP Explorer.command"]=0o755
 signal.alarm(45)
 write_new(EVIDENCE/"install-and-author-controls.py",sys.argv[1].encode("utf-8"))
 write_new(CONTROL_SOURCE,controls)
 report["installer_invocations"]=1
 stdout=child_run("positive-install",[PYTHON,"-B",str(SOURCE/"install.py"),"--destination",str(INSTALL)],10)
 marker=json.loads(stdout)
 fixed={"schema":"recallweave.lp.local-installation/1","destination":str(INSTALL),"sourceCommit":"b5e46d4f8c3013259c0baa81507652d900cb5074","sourceTree":"988b548df0dee45259e54341b56beba1a054ccc9","releaseSha256":sha(sources["RELEASE.json"]),"payloadSha256":sha(sources["LP-ASSETS.json"]),"python":PYTHON,"pythonVersion":"3.13.7","entryUrl":(INSTALL/"site/courses/linear-programming-explorer.html").as_uri()}
 if any(marker.get(k)!=v for k,v in fixed.items()): raise RuntimeError("positive marker fixed binding differs")
 if marker["files"]!={name:{"bytes":len(body),"sha256":sha(body),"mode":expected_modes[name]} for name,body in expected_bodies.items()}: raise RuntimeError("positive marker file map differs")
 expected_bodies["INSTALLATION.json"]=stdout; expected_modes["INSTALLATION.json"]=0o644
 report["installed_before_controls"]=installed_snapshot(expected_bodies,expected_modes)
 report["installation_marker"]=marker
 report["runtime_before_controls"]=gate("before-author-controls",preparation)
 if report["runtime_before_controls"]!=report["runtime_before"]: raise RuntimeError("runtime metadata changed before controls")
 report["author_control_invocations"]=1
 output=child_run("author-controls",[PYTHON,"-B",str(CONTROL_SOURCE)],25)
 summary=json.loads(output); report["author_controls"]=summary
 if summary.get("passed") is not True or summary.get("inputsUnchanged") is not True or summary.get("genuineInstallationUnchanged") is not True: raise RuntimeError("author controls not passed")
 expected_ids=["A2-tampered-carrier","A3-existing-destination","A4-missing-marker","A6-valid-dispatch-spy","A5-tampered-installed-asset"]
 if summary["completedControlIds"]!=expected_ids: raise RuntimeError("author controls incomplete")
 cr=CONTROL_ROOT/"AUTHOR-CONTROLS.json"; cpin=file_pin(cr,262144)
 if str(cr)!=summary["receipt"]["path"] or cpin["bytes"]!=summary["receipt"]["bytes"] or cpin["sha256"]!=summary["receipt"]["sha256"]: raise RuntimeError("author control receipt mismatch")
 report["author_control_receipt"]=cpin
 report["source_after"]=source_snapshot(preparation)
 report["installed_after"]=installed_snapshot(expected_bodies,expected_modes)
 report["runtime_after"]={name:runtime_match(pin) for name,pin in preparation["runtime_after"].items()}
 if report["source_before"]!=report["source_after"] or report["installed_before_controls"]!=report["installed_after"] or report["runtime_before"]!=report["runtime_after"]: raise RuntimeError("protected source/installation/runtime changed")
 total_owned_bytes=0; owned_file_count=0
 for root in (AUTHOR,INSTALL):
  for directory,dirnames,filenames in os.walk(root,followlinks=False):
   for name in dirnames:
    if not stat.S_ISDIR((pathlib.Path(directory)/name).lstat().st_mode): raise RuntimeError("owned directory is not ordinary")
   for name in filenames:
    pin=file_pin(pathlib.Path(directory)/name,2097152); total_owned_bytes+=pin["bytes"]; owned_file_count+=1
    if owned_file_count>256 or total_owned_bytes>4194304: raise RuntimeError("combined installation/source4MiB or entry cap")
 report["combined_owned_before_final_receipt"]={"bytes":total_owned_bytes,"files":owned_file_count,"limit_bytes":4194304}
 if total_owned_bytes+len(json.dumps(report,ensure_ascii=True,separators=(",",":")).encode())+1024>4194304: raise RuntimeError("final receipt would exceed combined4MiB cap")
 report["status"]="installed_and_five_author_controls_passed"
except BaseException as exc:
 report["status"]="failed"; report["errors"].append(type(exc).__name__+": "+str(exc))
finally:
 signal.alarm(0)
 if child is not None and child.poll() is None:
  try: os.killpg(child.pid,signal.SIGKILL); child.wait(timeout=2)
  except BaseException as exc: report["errors"].append("child cleanup "+type(exc).__name__+": "+str(exc))
  report["cleanup_child_exit"]=child.returncode
 report["finished"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
 output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 try:
  fd=os.open(EVIDENCE/"POSITIVE-INSTALLATION-AND-CONTROLS.json",os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
  with os.fdopen(fd,"wb") as f: f.write(output); f.flush(); os.fchmod(f.fileno(),0o600); os.fsync(f.fileno())
 except BaseException as exc:
  report["receipt_write_error"]=type(exc).__name__+": "+str(exc); report["status"]="failed"
  output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 sys.stdout.buffer.write(output); sys.stdout.flush()
raise SystemExit(0 if report["status"]=="installed_and_five_author_controls_passed" else 3)
