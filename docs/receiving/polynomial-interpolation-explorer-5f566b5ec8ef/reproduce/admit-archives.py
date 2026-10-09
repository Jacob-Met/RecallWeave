from pathlib import Path,PurePosixPath
import base64,hashlib,zipfile,io,json,datetime
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');I=R/'intake'
wanted={'native-packet-v1.zip':('527363673875aeb20bec831561d283e22daf435d5c603d8b2f1a9ef8766e2947',86731,36),'prose-successor-v1.zip':('3c60fe20e49c69c8bb46448d9fca597009546cfa738d24a725b65c13a3b82f97',9295,5)}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archives':{}}
for name,(sha,n,count) in wanted.items():
 b=base64.b64decode((I/(name+'.base64')).read_text());assert len(b)==n and hashlib.sha256(b).hexdigest()==sha
 target=I/name;assert not target.exists();target.write_bytes(b)
 with zipfile.ZipFile(io.BytesIO(b)) as z:
  names=z.namelist();assert len(names)==count and len(names)==len(set(names))
  rows=[]
  for p in names:
   pp=PurePosixPath(p);assert not pp.is_absolute() and '..' not in pp.parts
   bb=z.read(p);q=I/name.removesuffix('.zip')/p;q.parent.mkdir(parents=True,exist_ok=True);assert not q.exists();q.write_bytes(bb)
   rows.append({'path':p,'bytes':len(bb),'sha256':hashlib.sha256(bb).hexdigest()})
  out['archives'][name]={'sha256':sha,'files':rows}
(I/'archive-intake.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
