import ctypes,datetime,hashlib,json,shutil,zipfile
from pathlib import Path
root=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1");peer=Path(r"C:\Users\jacob\recallweave-nfa-independent-3dcb83a1");out=root/"root-supplement-v2"
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def raw(x):return (json.dumps(x,ensure_ascii=True,indent=2)+"\n").encode()
class M(ctypes.Structure):
 _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("available",ctypes.c_ulonglong),("page_total",ctypes.c_ulonglong),("page_available",ctypes.c_ulonglong),("virtual_total",ctypes.c_ulonglong),("virtual_available",ctypes.c_ulonglong),("extended",ctypes.c_ulonglong)]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m));disk=shutil.disk_usage(root).free
assert m.available>=2147483648 and disk>=38654705664 and not out.exists()
names=["contract.json","receive-model-v1.mjs","model-receiver-amendment-v2.json","receive-model-v2.mjs","model-receiving-v2/result.json","browser-receiver-freeze-v1.json","stage-browser-source-v1.mjs","browser-source-manifest-v1.json","browser-source-intake-v1.json","freeze-browser-v1.mjs","receive-browser-v1.mjs","launch-browser-v1.mjs","browser-execution-v1.json","browser-v1.stdout","browser-v1.stderr","browser-receiving-v1/chrome.stdout","browser-receiving-v1/chrome.stderr","browser-receiving-v1/result.json","browser-receiving-v1/learner-preview.json","ROOT-RECEIVING.md","ROOT-RECEIVING-v1.json","tool-completion-provenance-v1.json"]
review=json.loads((peer/"ROOT-RECEIVING-v1.json").read_bytes());assert review["accepted"] and review["model"]["passed_groups"]==9 and review["browser"]["passed"]==62
for n,p in review["screenshots"].items():
 path="browser-receiving-v1/"+n;assert pin((peer/path).read_bytes())==p;names.append(path)
missing="recallweave-study-notes-2026-10-09.txt"
for n,p in review["downloads"].items():
 path="browser-receiving-v1/downloads/"+n
 if n==missing:assert not (peer/path).exists();continue
 assert pin((peer/path).read_bytes())==p;names.append(path)
assert len(names)==32 and len(set(names))==32
for key in ("model","browser"):
 p=review[key];b=(peer/p["path"]).read_bytes();assert len(b)==p["bytes"] and hashlib.sha256(b).hexdigest()==p["sha256"]
ours=["seal-root-supplement-v1.py","root-supplement-packaging-refusal-v1.json","inspect-notes-custody-v1.py","notes-custody-investigation-v1.json","notes-custody-enum-interpretation-v1.json","peer/notes-custody-followup-contract-v1.json","receive-notes-followup-v1.mjs","run-notes-followup-v1.py","notes-followup-freeze-v1.json","notes-followup-execution-v1.json","notes-followup-v1.stdout","notes-followup-v1.stderr","notes-followup-v1/result.json","notes-followup-v1/chrome.stdout","notes-followup-v1/chrome.stderr","notes-followup-v1/failure.png","notes-followup-v1/downloads/"+missing,"notes-followup-postexit-observation-v1.json","notes-custody-correction-v1.md","qualify-retained-notes-v1.py","ROOT-NOTES-CUSTODY-SUPPLEMENT.json","ROOT-NOTES-CUSTODY-SUPPLEMENT.md"]
sources={**{"original/"+n:peer/n for n in names},**{"notes-custody/"+n:root/n for n in ours}}
assert len(sources)==54
for n,p in sources.items():
 assert p.is_file()
 for a in [p,*p.parents]:
  assert not a.is_symlink() and not a.is_junction()
  if a in (root,peer):break
before={n:pin(p.read_bytes()) for n,p in sources.items()}
out.mkdir();entries=[];texts=[]
for n,p in sorted(sources.items()):
 b=p.read_bytes();dest=out/n;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b);assert dest.read_bytes()==b
 row={"path":n,**pin(b)};entries.append(row)
 if not n.endswith(".png"):texts.append({**row,"content":b.decode("utf-8"),"mode":"100644"})
