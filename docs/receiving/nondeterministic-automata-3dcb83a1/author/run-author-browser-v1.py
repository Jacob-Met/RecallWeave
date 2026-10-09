import ctypes,datetime,hashlib,json,pathlib,shutil,subprocess,sys
root=pathlib.Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1")
class Memory(ctypes.Structure):
 _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("avail",ctypes.c_ulonglong),("tp",ctypes.c_ulonglong),("ap",ctypes.c_ulonglong),("tv",ctypes.c_ulonglong),("av",ctypes.c_ulonglong),("ext",ctypes.c_ulonglong)]
m=Memory();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
assert m.avail>=2*1024**3
assert shutil.disk_usage(root).free>=36*1024**3
out=root/"author-browser-v1"
assert not out.exists()
script=root/"receive-author-browser-v1.mjs"
assert hashlib.sha256(script.read_bytes()).hexdigest()=="a4bfb7b413b81b92e10f7dc03891c43b0d52243e5f9e004370eb6406560a6f3b"
node=pathlib.Path(r"C:\Program Files\nodejs\node.exe")
assert hashlib.sha256(node.read_bytes()).hexdigest()=="63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088"
record={"started":datetime.datetime.now(datetime.timezone.utc).isoformat(),"memory_available":m.avail,"disk_free":shutil.disk_usage(root).free,"command":[str(node),str(script)],"script_sha256":hashlib.sha256(script.read_bytes()).hexdigest()}
with (root/"browser-launch-v1.json").open("x",encoding="utf-8",newline="\n") as f:json.dump(record,f,indent=2);f.write("\n")
p=subprocess.run(record["command"],capture_output=True,cwd=root,timeout=180)
(root/"browser-wrapper-v1.stdout").write_bytes(p.stdout);(root/"browser-wrapper-v1.stderr").write_bytes(p.stderr)
record.update({"ended":datetime.datetime.now(datetime.timezone.utc).isoformat(),"exit_code":p.returncode,"stdout_sha256":hashlib.sha256(p.stdout).hexdigest(),"stderr_sha256":hashlib.sha256(p.stderr).hexdigest()})
with (root/"browser-completion-v1.json").open("x",encoding="utf-8",newline="\n") as f:json.dump(record,f,indent=2);f.write("\n")
print(json.dumps(record));print(p.stdout.decode("utf-8",errors="replace"));sys.exit(p.returncode)
