from pathlib import Path
import json,hashlib,subprocess,datetime
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');S=R/'source'
assert not (S/'.git').exists()
base=json.loads((R/'evidence/baseline-source.json').read_text(encoding='utf-8'))
for p,v in base['files'].items():assert hashlib.sha256((S/p).read_bytes()).hexdigest()==v['sha256'],p
log=[]
def git(*args):
 p=subprocess.run(['git','-c','user.name=ChatGPT HAMON worker','-c','user.email=chatgpt+5f566b5ec8ef@local.invalid',*args],cwd=S,capture_output=True,text=True,encoding='utf-8')
 log.append({'args':args,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr});assert p.returncode==0,p.stderr;return p.stdout.strip()
git('init');git('config','core.autocrlf','false');git('config','core.filemode','false')
git('add','--',*base['files']);git('commit','-m','Preserve accepted interpolation inputs and current learner receiving projection')
baseline=git('rev-parse','HEAD')
git('add','--','.');git('commit','-m','Add editable offline interpolation explorer over accepted exact model')
product=git('rev-parse','HEAD');tree=git('rev-parse','HEAD^{tree}')
r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':baseline,'product':product,'tree':tree,'projection':True,'baselineCount':len(base['files']),'log':log,'status':git('status','--porcelain')}
(R/'evidence/product-custody.json').write_bytes((json.dumps(r,indent=2)+'\n').encode('utf-8'))
print(json.dumps({k:r[k] for k in ['baseline','product','tree','status']}))
