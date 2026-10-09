from pathlib import Path
import subprocess,json,hashlib,time
r=Path(__file__).resolve().parent;p=r/'source/tests/diffusion-stencil.test.mjs';(r/'evidence/test-helper-before-correction.mjs').write_bytes(p.read_bytes())
p.write_bytes(json.loads((r/'test-helper-correction.json').read_text(encoding='utf-8-sig'))['test'].encode('utf-8'))
t=time.monotonic();z=subprocess.run(['C:/Program Files/nodejs/node.exe','--test','tests/diffusion-stencil.test.mjs'],cwd=r/'source',capture_output=True,text=True,encoding='utf-8')
(r/'evidence/core-second.stdout').write_text(z.stdout,encoding='utf-8');(r/'evidence/core-second.stderr').write_text(z.stderr,encoding='utf-8')
o={'exit':z.returncode,'duration':time.monotonic()-t,'test_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'model_sha256':hashlib.sha256((r/'source/src/diffusion-stencil.mjs').read_bytes()).hexdigest(),'stdout':z.stdout,'stderr':z.stderr}
(r/'evidence/core-second.json').write_text(json.dumps(o,indent=2),encoding='utf-8');print(json.dumps(o))
