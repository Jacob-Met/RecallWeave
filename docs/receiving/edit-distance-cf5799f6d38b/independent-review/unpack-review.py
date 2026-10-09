from pathlib import Path
import base64,gzip,hashlib,json,sys
root=Path(__file__).resolve().parent
out=Path(sys.argv[1]).resolve()
out.mkdir(parents=True,exist_ok=False)
data=json.loads((root/'records.json').read_bytes())
objects={}
for key,record in data['objects'].items():
 b=gzip.decompress(base64.b64decode(record['data'],validate=True))
 assert len(b)==record['bytes'] and hashlib.sha256(b).hexdigest()==key==record['sha256']
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==record['git_blob']
 objects[key]=b
for record in data['files']:
 rel=Path(record['path'])
 assert not rel.is_absolute() and '..' not in rel.parts
 b=objects[record['object']]
 assert len(b)==record['bytes'] and hashlib.sha256(b).hexdigest()==record['sha256']
 p=out/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 p.chmod(0o755 if record['mode']=='100755' else 0o644)
print(json.dumps({'restored_files':len(data['files']),'unique_byte_streams':len(objects),'destination':str(out),'all_hashes_verified':True}))
