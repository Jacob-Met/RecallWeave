import datetime, hashlib, json, os, pathlib, platform, pwd, re, signal, stat, subprocess, sys, time
AUTHOR=pathlib.Path("/Users/me/Developer/recallweave-lp-local-e3a41d2b3368")
SOURCE=AUTHOR/"source"
EVIDENCE=AUTHOR/"evidence"
BASE=pathlib.Path("/Users/me/Developer/recallweave-lp-local-receiving-e3a41d2b3368")
RUN=BASE/"run-v1"
PROFILE=RUN/"profile"
INSTALL=pathlib.Path("/Users/me/Applications/RecallWeave-LP-e3a41d2b3368")
PYTHON="/Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python"
NODE="/opt/homebrew/Cellar/node/26.3.0/bin/node"
DRIVER_PIN={"bytes":47322,"sha256":"e8b0119f8834ce36ee57afae4103b0f0a569bbe354daa00f3b2e938d488a50e2","gitBlob":"77f12825b480ed98a131f7430a483e6d147898bc"}
PLAN_PIN={"bytes":16446,"sha256":"5d219ad7f7a7a22aae7bbc8792bf0cc3b07f77533e1341a552c412e28cd56f73","gitBlob":"0fa25ecd260bbffb80d2e7ee55d27ea8c062a3e8"}
AMENDMENT_PIN={"bytes":7284,"sha256":"14529b94ea9add891b0afaf06996ca4a126699bb865fba0e9e1b9f732b3f4380","gitBlob":"c4114311d5c5c631d6383c912846e68ea4fe9224"}
report={"schema":"recallweave.lp.mac.installed-receiving-supervisor/1","started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"pid":os.getpid(),"writes":[],"errors":[],"receiver_invocations":0,"installer_invocations":0,"author_control_invocations":0,"desktop_opener_invocations":0,"cleanup":[]}
child=None
created=False
def alarm(signum,frame): raise TimeoutError("bounded receiver preparation/supervision deadline")
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

def exact_bytes(body,pin,label):
 if len(body)!=pin["bytes"] or sha(body)!=pin["sha256"] or blob(body)!=pin["gitBlob"]: raise RuntimeError(label+" exact identity differs")
def installed_snapshot(previous):
 out={}
 for name,pin in previous["files"].items():
  actual=file_pin(INSTALL/name,262144)
  if actual!=pin: raise RuntimeError("genuine installed file identity differs "+name)
  out[name]=actual
 return out
def bounded_owned_size():
 total=0; count=0
 for directory,dirs,files in os.walk(BASE,followlinks=False):
  dirs[:]=[name for name in dirs if stat.S_ISDIR((pathlib.Path(directory)/name).lstat().st_mode)]
  for name in files:
   p=pathlib.Path(directory)/name
   try: s=p.lstat()
   except FileNotFoundError: continue
   count+=1
   if stat.S_ISREG(s.st_mode): total+=s.st_size
   if count>20000 or total>67108864: raise RuntimeError("whole receiver64MiB/entry cap")
 return {"bytes":total,"files":count,"limitBytes":67108864,"scope":"Entire new receiving root, including staged source, plan, private profile, outputs and supervisor files; symlinks never followed."}
def close_live_driver(reason):
 if child is None or child.poll() is not None: return
 env=os.environ.copy(); env.update({"COMMAND_MODE":"unix2003","LC_ALL":"C"})
 observation={"reason":reason,"nodePid":child.pid,"directChildren":[]}
 try:
  p=subprocess.run(["/usr/bin/pgrep","-P",str(child.pid)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=2,check=False)
  if p.returncode not in (0,1) or p.stderr or len(p.stdout)>8192: raise RuntimeError("scoped direct-child query failed")
  ids=[int(x) for x in p.stdout.splitlines() if x.strip()]
  if len(ids)>32: raise RuntimeError("scoped direct-child count bound")
  if ids:
   ps=subprocess.run(["/bin/ps","-ww","-p",",".join(map(str,ids)),"-o","pid=,ppid=,pgid=,uid=,command="],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=2,check=False)
   if ps.returncode not in (0,1) or ps.stderr or len(ps.stdout)>65536: raise RuntimeError("scoped own-child metadata failed")
   for line in ps.stdout.decode("utf-8","strict").splitlines():
    m=re.fullmatch(r"\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.*)",line)
    if not m: raise RuntimeError("scoped own-child row malformed")
    pid,ppid,pgid,uid=map(int,m.groups()[:4]); command_text=m.group(5)
    rec={"pid":pid,"ppid":ppid,"pgid":pgid,"uid":uid,"command":command_text,"signaled":False}
    if pid in ids and ppid==child.pid and uid==501 and pgid==pid and ("--user-data-dir="+str(PROFILE) in command_text or str(INSTALL/"open.py") in command_text or str(INSTALL/"Open LP Explorer.command") in command_text):
     try: os.killpg(pgid,signal.SIGTERM); rec["signaled"]="SIGTERM"
     except ProcessLookupError: rec["alreadyAbsent"]=True
    observation["directChildren"].append(rec)
 except BaseException as exc: observation["queryError"]=type(exc).__name__+": "+str(exc)
 report["cleanup"].append(observation)
 try: os.killpg(child.pid,signal.SIGTERM)
 except ProcessLookupError: pass
 try: child.wait(timeout=3)
 except subprocess.TimeoutExpired:
  os.killpg(child.pid,signal.SIGKILL); child.wait(timeout=2)
 report["cleanup"].append({"scope":"exact receiver-created Node group","pid":child.pid,"terminalExit":child.returncode,"reason":reason})
try:
 prep_raw=(EVIDENCE/"SOURCE-PREPARATION.json").read_bytes()
 exact_bytes(prep_raw,{"bytes":15542,"sha256":"a75aef5374a2bbb0e493b7f805a3eaf6e06ce93b537edc40688e196bfea3e7cd","gitBlob":"1445a8f35cf428779599f5013cdb8e096f0e3e00"},"source preparation")
 preparation=json.loads(prep_raw)
 positive_raw=(EVIDENCE/"POSITIVE-INSTALLATION-AND-CONTROLS.json").read_bytes()
 exact_bytes(positive_raw,{"bytes":36978,"sha256":"72d0c20ad9b34c5f343b76aa9490fe3dbed35493fe4049f9fd3b5108888a9d6a","gitBlob":"bfe320148242b80225e639dde2fdd92d32ef88f4"},"positive native receipt")
 positive=json.loads(positive_raw)
 if positive["status"]!="installed_and_five_author_controls_passed": raise RuntimeError("positive installation not qualified")
 report["runtime_before"]=gate("before-receiver-staging-and-use",preparation)
 report["source_before"]=source_snapshot(preparation)
 report["installed_before"]=installed_snapshot(positive["installed_after"])
 if os.path.lexists(BASE): raise RuntimeError("new receiving root already exists; no replay")
 driver=sys.argv[2].encode("utf-8"); plan_bytes=sys.argv[3].encode("utf-8"); amendment=sys.argv[4].encode("utf-8")
 exact_bytes(driver,DRIVER_PIN,"independently reviewed receiving source"); exact_bytes(plan_bytes,PLAN_PIN,"actual-data receiving plan"); exact_bytes(amendment,AMENDMENT_PIN,"pre-use identity amendment")
 plan=json.loads(plan_bytes)
 if plan["driver"]!=DRIVER_PIN or plan["sourceCommit"]!="b5e46d4f8c3013259c0baa81507652d900cb5074" or plan["bootIdentityAmendment"]!=AMENDMENT_PIN["gitBlob"]: raise RuntimeError("plan independent source identity differs")
 expected={name:{key:p[key] for key in ("bytes","sha256","gitBlob","mode")} for name,p in positive["installed_after"]["files"].items()}
 proposed={x["path"]:{k:x[k] for k in ("bytes","sha256","gitBlob","mode")} for x in plan["installedFiles"]}
 if len(plan["installedFiles"])!=14 or proposed!=expected: raise RuntimeError("plan does not bind genuine fourteen-file installed inventory")
 if len(plan["retainedInputs"])!=6 or {x["path"] for x in plan["retainedInputs"]}!={str(SOURCE/name) for name in preparation["source_after"]}: raise RuntimeError("plan six source paths differ")
 for item in plan["retainedInputs"]:
  p=file_pin(item["path"],1048576)
  for key in ("bytes","sha256","gitBlob"):
   if p[key]!=item[key]: raise RuntimeError("plan retained input differs")
 if plan["runtime"]["node"]["version"]!="v26.3.0" or plan["runtime"]["chrome"]["version"]!="154.0.8037.99": raise RuntimeError("plan runtime expectation differs")
 for name,original in (("node","node"),("python","python"),("chrome","chrome"),("chromePlist","chrome_info_plist")):
  pin=plan["runtime"][name]; observed=preparation["runtime_after"][original]
  for key in ("path","bytes","sha256","gitBlob"):
   if pin[key]!=observed[key]: raise RuntimeError("plan runtime file differs")
 report["sourceInputs"]={"driver":DRIVER_PIN,"plan":PLAN_PIN,"identityAmendment":AMENDMENT_PIN,"positiveReceipt":"bfe320148242b80225e639dde2fdd92d32ef88f4"}
 BASE.mkdir(mode=0o700); created=True
 write_new(BASE/"receive-local-lp.mjs",driver)
 write_new(BASE/"RECEIVING-PLAN.json",plan_bytes)
 write_new(BASE/"BOOT-IDENTITY-AMENDMENT.json",amendment)
 write_new(BASE/"supervise-receiving.py",sys.argv[1].encode("utf-8"))
 signal.alarm(145)
 env=os.environ.copy()
 removed=[key for key in ("NODE_OPTIONS","NODE_PATH") if key in env]
 for key in ("NODE_OPTIONS","NODE_PATH"): env.pop(key,None)
 argv=[NODE,str(BASE/"receive-local-lp.mjs"),"--plan",str(BASE/"RECEIVING-PLAN.json"),"--plan-sha256",PLAN_PIN["sha256"]]
 began=time.monotonic()
 child=subprocess.Popen(argv,cwd=BASE,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,start_new_session=True)
 report["receiver_invocations"]=1
 report["receiver"]={"argv":argv,"pid":child.pid,"started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"outerDeadlineSeconds":125,"removedChildEnvironmentKeys":removed}
 try: stdout,stderr=child.communicate(timeout=125)
 except subprocess.TimeoutExpired:
  report["receiver"]["timeout"]=True; close_live_driver("125-second receiver deadline")
  stdout,stderr=child.communicate(timeout=2)
 report["receiver"].update({"exit":child.returncode,"wallSeconds":time.monotonic()-began,"stdoutBytes":len(stdout),"stdoutSha256":sha(stdout),"stderrBytes":len(stderr),"stderrSha256":sha(stderr),"reaped":child.poll() is not None})
 if len(stdout)>262144 or len(stderr)>65536: raise RuntimeError("receiver console output bound exceeded")
 report["receiver"]["stdoutUtf8"]=stdout.decode("utf-8","strict"); report["receiver"]["stderrUtf8"]=stderr.decode("utf-8","strict")
 write_new(BASE/"receiver.stdout",stdout); write_new(BASE/"receiver.stderr",stderr)
 try: os.killpg(child.pid,0); node_group_absent=False
 except ProcessLookupError: node_group_absent=True
 report["receiver"]["ownedNodeGroupAbsent"]=node_group_absent
 rpin=file_pin(RUN/"RECEIPT.json",2097152)
 native=json.loads((RUN/"RECEIPT.json").read_bytes())
 report["receiverReceipt"]=rpin
 report["receiverTerminal"]=native["terminal"]
 report["groups"]=[{"id":x["id"],"passed":x["passed"]} for x in native["groups"]]
 report["nativeProcesses"]=native["processes"]
 report["finalNativeCensus"]=native["processCensus"][-1] if native["processCensus"] else None
 report["downloads"]=[{k:x[k] for k in ("role","suggestedName","nativePath","bytes","sha256","gitBlob")} for x in native["downloadArtifacts"]]
 report["captures"]=native["captures"]
 report["runtime_after"]={name:runtime_match(pin) for name,pin in preparation["runtime_after"].items()}
 report["source_after"]=source_snapshot(preparation)
 report["installed_after"]=installed_snapshot(positive["installed_after"])
 report["wholeReceiverBeforeFinalReceipt"]=bounded_owned_size()
 if child.returncode!=0 or report["receiver"].get("timeout") or not node_group_absent or native["terminal"].get("passed") is not True: raise RuntimeError("native receiving did not pass and close")
 if [x["id"] for x in native["groups"]]!=["L1-installed-shebang","L2-installed-fractional-use","L3-three-physical-downloads","L4-same-installed-url-reopened","L5-integrity-and-owned-closure"] or any(x["passed"] is not True for x in native["groups"]): raise RuntimeError("five receiving groups incomplete")
 if native["processCensus"][-1]["entries"] or any(x.get("terminal") is not True for x in native["processes"]): raise RuntimeError("receiver-owned closure incomplete")
 if report["runtime_before"]!=report["runtime_after"] or report["source_before"]!=report["source_after"] or report["installed_before"]!=report["installed_after"]: raise RuntimeError("protected source/installation/runtime changed")
 if report["wholeReceiverBeforeFinalReceipt"]["bytes"]+len(json.dumps(report,ensure_ascii=True).encode())+4096>67108864: raise RuntimeError("final supervisor receipt exceeds whole64MiB cap")
 report["status"]="five_installed_receiving_groups_passed"
except BaseException as exc:
 report["status"]="failed"; report["errors"].append(type(exc).__name__+": "+str(exc))
finally:
 signal.alarm(0)
 close_live_driver("supervisor final closure")
 report["finished"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
 output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 if created:
  try:
   fd=os.open(BASE/"SUPERVISOR-RECEIPT.json",os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,"wb") as f: f.write(output); f.flush(); os.fchmod(f.fileno(),0o600); os.fsync(f.fileno())
  except BaseException as exc:
   report["receiptWriteError"]=type(exc).__name__+": "+str(exc); report["status"]="failed"
   output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 sys.stdout.buffer.write(output); sys.stdout.flush()
raise SystemExit(0 if report["status"]=="five_installed_receiving_groups_passed" else 3)
