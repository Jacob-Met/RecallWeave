import hashlib,json,os,pathlib,platform,subprocess,sys,time
root=pathlib.Path(__file__).resolve().parent
helper=root/"receive_static_preview.py"
b=helper.read_bytes()
assert hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()=="2d30a8a10014f8d21e5d34febc1f446e36fceba3"
assert platform.node()=="MSI" and os.environ.get("USERNAME")=="Veria"
env=dict(os.environ);tmp=root/"receiver-temp";tmp.mkdir()
env["TEMP"]=str(tmp);env["TMP"]=str(tmp)
argv=[sys.executable,"-I","-B",str(helper),"--archive",str(root/"RecallWeave-Minhash-Companion-0d3fa410-v1.zip"),"--sha256","41a78f125d9ff54da3395d7d0e6ffbb08626f5d871087efbc507443d3a5e9cbb","--output",str(root/"static-receiving-v1"),"--port","8807"]
with (root/"receiver.stdout").open("xb") as out,(root/"receiver.stderr").open("xb") as err:
    p=subprocess.Popen(argv,stdout=out,stderr=err,env=env,cwd=root)
    pid=p.pid
    try:code=p.wait(timeout=45)
    except subprocess.TimeoutExpired:
        p.kill();p.wait();raise
receipt={"schema":"hamon.minhash-static-receiver-launch/1","host":platform.node(),"user":os.environ.get("USERNAME"),"python":sys.executable,"helper_git":"2d30a8a10014f8d21e5d34febc1f446e36fceba3","argv":argv,"child_pid":pid,"child_exit":code,"stdout":(root/"receiver.stdout").read_text(encoding="utf-8"),"stderr":(root/"receiver.stderr").read_text(encoding="utf-8")}
(root/"receiver-launch.json").write_bytes((json.dumps(receipt,indent=2)+"\n").encode())
print(json.dumps(receipt))
raise SystemExit(code)
