import ctypes,datetime,hashlib,json,os,subprocess,sys
from pathlib import Path
root=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1")
node=Path(r"C:\Program Files\nodejs\node.exe")
class Memory(ctypes.Structure):
    _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("available",ctypes.c_ulonglong),("page_total",ctypes.c_ulonglong),("page_available",ctypes.c_ulonglong),("virtual_total",ctypes.c_ulonglong),("virtual_available",ctypes.c_ulonglong),("extended",ctypes.c_ulonglong)]
def pin(data):return {"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()}
def raw(x):return (json.dumps(x,ensure_ascii=True,indent=2)+"\n").encode()
m=Memory();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
d=ctypes.c_ulonglong();assert ctypes.windll.kernel32.GetDiskFreeSpaceExW(str(root),ctypes.byref(d),None,None)
assert m.available>=2147483648 and d.value>=38654705664
packet=json.loads((root/"intake-packet.json").read_bytes())
for row in packet["files"]:
    data=row["content"].encode("utf-8");assert pin(data)=={k:row[k] for k in ("bytes","sha256","git_blob")}
    dest=root/row["path"];dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open("xb") as f:f.write(data)
    assert dest.read_bytes()==data
admission={"utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"memory_available":m.available,"disk_free":d.value,"node":str(node),"node_pin":pin(node.read_bytes()),"node_version":subprocess.run([str(node),"--version"],capture_output=True,check=True).stdout.decode().strip(),"staging_python":sys.executable,"files":[{k:r[k] for k in ("path","bytes","sha256","git_blob")} for r in packet["files"]],"source_before_execution":True}
(root/"native-admission.json").write_bytes(raw(admission))
out=root/"native-model-v1";out.mkdir()
cmd=[str(node),"--test","tests/nondeterministic-automata.test.mjs","tests/nondeterministic-automata-course.test.mjs"]
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
p=subprocess.run(cmd,cwd=root/"source",capture_output=True,timeout=90)
(out/"stdout.log").write_bytes(p.stdout);(out/"stderr.log").write_bytes(p.stderr)
after=[{k:r[k] for k in ("path","bytes","sha256","git_blob")} for r in packet["files"]]
for r in after:assert pin((root/r["path"]).read_bytes())=={k:r[k] for k in ("bytes","sha256","git_blob")}
result={"started":start,"ended":datetime.datetime.now(datetime.timezone.utc).isoformat(),"command":cmd,"cwd":str(root/"source"),"exit_code":p.returncode,"stdout":pin(p.stdout),"stderr":pin(p.stderr),"all_staged_sources_unchanged":True,"admission":pin((root/"native-admission.json").read_bytes())}
(out/"result.json").write_bytes(raw(result))
print(json.dumps(result,ensure_ascii=True))
print(p.stdout.decode("utf-8",errors="replace").encode("ascii",errors="backslashreplace").decode("ascii"))
raise SystemExit(p.returncode)
