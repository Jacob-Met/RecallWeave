import hashlib,json,os,plistlib,re,subprocess,sys,time
from pathlib import Path
ROOT=Path("/Users/me/Developer/recallweave-edit-distance-receiving-c945953fdeb7")
TARGET=Path("/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7")
NODE="/opt/homebrew/bin/node"
def pin(b):
 return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def guard():
 s=os.statvfs(ROOT.parent);r=subprocess.run(["/usr/bin/vm_stat"],capture_output=True,text=True,check=True,timeout=5).stdout
 page=int(re.search(r"page size of (\d+) bytes",r).group(1))
 mem=sum(int(re.search(r"^"+re.escape(k)+r":\s+(\d+)",r,re.M).group(1)) for k in ("Pages free","Pages inactive","Pages speculative"))*page
 g={"free_disk":s.f_bavail*s.f_frsize,"conservative_memory":mem,"time_ns":time.time_ns()}
 if g["free_disk"]<268435456 or mem<2147483648:raise RuntimeError("initial receiving guard refused: "+json.dumps(g))
 return g
request=json.loads(sys.argv[1])
source=request["source"].encode()
contract=request["contract"].encode()
authority=request["authority"]
assert pin(source)==authority["receiver_source"]
assert pin(contract)==authority["contract"]
assert authority["contract"]["git_blob"]=="499f3a7e240b3eb14a0b2911b4300ba7b77e95c9"
assert pin((TARGET/"INSTALLATION.json").read_bytes())==authority["installed_marker"]
assert not os.path.lexists(ROOT),"receiver root exists; preserve it"
assert ROOT.parent.is_dir()
g=guard()
plist=plistlib.loads(Path("/Applications/Google Chrome.app/Contents/Info.plist").read_bytes())
chrome_product="Chrome/"+plist["CFBundleShortVersionString"]
assert chrome_product==authority["chrome_product"],"Chrome version changed"
node=subprocess.run([NODE,"--version"],capture_output=True,text=True,check=True,timeout=5)
assert node.stdout.strip()=="v26.3.0","Node version changed"
payload={"receive.mjs":source,"CONTRACT.md":contract,"AUTHORITY.json":(json.dumps(authority,indent=2,ensure_ascii=False)+"\n").encode()}
assert sum(map(len,payload.values()))<2097152
ROOT.mkdir(mode=0o700)
for name,b in payload.items():
 p=ROOT/name
 with p.open("xb") as f:f.write(b);f.flush();os.fsync(f.fileno())
 p.chmod(0o444)
 assert p.read_bytes()==b
freeze={"time_ns":time.time_ns(),"controller_pid":os.getpid(),"source_precedes_execution":True,"source_candidate_edited":False,
        "guard":g,"chrome_product":chrome_product,"node_version":node.stdout.strip(),"inputs":{n:pin(b) for n,b in payload.items()}}
with (ROOT/"source-freeze.json").open("x",encoding="utf-8",newline="") as f:json.dump(freeze,f,indent=2);f.write("\n")
syntax=subprocess.run([NODE,"--check",str(ROOT/"receive.mjs")],capture_output=True,timeout=10)
record={"purpose":"Exclusive independent source preparation only; zero product/browser invocation.","guard":g,"source_freeze":pin((ROOT/"source-freeze.json").read_bytes()),
        "syntax_exit":syntax.returncode,"syntax_stdout":syntax.stdout.decode(),"syntax_stderr":syntax.stderr.decode(),"node_version":node.stdout.strip(),
        "original_marker":authority["installed_marker"],"owned_bytes":sum(p.stat().st_size for p in ROOT.rglob("*") if p.is_file()),"controller_pid":os.getpid()}
with (ROOT/"PREPARATION.json").open("x",encoding="utf-8",newline="") as f:json.dump(record,f,indent=2);f.write("\n")
print(json.dumps({"prepared":str(ROOT),"source":pin(source),"source_freeze":freeze,"preparation":pin((ROOT/"PREPARATION.json").read_bytes()),"syntax_exit":syntax.returncode,"product_browser_calls":0}))
raise SystemExit(0 if syntax.returncode==0 else 1)
