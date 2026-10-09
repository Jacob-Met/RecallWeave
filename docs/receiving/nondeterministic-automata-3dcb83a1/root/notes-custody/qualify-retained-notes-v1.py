import ctypes,datetime,hashlib,json,re,shutil
from pathlib import Path
root=Path(r"C:\Users\jacob\recallweave-nfa-3dcb83a1");peer=Path(r"C:\Users\jacob\recallweave-nfa-independent-3dcb83a1")
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
class M(ctypes.Structure):
 _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),("total",ctypes.c_ulonglong),("available",ctypes.c_ulonglong),("page_total",ctypes.c_ulonglong),("page_available",ctypes.c_ulonglong),("virtual_total",ctypes.c_ulonglong),("virtual_available",ctypes.c_ulonglong),("extended",ctypes.c_ulonglong)]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m));disk=shutil.disk_usage(root).free
assert m.available>=2147483648 and disk>=38654705664
paths={"course":root/"source/courses/nondeterministic-automata.json","result":root/"notes-followup-v1/result.json","notes":root/"notes-followup-v1/downloads/recallweave-study-notes-2026-10-09.txt","observation":root/"notes-followup-postexit-observation-v1.json","investigation":root/"notes-custody-investigation-v1.json","learner":peer/"product-received-v1/demo.html"}
before={k:pin(p.read_bytes()) for k,p in paths.items()}
assert before["course"]["sha256"]=="71594563286bdacaa476f414e41fba08f5678e3a7f98f2f03cdfdacbc9d0c875"
assert before["result"]["sha256"]=="ae884eb15a90e6cabf9c9a36848db7ee710248cf9d4ccd93c5724f454ae5df45"
assert before["notes"]["sha256"]=="96362b05ad731e5c0766a3c412f85047d6f15cea6dbaf2f4aa48d645cbca5299"
deck=json.loads(paths["course"].read_bytes());r=json.loads(paths["result"].read_bytes());notes=paths["notes"].read_bytes().decode();obs=json.loads(paths["observation"].read_bytes())
assert r["passed"]==25 and r["failed"]==1 and r["accepted"] is False
assert r["browser_exit"]=={"code":0,"signal":None} and not r["cleanup_fallback"]
assert not r["page_exceptions"] and not r["page_http_requests"]
fail=[x for x in r["checks"] if not x["passed"]];assert len(fail)==1 and fail[0]["label"]=="live notes sha256"
assert fail[0]["actual"]==before["notes"]["sha256"] and before["notes"]==obs["postexit_notes"]
begin=[e for e in r["download_events"] if e["method"]=="Browser.downloadWillBegin"];assert len(begin)==1
completed=[e for e in r["download_events"] if e["method"]=="Browser.downloadProgress" and e["params"]["state"]=="completed"]
assert len(completed)==1 and begin[0]["params"]["guid"]==completed[0]["params"]["guid"]
assert completed[0]["params"]["receivedBytes"]==completed[0]["params"]["totalBytes"]==10967
assert "Saved: 2026-10-09T06:04:37.614Z" in notes
assert "9 of 12 connections correct on the first try." in notes and "Complete: 3 of 3 practice answers recorded; 3 correct on retry." in notes
responses={x["id"]:x for x in r["learner"]["responses"]}
assert len(responses)==12 and sorted(x for x,v in responses.items() if not v["correct"])==["nfa-03","nfa-07","nfa-11"]
assert r["learner"]["practiced"]==["nfa-03","nfa-07","nfa-11"]
sections=re.split(r"\n(?=\d+\. )",notes)[1:];assert len(sections)==12
content=[]
for q in deck["items"]:
 matches=[s for s in sections if s.split("\n",1)[0].split(". ",1)[1]==q["prompt"]];assert len(matches)==1
 s=matches[0];correct=responses[q["id"]]["correct"]
 expected=["Concept: "+q["concept"],"Correct answer: "+q["options"][q["answer"]],"Explanation: "+q["explanation"],"Apply the idea: "+q["transfer"],"First try: "+("correct" if correct else "needs review")]
 assert all(x in s for x in expected)
 practice="Practice answer: "+q["options"][q["answer"]]
 assert (practice in s)==(not correct) and ("Practice result: correct on retry" in s)==(not correct)
 content.append({"id":q["id"],"exact_prompt_concept_answer_explanation_transfer":True,"first_try_agrees_with_actual_UI_record":True,"practice_agrees_with_actual_UI_record":True})
