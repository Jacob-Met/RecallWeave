import ctypes,datetime,hashlib,json,re,subprocess,sys
from pathlib import Path
root=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1")
source=root/"source";node=r"C:\Program Files\nodejs\node.exe"
class M(ctypes.Structure):
    _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("available",ctypes.c_ulonglong),("page_total",ctypes.c_ulonglong),("page_available",ctypes.c_ulonglong),("virtual_total",ctypes.c_ulonglong),("virtual_available",ctypes.c_ulonglong),("extended",ctypes.c_ulonglong)]
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def raw(x):return (json.dumps(x,ensure_ascii=True,indent=2)+"\n").encode()
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
d=ctypes.c_ulonglong();assert ctypes.windll.kernel32.GetDiskFreeSpaceExW(str(root),ctypes.byref(d),None,None)
assert m.available>=2147483648 and d.value>=38654705664
before={p.relative_to(source).as_posix():pin(p.read_bytes()) for p in source.rglob("*") if p.is_file()}
packet=json.loads((root/"interface-packet.json").read_bytes())
for row in packet["files"]:
    data=row["content"].encode();assert pin(data)=={k:row[k] for k in ("bytes","sha256","git_blob")}
    p=root/row["path"];p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("xb") as f:f.write(data)
out=root/"native-build-v1";out.mkdir()
commands=[]
def run(args,label):
    p=subprocess.run([node,*args],cwd=source,capture_output=True,timeout=30)
    (out/(label+".stdout")).write_bytes(p.stdout);(out/(label+".stderr")).write_bytes(p.stderr)
    commands.append({"argv":[node,*args],"exit":p.returncode,"stdout":pin(p.stdout),"stderr":pin(p.stderr)})
    assert p.returncode==0,label
run(["tools/build-nondeterministic-automata.mjs"],"build")
run(["tools/build-nondeterministic-automata.mjs","--check"],"check")
html=(source/"courses/nondeterministic-automata-explorer.html").read_bytes()
program=re.search(rb'<script type="module">([\s\S]*?)</script>',html).group(1)
(out/"built-program.mjs").write_bytes(program)
run(["--check",str(out/"built-program.mjs")],"built-syntax")
after={p.relative_to(source).as_posix():pin(p.read_bytes()) for p in source.rglob("*") if p.is_file()}
assert all(after[name]==value for name,value in before.items())
assert after["src/nondeterministic-automata.mjs"]["sha256"]==packet["prior_model_sha256"]
assert after["courses/nondeterministic-automata.json"]["sha256"]==packet["prior_deck_sha256"]
result={"utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"guard":{"memory_available":m.available,"disk_free":d.value},"commands":commands,"all_prior_sources_unchanged":True,"source_pins":after,"generated_html":pin(html)}
(out/"result.json").write_bytes(raw(result))
print(json.dumps(result,ensure_ascii=True))
