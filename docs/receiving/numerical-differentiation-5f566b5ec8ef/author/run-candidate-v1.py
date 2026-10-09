from pathlib import Path
import subprocess,json,hashlib,datetime
root=Path('D:/HAMON/recallweave-differentiation-5f566b5ec8ef');source=root/'source';e=root/'evidence'/'candidate-v1';e.mkdir()
node='C:/Program Files/nodejs/node.exe';results=[]
for name,cmd in [('build',[node,'tools/build-numerical-differentiation.mjs']),('focused',[node,'--test','tests/numerical-differentiation.test.mjs','tests/numerical-differentiation-course.test.mjs']),('builder-check',[node,'tools/build-numerical-differentiation.mjs','--check'])]:
 r=subprocess.run(cmd,cwd=source,capture_output=True);(e/(name+'.stdout')).write_bytes(r.stdout);(e/(name+'.stderr')).write_bytes(r.stderr);results.append({'name':name,'command':cmd,'exit':r.returncode})
 if r.returncode:break
pins=[]
for p in sorted(source.rglob('*')):
 if p.is_file() and '.git' not in p.parts:
  b=p.read_bytes();pins.append({'path':p.relative_to(source).as_posix(),'size':len(b),'sha256':hashlib.sha256(b).hexdigest(),'blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()})
out={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':results,'source':pins}
(e/'receipt.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8')
print(json.dumps({'results':results,'productPins':[x for x in pins if 'numerical-differentiation' in x['path']]}))
