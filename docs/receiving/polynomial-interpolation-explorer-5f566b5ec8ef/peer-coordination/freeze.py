from pathlib import Path
import json,hashlib,datetime
R=Path(__file__).resolve().parent;C=Path(r'D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef/CONTRACT.json')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(C)=='6cdbaa928ae40306bd4bdf9449853a3edf9c11d84a670f451afee2f3671ad9d9'
d={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'contract_sha256':sha(C),'expectations_sha256':sha(R/'expectations.json'),'exposure':'contract only; no model/course/new UI/builder/tests read'}
with (R/'blind-freeze.json').open('x',encoding='utf-8') as f:json.dump(d,f,indent=2);f.write('\n')
print(json.dumps(d))
