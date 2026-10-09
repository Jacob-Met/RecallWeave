from pathlib import Path
import subprocess,json,hashlib,re,time,datetime
P=Path(__file__).resolve().parent
S=P.parent/'recallweave-interpolation-explorer-5f566b5ec8ef'/'source'
def sha(b):return hashlib.sha256(b).hexdigest()
paths=['src/polynomial-interpolation.mjs','src/polynomial-interpolation-ui.mjs','courses/polynomial-interpolation.json','courses/polynomial-interpolation.md','templates/polynomial-interpolation-explorer.html','tools/build-polynomial-interpolation-explorer.mjs','courses/polynomial-interpolation-explorer.html']
before={p:sha((S/p).read_bytes()) for p in paths}
out=P/'caller-process';out.mkdir(exist_ok=False)
start=time.monotonic()
r=subprocess.run([r'C:\Program Files\nodejs\node.exe',str(P/'receive-caller.mjs')],cwd=P,capture_output=True)
(out/'stdout.txt').write_bytes(r.stdout);(out/'stderr.txt').write_bytes(r.stderr)
(out/'process.json').write_text(json.dumps({'exit':r.returncode,'seconds':time.monotonic()-start,'script_sha256':sha((P/'receive-caller.mjs').read_bytes())},indent=2)+'\n')
assert r.returncode==0,r.stderr.decode()
read=lambda p:(S/p).read_bytes().decode('utf-8','strict')
model=read(paths[0]);ui=read(paths[1]);course=read(paths[2]);guide=read(paths[3]);template=read(paths[4])
dependency="import {interpolatePolynomial} from './polynomial-interpolation.mjs';"
assert ui.startswith(dependency)
plain=lambda x:re.sub(r'^export ','',x,flags=re.M)
resources=json.dumps({'course':course,'guide':guide},ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c')
program=plain(model)+'\n'+plain(ui[len(dependency):])+'\nconst embeddedResources='+resources+';\nmountInterpolation(document,embeddedResources);\n'
assert not re.search(r'</script',program,re.I)
marker='/*__INTERPOLATION_PROGRAM__*/';assert template.count(marker)==1
expected=template.replace(marker,program).encode('utf-8')
actual=(S/paths[-1]).read_bytes();assert expected==actual
after={p:sha((S/p).read_bytes()) for p in paths};assert before==after
receipt={'reviewer':'chatgpt:5f566b5ec8ef:coordination','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_pins':before,'checks':6,'built_reconstruction':{'independent':'Python strict UTF8 / explicit assembly; owner builder not executed','bytes':len(actual),'sha256':sha(actual),'exact':True},'source_unchanged':True}
(P/'source-and-reconstruction.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
