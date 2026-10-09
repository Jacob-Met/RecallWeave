from pathlib import Path
import json,hashlib,subprocess,datetime
root=Path('D:/HAMON/recallweave-differentiation-5f566b5ec8ef')
p=json.loads((root/'intake-transfer.json').read_text(encoding='utf8'))
source=root/'source'; source.mkdir()
e=root/'evidence';e.mkdir()
for d in ['courses','tools','tests','src','data']: (source/d).mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
rows=[]
for x in p['inputs']:
 b=x['body'].encode();assert len(b)==x['size'] and blob(b)==x['sha'],x['path']
 f=source/x['path'];f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
 rows.append(dict(path=x['path'],size=len(b),sha256=sha(b),blob=blob(b),mode=x['mode']))
for x in p['workflows']:assert blob(x['body'].encode())==x['sha']
for key in ['tree','workflows','claim','nativeClaims']:(e/(key+'.json')).write_text(json.dumps(p[key],ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(e/'original-inputs.json').write_text(json.dumps({'canonical':p['base'],'partialProjection':True,'files':rows},indent=2)+'\n',encoding='utf8')
def run(cmd,name):
 r=subprocess.run(cmd,cwd=source,capture_output=True)
 (e/(name+'.stdout')).write_bytes(r.stdout);(e/(name+'.stderr')).write_bytes(r.stderr)
 return {'command':cmd,'exit':r.returncode,'stdoutSHA256':sha(r.stdout),'stderrSHA256':sha(r.stderr)}
git=['git','-c','user.name=ChatGPT HAMON worker','-c','user.email=chatgpt+5f566b5ec8ef@local.invalid']
for cmd in [['git','init'],['git','config','core.autocrlf','false'],['git','add','.'],git+['commit','-m','Receive exact current RecallWeave learner projection']]:
 r=subprocess.run(cmd,cwd=source,capture_output=True);assert r.returncode==0,r.stderr
receipt=run(['C:/Program Files/nodejs/node.exe','--test','tests/deck.test.mjs','tests/knowledge.test.mjs','tests/reflections.test.mjs','tests/review.test.mjs'],'baseline')
receipt.update(time=datetime.datetime.now(datetime.timezone.utc).isoformat(),inputs=len(rows),head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip(),newProductAbsent=not(source/'src/numerical-differentiation.mjs').exists())
(e/'baseline.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8');print(json.dumps(receipt))
