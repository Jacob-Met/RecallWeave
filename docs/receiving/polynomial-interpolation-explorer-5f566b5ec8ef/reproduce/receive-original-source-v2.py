from pathlib import Path
import json,hashlib,shutil,subprocess,datetime
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');I=R/'intake';S=R/'source'
assert not S.exists()
tree=json.loads((I/'current-main-tree.json').read_text())['tree'];by={x['path']:x for x in tree if x['type']=='blob'}
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
for archive in ['native-packet-v1','prose-successor-v1']:
 m=json.loads((I/archive/'MANIFEST.json').read_text())
 for row in (m['files'] if 'files' in m else [dict(v,path=k) for k,v in m['members'].items()]):
  p=I/archive/row['path'];b=p.read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
for p in (R/'current-inputs').rglob('*'):
 if p.is_file():
  rel=p.relative_to(R/'current-inputs').as_posix();assert blob(p.read_bytes())==by[rel]['sha'];q=S/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
for rel in ['src/polynomial-interpolation.mjs','tools/interpolate-polynomial.mjs','courses/polynomial-interpolation.md','tests/polynomial-interpolation.test.mjs','tests/polynomial-interpolation-receiving.test.mjs','tests/fixtures/polynomial-interpolation-receiving.json']:
 q=S/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(I/'native-packet-v1/candidate'/rel,q)
shutil.copy2(I/'prose-successor-v1/successor/courses/polynomial-interpolation.json',S/'courses/polynomial-interpolation.json')
rows={}
for p in sorted(S.rglob('*')):
 if p.is_file():
  b=p.read_bytes();rows[p.relative_to(S).as_posix()]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'gitBlob':blob(b)}
out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'projection':True,'canonicalMain':'ec07bf3989132130759e5c00c6cb02eef19709d3','canonicalLeaves':2933,'acceptedOwnerCustody':'a9626b52ab65bf7e9896e60de340ffbb04333509','successorOnlyOverlay':'courses/polynomial-interpolation.json','allArchiveMemberHashesExact':True,'license404':'Optional guessedLICENSE path absent; no retry'}
(R/'evidence/baseline-source.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'files':len(rows),'allArchiveMemberHashesExact':True,'source':str(S)}))
