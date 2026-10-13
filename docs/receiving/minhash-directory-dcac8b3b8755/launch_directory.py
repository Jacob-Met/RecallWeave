import pathlib,hashlib,subprocess,sys,json
root=pathlib.Path(r"D:\hamon-dcac8b3b8755-minhash-directory-we8qgy23")
p=root/"receive_directory.py";b=p.read_bytes()
if hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()!="a4af27b60c21caa4c0edbdeb1bbccc69d2361389":raise SystemExit("Observer identity mismatch")
r=subprocess.run([sys.executable,"-I","-B",str(p)],cwd=root,capture_output=True,timeout=120)
(root/"outer.stdout").write_bytes(r.stdout);(root/"outer.stderr").write_bytes(r.stderr)
print(json.dumps({"exit":r.returncode,"stdout":r.stdout.decode("utf-8"),"stderr":r.stderr.decode("utf-8")}))
raise SystemExit(r.returncode)
