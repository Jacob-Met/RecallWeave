import base64,gzip,hashlib,json,os,pathlib,platform,shutil,signal,stat as statmod,subprocess,sys,termios,time
old=termios.tcgetattr(0);quiet=termios.tcgetattr(0);quiet[3]&=~termios.ECHO;termios.tcsetattr(0,termios.TCSANOW,quiet)
print("RECALL_ZIP_USE_READY",flush=True)
parts=[];transport_chars=0
while True:
    line=sys.stdin.readline()
    if not line:raise RuntimeError("EOF before payload")
    if line.rstrip("\r\n")=="RECALL_ZIP_USE_END":break
    piece=line.rstrip("\r\n");transport_chars+=len(piece)
    assert transport_chars<=2097152,"Payload transport exceeds 2MiB"
    parts.append(piece)
raw_payload="".join(parts);payload=json.loads(raw_payload);del parts
def pin(raw):
    return {"bytes":len(raw),"sha":hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest(),"sha256":hashlib.sha256(raw).hexdigest()}
def decode(row):
    assert row["encoding"] in ("utf-8","base64")
    return row["content"].encode("utf-8") if row["encoding"]=="utf-8" else base64.b64decode(row["content"],validate=True)
def require_pin(raw,expected):
    actual=pin(raw);assert actual=={k:expected[k] for k in actual},(actual,expected);return actual
def describe(value):
    if isinstance(value,(bytes,bytearray)):return {"binary_value_pin":pin(bytes(value))}
    if isinstance(value,dict):return {str(k):describe(v) for k,v in value.items()}
    if isinstance(value,(tuple,list)):return [describe(v) for v in value]
    if isinstance(value,pathlib.Path):return str(value)
    if value is None or isinstance(value,(str,int,float,bool)):return value
    raise TypeError("Unsupported receipt value: "+type(value).__name__)
def create_bytes(path,raw,mode=0o600):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
    try:
        with os.fdopen(fd,"wb") as stream:stream.write(raw);stream.flush();os.fsync(stream.fileno())
    except BaseException:raise
    assert pathlib.Path(path).read_bytes()==raw
def create_json(path,value):
    create_bytes(path,(json.dumps(describe(value),sort_keys=True,indent=2)+"\n").encode())
payload_pin=pin(raw_payload.encode())
assert len(sys.argv)==2 and payload_pin["sha"]==sys.argv[1],payload_pin
assert payload["schema"]=="recall.original-offline-zip-native-payload.v1"
assert payload["product_source_changes"] is False and payload["historical_browser_groups_replayed"] is False
carrier=decode(payload["archive_carrier"])
assert require_pin(carrier,payload["archive_carrier"])=={"bytes":71380,"sha":"0f984d3f82104f4a309b1a17b908b159477c93e9","sha256":"48a772124737ebe5ff2eab773e6e6b10da2675619bbff0c05173f8598a0667fa"}
original_zip=base64.b64decode(carrier,validate=True)
zip_pin=require_pin(original_zip,payload["original_zip"])
assert zip_pin=={"bytes":53535,"sha":"ae0f3ed4e067fd527b1db7e103270419242db0c2","sha256":"a86d823d70be98d08fd804ce9d8bccdb071b586adf5c30c0784a96a5db2a03e9"}
source_rows=payload["receiver_sources"]
assert [r["path"] for r in source_rows]==["archive-admission.py","receive-extracted.mjs"]
source_pins=[{"path":r["path"],**require_pin(decode(r),r)} for r in source_rows]
source_capsule_pin=require_pin(decode(payload["source_capsule"]),payload["source_capsule"])
extractor_text=decode(source_rows[0]).decode("utf-8");driver_text=decode(source_rows[1]).decode("utf-8")
source_capsule=json.loads(decode(payload["source_capsule"]))
assert source_capsule["schema"]=="recallweave-original-zip-receiver-source/v1"
assert source_capsule["archive_base64"].encode("ascii")==carrier
assert extractor_text==source_capsule["files"]["archive_admission.py"]
inverse_driver=driver_text
for adaptation in reversed(payload["receiver_adaptations"]):
    assert adaptation["kind"] in ("evidence-ownership","factory-node-path-admission")
    assert inverse_driver.count(adaptation["after"])==1
    inverse_driver=inverse_driver.replace(adaptation["after"],adaptation["before"])
