from pathlib import Path
import argparse,hashlib,json
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
s=Path(__file__).resolve().parent/'evidence/peer-mac/fraction-oracle.py'
raw=s.read_bytes();assert hashlib.sha256(raw).hexdigest()=='6a0eeb97125fa5edac2e113447ce2cd4db4515e6e0d12daa8c626e5ad729d7a7'
prefix=raw.decode('utf-8').split("(root/'oracle-expected.json').write_text")[0]
namespace={};exec(compile(prefix,str(s),'exec'),namespace)
a.output.mkdir(parents=True,exist_ok=False)
b=(json.dumps(namespace['result'],separators=(',',':'))+'\r\n').encode('utf-8')
assert hashlib.sha256(b).hexdigest()=='affbb83c5a4022c455fa8149f9510449e8f72e9becde1fbb79954f559421bdce'
(a.output/'oracle-expected.json').write_bytes(b)
print(json.dumps({'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}))
