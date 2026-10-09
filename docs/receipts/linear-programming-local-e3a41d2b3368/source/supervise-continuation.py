import datetime, hashlib, json, os, pathlib, platform, pwd, re, signal, stat, subprocess, sys, time
AUTHOR=pathlib.Path("/Users/me/Developer/recallweave-lp-local-e3a41d2b3368")
SOURCE=AUTHOR/"source"
EVIDENCE=AUTHOR/"evidence"
BASE=pathlib.Path("/Users/me/Developer/recallweave-lp-local-receiving-e3a41d2b3368")
CONT=BASE/"continuation-v2"
RUN=CONT/"run-v2"
PROFILE=RUN/"profile"
INSTALL=pathlib.Path("/Users/me/Applications/RecallWeave-LP-e3a41d2b3368")
PYTHON="/Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python"
NODE="/opt/homebrew/Cellar/node/26.3.0/bin/node"
DRIVER_PIN={"bytes":57288,"sha256":"930f1eb5d79bdc01c8d4345822d9318077fdec29cec67f8d918d67a611d5fab3","gitBlob":"0f654871b830adf7e41d4243a9935cf9dd9a0ce7"}
PLAN_PIN={"bytes":24340,"sha256":"2755416f70d8f86ac502334b937fc0ffe9d18054d48eba67bbc9570ff77bd863","gitBlob":"134d66dbf1ceb54b8e87b857b81fc3405ace70c0"}
AMENDMENT_PIN={"bytes":7284,"sha256":"14529b94ea9add891b0afaf06996ca4a126699bb865fba0e9e1b9f732b3f4380","gitBlob":"c4114311d5c5c631d6383c912846e68ea4fe9224"}
FREEZE_PIN={"bytes":12473,"sha256":"e912d4d210e87b2194192ab154fa7dc284df52e2ecdfd00816c75ea5fc672b6e","gitBlob":"dfd2eb3d9dede88fe747ffdb8d2e892ed5c9f6d7"}
PREFIX_PIN={"bytes":4801,"sha256":"b02be8777162afa224b4e793266c6939efe97a5f7e497e023e40c747b45b3942","gitBlob":"75c50d1e72ab98912be376bfa4770bc42e7bf601"}
PRIOR_RECEIPT_PIN={"bytes":60658,"sha256":"3a9ac5b7572389718a5f1b95079585275f9a0edc297652ca692d5e2e63dd6215","gitBlob":"df4aa070aa79b0394b6f8ac84c31ceb681ab3f04"}
PRIOR_SUPERVISOR_PIN={"bytes":32788,"sha256":"3c5981d4515b747c28d84d469b441ea7f5af6c2664cf0a3e6e2e2cbf5a4a4b09","gitBlob":"8430aaf3e29527723b473dca9e01b30110917f9e"}
report={"schema":"recallweave.lp.mac.installed-continuation-supervisor/1","started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"pid":os.getpid(),"writes":[],"errors":[],"receiver_invocations":0,"installer_invocations":0,"author_control_invocations":0,"desktop_opener_invocations":0,"installed_launcher_invocations":0,"prior_epoch_overall":"FAILED; preserved without replay","new_groups_expected":["L2-installed-fractional-use","L3-three-physical-downloads","L4-same-installed-url-reopened","L5-integrity-and-owned-closure"],"cleanup":[]}
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
 for key in ("bytes","sha256","gitBlob","mode","uid","mtime_ns","device","inode"):
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
def prior_snapshot(prior_supervisor,prior_native):
 expected={pathlib.Path(x["path"]):x for x in prior_supervisor["writes"]}
 expected[BASE/"SUPERVISOR-RECEIPT.json"]=PRIOR_SUPERVISOR_PIN
 expected[BASE/"run-v1"/"RECEIPT.json"]=prior_supervisor["receiverReceipt"]
 for x in prior_native["artifactFiles"]:
  rel=pathlib.PurePosixPath(x["path"])
  if rel.is_absolute() or len(rel.parts)!=1 or rel.name in ("profile","tmp"): raise RuntimeError("prior artifact is not immutable top-level evidence")
  expected[BASE/"run-v1"/rel.name]={k:x[k] for k in ("bytes","sha256","gitBlob")}
 result={}
 for path,pin in sorted(expected.items(),key=lambda x:str(x[0])):
  if path.parent not in (BASE,BASE/"run-v1"): raise RuntimeError("prior evidence path outside frozen top-level scope")
  actual=file_pin(path)
  if actual["resolved"]!=str(path) or actual["uid"]!=501 or actual["mode"]!=0o600: raise RuntimeError("prior evidence ordinary identity differs")
  if any(actual[k]!=pin[k] for k in ("bytes","sha256","gitBlob","resolved","mode","uid","mtime_ns","device","inode") if k in pin): raise RuntimeError("prior evidence retained identity differs: "+str(path))
  result[str(path)]=actual
 return result
def bounded_owned_size():
 total=0; count=0
 for directory,dirs,files in os.walk(CONT,followlinks=False):
  dirs[:]=[name for name in dirs if stat.S_ISDIR((pathlib.Path(directory)/name).lstat().st_mode)]
  for name in files:
   p=pathlib.Path(directory)/name
   try: st=p.lstat()
   except FileNotFoundError: continue
   count+=1
   if stat.S_ISREG(st.st_mode): total+=st.st_size
   if count>20000 or total>62914560: raise RuntimeError("continuation60MiB/entry cap")
 return {"continuationBytes":total,"continuationFiles":count,"continuationLimitBytes":62914560,"sealedPriorMeasuredBytes":2890290,"sealedPriorReservedBytes":4194304,"compositeAccountingBytes":4194304+total,"compositeLimitBytes":67108864,"scope":"Fresh metadata census only of continuation-v2, including its staged source, plan, profile, outputs and supervisor. The original closed epoch has a4MiB reservation, based on its sealed2,857,502-byte measure plus32,788-byte final receipt. This is an accounting bound, not a fresh complete original-root census. Original profile/tmp are not read and no symlinks are followed."}
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
 prior_supervisor_raw=(BASE/"SUPERVISOR-RECEIPT.json").read_bytes()
 exact_bytes(prior_supervisor_raw,PRIOR_SUPERVISOR_PIN,"immutable first supervisor receipt")
 prior_supervisor=json.loads(prior_supervisor_raw)
 prior_native_raw=(BASE/"run-v1"/"RECEIPT.json").read_bytes()
 exact_bytes(prior_native_raw,PRIOR_RECEIPT_PIN,"immutable first driver receipt")
 prior_native=json.loads(prior_native_raw)
 if prior_supervisor["status"]!="failed" or prior_supervisor["receiver"]["exit"]!=1 or prior_supervisor["receiver"]["reaped"] is not True or prior_supervisor["receiver"]["ownedNodeGroupAbsent"] is not True: raise RuntimeError("first epoch disposition or Node closure differs")
 if prior_supervisor["finalNativeCensus"]["entries"] or prior_native["terminal"]["passed"] is not False or prior_native["processCensus"][-1]["entries"]: raise RuntimeError("first epoch failure/owned closure differs")
 if len(prior_native["groups"])!=1 or prior_native["groups"][0]["id"]!="L1-installed-shebang" or prior_native["groups"][0]["passed"] is not True: raise RuntimeError("original actual L1 evidence differs")
 for name in ("runtime","source","installed"):
  if prior_supervisor[name+"_before"]!=prior_supervisor[name+"_after"]: raise RuntimeError("sealed first supervisor conservation differs")
 if prior_supervisor["wholeReceiverBeforeFinalReceipt"]["bytes"]+len(prior_supervisor_raw)!=2890290 or 2890290>4194304: raise RuntimeError("sealed first epoch reservation differs")
 for path in (BASE,BASE/"run-v1"):
  st=path.lstat()
  if not stat.S_ISDIR(st.st_mode) or st.st_uid!=501 or stat.S_IMODE(st.st_mode)!=0o700: raise RuntimeError("prior receiving directory identity differs")
 report["prior_before"]=prior_snapshot(prior_supervisor,prior_native)
 report["carriedGroup"]={"id":"L1-installed-shebang","source":"immutable first epoch only","passed":True,"newInvocations":0,"driverReceipt":PRIOR_RECEIPT_PIN,"supervisorReceipt":PRIOR_SUPERVISOR_PIN,"originalOverallPassed":False}
 report["runtime_before"]=gate("before-continuation-staging-and-use",preparation)
 report["source_before"]=source_snapshot(preparation)
 report["installed_before"]=installed_snapshot(positive["installed_after"])
 if os.path.lexists(CONT): raise RuntimeError("new continuation source root already exists; no replay")
 driver=sys.argv[2].encode("utf-8"); plan_bytes=sys.argv[3].encode("utf-8"); freeze_bytes=sys.argv[4].encode("utf-8"); prefix_bytes=sys.argv[5].encode("utf-8")
 exact_bytes(driver,DRIVER_PIN,"reviewed continuation source"); exact_bytes(plan_bytes,PLAN_PIN,"actual-data continuation plan"); exact_bytes(freeze_bytes,FREEZE_PIN,"pre-code unfinished-work freeze"); exact_bytes(prefix_bytes,PREFIX_PIN,"pre-use unique-prefix correction")
 plan=json.loads(plan_bytes)
 if plan["driver"]!=DRIVER_PIN or plan["sourceCommit"]!="b5e46d4f8c3013259c0baa81507652d900cb5074" or plan["bootIdentityAmendment"]!=AMENDMENT_PIN["gitBlob"]: raise RuntimeError("plan independent source identity differs")
 if plan["schema"]!="recallweave.lp.local-continuation-plan/1" or plan["continuationFreeze"]!=FREEZE_PIN["gitBlob"] or plan["continuationFreezeSha256"]!=FREEZE_PIN["sha256"] or plan["prefixAmendment"]!=PREFIX_PIN["gitBlob"] or plan["prefixAmendmentSha256"]!=PREFIX_PIN["sha256"]: raise RuntimeError("plan continuation freeze or prefix correction differs")
 if plan["priorEpoch"]["receipt"]!=PRIOR_RECEIPT_PIN or plan["priorEpoch"]["supervisor"]!=PRIOR_SUPERVISOR_PIN: raise RuntimeError("plan original failed epoch bindings differ")
 if plan["receiving"]["newGroups"]!=report["new_groups_expected"] or plan["receiving"]["inputMethod"]["preset"]["prefix"]!="A fr" or plan["receiving"]["inputMethod"]["vertex"]["prefix"]!="V3" or plan["receiving"]["inputMethod"]["attemptsPerSelect"]!=1 or plan["receiving"]["inputMethod"]["expectedApplyClicks"]!=0 or plan["receiving"]["inputMethod"]["expectedFormSubmits"]!=0: raise RuntimeError("plan fixed continuation input contract differs")
 accounting=plan["outerAccounting"]
 if any(accounting[k]!=v for k,v in {"historicalOriginalMeasuredBytes":2857502,"historicalOriginalFinalSupervisorBytes":32788,"sealedOriginalReservationBytes":4194304,"newContinuationTreeCapBytes":62914560,"compositeCapBytes":67108864}.items()): raise RuntimeError("plan stricter outer accounting differs")
 if len(plan["priorEpoch"]["evidenceFiles"])!=11: raise RuntimeError("plan prior evidence count differs")
 for item in plan["priorEpoch"]["evidenceFiles"]:
  prior_path=str(BASE/item["path"])
  if prior_path not in report["prior_before"] or any(item[k]!=report["prior_before"][prior_path][k] for k in ("bytes","sha256","gitBlob")): raise RuntimeError("plan prior evidence path or identity differs")
 if plan["receiving"]["nativeRoot"]!=str(BASE) or plan["receiving"]["continuationRoot"]!=str(CONT) or plan["receiving"]["runDirectory"]!="run-v2" or plan["receiving"]["driverPath"]!=str(CONT/"receive-local-lp-continuation.mjs") or plan["receiving"]["planPath"]!=str(CONT/"RECEIVING-PLAN.json") or plan["receiving"]["actualEntryFlags"]!=[]: raise RuntimeError("plan continuation-only paths or no-launcher-replay scope differs")
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
 report["sourceInputs"]={"driver":DRIVER_PIN,"plan":PLAN_PIN,"continuationFreeze":FREEZE_PIN,"prefixAmendment":PREFIX_PIN,"identityAmendment":AMENDMENT_PIN,"positiveReceipt":"bfe320148242b80225e639dde2fdd92d32ef88f4","firstDriverReceipt":PRIOR_RECEIPT_PIN,"firstSupervisorReceipt":PRIOR_SUPERVISOR_PIN}
 CONT.mkdir(mode=0o700); created=True
 write_new(CONT/"receive-local-lp-continuation.mjs",driver)
 write_new(CONT/"RECEIVING-PLAN.json",plan_bytes)
 write_new(CONT/"CONTINUATION-FREEZE.json",freeze_bytes)
 write_new(CONT/"PREFIX-AMENDMENT.json",prefix_bytes)
 write_new(CONT/"supervise-continuation.py",sys.argv[1].encode("utf-8"))
 report["staged_before"]={x["path"]:x for x in report["writes"]}
 signal.alarm(145)
 env=os.environ.copy()
 removed=[key for key in ("NODE_OPTIONS","NODE_PATH") if key in env]
 for key in ("NODE_OPTIONS","NODE_PATH"): env.pop(key,None)
 argv=[NODE,str(CONT/"receive-local-lp-continuation.mjs"),"--plan",str(CONT/"RECEIVING-PLAN.json"),"--plan-sha256",PLAN_PIN["sha256"]]
 began=time.monotonic()
 child=subprocess.Popen(argv,cwd=CONT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,start_new_session=True)
 report["receiver_invocations"]=1
 report["receiver"]={"argv":argv,"pid":child.pid,"started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"outerDeadlineSeconds":125,"removedChildEnvironmentKeys":removed}
 try: stdout,stderr=child.communicate(timeout=125)
 except subprocess.TimeoutExpired:
  report["receiver"]["timeout"]=True; close_live_driver("125-second receiver deadline")
  stdout,stderr=child.communicate(timeout=2)
 report["receiver"].update({"exit":child.returncode,"wallSeconds":time.monotonic()-began,"stdoutBytes":len(stdout),"stdoutSha256":sha(stdout),"stderrBytes":len(stderr),"stderrSha256":sha(stderr),"reaped":child.poll() is not None})
 if len(stdout)>262144 or len(stderr)>65536: raise RuntimeError("receiver console output bound exceeded")
 report["receiver"]["stdoutUtf8"]=stdout.decode("utf-8","strict"); report["receiver"]["stderrUtf8"]=stderr.decode("utf-8","strict")
 write_new(CONT/"receiver.stdout",stdout); write_new(CONT/"receiver.stderr",stderr)
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
 report["prior_after"]=prior_snapshot(prior_supervisor,prior_native)
 report["staged_after"]={name:file_pin(name) for name in report["staged_before"]}
 report["receivingAccountingBeforeFinalReceipt"]=bounded_owned_size()
 if child.returncode!=0 or report["receiver"].get("timeout") or not node_group_absent or native["terminal"].get("passed") is not True: raise RuntimeError("native receiving did not pass and close")
 if [x["id"] for x in native["groups"]]!=["L2-installed-fractional-use","L3-three-physical-downloads","L4-same-installed-url-reopened","L5-integrity-and-owned-closure"] or any(x["passed"] is not True for x in native["groups"]): raise RuntimeError("four remaining receiving groups incomplete")
 if native["processCensus"][-1]["entries"] or any(x.get("terminal") is not True for x in native["processes"]): raise RuntimeError("receiver-owned closure incomplete")
 if report["runtime_before"]!=report["runtime_after"] or report["source_before"]!=report["source_after"] or report["installed_before"]!=report["installed_after"] or report["prior_before"]!=report["prior_after"] or report["staged_before"]!=report["staged_after"]: raise RuntimeError("protected source/installation/runtime/prior evidence changed")
 if report["receivingAccountingBeforeFinalReceipt"]["continuationBytes"]+len(json.dumps(report,ensure_ascii=True).encode())+4096>62914560: raise RuntimeError("final supervisor receipt exceeds new60MiB/composite64MiB cap")
 report["status"]="four_remaining_installed_receiving_groups_passed"
except BaseException as exc:
 report["status"]="failed"; report["errors"].append(type(exc).__name__+": "+str(exc))
finally:
 signal.alarm(0)
 close_live_driver("supervisor final closure")
 report["finished"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
 output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 if created:
  try:
   fd=os.open(CONT/"SUPERVISOR-RECEIPT.json",os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,"wb") as f: f.write(output); f.flush(); os.fchmod(f.fileno(),0o600); os.fsync(f.fileno())
  except BaseException as exc:
   report["receiptWriteError"]=type(exc).__name__+": "+str(exc); report["status"]="failed"
   output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 sys.stdout.buffer.write(output); sys.stdout.flush()
raise SystemExit(0 if report["status"]=="four_remaining_installed_receiving_groups_passed" else 3)
