from pathlib import Path
import json,hashlib,subprocess,time
r=Path(__file__).resolve().parent;files=json.loads((r/'ui-first.json').read_text(encoding='utf-8-sig'))
for f in files:
 p=r/'source'/f['path'];assert not p.exists(),p;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(f['content'].encode('utf-8'))
results=[]
for args in [['tools/build-diffusion-stencil.mjs'],['--test','tests/diffusion-stencil-build.test.mjs']]:
 t=time.monotonic();z=subprocess.run(['C:/Program Files/nodejs/node.exe',*args],cwd=r/'source',capture_output=True,text=True,encoding='utf-8');results.append({'args':args,'exit':z.returncode,'duration':time.monotonic()-t,'stdout':z.stdout,'stderr':z.stderr})
 if z.returncode:break
out={'results':results,'source':[{'path':f['path'],'sha256':hashlib.sha256((r/'source'/f['path']).read_bytes()).hexdigest()} for f in files]}
(r/'evidence/ui-build-first.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out))
