import pathlib,json,os,hashlib,subprocess,time,sys
base=pathlib.Path(__file__).parent
source=pathlib.Path(r'D:\hamon-course-receiving-dc7255e161d3\source')
receiver=pathlib.Path(sys.argv[1])
expected=sys.argv[2]
receiver_before=receiver.read_bytes()
assert hashlib.sha256(receiver_before).hexdigest()==expected
prefix=sys.argv[3] if len(sys.argv)>3 else 'native-v1'
run=base/prefix
run.mkdir()
(run/'tmp').mkdir()
(run/'profiles').mkdir()
manifest=json.loads((source.parent/'expected-loss-v1/browser-receipt.json').read_text(encoding='utf8'))['sourceFiles']
before={r['path']:hashlib.sha256((source/r['path']).read_bytes()).hexdigest() for r in manifest}
assert all(before[r['path']]==r['sha256'] for r in manifest)
env=os.environ.copy()
env.update(TMP=str(run/'tmp'),TEMP=str(run/'tmp'),TMPDIR=str(run/'tmp'),RECALL_COURSE_PROFILE_ROOT=str(run/'profiles'))
receipt={'schema':'recallweave.selected-course-independent-controls.v1','owner':'dc7255e161d3/estate_runtime','receiver':str(receiver),'receiver_sha256':expected,'node':r'C:\Program Files\nodejs\node.exe','browser':r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe','source':str(source),'sourceFiles':manifest,'controls':[]}
try:
 for name in ['one-question','two-question']:
  fixture=base/(name+'.json')
  b=fixture.read_bytes()
  output=run/name
  command=[receipt['node'],str(receiver),str(source),str(fixture),str(output),receipt['browser']]
  start=time.monotonic()
  with (run/(name+'.stdout')).open('wb') as out,(run/(name+'.stderr')).open('wb') as err:
   p=subprocess.Popen(command,env=env,stdout=out,stderr=err)
   (run/(name+'.running.json')).write_text(json.dumps({'pid':p.pid,'command':command,'output':str(output)},indent=2)+'\n',encoding='utf8',newline='')
   code=p.wait()
  result={'fixture':name,'fixture_sha256':hashlib.sha256(b).hexdigest(),'fixture_bytes':len(b),'command':command,'pid':p.pid,'exit':code,'elapsed_seconds':time.monotonic()-start,'output':str(output)}
  if (output/'browser-receipt.json').exists():
   native=json.loads((output/'browser-receipt.json').read_text(encoding='utf8'))
   result.update(passed=sum(bool(x['passed']) for x in native['checks']),failed=[x['name'] for x in native['checks'] if not x['passed']],fatal=native['fatal'],sessions=[x['name'] for x in native['sessions']],download_count=len(native['downloads']),cleanup=native['cleanup'],lifecycle=native.get('browserLifecycle'))
  receipt['controls'].append(result)
  print(json.dumps(result),flush=True)
  if code: break
finally:
 receipt['receiver_unchanged']=receiver.read_bytes()==receiver_before
 receipt['source_unchanged']=all(hashlib.sha256((source/k).read_bytes()).hexdigest()==v for k,v in before.items())
 receipt['all_controls_passed']=len(receipt['controls'])==2 and all(x['exit']==0 and x.get('passed')==21 and not x.get('failed') and not x.get('fatal') and x.get('download_count')==4 and all(x['cleanup'].values()) for x in receipt['controls'])
 (run/'independent-controls.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8',newline='')
 print(json.dumps({'receipt':str(run/'independent-controls.json'),'all_controls_passed':receipt['all_controls_passed'],'source_unchanged':receipt['source_unchanged'],'receiver_unchanged':receipt['receiver_unchanged']}),flush=True)
sys.exit(0 if receipt['all_controls_passed'] and receipt['source_unchanged'] and receipt['receiver_unchanged'] else 1)
