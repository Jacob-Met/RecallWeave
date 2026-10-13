import base64,datetime,hashlib,json,os,pathlib,platform,subprocess,sys
ROOT=pathlib.Path(__file__).parent
def pin(b): return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def witness(p):
 s=p.stat();return dict(pin(p.read_bytes()),mode=s.st_mode,mtime_ns=s.st_mtime_ns,inode=s.st_ino)
assert platform.node()=="MSI" and os.environ.get("USERNAME","").lower()=="veria"
packet=ROOT/"source-packet.json";packet_before=witness(packet)
spec=json.loads(packet.read_text(encoding="utf-8"))
for row in spec["files"]:
 path=ROOT/row["path"];path.parent.mkdir(parents=True,exist_ok=True)
 raw=row["text"].encode("utf-8")
 assert pin(raw)=={"bytes":row["bytes"],"sha256":row["sha256"],"git_blob":row["git_blob_sha1"]}
 with path.open("xb") as f:f.write(raw)
before={row["path"]:witness(ROOT/row["path"]) for row in spec["files"]}
temp=ROOT/"process-temp";temp.mkdir();env=dict(os.environ,TEMP=str(temp),TMP=str(temp))
R={"schema":"hamon.minhash-author-course/1","started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"runtime":{"device":platform.node(),"user":os.environ.get("USERNAME"),"python":platform.python_version()},"commands":[],"inputs_before":before,"packet_before":packet_before}
commands=[["version",["--version"]],["unit",["--test","tests/minhash.test.mjs"]],["build",["tools/build-minhash.mjs"]],["parity",["tools/build-minhash.mjs","--check"]],["ui-syntax",["--check","src/minhash-ui.mjs"]]]
passed=True
for name,args in commands:
 argv=[r"C:\Program Files\nodejs\node.exe",*args]
 with (ROOT/(name+".stdout")).open("xb") as out,(ROOT/(name+".stderr")).open("xb") as err:
  p=subprocess.Popen(argv,cwd=ROOT,env=env,stdout=out,stderr=err)
  try:code=p.wait(timeout=45)
  except subprocess.TimeoutExpired:
   p.kill();code=p.wait();passed=False
 entry={"name":name,"argv":argv,"pid":p.pid,"exit":code}
 for stream in ("stdout","stderr"):
  raw=(ROOT/(name+"."+stream)).read_bytes();entry[stream]={"text":raw.decode("utf-8","replace"),**pin(raw)}
 R["commands"].append(entry)
 print(json.dumps({"command":name,"pid":p.pid,"exit":code}),flush=True)
 if code!=0:passed=False;break
if passed:
 html=(ROOT/"courses/minhash-explorer.html").read_text(encoding="utf-8")
 def embedded(id):
  return json.loads(html.split('<script type="application/json" id="'+id+'">',1)[1].split("</script>",1)[0])
 R["embedded_course_exact"]=embedded("course-data")== (ROOT/"courses/probability-foundations.json").read_text(encoding="utf-8")
 R["embedded_guide_exact"]=embedded("guide-data")== (ROOT/"courses/minhash.md").read_text(encoding="utf-8")
 R["html"]=witness(ROOT/"courses/minhash-explorer.html")
 passed=R["embedded_course_exact"] and R["embedded_guide_exact"]
R["inputs_after"]={row["path"]:witness(ROOT/row["path"]) for row in spec["files"]}
R["packet_after"]=witness(packet)
R["source_conserved"]=R["inputs_before"]==R["inputs_after"]
R["packet_conserved"]=R["packet_before"]==R["packet_after"]
R["observer"]=pin(pathlib.Path(__file__).read_bytes())
R["passed"]=passed and R["source_conserved"] and R["packet_conserved"]
R["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
raw=(json.dumps(R,ensure_ascii=True,indent=2)+"\n").encode("utf-8")
with (ROOT/"author-receiving.json").open("xb") as f:f.write(raw)
exports=["author-receiving.json","author-course.py","courses/minhash-explorer.html"]+[n+"."+s for n,_ in commands for s in ("stdout","stderr") if (ROOT/(n+"."+s)).exists()]
rows=[]
for name in exports:
 b=(ROOT/name).read_bytes();rows.append({"path":name,**pin(b),"base64":base64.b64encode(b).decode("ascii")})
with (ROOT/"publication-packet.json").open("x",encoding="utf-8",newline="\n") as f:f.write(json.dumps({"schema":"hamon.minhash-author-publication/1","files":rows},separators=(",",":"))+"\n")
print(json.dumps({"passed":R["passed"],"receipt":pin(raw),"html":R.get("html"),"packet":pin((ROOT/"publication-packet.json").read_bytes())}),flush=True)
raise SystemExit(0 if R["passed"] else 1)
