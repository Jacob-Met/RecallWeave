from pathlib import Path
import json,hashlib,shutil,subprocess
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');S=R/'source';E=R/'evidence/label-spacing'
pins={}
for rel in ['templates/polynomial-interpolation-explorer.html','docs/polynomial-interpolation-explorer.md','courses/polynomial-interpolation-explorer.html']:
 p=S/rel;q=E/'intermediate-crlf'/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 if not rel.startswith('courses/'):p.write_bytes(p.read_bytes().replace(b'\r\n',b'\n'))
p=subprocess.run(['C:/Program Files/nodejs/node.exe',str(S/'tools/build-polynomial-interpolation-explorer.mjs')],text=True,capture_output=True)
for rel in ['templates/polynomial-interpolation-explorer.html','docs/polynomial-interpolation-explorer.md','courses/polynomial-interpolation-explorer.html']:pins[rel]={'bytes':(S/rel).stat().st_size,'sha256':hashlib.sha256((S/rel).read_bytes()).hexdigest()}
(E/'final-lf-receipt.json').write_text(json.dumps({'pins':pins,'scope':'Preserved platform-default CRLF transfer phase; restored original LF in newtemplate/guide before final visual receiving. Only six intended template spaces remain vs first source; no UI/model changes.','buildExit':p.returncode,'stdout':p.stdout,'stderr':p.stderr},indent=2)+'\n')
print(json.dumps(pins));raise SystemExit(p.returncode)
