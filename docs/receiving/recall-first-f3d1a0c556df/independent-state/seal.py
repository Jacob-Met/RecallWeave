import pathlib,json,hashlib,datetime
r=pathlib.Path(r'C:\Users\minec\hamon-recall-first-independent-f3d1a0c556df')
accept=json.loads((r/'acceptance.json').read_text());accept['sealed_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(r/'acceptance.json').write_text(json.dumps(accept,indent=2)+'\n',encoding='utf-8')
entries=[]
for p in sorted(r.rglob('*')):
 if p.is_file() and p.name!='MANIFEST.json':
  b=p.read_bytes();entries.append({'path':str(p.relative_to(r)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
data=(json.dumps({'schema':'hamon.qualified-receiver-packet.v1','root':str(r),'files':entries},indent=2)+'\n').encode()
(r/'MANIFEST.json').write_bytes(data)
for e in entries:
 b=(r/e['path']).read_bytes();assert len(b)==e['bytes'] and hashlib.sha256(b).hexdigest()==e['sha256']
print(json.dumps({'manifest':str(r/'MANIFEST.json'),'sha256':hashlib.sha256(data).hexdigest(),'files':len(entries),'bytes':sum(e['bytes'] for e in entries),'acceptance_sha256':hashlib.sha256((r/'acceptance.json').read_bytes()).hexdigest(),'all_readback_verified':True}),flush=True)
