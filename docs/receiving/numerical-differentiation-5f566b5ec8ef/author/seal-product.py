from pathlib import Path
import json,hashlib,subprocess,datetime
root=Path('D:/HAMON/recallweave-differentiation-5f566b5ec8ef');s=root/'source';e=root/'evidence'
original=json.loads((e/'original-inputs.json').read_text(encoding='utf8'))
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
for r in original['files']:
 b=(s/r['path']).read_bytes();assert sha(b)==r['sha256'] and blob(b)==r['blob']
owned=['src/numerical-differentiation.mjs','src/numerical-differentiation-ui.mjs','courses/numerical-differentiation.json','courses/numerical-differentiation.md','courses/numerical-differentiation-lab.template.html','courses/numerical-differentiation-lab.html','tools/build-numerical-differentiation.mjs','tools/check-numerical-differentiation-browser.py','tests/numerical-differentiation.test.mjs','tests/numerical-differentiation-course.test.mjs']
canon={x['path']:x for x in json.loads((e/'tree.json').read_text(encoding='utf8'))['tree'] if x['type']=='blob'}
assert all(p not in canon for p in owned)
pins=[]
for p in owned:
 b=(s/p).read_bytes();pins.append({'path':p,'size':len(b),'sha256':sha(b),'blob':blob(b),'mode':'100644'})
r=subprocess.run(['git','add','--']+owned,cwd=s,capture_output=True);assert r.returncode==0,r.stderr
r=subprocess.run(['git','-c','user.name=ChatGPT HAMON worker','-c','user.email=chatgpt+5f566b5ec8ef@local.invalid','commit','-m','Add exact sampled-slope course and standalone differentiation lab'],cwd=s,capture_output=True);assert r.returncode==0,r.stderr
out={'canonicalMain':original['canonical'],'nativePartialProjection':True,'originalInputCount':len(original['files']),'originalInputsUnchanged':True,'productPaths':pins,'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=s,text=True).strip(),'tree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=s,text=True).strip(),'status':subprocess.check_output(['git','status','--porcelain'],cwd=s,text=True),'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(e/'product-freeze.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8')
print(json.dumps(out))