assert inverse_driver==source_capsule["files"]["receive-extracted.mjs"]
assert payload["expected_phases"]==["entry-and-downloads","native-file-preview","single-answer-feedback"]
supervisor_text=sys.orig_argv[sys.orig_argv.index("-c")+1]
supervisor_pin=require_pin(supervisor_text.encode(),payload["supervisor"])
namespace={"__name__":"recall_archive_admission"}
exec(compile(extractor_text,"<frozen-recall-archive-admission>","exec"),namespace)
admitted=namespace["admit_zip"](original_zip)
node="/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node"
chrome="/tmp/hamon-project-browser-ce7eb129730f/portable-153/chromium"
assert payload["node"]["path"]==node and payload["browser"]["path"]==chrome
node_before=require_pin(pathlib.Path(node).read_bytes(),payload["node"])
browser_before=require_pin(pathlib.Path(chrome).read_bytes(),payload["browser"])
assert node_before["bytes"]==125989464 and node_before["sha256"]=="bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12"
assert browser_before["bytes"]==209022176 and browser_before["sha256"]=="53a15d6c3a3d27dfb54c4ba60278b1683136f70cf1e67e989da7dfbd3d451ef0"
factory_node_modules="/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules"
node_environment_contract={"kind":"factory-node-path-admission","factory_node_modules":factory_node_modules,"allow_absent_or_empty_node_path":True,"preserve_in_child_environment":True,"forbidden_nonempty":["NODE_OPTIONS","NODE_V8_COVERAGE","NODE_COMPILE_CACHE"]}
assert payload["node_environment_admission"]==node_environment_contract
node_environment_values={key:os.environ.get(key) for key in ("NODE_PATH","CODEX_PRIMARY_RUNTIME_NODE_MODULES","NODE_OPTIONS","NODE_V8_COVERAGE","NODE_COMPILE_CACHE")}
for key in ("NODE_OPTIONS","NODE_V8_COVERAGE","NODE_COMPILE_CACHE"):
    assert not node_environment_values[key],"Nonempty Node override requires separate admission: "+key
if node_environment_values["NODE_PATH"]:
    assert node_environment_values["NODE_PATH"]==factory_node_modules,"Only the admitted factory NODE_PATH is permitted"
    assert node_environment_values["CODEX_PRIMARY_RUNTIME_NODE_MODULES"]==factory_node_modules,"Factory runtime modules binding changed"
