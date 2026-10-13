import pathlib,hashlib,subprocess,json,sys,os,platform,datetime,shutil
root=pathlib.Path(r"D:\hamon-dcac8b3b8755-minhash-browser-9gi7vlzn")
expected={"minhash-explorer.html":(48370,"375d963433888989fb053b3d48f43b18a1cbf028a19880256435eaab921df928","c601c22c99c53aef15de4f21ed4a3fa3ec69b0ce"),"minhash.md":(10174,"a54ad614612d04fffdfc7f049615fd2b2daaa5a986f25de1a1db1f3cca5ef593","ee10d4e34b2a996d4f25944f4fcb623f5b76855c"),"receive_browser.py":(None,None,"304663d3fc3bfda597405679eff79384160ffcf8")}
pins={}
for name,(size,sha,git) in expected.items():
 b=(root/name).read_bytes(); actual={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
 if actual["git_blob"]!=git or (size is not None and (actual["bytes"]!=size or actual["sha256"]!=sha)): raise SystemExit("Source identity mismatch: "+name)
 pins[name]=actual
if platform.node()!="MSI" or os.environ.get("USERNAME")!="Veria": raise SystemExit("Unexpected device identity")
compile((root/"receive_browser.py").read_text(encoding="utf-8"),"receive_browser.py","exec")
env=dict(os.environ); env["TEMP"]=str(root/"process-temp"); env["TMP"]=str(root/"process-temp"); env["PYTHONIOENCODING"]="utf-8"
argv=[sys.executable,"-B",str(root/"receive_browser.py"),"--html",str(root/"minhash-explorer.html"),"--guide",str(root/"minhash.md"),"--fixtures",str(root),"--output",str(root/"browser-receiving-v1"),"--chrome",r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"]
r={"schema":"recallweave.minhash-browser-native-launch/1","started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"identity":{"node":platform.node(),"user":os.environ.get("USERNAME"),"python":sys.executable,"version":platform.python_version(),"free_d":shutil.disk_usage("D:\\").free},"argv":argv,"source_pins":pins}
try:
 p=subprocess.run(argv,env=env,cwd=str(root),capture_output=True,timeout=180)
 r.update({"exit":p.returncode,"stdout_bytes":len(p.stdout),"stderr_bytes":len(p.stderr)})
 (root/"browser-v1.stdout").write_bytes(p.stdout); (root/"browser-v1.stderr").write_bytes(p.stderr)
except subprocess.TimeoutExpired as e:
 r.update({"timeout":True}); (root/"browser-v1.stdout").write_bytes(e.stdout or b""); (root/"browser-v1.stderr").write_bytes(e.stderr or b"")
r["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
(root/"browser-v1-launch.json").write_text(json.dumps(r,indent=2)+"\n",encoding="utf-8")
print(json.dumps(r))
raise SystemExit(r.get("exit",1))
