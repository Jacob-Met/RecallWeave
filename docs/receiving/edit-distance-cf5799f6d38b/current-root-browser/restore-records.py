from pathlib import Path
import base64,gzip,json,hashlib,os,sys
HERE=Path(__file__).resolve().parent
target=Path(sys.argv[1]);target.mkdir(parents=True,exist_ok=False)
def pin(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}
meta=json.loads((HERE/'records-manifest.json').read_bytes());payload=(HERE/'records.json.gz.b64').read_bytes()
assert pin(payload)==meta['archive']
raw=gzip.decompress(base64.b64decode(payload,validate=False));assert pin(raw)==meta['decoded_json']
a=json.loads(raw);assert a['records']==meta['records']
for e in a['records']:
 p=Path(e['path']);assert not p.is_absolute() and '..' not in p.parts
 b=base64.b64decode(a['blobs'][e['sha256']],validate=True);assert all(pin(b)[k]==e[k] for k in ('bytes','sha256','git_blob'))
 o=target/p;o.parent.mkdir(parents=True,exist_ok=True);o.write_bytes(b);os.chmod(o,0o755 if e['mode']=='100755' else 0o644)
 assert o.read_bytes()==b
print(json.dumps({'restored_records':len(a['records']),'unique_streams':len(a['blobs']),'all_exact':True,'target':str(target)},sort_keys=True))
