from pathlib import Path
import json,hashlib,subprocess,time
r=Path(__file__).resolve().parent;p=json.loads((r/'product-first.json').read_text(encoding='utf-8-sig'))
(r/'evidence/course-questions-blind.json').write_bytes((json.dumps(p['blind'],ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
(r/'evidence/setup-first-failure.json').write_text(json.dumps(p['setupFailure'],indent=2),encoding='utf-8')
for f in p['files']:
 q=r/'source'/f['path'];assert not q.exists(),q;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(f['content'].encode('utf-8'))
start=time.monotonic();z=subprocess.run(['C:/Program Files/nodejs/node.exe','--test','tests/diffusion-stencil.test.mjs'],cwd=r/'source',capture_output=True,text=True,encoding='utf-8')
(r/'evidence/core-first.stdout').write_text(z.stdout,encoding='utf-8');(r/'evidence/core-first.stderr').write_text(z.stderr,encoding='utf-8')
out={'exit':z.returncode,'duration':time.monotonic()-start,'source':[{'path':f['path'],'sha256':hashlib.sha256((r/'source'/f['path']).read_bytes()).hexdigest()} for f in p['files']],'blind_sha256':hashlib.sha256((r/'evidence/course-questions-blind.json').read_bytes()).hexdigest(),'stdout':z.stdout,'stderr':z.stderr}
(r/'evidence/core-first.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out))
