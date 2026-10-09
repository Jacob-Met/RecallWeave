import base64, datetime, hashlib, json, os, pathlib, platform, pwd, re, signal, stat, subprocess, sys, time, zlib
AUTHOR=pathlib.Path("/Users/me/Developer/recallweave-lp-local-e3a41d2b3368")
INSTALL=pathlib.Path("/Users/me/Applications/RecallWeave-LP-e3a41d2b3368")
RECEIVE=pathlib.Path("/Users/me/Developer/recallweave-lp-local-receiving-e3a41d2b3368")
EXPECTED_BYTES=147785
EXPECTED_SHA="ba2f48790745aa2e04ee64c772270f5fb141c5b2af49426856793f84ba435b8a"
NAMES=("install.py","open.py","Open LP Explorer.command.in","README.md","LP-ASSETS.json","RELEASE.json")
EVIDENCE=("ROOT-CONTRACT.json","INDEPENDENT-EXPECTATIONS.json","SOURCE-INDEX.json","ORIGINAL-READ-ADMISSION.json")
report={"schema":"recallweave.lp.mac.source-placement-result/1","started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"pid":os.getpid(),"writes":[],"browser_invocations":0,"installer_invocations":0,"node_invocations":0,"syntax_compilations":[],"errors":[]}
child=None
def alarm(signum,frame): raise TimeoutError("15s source-placement guard")
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
try:
 fragments=json.loads(sys.argv[2])
 if type(fragments) is not list or len(fragments)!=7: raise RuntimeError("fragment count")
 parts=[]
 for i,f in enumerate(fragments):
  if f["index"]!=i or type(f["bytes"]) is not int or not 0<f["bytes"]<=23000 or len(f["zlibBase64"])>32000: raise RuntimeError("fragment shape")
  compressed=base64.b64decode(f["zlibBase64"],validate=True)
  decompressor=zlib.decompressobj()
  b=decompressor.decompress(compressed,f["bytes"]+1)
  if len(b)!=f["bytes"] or not decompressor.eof or decompressor.unused_data or decompressor.unconsumed_tail or sha(b)!=f["sha256"]: raise RuntimeError("fragment identity")
  parts.append(b)
 packet_bytes=b"".join(parts)
 if len(packet_bytes)!=EXPECTED_BYTES or sha(packet_bytes)!=EXPECTED_SHA: raise RuntimeError("complete packet identity")
 packet=json.loads(packet_bytes)
 if set(packet)!={"schema","files","pins","evidence"} or packet["schema"]!="recallweave.lp.mac.source-placement/1": raise RuntimeError("packet schema")
 if set(packet["files"])!=set(NAMES) or set(packet["evidence"])!=set(EVIDENCE): raise RuntimeError("packet file set")
 pins={p["path"]:p for p in packet["pins"]}
 if len(packet["pins"])!=6 or set(pins)!=set(NAMES): raise RuntimeError("source pin set")
 bodies={}
 for name in NAMES:
  b=packet["files"][name].encode("utf-8"); p=pins[name]
  if len(b)!=p["bytes"] or sha(b)!=p["sha256"] or blob(b)!=p["gitBlob"]: raise RuntimeError("source pin failed: "+name)
  bodies[name]=b
 evidence={name:packet["evidence"][name].encode("utf-8") for name in EVIDENCE}
 index=json.loads(evidence["SOURCE-INDEX.json"])
 if index["files"]!=packet["pins"] or index["productCommit"]!="b5e46d4f8c3013259c0baa81507652d900cb5074": raise RuntimeError("source index disagreement")
 expected_evidence={
  "ROOT-CONTRACT.json":(5037,"369715075ce9c14f067388a64af7d928694e995c61b8c2545bd4c10494742b85","6179d7bfea80fed5201b19c1a575cc27fcbef7d8"),
  "INDEPENDENT-EXPECTATIONS.json":(18569,"b894b230a64638aa9cf6f324ded29afebdb60ca3d26896f4e90e3a952e35e56e","66d4e6a9d3a2f12507aff55de865617b43c647e0")}
 for name,(size,digest,git) in expected_evidence.items():
  if len(evidence[name])!=size or sha(evidence[name])!=digest or blob(evidence[name])!=git: raise RuntimeError("frozen evidence identity: "+name)
 stable_bytes=sys.argv[3].encode("utf-8")
 refusal_bytes=sys.argv[4].encode("utf-8")
 if len(stable_bytes)!=3433 or sha(stable_bytes)!="3615bdabc08dcac92c7c195c422d4972138d2f570903b3f5fbbe24932fb2e8c9" or len(refusal_bytes)!=578 or sha(refusal_bytes)!="849e621965c82fa254112ea0af395cab303951664e76f3d79fb36884924afb2e": raise RuntimeError("stable identity or original refusal evidence mismatch")
 stable_read=json.loads(stable_bytes)
 first_refusal=json.loads(refusal_bytes)
 prior=json.loads(evidence["ORIGINAL-READ-ADMISSION.json"])
 if prior["status"]!="read_admitted": raise RuntimeError("original admission not admitted")
 account=pwd.getpwuid(os.getuid())
 identity={"system":platform.system(),"hostname":platform.node(),"uid":os.getuid(),"euid":os.geteuid(),"account":account.pw_name,"home":account.pw_dir}
 identity["boot"]=command(["/usr/sbin/sysctl","-n","kern.boottime"])
 io=command(["/usr/sbin/ioreg","-rd1","-c","IOPlatformExpertDevice"])
 uuids=re.findall(r'"IOPlatformUUID"\s*=\s*"([^"]+)"',io)
 if len(uuids)!=1: raise RuntimeError("platform UUID unavailable")
 identity["uuid"]=uuids[0]; report["identity"]=identity
 identity["bootSessionUuid"]=command(["/usr/sbin/sysctl","-n","kern.bootsessionuuid"])
 if identity["bootSessionUuid"]!="47865B22-BECE-4090-92BD-88664552E3A6" or identity["bootSessionUuid"]!=stable_read["identity"]["bootSessionUuid"]: raise RuntimeError("fresh boot-session UUID differs from stable admission")
 if any(identity[k]!=v for k,v in prior["identity"].items() if k!="boot"): raise RuntimeError("fresh hardware or account identity differs from admitted Mac")
 report["boot_identity_amendment"]={"stable_read_started":stable_read["started"],"stable_read_sha256":sha(stable_bytes),"first_refused_pid":first_refusal["pid"],"first_refusal_sha256":sha(refusal_bytes),"original_raw_boottime":prior["identity"]["boot"],"first_refusal_raw_boottime":first_refusal["identity"]["boot"],"fresh_raw_boottime":identity["boot"],"stable_boot_session_uuid":identity["bootSessionUuid"],"original_materializer_git_blob":"bc2616e3debf854c272e032c2c0e8855b07ff0f2","reason":"XNU calendar time changes may adjust boottime; use fresh read-only kern.bootsessionuuid as the session identity. No claim about the cause of the earlier microsecond difference or retrospective same-session proof."}
 raw=command(["/usr/bin/vm_stat"])
 page=re.search(r"page size of (\d+) bytes",raw)
 if not page: raise RuntimeError("memory page size unavailable")
 counts={}
 for name in ("Pages free","Pages inactive","Pages speculative"):
  match=re.search(r"^"+re.escape(name)+r":\s*(\d+)\.",raw,re.M)
  if not match: raise RuntimeError("memory count unavailable")
  counts[name]=int(match.group(1))
 memory=int(page.group(1))*sum(counts.values())
 report["memory"]={"page_bytes":int(page.group(1)),"counts":counts,"free_inactive_speculative_bytes":memory,"floor":2147483648}
 if memory<2147483648: raise RuntimeError("2GiB memory admission refused")
 report["parents"]=[]
 for expected in prior["parents"]:
  path=pathlib.Path(expected["path"])
  for parent in (path,*path.parents):
   if not stat.S_ISDIR(parent.lstat().st_mode): raise RuntimeError("nonordinary destination ancestor")
  s=path.lstat(); fs=os.statvfs(path); free=fs.f_bavail*fs.f_frsize
  actual={"path":str(path),"mode":oct(stat.S_IMODE(s.st_mode)),"uid":s.st_uid,"device":s.st_dev,"inode":s.st_ino,"disk_free_user_bytes":free}
  report["parents"].append(actual)
  if any(actual[k]!=expected[k] for k in ("path","mode","uid","device","inode")) or free<268435456: raise RuntimeError("parent identity or 256MiB disk admission refused")
 report["destinations"]=[{"path":str(p),"lexists":os.path.lexists(p)} for p in (AUTHOR,INSTALL,RECEIVE)]
 if any(x["lexists"] for x in report["destinations"]): raise RuntimeError("new path already exists")
 if not sys.dont_write_bytecode or sys.executable!=prior["python"]["executable"]["path"] or sys.version!=prior["python"]["version"]: raise RuntimeError("Python process mismatch")
 report["runtime_before"]={
  "python":runtime_match(prior["python"]["executable"]),
  "chrome":runtime_match(prior["chrome"]),
  "chrome_info_plist":runtime_match(prior["chrome"]["info_plist"]),
  "node":runtime_match(prior["node"]["pin"],prior["node"]["pin"]["resolved"])}
 for name in ("install.py","open.py"):
  compile(bodies[name],str(AUTHOR/"source"/name),"exec")
  report["syntax_compilations"].append({"path":str(AUTHOR/"source"/name),"sha256":sha(bodies[name]),"executed":False,"pythonVersion":sys.version})
 planned_bytes=sum(map(len,bodies.values()))+sum(map(len,evidence.values()))+len(packet_bytes)+len(sys.argv[1].encode("utf-8"))+len(stable_bytes)+len(refusal_bytes)
 report["planned_file_bytes"]=planned_bytes
 if planned_bytes>1048576: raise RuntimeError("source placement exceeds reserved1MiB of4MiB combined cap")
 AUTHOR.mkdir(mode=0o700)
 (AUTHOR/"source").mkdir(mode=0o700)
 (AUTHOR/"evidence").mkdir(mode=0o700)
 for name in NAMES: write_new(AUTHOR/"source"/name,bodies[name])
 for name in EVIDENCE: write_new(AUTHOR/"evidence"/name,evidence[name])
 write_new(AUTHOR/"evidence"/"MATERIALIZATION-PACKET.json",packet_bytes)
 write_new(AUTHOR/"evidence"/"materialize-source.py",sys.argv[1].encode("utf-8"))
 write_new(AUTHOR/"evidence"/"BOOT-SESSION-READ.json",stable_bytes)
 write_new(AUTHOR/"evidence"/"SOURCE-PLACEMENT-REFUSAL.json",refusal_bytes)
 report["transport_preparation"]={"earlier_local_status":"exec-server rejected overlong argv before creating process","recovery":"Seven independently compressed bounded fragments, complete reconstruction verified before native source validation","complete_packet_sha256":EXPECTED_SHA,"source_or_product_change":False}
 env=os.environ.copy()
 removed=[key for key in ("NODE_OPTIONS","NODE_PATH") if key in env]
 for key in ("NODE_OPTIONS","NODE_PATH"): env.pop(key,None)
 argv=[prior["node"]["pin"]["resolved"],"-e","process.stdout.write(JSON.stringify({version:process.version,webSocket:typeof WebSocket,execPath:process.execPath})+'\\n')"]
 started=time.monotonic()
 child=subprocess.Popen(argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,start_new_session=True)
 report["node_invocations"]=1
 report["node_probe"]={"argv":argv,"pid":child.pid,"removed_child_environment_keys":removed}
 try:
  stdout,stderr=child.communicate(timeout=4)
 except subprocess.TimeoutExpired:
  os.killpg(child.pid,signal.SIGKILL); stdout,stderr=child.communicate(timeout=2)
  report["node_probe"].update({"timeout":True,"exit":child.returncode,"stdout_base64":base64.b64encode(stdout).decode(),"stderr_base64":base64.b64encode(stderr).decode()})
  raise RuntimeError("Node probe timed out")
 report["node_probe"].update({"exit":child.returncode,"wall_seconds":time.monotonic()-started,"stdout_utf8":stdout.decode("utf-8","strict"),"stderr_utf8":stderr.decode("utf-8","strict"),"stdout_bytes":len(stdout),"stdout_sha256":sha(stdout),"stderr_bytes":len(stderr),"stderr_sha256":sha(stderr),"reaped":child.poll() is not None})
 if child.returncode!=0 or len(stdout)>4096 or len(stderr)>8192: raise RuntimeError("Node probe failed")
 observed=json.loads(stdout)
 report["node_probe"]["observed"]=observed
 if observed["execPath"]!=prior["node"]["pin"]["resolved"] or observed["webSocket"]!="function": raise RuntimeError("Node runtime does not supply required existing WebSocket")
 try:
  os.killpg(child.pid,0); report["node_probe"]["owned_process_group_absent"]=False
 except ProcessLookupError: report["node_probe"]["owned_process_group_absent"]=True
 if not report["node_probe"]["owned_process_group_absent"]: raise RuntimeError("owned Node group remains")
 report["runtime_after"]={
  "python":runtime_match(prior["python"]["executable"]),
  "chrome":runtime_match(prior["chrome"]),
  "chrome_info_plist":runtime_match(prior["chrome"]["info_plist"]),
  "node":runtime_match(prior["node"]["pin"],prior["node"]["pin"]["resolved"])}
 if report["runtime_before"]!=report["runtime_after"]: raise RuntimeError("runtime metadata changed")
 report["source_after"]={name:file_pin(AUTHOR/"source"/name) for name in NAMES}
 if os.path.lexists(INSTALL) or os.path.lexists(RECEIVE): raise RuntimeError("unexpected target creation")
 report["status"]="source_materialized_and_node_observed"
except BaseException as exc:
 report["status"]="failed"
 report["errors"].append(type(exc).__name__+": "+str(exc))
finally:
 signal.alarm(0)
 if child is not None and child.poll() is None:
  try: os.killpg(child.pid,signal.SIGKILL); child.wait(timeout=2)
  except BaseException as exc: report["errors"].append("child cleanup "+type(exc).__name__+": "+str(exc))
  report["node_cleanup_exit"]=child.returncode
 report["finished"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
 output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 if (AUTHOR/"evidence").is_dir():
  try:
   fd=os.open(AUTHOR/"evidence"/"SOURCE-PREPARATION.json",os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,"wb") as f: f.write(output); f.flush(); os.fchmod(f.fileno(),0o600); os.fsync(f.fileno())
  except BaseException as exc:
   report["receipt_write_error"]=type(exc).__name__+": "+str(exc); report["status"]="failed"
   output=(json.dumps(report,ensure_ascii=True,separators=(",",":"))+"\n").encode()
 sys.stdout.buffer.write(output); sys.stdout.flush()
raise SystemExit(0 if report["status"]=="source_materialized_and_node_observed" else 3)
