from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,os,time,shutil
root=Path('/home/jacob/recallweave-information-5f566b5ec8ef');source=root/'source';peer=root/'evidence/peer'
packet=json.loads((peer/'baseline-source-packet.json').read_text())
assert shutil.disk_usage(root).free > 10_000_000
rows=[]
for item in packet['files']:
    path=source/item['path'];raw=item['content'].encode('utf-8');expected=item['expected']
    blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    assert blob==expected['sha'] and len(raw)==expected['size'],item['path']
    assert expected['mode'] in ('100644','100755')
    if path.exists(): assert path.is_file() and path.read_bytes()==raw,('refuse existing differing source',item['path'])
    rows.append({'path':item['path'],'git_blob':blob,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'mode':expected['mode'],'original_contract_blob':item['original']['sha'] if item.get('original') else None})
for item in packet['files']:
    path=source/item['path'];path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():path.write_text(item['content'],encoding='utf-8',newline='')
    os.chmod(path,0o755 if item['expected']['mode']=='100755' else 0o644)
    assert path.read_bytes()==item['content'].encode('utf-8')
def git(*args):
    return subprocess.check_output(['git',*args],cwd=source,text=True).strip()
if not (source/'.git').exists():
    subprocess.run(['git','init','-q'],cwd=source,check=True)
assert not git('diff','--cached','--name-only'),'Another staged contribution exists; do not commit it'
head=subprocess.run(['git','rev-parse','--verify','HEAD'],cwd=source,capture_output=True,text=True)
assert head.returncode != 0,('Unexpected existing commit; stop before baseline stage',head.stdout)
paths=[x['path'] for x in rows]
git('add','--',*paths)
assert sorted(git('diff','--cached','--name-only').splitlines())==sorted(paths)
git('-c','user.name=HAMON native receiver','-c','user.email=hamon@localhost','commit','-m','Receive exact RecallWeave learner baseline from current 1c8ece27')
commit=git('rev-parse','HEAD')
tracked=git('ls-tree','-r','HEAD').splitlines()
assert len(tracked)==len(rows)
for row in rows:
    assert git('rev-parse',f"HEAD:{row['path']}")==row['git_blob']
record={'schema':'recallweave.information-theory.current-input-intake.v1','utc':datetime.now(timezone.utc).isoformat(),
        'canonical_commit':packet['canonicalCommit'],'canonical_tree':packet['canonicalTree'],'canonical_total_leaves':2865,
        'original_contract_commit':packet['originalContractCommit'],'original_contract_unchanged':True,
        'native_baseline_commit':commit,'paths':rows,'unchanged_original_paths':packet['unchangedOriginalPaths'],
        'scope':'16 exact current inputs, not a hydrated2865-leaf repository. Native baseline commit stages only these explicit paths. New information-theory source is root-owned and was neither read nor staged.',
        'workflow_status':'All five current workflow definitions received exactly; push/main and pull_request triggers observed, none subscribed to issue/issue_comment. No workflow/source publication or execution.',
        'missing_optional_reads':['No package.json or AGENTS.md exists in this canonical full tree; 404 retained as observation, no dependency install attempted.'],
        'preserved_nonbaseline_pathnames':git('ls-files','--others','--exclude-standard').splitlines()}
print(json.dumps({'intake':'success','native_baseline_commit':commit,'paths':len(rows),'untracked_path_count':len(record['preserved_nonbaseline_pathnames'])}),flush=True)
(peer/'baseline-intake-receipt.json').write_text(json.dumps(record,indent=2)+'\n')
cmd=['node','--test','tests/deck.test.mjs','tests/knowledge.test.mjs','tests/review.test.mjs']
start=time.monotonic()
run=subprocess.run(cmd,cwd=source,capture_output=True,text=True,timeout=90)
receipt={'schema':'recallweave.information-theory.native-learner-baseline.v1','command':cmd,'exit':run.returncode,'seconds':time.monotonic()-start,'native_baseline_commit':commit,'node':subprocess.check_output(['node','--version'],text=True).strip(),'stdout_tail':run.stdout[-2200:],'stderr_tail':run.stderr[-1000:]}
print(json.dumps(receipt),flush=True)
(peer/'baseline-node.stdout').write_text(run.stdout);(peer/'baseline-node.stderr').write_text(run.stderr)
(peer/'baseline-node-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
raise SystemExit(run.returncode)
