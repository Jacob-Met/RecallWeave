from pathlib import Path
import json,hashlib,datetime
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');S=R/'source'
paths=['src/polynomial-interpolation-ui.mjs','templates/polynomial-interpolation-explorer.html','courses/polynomial-interpolation-explorer.html','tools/build-polynomial-interpolation-explorer.mjs','tests/polynomial-interpolation-ui.test.mjs','docs/polynomial-interpolation-explorer.md']
files={p:{'bytes':(S/p).stat().st_size,'sha256':hashlib.sha256((S/p).read_bytes()).hexdigest()} for p in paths}
baseline=json.loads((R/'evidence/baseline-source.json').read_text())['files']
for p,row in baseline.items():assert hashlib.sha256((S/p).read_bytes()).hexdigest()==row['sha256'],p
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,'baseline11Exact':True,'nodeNewControls':9,'build':{'bytes':54647,'sha256':'0e239f3c4b7f4e0b54cdb272c051d0b324284eb5fb89f04928fc63ccac014d2c'},'scope':'Candidate prior to first new actual browser invocation; original13+6 suites not replayed.'}
(R/'evidence/source-freeze-v1.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
