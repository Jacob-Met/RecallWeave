from pathlib import Path
import subprocess,sys,json,datetime,time
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef');E=R/'evidence/browser-v1-process';E.mkdir(exist_ok=False)
args=[sys.executable,'-X','utf8','-B',str(R/'source/tools/receive-polynomial-interpolation-browser.py'),'--root',str(R/'source'),'--output',str(R/'evidence/browser-v1'),'--browser','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
start=time.time();p=subprocess.run(args,text=True,capture_output=True)
(E/'stdout.txt').write_text(p.stdout,encoding='utf-8');(E/'stderr.txt').write_text(p.stderr,encoding='utf-8')
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':p.returncode,'seconds':time.time()-start,'args':args}
(E/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt));print(p.stdout,p.stderr)
