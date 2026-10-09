import ctypes,datetime,hashlib,json,os,shutil,sqlite3
from pathlib import Path
own=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1")
peer=Path(r"C:\Users\jacob\recallweave-nfa-independent-3dcb83a1")
name="recallweave-study-notes-2026-10-09.txt"
class M(ctypes.Structure):
 _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("available",ctypes.c_ulonglong),("page_total",ctypes.c_ulonglong),("page_available",ctypes.c_ulonglong),("virtual_total",ctypes.c_ulonglong),("virtual_available",ctypes.c_ulonglong),("extended",ctypes.c_ulonglong)]
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
disk=shutil.disk_usage(own).free;assert m.available>=2147483648 and disk>=38654705664
history=peer/"browser-receiving-v1/profile/Default/History"
before=pin(history.read_bytes())
db=sqlite3.connect(history.as_uri()+"?mode=ro",uri=True)
db.execute("PRAGMA query_only=ON")
cols=[r[1]for r in db.execute("PRAGMA table_info(downloads)")]
wanted=[c for c in ("id","current_path","target_path","start_time","end_time","received_bytes","total_bytes","state","danger_type","interrupt_reason","opened","transient","by_ext_id","mime_type")if c in cols]
rows=[dict(zip(wanted,r))for r in db.execute("SELECT "+",".join(wanted)+" FROM downloads WHERE target_path LIKE ? OR current_path LIKE ?",("%"+name+"%","%"+name+"%"))]
db.close()
assert pin(history.read_bytes())==before
matches=[];visited=0;skipped=[]
for directory,dirs,files in os.walk(peer,followlinks=False):
 keep=[]
 for d in dirs:
  p=Path(directory)/d
  if d=="profile" or p.is_symlink() or p.is_junction():skipped.append(str(p.relative_to(peer)));continue
  keep.append(d)
 dirs[:]=keep
 for f in files:
  visited+=1
  assert visited<=1000,"Bounded own-root scan limit"
  if f==name or f.startswith(name+"."):
   p=Path(directory)/f
   if p.is_symlink()or p.is_junction():continue
   matches.append({"path":str(p),**pin(p.read_bytes())})
result={"schema":"recallweave.nfa.notes-custody-readonly-investigation.v1","utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"history":str(history),"history_pin_before_after":before,"sqlite_mode":"mode=ro; PRAGMA query_only=ON","selected_filename":name,"download_rows":rows,"bounded_own_root_files_visited":visited,"skipped_directories":skipped,"exact_filename_or_partial_matches":matches,"scope":"Only receiver-owned profile History filtered to the exact reported notes filename, and its own receiving root excluding profile/junctions; no other Chrome profile inspected.","product_or_browser_execution":False,"admission":{"memory_available":m.available,"disk_available":disk}}
out=own/"notes-custody-investigation-v1.json"
with out.open("xb")as f:f.write((json.dumps(result,ensure_ascii=True,indent=2)+"\n").encode())
print(json.dumps(result,ensure_ascii=True));print(json.dumps({"result":pin(out.read_bytes())}))
