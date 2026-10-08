import os,json,hashlib,subprocess,shutil,difflib,datetime
from pathlib import Path
root=Path("/home/jacob/hamon-answer-feedback-receiving-ab529ac65023").resolve(strict=True)
v=os.statvfs(root)
assert v.f_bavail*v.f_frsize>=1073741824,"Candidate source held by capacity"
def run(args,ok=(0,)):
 r=subprocess.run(args,cwd=root,capture_output=True,text=True,timeout=40)
 if r.returncode not in ok: raise RuntimeError(json.dumps({"command":args,"returncode":r.returncode,"stdout":r.stdout,"stderr":r.stderr}))
 return {"command":args,"returncode":r.returncode,"stdout":r.stdout,"stderr":r.stderr}
assert run(["git","rev-parse","HEAD"])["stdout"].strip()=="7583e5b840fe36ede3d0760d00826059f9dd1f1d"
run(["git","diff","--exit-code"])
report=json.loads((root/"baseline-receiving/browser-receiving.json").read_bytes())
assert report["status"]=="failed" and sum(c["status"]=="passed" for c in report["checks"])==8 and sum(c["status"]=="failed" for c in report["checks"])==5
assert all("Missing exact visible feedback" in c["error"] for c in report["checks"] if c["status"]=="failed")
assert report["browserExit"]=={"code":0,"signal":None} and "cleanupError" not in report
negative=["baseline-controller.json","baseline-console.log","baseline-receiving","native-source-preflight.json","run-native-receiving.py","baseline-receiving-proof.json"]
run(["git","add","--"]+negative)
run(["git","-c","user.name=HAMON mac_production","-c","user.email=hamon-ultra-ab529ac65023@localhost","commit","-m","Preserve actual feedback baseline: five missing-label failures and eight passing controls"])
baseline_commit=run(["git","rev-parse","HEAD"])["stdout"].strip()
assert not run(["git","ls-files","--","candidate-input.json","prepare-candidate.py"])["stdout"],"Candidate leaked into baseline custody"
print(json.dumps({"baselineCustodyCommit":baseline_commit,"baselineTests":{"passed":8,"failed":5}}),flush=True)
raw=(root/"candidate-input.json").read_bytes()
assert hashlib.sha256(raw).hexdigest()=="8729b0d5f8cdc810a2c6e6a2138ae6475a4cfc4a6860cedff0645dc280032cea"
candidate=json.loads(raw)
manifest=json.loads((root/"source-transfer.json").read_bytes())
carried=[entry for entry in manifest["files"] if entry["path"].startswith("baseline-source/")]
baseline=root/"baseline-source"
relative=[entry["path"][len("baseline-source/"):] for entry in carried]
assert sorted(str(p.relative_to(baseline)) for p in baseline.rglob("*") if p.is_file())==sorted(relative)
for entry,rel in zip(carried,relative):
 assert hashlib.sha256((baseline/rel).read_bytes()).hexdigest()==entry["sha256"],rel
dest=root/"candidate-source"
assert not dest.exists()
shutil.copytree(baseline,dest)
app=candidate["application"].encode("utf-8")
assert hashlib.sha256(app).hexdigest()==candidate["applicationPin"]["sha256"]
(dest/"src/app.mjs").write_bytes(app)
checks=[run(["/usr/bin/node","--check",str(dest/"src/app.mjs")]),run(["python3",str(dest/"tools/make_demo.py")])]
demo=(dest/"demo.html").read_bytes()
assert len(demo)==candidate["expectedDemo"]["bytes"] and hashlib.sha256(demo).hexdigest()==candidate["expectedDemo"]["sha256"]
changed=[];pins={}
for entry,rel in zip(carried,relative):
 b=(dest/rel).read_bytes()
 pins[rel]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()}
 if pins[rel]["sha256"]!=entry["sha256"]: changed.append(rel)
assert sorted(changed)==["demo.html","src/app.mjs"]
patch="".join(difflib.unified_diff((baseline/"src/app.mjs").read_text().splitlines(True),app.decode().splitlines(True),fromfile="a/src/app.mjs",tofile="b/src/app.mjs"))
(root/"candidate-app.patch").write_text(patch)
receipt={"version":1,"preparedAfterActualBaseline":True,"baselineCustodyCommit":baseline_commit,"time":datetime.datetime.now(datetime.timezone.utc).isoformat(),"changedPaths":changed,"sourcePins":pins,"checks":checks,"productionScope":"Only renderAnswerFeedback adds two escaped visible canonical answer paragraphs; unchanged maintained Python builder regenerated demo.","otherSourceBytesIdentical":True,"browserCandidateExecuted":False,"independentReceiverReview":candidate["independentReceiverReview"]}
(root/"candidate-source-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
run(["git","add","--","candidate-input.json","prepare-candidate.py","candidate-source","candidate-app.patch","candidate-source-receipt.json"])
run(["git","-c","user.name=HAMON mac_production","-c","user.email=hamon-ultra-ab529ac65023@localhost","commit","-m","Add visible first-pass answer identities and rebuild standalone learner"])
candidate_commit=run(["git","rev-parse","HEAD"])["stdout"].strip()
print(json.dumps({"baselineCustodyCommit":baseline_commit,"candidateSourceCommit":candidate_commit,"changedPaths":changed,"app":pins["src/app.mjs"],"demo":pins["demo.html"],"receiver":pins["tools/check_answer_feedback_browser.mjs"],"checks":checks,"browserCandidateExecuted":False}))
