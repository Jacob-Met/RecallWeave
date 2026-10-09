import ctypes,datetime,hashlib,json,shutil,zipfile
from pathlib import Path
root=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1")
peer=Path(r"C:\Users\jacob\recallweave-nfa-independent-3dcb83a1")
out=root/"root-supplement-v1"
class M(ctypes.Structure):
 _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("available",ctypes.c_ulonglong),("page_total",ctypes.c_ulonglong),("page_available",ctypes.c_ulonglong),("virtual_total",ctypes.c_ulonglong),("virtual_available",ctypes.c_ulonglong),("extended",ctypes.c_ulonglong)]
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def raw(x):return (json.dumps(x,ensure_ascii=True,indent=2)+"\n").encode()
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
disk=shutil.disk_usage(root).free
assert m.available>=2147483648 and disk>=38654705664
assert not out.exists()
names=[
"contract.json","receive-model-v1.mjs","model-receiver-amendment-v2.json","receive-model-v2.mjs","model-receiving-v2/result.json",
"browser-receiver-freeze-v1.json","stage-browser-source-v1.mjs","browser-source-manifest-v1.json","browser-source-intake-v1.json","freeze-browser-v1.mjs","receive-browser-v1.mjs","launch-browser-v1.mjs","browser-execution-v1.json","browser-v1.stdout","browser-v1.stderr",
"browser-receiving-v1/chrome.stdout","browser-receiving-v1/chrome.stderr","browser-receiving-v1/result.json","browser-receiving-v1/learner-preview.json",
"ROOT-RECEIVING.md","ROOT-RECEIVING-v1.json","tool-completion-provenance-v1.json"]
review=json.loads((peer/"ROOT-RECEIVING-v1.json").read_bytes())
assert review["accepted"] and review["model"]["passed_groups"]==9 and review["browser"]["passed"]==62
for n,p in review["screenshots"].items():
 path="browser-receiving-v1/"+n
 assert pin((peer/path).read_bytes())==p
 names.append(path)
for n,p in review["downloads"].items():
 path="browser-receiving-v1/downloads/"+n
 assert pin((peer/path).read_bytes())==p
 names.append(path)
assert len(names)==33 and len(set(names))==33
for key in ("model","browser"):
 p=review[key];b=(peer/p["path"]).read_bytes()
 assert len(b)==p["bytes"] and hashlib.sha256(b).hexdigest()==p["sha256"]
out.mkdir()
entries=[];texts=[]
for n in sorted(names):
 src=peer/n
 assert src.is_file() and not src.is_symlink() and not src.is_junction()
 b=src.read_bytes();dest=out/n;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
 assert dest.read_bytes()==b
 row={"path":n,**pin(b)}
 entries.append(row)
 if not n.endswith(".png"):
  texts.append({**row,"content":b.decode("utf-8"),"mode":"100644"})
manifest={"schema":"recallweave.nfa.root-supplement-custody.v1","assembled_by":"estate_continuity-3dcb83a1","reviewer":"root-3dcb83a1","native_origin":str(peer),"files":entries,"count":len(entries),"decoded_bytes":sum(x["bytes"] for x in entries),"copy_method":"read_bytes, no newline normalization","excluded":["private Chrome profile","product-received-v1 copies"],"source_and_test_execution":False}
mb=raw(manifest);(out/"files-manifest.json").write_bytes(mb)
archive=root/"RecallWeave-NFA-root-receiving-v1.zip"
assert not archive.exists()
with zipfile.ZipFile(archive,"x",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n in sorted(names+["files-manifest.json"]):
  info=zipfile.ZipInfo(n,(2026,10,9,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,(out/n).read_bytes())
with zipfile.ZipFile(archive) as z:
 assert sorted(z.namelist())==sorted(names+["files-manifest.json"])
 for n in z.namelist():assert z.read(n)==(out/n).read_bytes()
for e in entries:assert pin((peer/e["path"]).read_bytes())=={k:e[k] for k in ("bytes","sha256","git_blob")}
receipt={"schema":"recallweave.nfa.root-supplement-assembly.v1","created_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"admission":{"available_memory":m.available,"disk_available":disk},"archive":{"path":str(archive),**pin(archive.read_bytes())},"manifest":pin(mb),"original_files":len(entries),"decoded_original_bytes":sum(e["bytes"] for e in entries),"zip_members":len(entries)+1,"all_original_files_unchanged":True,"all_archive_members_byte_exact":True,"test_or_browser_rerun":False,"text_offer_files":len(texts),"pngs_retained_in_zip_and_pinned_in_root_review":len(review["screenshots"])}
rb=raw(receipt);(root/"root-supplement-assembly-v1.json").write_bytes(rb)
texts.append({"path":"files-manifest.json",**pin(mb),"content":mb.decode(),"mode":"100644"})
texts.append({"path":"assembly-receipt.json",**pin(rb),"content":rb.decode(),"mode":"100644"})
packet={"schema":"recallweave.nfa.root-exact-text-supplement.v1","origin":str(peer),"archive":receipt["archive"],"files":texts,"count":len(texts),"decoded_bytes":sum(e["bytes"] for e in texts),"binary_custody":"All six exact PNGs reside in the full ZIP and are pinned by ROOT-RECEIVING-v1.json and files-manifest.json; they are not substituted with text."}
pb=raw(packet);(root/"root-exact-text-supplement-v1.json").write_bytes(pb)
print(json.dumps({"receipt":receipt,"text_packet":pin(pb)},ensure_ascii=True))