assert deck["title"] in notes and deck["attribution"] in notes and deck["license"] in notes
source=paths["learner"].read_bytes().decode()
assert "exportedAt = new Date()" in source and ("Saved: $"+"{savedAt.toISOString()}") in source
assert not (peer/"browser-receiving-v1/downloads/recallweave-study-notes-2026-10-09.txt").exists()
assert before=={k:pin(p.read_bytes()) for k,p in paths.items()}
report={"schema":"recallweave.nfa.root-notes-custody-supplement.v1","prepared_by":"estate_continuity-3dcb83a1","disposition_author":"root-3dcb83a1","recorded_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"root_disposition":"Root explicitly accepts this scoped correction: retain the original cancellation and failed literal-hash oracle; qualify only the separately completed and retained new file by actual normal UI record, exact course content and its own live/post-exit pin. No further browser run or expected-pin rewrite.","root_message_quote":"Root accepts your proposed scoped notes disposition: preserve original cancellation and the failed literal-hash oracle (my contract was overstrict for an export that includes Saved:new Date).","accepted_scope":"Newly completed notes file, exact course content, recorded first-session/practice state, live and post-exit custody. Original 62 functional checks and their historical pre-close notes pin remain unchanged.","original_download":{"retained":False,"expected_bytes":10967,"expected_sha256":"4fe3e191422df634b41aa3f93aebc464b3bcc67eef6d66f0bbcf2fa8c4401e2f","history_state":2,"history_interrupt_reason":41,"interpretation":"CANCELLED / USER_SHUTDOWN; inspect-notes-custody-v1.py queried only the receiver-owned profile."},"single_followup":{"raw_accepted":False,"passed":25,"failed":1,"node_exit":2,"rdc_exit":1,"chrome_exit":r["browser_exit"],"cleanup_fallback":False,"failed_oracle_unchanged":fail[0],"download_begin":begin[0],"download_completed":completed[0],"notes_pin":before["notes"],"saved_line":"Saved: 2026-10-09T06:04:37.614Z","normal_first_correct":9,"normal_first_total":12,"wrong_ids":["nfa-03","nfa-07","nfa-11"],"practice_correct":3,"practice_total":3},"retained_content_correspondence":content,"source_timestamp_evidence":obs["source_excerpt"],"inputs":{k:{"path":str(paths[k]),**p} for k,p in before.items()},"all_inputs_unchanged":True,"additional_source_or_browser_execution":False,"reconstruction_or_expected_pin_rewrite":False,"limits":["The absent original file was not recovered.","The unavailable original body prevents proving that every old/new byte difference is solely its timestamp.","The original root acceptance documents and failed raw receiver result remain verbatim; this is an explicit correction, not relabeling.","The read-only content correspondence is a new retained-data check, not a second browser attempt.","No product source, browser protections or prompt handling changed."],"admission":{"available_memory":m.available,"disk_available":disk},"assembly_incident":"An orchestration ReferenceError caused by an unescaped JavaScript template interpolation occurred before this script was staged; no native effect resulted."}
b=(json.dumps(report,ensure_ascii=True,indent=2)+"\n").encode();p=root/"ROOT-NOTES-CUSTODY-SUPPLEMENT.json";assert not p.exists();p.write_bytes(b)
md="""# Root notes custody supplement

Prepared by estate_continuity-3dcb83a1 under root's explicit scoped disposition. This supplements the unchanged original ROOT-RECEIVING.md and ROOT-RECEIVING-v1.json; it does not rewrite their historical observations.

The original browser run passed 62 functional checks, including reading a 10,967-byte notes file before closing Chrome. Subsequent packaging found that file absent. A read-only query of that receiver's own Chrome History recorded state 2 and interrupt reason 41 (CANCELLED / USER_SHUTDOWN). No alternate was found in the bounded owned directory. The original claimed post-close custody of five downloads is therefore corrected: four original downloads are retained; the original notes are not.

Root authorized exactly one targeted follow-up using the unchanged learner, exact course, normal import/preview/start, 12 first answers (nfa-03/07/11 intentionally wrong) and three correct practice answers. Its raw outcome remains 25 passed / 1 failed, Node exit 2 and outer RDC exit 1. The sole failure was the contract's literal prior-file SHA. Chrome exited 0 without fallback cleanup. No second browser attempt occurred.

The follow-up observed Browser.downloadWillBegin and Browser.downloadProgress completed for the same GUID 2c6ab15e-e468-4716-a7d1-eacfc5cd878a, with 10,967 received bytes, before Chrome closure. Its SHA-256 was 96362b05ad731e5c0766a3c412f85047d6f15cea6dbaf2f4aa48d645cbca5299 while live and is identical after exit; Git blob ff73bb9a43258b0b553ff8d38ffbbed9a59c67e3. This separately reacquired physical file is preserved under the follow-up directory, never substituted into the missing original path.

The unchanged learner defaults exportedAt to new Date() (demo.html line 466) and writes the savedAt ISO timestamp (line 500); the normal Save notes handler at line 1495 supplies no timestamp override. The new file says Saved: 2026-10-09T06:04:37.614Z. Root acknowledges that its cross-run literal-hash contract was overstrict for this timestamped export. The failed expected hash is preserved. Because the original body is unavailable, we do not assert that every other old/new byte is identical.

A separate read-only retained-data comparison verifies all 12 exact prompts, concepts, correct answer text, explanations and transfer prompts against the frozen course. Every first-try and practice label agrees with the actual UI response record, including 9/12 first try and 3/3 correct practice. Title, attribution and license are present. All six inputs remained byte-identical. Full per-item results, actual completion events, source excerpts and pins are in ROOT-NOTES-CUSTODY-SUPPLEMENT.json.

Root's accepted scope is the independently completed new file's content and live/post-exit custody, alongside the unchanged original model and functional-browser receiving. No source repair, reconstructed download, protection change, expected-pin rewrite or extra browser run was performed.
"""
mp=root/"ROOT-NOTES-CUSTODY-SUPPLEMENT.md";assert not mp.exists();mp.write_bytes(md.encode())
print(json.dumps({"supplement_json":pin(b),"supplement_markdown":pin(mp.read_bytes()),"retained_content_items":len(content),"all_inputs_unchanged":True,"browser_rerun":False}))
