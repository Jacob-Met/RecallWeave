from pathlib import Path
import json,hashlib,shutil,subprocess,datetime
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');S=R/'source';E=R/'evidence/label-spacing';E.mkdir(exist_ok=False)
paths=['templates/polynomial-interpolation-explorer.html','courses/polynomial-interpolation-explorer.html','docs/polynomial-interpolation-explorer.md']
before={}
for rel in paths:
 p=S/rel;q=E/'original'/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);before[rel]=hashlib.sha256(p.read_bytes()).hexdigest()
changes={'up to16':'up to 16','up to6':'up to 6','at most32':'at most 32','at most1,000':'at most 1,000','denominator1–':'denominator 1–','course has18':'course has 18'}
p=S/paths[0];text=p.read_text(encoding='utf-8')
for old,new in changes.items():
 assert old in text,old;text=text.replace(old,new)
p.write_text(text,encoding='utf-8')
p=S/paths[2];text=p.read_text(encoding='utf-8')
for old,new in {'original18-question':'original 18-question','enter1–8':'enter 1–8','up to16':'up to 16','sampled at161':'sampled at 161','degree0':'degree 0','original18 questions':'original 18 questions','declared11-file':'declared 11-file'}.items():text=text.replace(old,new)
p.write_text(text,encoding='utf-8')
p=subprocess.run(['C:/Program Files/nodejs/node.exe',str(S/'tools/build-polynomial-interpolation-explorer.mjs')],text=True,capture_output=True)
after={rel:hashlib.sha256((S/rel).read_bytes()).hexdigest() for rel in paths}
(E/'receipt.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'before':before,'after':after,'templateReplacements':changes,'scope':'Text-only spacing labels; no UI/model/interaction/test changes. Original22-group browser phase remains exact to original pins.','build':{'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr}},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'after':after,'buildExit':p.returncode,'stdout':p.stdout}));raise SystemExit(p.returncode)
