from pathlib import Path
import subprocess,time,json,ast
r=Path(__file__).resolve().parent;ast.parse((r/'browser-fourth.py').read_text(encoding='utf-8'));t=time.monotonic();p=subprocess.run(['C:/Users/Veria/AppData/Local/Programs/Python/Python311/python.exe','-X','utf8','-B',str(r/'browser-fourth.py')],capture_output=True,text=True,encoding='utf-8')
(r/'evidence/browser-fourth.stdout').write_text(p.stdout,encoding='utf-8');(r/'evidence/browser-fourth.stderr').write_text(p.stderr,encoding='utf-8')
o={'exit':p.returncode,'duration':time.monotonic()-t,'stdout':p.stdout,'stderr':p.stderr};(r/'evidence/browser-process-fourth.json').write_text(json.dumps(o,indent=2),encoding='utf-8');print(json.dumps(o))
