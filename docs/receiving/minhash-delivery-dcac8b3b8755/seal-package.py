"""Seal the qualified MinHash files; no product, build or browser execution."""
import base64,datetime,hashlib,json,os,pathlib,platform,stat,sys,zipfile
ROOT=pathlib.Path(__file__).resolve().parent
def identity(b):
    return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def witness(p):
    s=p.stat()
    return dict(identity(p.read_bytes()),mode=s.st_mode,mtime_ns=str(s.st_mtime_ns),inode=str(s.st_ino))
def require(ok,message):
    if not ok: raise ValueError(message)
def same_identity(b,row):
    return all(identity(b)[k]==row[k] for k in ("bytes","sha256","git_blob"))
def safe(path):
    p=pathlib.PurePosixPath(path)
    require(not p.is_absolute() and p.as_posix()==path and all(x not in ("",".","..") for x in path.split("/")) and "\\" not in path,"Noncanonical member")
    return path
def main():
    require(platform.node()=="MSI" and os.environ.get("USERNAME")=="Veria","Unexpected device")
    original=ROOT/"package-input.json"
    before={str(original):witness(original),str(pathlib.Path(__file__).resolve()):witness(pathlib.Path(__file__).resolve())}
    raw=original.read_bytes()
    require(identity(raw)["git_blob"]=="fc7168a7af98f7bb4d73e58208e81ba617604795","Input packet changed")
    packet=json.loads(raw)
    bp=pathlib.Path(packet["browser_packet"]["path"]); before[str(bp)]=witness(bp)
    braw=bp.read_bytes(); require(same_identity(braw,packet["browser_packet"]),"Native browser packet changed")
    browser=json.loads(braw)
    require(browser["native_conserved"] and len(browser["files"])==21,"Incomplete browser packet")
    payload={}
    def add(path,data,row):
        name=safe(path)
        require(name not in payload and same_identity(data,row),"Duplicate or unequal payload: "+name)
        payload[name]=data
    for f in packet["files"]:
        require(f["encoding"]=="utf-8","Unsupported input encoding")
        add(f["path"],f["content"].encode("utf-8"),f)
    for f in browser["files"]:
        native=bp.parent/pathlib.PurePosixPath(f["path"])
        require(not native.is_symlink(),"Native symlink refused")
        before[str(native)]=witness(native)
        data=base64.b64decode(f["content"],validate=True)
        require(native.read_bytes()==data,"Native output changed: "+f["path"])
        require(all(before[str(native)][k]==str(f[k]) if k in ("mtime_ns","inode") else before[str(native)][k]==f[k] for k in ("bytes","sha256","git_blob","mode","mtime_ns","inode")),"Native custody changed: "+f["path"])
        add("evidence/browser/"+f["path"],data,f)
    require(len(payload)==56,"Unexpected payload count")
    require(payload["preview/index.html"]==payload["source/courses/minhash-explorer.html"],"Preview/source mismatch")
    require(payload["preview/minhash.md"]==payload["source/courses/minhash.md"],"Guide/source mismatch")
    require(payload["preview/probability-foundations.json"]==payload["source/courses/probability-foundations.json"],"Course/source mismatch")
    manifest={"schema":"hamon.exact-delivery-manifest/1","product":"RecallWeave MinHash finite-permutation companion",
              "product_commit":packet["product_commit"],"source_commit":packet["source_commit"],"product_tree":packet["product_tree"],
              "files":[dict(path=n,**identity(payload[n])) for n in sorted(payload)]}
    payload["MANIFEST.json"]=(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
    archive=ROOT/"RecallWeave-Minhash-Companion-0d3fa410-v1.zip"
    require(not archive.exists(),"Archive already exists")
    with zipfile.ZipFile(archive,"x",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name in sorted(payload):
            info=zipfile.ZipInfo(name,date_time=(2026,10,13,0,0,0))
            info.create_system=3;info.external_attr=(stat.S_IFREG|0o644)<<16
            info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,payload[name])
    with zipfile.ZipFile(archive,"r") as z:
        require(z.namelist()==sorted(payload),"Archive membership changed")
        for name in sorted(payload): require(z.read(name)==payload[name],"ZIP roundtrip differs: "+name)
    after={p:witness(pathlib.Path(p)) for p in before}
    require(before==after,"A source/custody witness changed")
    receipt={"schema":"hamon.minhash-portable-seal/1","passed":True,
             "identity":{"host":platform.node(),"user":os.environ.get("USERNAME"),"python":sys.executable,"version":platform.python_version()},
             "archive":{"path":str(archive),**identity(archive.read_bytes())},
             "members":len(payload),"manifest_payloads":len(payload)-1,
             "scope":"Packaging and exact ZIP byte roundtrip only; no product, build or browser replay.",
             "source_commit":packet["source_commit"],"source_before":before,"source_after":after,
             "source_conserved":True,"files":[dict(path=n,**identity(payload[n])) for n in sorted(payload)],
             "finished_utc":datetime.datetime.now(datetime.timezone.utc).isoformat()}
    data=(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
    (ROOT/"seal-receiving.json").write_bytes(data)
    (ROOT/"package-manifest.json").write_bytes(payload["MANIFEST.json"])
    print(json.dumps({"passed":True,"archive":receipt["archive"],"members":len(payload),"payloads":len(payload)-1,
                      "receipt":identity(data),"source_witnesses":len(before)}))
if __name__=="__main__": main()
