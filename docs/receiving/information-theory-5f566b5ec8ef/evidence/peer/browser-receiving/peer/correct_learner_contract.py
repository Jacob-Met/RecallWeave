from pathlib import Path
import json,hashlib,shutil
r=Path("D:/HAMON/recallweave-information-peer-5f566b5ec8ef")
saved=r/"evidence/browser-navigation30/harness"
assert not saved.exists()
saved.mkdir()
for p in (r/"peer").glob("*.py"): shutil.copy2(p,saved/p.name)
p=r/"peer/learner_phase.py"; old=p.read_text(encoding="utf-8")
assert hashlib.sha256(p.read_bytes()).hexdigest()=="9120ab8402e08d872eb405e4c04dbae97b1da5605a528c5f0366a5aa1cfc3777"
start=old.index('    expect(page.locator("#start-button")).to_be_visible()')
end=old.index('    seen = set()',start)
replacement='    expect(page.locator(".question-card h2")).to_be_visible()\n    checks.append("Explicit Start this deck begins the imported questions directly in the unchanged learner")\n'
new=old[:start]+replacement+old[end:]
new=new.replace('    original_estimates = page.locator(".mastery-box output").all_text_contents()','    expect(page.locator(".mastery-box output")).to_have_count(len(deck["concepts"]))\n    original_estimates = page.locator(".mastery-box output").all_text_contents()')
p.write_text(new,encoding="utf-8",newline="\n")
receipt={"parentPhase":"browser-navigation30","productChange":False,"helperSHA256":hashlib.sha256(p.read_bytes()).hexdigest(),"finding":"Receiver and guide incorrectly expected a second Start after imported Start this deck. Exact unchanged demo callback resets the session then invokes renderQuestion immediately.","sourceProof":{"demoGitBlob":"ef7bc3e27e7f161d917ced6a457fad8822802f3f","lines":1579,"callback":"nextDeck => { resetSession(nextDeck); renderQuestion(); }"},"changes":"Remove nonexistent imported welcome Start requirement; require actual first-question heading. Require5 mastery outputs before comparing later values. No answer/explanation/notes assertions removed.","scope":"Replay only unfinished learner flow with original downloaded course; twelve completed lab cases remain retained without replay.","initialCorrectionAttempt":"PowerShell parse error before Python invocation; no source or helper mutation from that attempt."}
print(json.dumps(receipt),flush=True)
(r/"evidence/learner-contract-correction.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
