import pathlib,json,hashlib,datetime,subprocess,os,time
r=pathlib.Path(r'C:\Users\minec\hamon-recall-first-independent-f3d1a0c556df')
owner=pathlib.Path(r'C:\Users\minec\hamon-recall-first-f3d1a0c556df')
freeze=owner/'evidence/CANDIDATE_FREEZE.json'
assert hashlib.sha256(freeze.read_bytes()).hexdigest()=='178ffe6f72792159a9abbaba04bacdbcd24c4361a92e4021420193bd37c588fa'
source=owner/'source';d=r/'candidate';d.mkdir()
pins={'recall-first.mjs':'21c62bfe9a918338ac4365453bbf5dc23bc899e5c966a9778bb2e4de36713e72','deck.mjs':'621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b'}
for name,digest in pins.items():
 b=(source/'src'/name).read_bytes();assert hashlib.sha256(b).hexdigest()==digest
 (d/name).write_bytes(b)
(r/'CANDIDATE_FREEZE.json').write_bytes(freeze.read_bytes())
node=pathlib.Path(r'C:\Users\minec\hamon-recall-locale-f3d1a0c556df\deps\playwright\driver\node.exe')
assert hashlib.sha256(node.read_bytes()).hexdigest()=='ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32'
assert hashlib.sha256((r/'receiver.mjs').read_bytes()).hexdigest()=='603851817e6a5dbeb87b7819c9ae1cb99c718b35970ddcf0e7d4914fa74bf719'
env=os.environ.copy();env['RECALL_FIRST_MODULE']=str(d/'recall-first.mjs')
cmd=[str(node),'--test',str(r/'receiver.mjs')]
start=time.monotonic();p=subprocess.run(cmd,env=env,cwd=r,capture_output=True,timeout=30)
(r/'receiver.stdout').write_bytes(p.stdout);(r/'receiver.stderr').write_bytes(p.stderr)
unchanged=all(hashlib.sha256((source/'src'/name).read_bytes()).hexdigest()==digest for name,digest in pins.items())
report={'schema':'hamon.recall-first-independent-state-receipt.v1','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pre_candidate_freeze_sha256':hashlib.sha256((r/'PRE_CANDIDATE_FREEZE.json').read_bytes()).hexdigest(),'author_freeze_sha256':hashlib.sha256(freeze.read_bytes()).hexdigest(),'candidate_pins':pins,'command':cmd,'environment_module':env['RECALL_FIRST_MODULE'],'node_sha256':hashlib.sha256(node.read_bytes()).hexdigest(),'exit':p.returncode,'seconds':round(time.monotonic()-start,4),'author_source_unchanged':unchanged,'receiver_sha256':hashlib.sha256((r/'receiver.mjs').read_bytes()).hexdigest(),'stdout_sha256':hashlib.sha256(p.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(p.stderr).hexdigest(),'passed':p.returncode==0 and unchanged}
b=(json.dumps(report,indent=2)+'\n').encode();(r/'receiving-receipt.json').write_bytes(b)
print(json.dumps({'receipt':str(r/'receiving-receipt.json'),'sha256':hashlib.sha256(b).hexdigest(),'result':report,'stdout':p.stdout.decode('utf-8','replace'),'stderr':p.stderr.decode('utf-8','replace')}),flush=True)
raise SystemExit(p.returncode)
