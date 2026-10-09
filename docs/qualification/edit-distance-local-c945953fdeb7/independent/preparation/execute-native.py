import hashlib,json,subprocess,sys,time
from pathlib import Path
root=Path("/Users/me/Developer/recallweave-edit-distance-receiving-c945953fdeb7")
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
started=time.monotonic();started_ns=time.time_ns()
command=["/opt/homebrew/bin/node",str(root/"receive.mjs")]
child=subprocess.Popen(command,cwd="/tmp",stdout=subprocess.PIPE,stderr=subprocess.PIPE)
timed_out=False
try:out,err=child.communicate(timeout=210)
except subprocess.TimeoutExpired:
 timed_out=True;child.terminate()
 try:out,err=child.communicate(timeout=5)
 except subprocess.TimeoutExpired:child.kill();out,err=child.communicate(timeout=5)
for name,b in (("controller.stdout.txt",out),("controller.stderr.txt",err)):
 with (root/name).open("xb") as f:f.write(b)
record={"command":command,"cwd":"/tmp","node_pid":child.pid,"actual_node_exit":child.returncode,"timed_out":timed_out,
        "started_ns":started_ns,"finished_ns":time.time_ns(),"elapsed_seconds":time.monotonic()-started,
        "stdout":pin(out),"stderr":pin(err),"outer_process_exit_pending_tool_observation":True}
raw=(json.dumps(record,indent=2)+"\n").encode()
with (root/"EXECUTION.json").open("xb") as f:f.write(raw)
print(json.dumps({"execution":record,"execution_pin":pin(raw),"stdout_utf8":out.decode(),"stderr_utf8":err.decode()}))
raise SystemExit(child.returncode if child.returncode>=0 else 1)