capacity=os.statvfs("/dev");available=capacity.f_bavail*capacity.f_frsize
memory=dict(line.split(":",1) for line in pathlib.Path("/proc/meminfo").read_text().splitlines())
mem_available=int(memory["MemAvailable"].strip().split()[0])*1024
assert available>=536870912,available
assert mem_available>=1073741824,mem_available
stage=pathlib.Path("/dev/recall-zip-use-6c20bb4b010e-"+str(os.getpid()))
stage.mkdir(mode=0o700);stage_stat=stage.lstat();stage_identity=(stage_stat.st_dev,stage_stat.st_ino)
assert statmod.S_ISDIR(stage_stat.st_mode) and statmod.S_IMODE(stage_stat.st_mode)==0o700 and stage_stat.st_uid==os.getuid()
package=stage/"package";own=stage/"receiver";evidence=stage/"evidence";downloads=stage/"downloads";profile=stage/"profile"
own.mkdir(mode=0o700)
for name in ("tmp","home","cache","config"):(stage/name).mkdir(mode=0o700)
env=os.environ.copy();env.update({"TMPDIR":str(stage/"tmp"),"HOME":str(stage/"home"),"XDG_CACHE_HOME":str(stage/"cache"),"XDG_CONFIG_HOME":str(stage/"config"),"PYTHONDONTWRITEBYTECODE":"1"})
outer={"schema":"recall.original-offline-zip-native-supervisor.v1","payload_pin":payload_pin,"supervisor_pin":supervisor_pin,"receiver_source_pins":source_pins,"source_capsule":source_capsule_pin,"receiver_adaptations":payload["receiver_adaptations"],"receiver_inverse_to_original_capsule":True,"archive_carrier_pin":pin(carrier),"original_zip_pin":zip_pin,"source_commit":"cb2f0ad1bc59bac7541004cde174179923e6cb75","package_member_count":8,"node_before":node_before,"browser_before":browser_before,"platform":platform.platform(),"capacity":{"dev_available_bytes":available,"mem_available_bytes":mem_available},"node_environment_admission":{"contract":node_environment_contract,"values":node_environment_values},"environment_overrides":{k:env[k] for k in ("TMPDIR","HOME","XDG_CACHE_HOME","XDG_CONFIG_HOME")},"budget_seconds":180,"product_source_changes":False,"historical_browser_groups_replayed":False,"boundary":"One actual unpacked original offline ZIP user-flow receive. START-HERE, local explorer, two actual downloads, included default Biology learner, local lesson import and visible preview, twelve-question identity, one ordinary answer and feedback. Private owned stage and fresh browser profile only. No rebuild, full historical suite, full-course/math/resume qualification, canonical storage/provider/account/queue/worker/ref/Actions effects.","started_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"child_started":False,"timed_out":False,"exit_code":None,"fatal":None}
child=None;initial=None;admission_path=stage/"archive-admission.json";post_path=stage/"archive-after.json";stdout_path=stage/"child-stdout.log";stderr_path=stage/"child-stderr.log"
start=time.monotonic()
try:
    for row in source_rows:create_bytes(own/row["path"],decode(row))
    create_bytes(own/"supervisor.py",supervisor_text.encode())
    create_bytes(stage/"original.zip",original_zip)
    create_bytes(stage/"source-capsule.json",decode(payload["source_capsule"]))
    initial=namespace["extract_new"](admitted,str(package))
    create_json(admission_path,{"archive":admitted,"initial":initial})
    outer["archive_admission"]=describe(initial)
    checked=subprocess.run([node,"--check",str(own/"receive-extracted.mjs")],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=15)
    outer["node_syntax_check"]={"exit_code":checked.returncode,"stdout":checked.stdout.decode(errors="replace"),"stderr":checked.stderr.decode(errors="replace")}
    assert checked.returncode==0,"Frozen browser child did not parse"
    node_version=subprocess.check_output([node,"--version"],text=True,env=env,timeout=15).strip()
    chrome_version=subprocess.check_output([chrome,"--version"],text=True,env=env,timeout=30).strip()
    assert node_version=="v24.19.0" and chrome_version=="Chromium 153.0.8010.0",(node_version,chrome_version)
    outer["node_version"]=node_version;outer["browser_version"]=chrome_version
    argv=[node,str(own/"receive-extracted.mjs"),str(package),str(evidence),str(downloads),str(profile)]
    outer["argv"]=argv
    with stdout_path.open("xb") as stdout,stderr_path.open("xb") as stderr:
        child=subprocess.Popen(argv,stdout=stdout,stderr=stderr,env=env,cwd=package,start_new_session=True)
        outer["child_started"]=True;outer["child_pid"]=child.pid;child_start=time.monotonic()
        print("RECALL_LAUNCHED "+json.dumps({"pid":child.pid,"node":node_version,"chrome":chrome_version,"package_members":8,"zip_sha":zip_pin["sha"]}),flush=True)
        while child.poll() is None:
            if time.monotonic()-child_start>180:
                outer["timed_out"]=True
                try:os.killpg(child.pid,signal.SIGTERM)
                except ProcessLookupError:pass
                try:child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    try:os.killpg(child.pid,signal.SIGKILL)
                    except ProcessLookupError:pass
                    child.wait(timeout=5)
                break
            time.sleep(0.25)
        outer["child_elapsed_seconds"]=time.monotonic()-child_start
        outer["exit_code"]=child.returncode
except BaseException as exc:
    outer["fatal"]=repr(exc)
finally:
    if child is not None:
        try:
            os.killpg(child.pid,0);outer["owned_group_present_after_child"]=True;os.killpg(child.pid,signal.SIGTERM)
            group_deadline=time.monotonic()+5
            while time.monotonic()<group_deadline:
                try:os.killpg(child.pid,0)
                except ProcessLookupError:break
                time.sleep(0.05)
            else:
                try:os.killpg(child.pid,signal.SIGKILL)
                except ProcessLookupError:pass
        except ProcessLookupError:outer["owned_group_present_after_child"]=False
        try:
            child.wait(timeout=5)
            if outer["exit_code"] is None:outer["exit_code"]=child.returncode
        except subprocess.TimeoutExpired:outer["child_reap_pending"]=True
        group_observation_deadline=time.monotonic()+2
        while True:
            try:os.killpg(child.pid,0);group_present=True
            except ProcessLookupError:group_present=False
            if not group_present or time.monotonic()>=group_observation_deadline:break
            time.sleep(0.05)
        outer["owned_group_absent_after_cleanup"]=not group_present
        outer["owned_group_observed_at"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
        if group_present:outer["cleanup_incomplete"]="Owned child process group remained observable after bounded cleanup; retain stage and qualification hold."
    else:outer["owned_group_absent_after_cleanup"]=True
    if initial is not None:
        try:
            after=namespace["verify_extracted"](str(package),admitted,(initial["stage_device"],initial["stage_inode"]))
            outer["package_unchanged"]=True;create_json(post_path,{"verified":True,"after":after})
        except BaseException as exc:
            outer["package_unchanged"]=False;outer["package_after_error"]=repr(exc);create_json(post_path,{"verified":False,"error":repr(exc)})
    else:outer["package_unchanged"]=False
    try:
        outer["receiver_sources_unchanged"]=all((own/r["path"]).read_bytes()==decode(r) for r in source_rows) and (own/"supervisor.py").read_bytes()==supervisor_text.encode()
        outer["archive_file_unchanged"]=(stage/"original.zip").read_bytes()==original_zip
        outer["source_capsule_unchanged"]=(stage/"source-capsule.json").read_bytes()==decode(payload["source_capsule"])
        outer["node_after"]=pin(pathlib.Path(node).read_bytes());outer["node_unchanged"]=outer["node_after"]==node_before
        outer["browser_after"]=pin(pathlib.Path(chrome).read_bytes());outer["browser_unchanged"]=outer["browser_after"]==browser_before
    except BaseException as exc:outer["after_error"]=repr(exc)
outer["completed_at"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime());outer["elapsed_seconds"]=time.monotonic()-start
try:
    receipt=json.loads((evidence/"receipt.json").read_text())
    outer["receipt_present"]=True
    outer["actual_phases"]=[{"name":r["name"],"passed":r["passed"]} for r in receipt["phases"]]
    outer["receipt_passed"]=receipt["passed"] is True
    outer["flow_completed"]=receipt["flowCompleted"] is True
    outer["child_profile_retained"]=receipt["profileRetained"] is True
    outer["child_fatal"]=receipt.get("fatal")
    outer["child_cleanup"]=receipt.get("cleanup")
except BaseException as exc:
    receipt=None;outer["receipt_present"]=False;outer["receipt_error"]=repr(exc);outer["actual_phases"]=[]
names=[r["name"] for r in outer["actual_phases"]]
outer["phase_names_unique"]=len(names)==len(set(names))
outer["expected_phases"]=payload["expected_phases"]
outer["expected_phase_order"]=names==payload["expected_phases"]
outer["all_phases_passed"]=bool(outer["actual_phases"]) and all(r["passed"] is True for r in outer["actual_phases"])
outer["profile_present_after_child"]=profile.exists()
outer["profile_retention_boundary"]="Generated profile is intentionally retained for the parent FINISH after group reconciliation and full artifact custody; it is not an exported qualification artifact."
outer["flow_receiving_passed"]=outer.get("child_started") is True and outer.get("exit_code")==0 and outer.get("timed_out") is False and outer.get("fatal") is None and outer.get("child_fatal") is None and all(outer.get(k) is True for k in ("receipt_passed","flow_completed","phase_names_unique","expected_phase_order","all_phases_passed","package_unchanged","receiver_sources_unchanged","archive_file_unchanged","source_capsule_unchanged","node_unchanged","browser_unchanged","owned_group_absent_after_cleanup")) and not outer.get("child_reap_pending")
outer["own_stage_removed"]=False
outer["stage_retention"]="Private stage retained until all exact export parts are hash-acknowledged; final cleanup reported separately."
outer["stage_identity"]={"device":stage_identity[0],"inode":stage_identity[1]}
artifact_paths=[p for folder in (evidence,downloads) if folder.exists() for p in folder.rglob("*") if p.is_file()]
artifact_paths += [p for p in [admission_path,post_path,stdout_path,stderr_path,stage/"original.zip",stage/"source-capsule.json",own/"supervisor.py",*[own/r["path"] for r in source_rows]] if p.exists()]
assert len(artifact_paths)==len(set(artifact_paths))
artifacts=[]
for path in sorted(artifact_paths):
    meta=path.lstat();assert statmod.S_ISREG(meta.st_mode) and meta.st_uid==os.getuid()
    raw=path.read_bytes();artifacts.append({"path":str(path.relative_to(stage)),"encoding":"base64","content":base64.b64encode(raw).decode(),**pin(raw)})
outer["artifacts"]=[{k:v for k,v in a.items() if k!="content"} for a in artifacts]
packet={"outer":outer,"artifacts":artifacts,"reproduction_payload":payload}
encoded=json.dumps(packet,sort_keys=True,separators=(",",":")).encode();compressed=gzip.compress(encoded,mtime=0);export=base64.b64encode(compressed).decode()
summary={k:outer.get(k) for k in ("child_started","exit_code","timed_out","elapsed_seconds","receipt_present","actual_phases","receipt_passed","flow_completed","flow_receiving_passed","fatal","child_fatal","child_cleanup","package_unchanged","receiver_sources_unchanged","archive_file_unchanged","node_unchanged","browser_unchanged","phase_names_unique","expected_phase_order","all_phases_passed","profile_present_after_child","child_profile_retained","owned_group_absent_after_cleanup","cleanup_incomplete","own_stage_removed")}
summary.update({"artifacts":len(artifacts),"packet_bytes":len(encoded),"packet_sha256":hashlib.sha256(encoded).hexdigest(),"gzip_bytes":len(compressed),"gzip_sha256":hashlib.sha256(compressed).hexdigest(),"export_characters":len(export)})
print("RECALL_RESULT "+json.dumps(summary,sort_keys=True),flush=True)
part_size=393216
fragment_size=24576
export_parts=[export[i:i+part_size]+"\n" for i in range(0,len(export),part_size)]
part_manifest=[{"index":i,**pin(part.encode("ascii"))} for i,part in enumerate(export_parts)]
export_manifest={"schema":"recall.original-offline-zip-export.v1","part_characters":part_size,"fragment_characters":fragment_size,"parts":part_manifest,"packet_bytes":len(encoded),"packet_sha256":hashlib.sha256(encoded).hexdigest(),"gzip_bytes":len(compressed),"gzip_sha256":hashlib.sha256(compressed).hexdigest(),"export_characters":len(export),"stage":str(stage)}
assert base64.b64decode("".join(export_parts))==compressed
print("RECALL_EXPORT_READY "+json.dumps(export_manifest,sort_keys=True),flush=True)
acknowledged={}
while True:
    line=sys.stdin.readline()
    if not line:
        print("RECALL_EXPORT_INTERRUPTED "+json.dumps({"stage":str(stage),"acknowledged":acknowledged}),flush=True)
        break
    fields=line.strip().split()
    if len(fields)==3 and fields[0]=="GET":
        index=int(fields[1]);offset=int(fields[2])
        assert 0<=index<len(export_parts)
        part=export_parts[index]
        assert 0<=offset<len(part)
        fragment=part[offset:offset+fragment_size]
        print("RECALL_EXPORT_FRAGMENT "+json.dumps({"index":index,"offset":offset,"characters":len(fragment),"part_sha":part_manifest[index]["sha"],"content":fragment},sort_keys=True),flush=True)
    elif len(fields)==3 and fields[0]=="ACK":
        index=int(fields[1]);assert 0<=index<len(export_parts)
        assert fields[2]==part_manifest[index]["sha"]
        acknowledged[index]=fields[2]
        print("RECALL_EXPORT_ACK "+json.dumps({"index":index,"sha":fields[2]},sort_keys=True),flush=True)
    elif len(fields)==3 and fields[0]=="ART":
        index=int(fields[1]);offset=int(fields[2])
        assert 0<=index<len(artifacts)
        value=artifacts[index]["content"];assert 0<=offset<len(value)
        fragment=value[offset:offset+fragment_size]
        print("RECALL_ARTIFACT_FRAGMENT "+json.dumps({"index":index,"path":artifacts[index]["path"],"offset":offset,"characters":len(fragment),"content":fragment},sort_keys=True),flush=True)
    elif fields==["INFO"]:
        print("RECALL_EXPORT_INFO "+json.dumps({"outer":outer,"artifact_manifest":outer["artifacts"],"acknowledged":acknowledged},sort_keys=True),flush=True)
    elif fields==["FINISH"]:
        assert len(acknowledged)==len(export_parts)
        assert all(acknowledged.get(i)==part_manifest[i]["sha"] for i in range(len(export_parts)))
        if child is not None:
            try:os.killpg(child.pid,0);still_present=True
            except ProcessLookupError:still_present=False
            if still_present:
                print("RECALL_EXPORT_COMMAND_REFUSED "+json.dumps({"reason":"Owned child process group remains observable; stage retained"}),flush=True)
                continue
        now_stage=stage.lstat()
        assert (now_stage.st_dev,now_stage.st_ino)==stage_identity and now_stage.st_uid==os.getuid() and statmod.S_ISDIR(now_stage.st_mode) and statmod.S_IMODE(now_stage.st_mode)==0o700
        shutil.rmtree(stage)
        final={"stage":str(stage),"own_stage_removed":not stage.exists(),"acknowledged_parts":part_manifest,"packet_sha256":hashlib.sha256(encoded).hexdigest(),"gzip_sha256":hashlib.sha256(compressed).hexdigest(),"completed_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
        print("RECALL_EXPORT_DONE "+json.dumps(final,sort_keys=True),flush=True)
        break
    else:
        print("RECALL_EXPORT_COMMAND_REFUSED "+json.dumps({"reason":"Expected GET/ACK/ART/INFO/FINISH"}),flush=True)
termios.tcsetattr(0,termios.TCSANOW,old)
