from pathlib import Path
import hashlib,json,shutil,datetime
root=Path(r'C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df')
src=Path(r'C:\Users\minec\hamon-recall-first-f3d1a0c556df\candidate-v1')
mp=src.parent/'evidence'/'CANDIDATE_FREEZE.json'
b=mp.read_bytes()
assert hashlib.sha256(b).hexdigest()=='178ffe6f72792159a9abbaba04bacdbcd24c4361a92e4021420193bd37c588fa'
manifest=json.loads(b)
dst=root/'candidate'; dst.mkdir(exist_ok=False)
copied=[]
for row in manifest['files']:
 p=src/row['path']; data=p.read_bytes()
 assert len(data)==row['bytes']
 assert hashlib.sha256(data).hexdigest()==row['sha256']
 assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==row['git_blob']
 out=dst/row['path'];out.parent.mkdir(parents=True,exist_ok=True)
 with out.open('xb') as f:f.write(data)
 copied.append(row)
(root/'candidate-v1-freeze.json').write_bytes(b)
receipt={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':str(src),'destination':str(dst),'manifest_sha256':hashlib.sha256(b).hexdigest(),'files':copied,'capacity_free':shutil.disk_usage(root).free,'implementation_read_after_blind_freeze':True}
(root/'candidate-intake.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8')
print(json.dumps({'verified':len(copied),'free_bytes':receipt['capacity_free'],'intake_sha256':hashlib.sha256((root/'candidate-intake.json').read_bytes()).hexdigest()}))
