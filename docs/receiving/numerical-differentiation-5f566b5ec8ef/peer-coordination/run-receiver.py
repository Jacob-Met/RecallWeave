from pathlib import Path
import subprocess,time,json,hashlib,datetime
r=Path('D:/HAMON/recallweave-differentiation-5f566b5ec8ef/evidence/peer-coordination')
t=time.monotonic()
with (r/'receiver-first.stdout').open('wb') as out,(r/'receiver-first.stderr').open('wb') as err:
 p=subprocess.run(['C:/Program Files/nodejs/node.exe',str(r/'compare-model.mjs')],stdout=out,stderr=err,timeout=90)
rec={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':p.returncode,'seconds':time.monotonic()-t,'receiverSHA256':hashlib.sha256((r/'compare-model.mjs').read_bytes()).hexdigest()}
(r/'receiver-first-process.json').write_text(json.dumps(rec,indent=2)+'\n',encoding='utf-8');print(json.dumps(rec))
