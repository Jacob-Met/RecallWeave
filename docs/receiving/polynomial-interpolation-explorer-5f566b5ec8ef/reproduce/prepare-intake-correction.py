from pathlib import Path
import json,subprocess,sys,datetime
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef')
p=R/'receive-original-source.py';s=p.read_text()
assert s.count("for row in m['files']:")==1
s=s.replace("for row in m['files']:","for row in (m['files'] if 'files' in m else [dict(v,path=k) for k,v in m['members'].items()]):")
q=R/'receive-original-source-v2.py';assert not q.exists();q.write_text(s)
(R/'evidence/intake-first-failure.json').write_text(json.dumps({'phase':'Receiver manifest admission before source copy','error':"KeyError: files on successor manifest; its actual schema is members mapping",'sourceCreated':(R/'source').exists(),'sourceMutation':False,'originalScript':p.name,'correctedScript':q.name},indent=2)+'\n')
out=subprocess.run([sys.executable,'-X','utf8','-B',str(q)],text=True,capture_output=True)
(R/'evidence/intake-v2-process.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':out.returncode,'stdout':out.stdout,'stderr':out.stderr},indent=2)+'\n')
print(out.stdout,out.stderr);raise SystemExit(out.returncode)