missing_record={"schema":"recallweave.nfa.original-download-unavailable.v1","original_path":"original/browser-receiving-v1/downloads/"+missing,"original_preclose_pin":review["downloads"][missing],"retained":False,"reconstructed":False,"source":"Read-only owned-profile History and bounded own-root scan in notes-custody/notes-custody-investigation-v1.json.","replacement_scope":"Separately completed follow-up is notes-custody/notes-followup-v1/downloads/"+missing,"raw_followup":"25pass/1fail, expected prior hash unchanged; scoped root correction in ROOT-NOTES-CUSTODY-SUPPLEMENT.md/JSON."}
execution={"schema":"recallweave.nfa.notes-custody-tool-provenance.v1","recorded_by":"estate_continuity-3dcb83a1","basis":"Record of actual previously returned RDC tool outputs; not a fabricated native launcher receipt.","events":[{"pid":90444,"role":"initial strict root packaging","exit_code":1,"outcome":"Original notes path missing before output directory created"},{"pid":87316,"role":"read-only own-profile History/own-root search","exit_code":0},{"pid":41204,"role":"followup receiver freeze and syntax","exit_code":0},{"pid":85128,"role":"one browser followup outer launch","exit_code":1,"node_pid":76684,"node_exit":2,"chrome_pid":65608,"chrome_exit":0},{"pid":55160,"role":"read-only postexit file/source observation","exit_code":0},{"pid":78832,"role":"read-only retained-content correspondence and scoped supplement","exit_code":0,"runtime_seconds":0.35}],"no_additional_browser_run":True}
for n,obj in [("original-download-unavailable.json",missing_record),("notes-custody/tool-completion-provenance.json",execution)]:
 b=raw(obj);(out/n).parent.mkdir(parents=True,exist_ok=True);(out/n).write_bytes(b);e={"path":n,**pin(b)};entries.append(e);texts.append({**e,"content":b.decode(),"mode":"100644"})
manifest={"schema":"recallweave.nfa.root-supplement-custody.v2","assembled_by":"estate_continuity-3dcb83a1","original_reviewer":"root-3dcb83a1","native_origin":str(peer),"original_available_files":32,"original_missing_downloads":1,"followup_and_correction_files":len(ours),"files":entries,"count":len(entries),"decoded_bytes":sum(x["bytes"] for x in entries),"copy_method":"read_bytes, no newline normalization","excluded":["both private Chrome profiles","product-received-v1 copies","absent original notes file"],"source_and_test_execution":False}
mb=raw(manifest);(out/"files-manifest.json").write_bytes(mb)
archive=root/"RecallWeave-NFA-root-receiving-v2.zip";assert not archive.exists()
allnames=[e["path"] for e in entries]+["files-manifest.json"]
with zipfile.ZipFile(archive,"x",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n in sorted(allnames):
  info=zipfile.ZipInfo(n,(2026,10,9,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,(out/n).read_bytes())
with zipfile.ZipFile(archive) as z:
 assert sorted(z.namelist())==sorted(allnames)
 for n in z.namelist():assert z.read(n)==(out/n).read_bytes()
assert before=={n:pin(p.read_bytes()) for n,p in sources.items()}
receipt={"schema":"recallweave.nfa.root-supplement-assembly.v2","created_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"admission":{"available_memory":m.available,"disk_available":disk},"archive":{"path":str(archive),**pin(archive.read_bytes())},"manifest":pin(mb),"original_available_files":32,"original_missing_downloads":1,"copied_original_and_followup_files":len(sources),"documented_provenance_files":2,"decoded_payload_bytes":sum(e["bytes"] for e in entries),"zip_members":len(allnames),"all_original_files_unchanged":True,"all_archive_members_byte_exact":True,"test_or_browser_rerun":False,"pngs":sum(n.endswith(".png") for n in allnames)}
rb=raw(receipt);(root/"root-supplement-assembly-v2.json").write_bytes(rb)
texts.append({"path":"files-manifest.json",**pin(mb),"content":mb.decode(),"mode":"100644"});texts.append({"path":"assembly-receipt.json",**pin(rb),"content":rb.decode(),"mode":"100644"})
packet={"schema":"recallweave.nfa.root-exact-text-supplement.v2","archive":receipt["archive"],"files":texts,"count":len(texts),"decoded_bytes":sum(e["bytes"] for e in texts),"binary_custody":"All six original PNGs and one follow-up failure PNG reside in the full ZIP and are pinned by files-manifest.json; no image or missing download is reconstructed."}
pb=raw(packet);(root/"root-exact-text-supplement-v2.json").write_bytes(pb)
print(json.dumps({"receipt":receipt,"text_packet":pin(pb),"text_files":len(texts)}))
