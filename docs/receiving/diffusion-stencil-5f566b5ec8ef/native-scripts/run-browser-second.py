from pathlib import Path
import subprocess,time,json
r=Path(__file__).resolve().parent;t=time.monotonic();p=subprocess.run(['C:/Users/Veria/AppData/Local/Programs/Python/Python311/python.exe','-X','utf8','-B',str(r/'browser-second.py')],capture_output=True,text=True,encoding='utf-8')
(r/'evidence/browser-second.stdout').write_text(p.stdout,encoding='utf-8');(r/'evidence/browser-second.stderr').write_text(p.stderr,encoding='utf-8')
o={'exit':p.returncode,'duration':time.monotonic()-t,'stdout':p.stdout,'stderr':p.stderr};(r/'evidence/browser-process-second.json').write_text(json.dumps(o,indent=2),encoding='utf-8');print(json.dumps(o))
