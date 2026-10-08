import pathlib,json,hashlib,datetime,subprocess,shutil
r=pathlib.Path(r'C:\Users\minec\hamon-recall-first-independent-f3d1a0c556df')
node=pathlib.Path(r'C:\Users\minec\hamon-recall-locale-f3d1a0c556df\deps\playwright\driver\node.exe')
files=[]
for name in ['contract.json','fixture-deck.json','baseline-deck.mjs','receiver.mjs']:
 b=(r/name).read_bytes();files.append({'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
b=(r/'baseline-deck.mjs').read_bytes()
assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='f0f8a4b234489c2388f427633f548d56c6ed4c03'
syntax=subprocess.run([str(node),'--check',str(r/'receiver.mjs')],capture_output=True)
(r/'syntax.stdout').write_bytes(syntax.stdout);(r/'syntax.stderr').write_bytes(syntax.stderr)
assert syntax.returncode==0
report={'schema':'hamon.recall-first-independent-freeze.v1','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidate_implementation_seen':False,'semantic_test_groups':8,'files':files,'baseline_validator_git_blob':'f0f8a4b234489c2388f427633f548d56c6ed4c03','node':{'path':str(node),'sha256':hashlib.sha256(node.read_bytes()).hexdigest(),'version':'v24.21.0'},'syntax_exit':syntax.returncode,'candidate_tests_executed':False,'free_bytes':shutil.disk_usage(r).free,'effects':'Own isolated LA7 receiver files only; no ThinkPad/scratch writes.'}
b=(json.dumps(report,indent=2)+'\n').encode();(r/'PRE_CANDIDATE_FREEZE.json').write_bytes(b)
print(json.dumps({'root':str(r),'freeze_sha256':hashlib.sha256(b).hexdigest(),'files':files,'node_sha256':report['node']['sha256']}),flush=True)
