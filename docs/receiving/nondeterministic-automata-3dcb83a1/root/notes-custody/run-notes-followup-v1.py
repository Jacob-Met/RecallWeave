import datetime,hashlib,json,subprocess,sys
from pathlib import Path
r=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1")
node=Path(r"C:\Program Files\nodejs\node.exe")
script=r/"receive-notes-followup-v1.mjs"
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
freeze=json.loads((r/"notes-followup-freeze-v1.json").read_bytes())
assert pin(script.read_bytes())==freeze["receiver"]["pin"]
assert pin(node.read_bytes())==freeze["runtime"]["node"]
assert not (r/"notes-followup-execution-v1.json").exists()
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
p=subprocess.run([str(node),str(script)],cwd=r,capture_output=True,timeout=90)
for name,data in [("notes-followup-v1.stdout",p.stdout),("notes-followup-v1.stderr",p.stderr)]:
 with(r/name).open("xb")as f:f.write(data)
receipt={"schema":"recallweave.notes-followup-actual-execution.v1","started":started,"finished":datetime.datetime.now(datetime.timezone.utc).isoformat(),"command":[str(node),str(script)],"cwd":str(r),"actual_exit":p.returncode,"stdout":pin(p.stdout),"stderr":pin(p.stderr),"receiver_before_after":pin(script.read_bytes()),"freeze":pin((r/"notes-followup-freeze-v1.json").read_bytes())}
assert receipt["receiver_before_after"]==freeze["receiver"]["pin"]
with(r/"notes-followup-execution-v1.json").open("xb")as f:f.write((json.dumps(receipt,indent=2)+"\n").encode())
print(json.dumps(receipt));print(p.stdout.decode("utf-8",errors="backslashreplace"));print(p.stderr.decode("utf-8",errors="backslashreplace"))
raise SystemExit(p.returncode)
