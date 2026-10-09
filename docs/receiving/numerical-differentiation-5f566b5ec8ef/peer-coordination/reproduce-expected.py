"""Reproduce the frozen expected data into a NEW file; do not overwrite custody."""
from pathlib import Path
import argparse,hashlib,json
ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);args=ap.parse_args()
here=Path(__file__).parent;source=here/'fraction-oracle.py';target=Path(args.output)
assert not target.exists(),'Choose a new output file.'
raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()=='f35e883c3e9e0c62fc2445e70e393b4d978bc3b86552ab2e2a08c947dd76803d'
text=raw.decode('utf-8');marker='\ncontract=OWNER/'
assert text.count(marker)==1
# Only the unchanged mathematical prefix: no original custody/hash/freeze writes.
ns={'__file__':str(source)}
exec(compile(text.split(marker)[0],str(source),'exec'),ns)
data=(json.dumps(ns['payload'],ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
pin=hashlib.sha256(data).hexdigest()
assert pin=='c26ec8456bbeeb14d436ee856293ba6fddc77721541be722c679cbfcc3bfc349'
with target.open('xb') as stream:stream.write(data)
print(json.dumps({'path':str(target),'bytes':len(data),'sha256':pin}))
