from pathlib import Path
import json,hashlib,subprocess,shutil,time
root=Path(__file__).resolve().parent
x=json.loads((root/'intake.json').read_text(encoding='utf-8-sig'))
s=root/'source';s.mkdir(exist_ok=True);assert not list(s.iterdir()), 'initial source must be empty after refused intake'
e=root/'evidence';e.mkdir(exist_ok=True)
manifest=[]
for f in x['files']:
 b=f['content'].encode('utf-8'); sha=hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()
 assert sha==f['sha'],(f['path'],sha,f['sha'])
 p=s/f['path'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 manifest.append({'path':f['path'],'blob':sha,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
(e/'implementation-contract.md').write_bytes(x['contract'].encode('utf-8'))
(e/'canonical-tree.json').write_bytes(json.dumps(x['tree'],indent=2).encode('utf-8'))
(root/'baseline.mjs').write_bytes("import fs from 'node:fs';\nimport assert from 'node:assert/strict';\nimport {parseDeck} from './source/src/deck.mjs';\nimport {initialMastery,selectNextItem,updateMastery} from './source/src/knowledge.mjs';\nimport {createReview,beginPractice,currentPracticeItem,answerPractice} from './source/src/review.mjs';\nconst deck=parseDeck(fs.readFileSync(new URL('./source/data/deck.json',import.meta.url),'utf8'));\nconst mastery=initialMastery(deck.concepts), asked=new Set(), answers=[];\nwhile(asked.size<deck.items.length){const q=selectNextItem(deck.items,asked,mastery);const choice=answers.length===0?(q.answer+1)%q.options.length:q.answer;answers.push({item:q.id,choice});asked.add(q.id);mastery[q.concept]=updateMastery(mastery[q.concept],choice===q.answer);}\nconst review=createReview(deck.items,answers);let practice=beginPractice(review);assert.equal(practice.items.length,1);const q=currentPracticeItem(practice);practice=answerPractice(practice,q.id,q.answer);assert.equal(currentPracticeItem(practice),null);assert.equal(review[0].correct,false);\nconst absent=['src/diffusion-stencil.mjs','courses/diffusion-stencil.json','courses/diffusion-stencil-lab.html'].map(p=>({path:p,absent:!fs.existsSync(new URL('./source/'+p,import.meta.url))}));assert.ok(absent.every(x=>x.absent));\nconsole.log(JSON.stringify({native:process.version,deck:deck.title,questions:asked.size,review:review.length,practice:practice.answers.length,absent}));\n".encode('utf-8'))
def git(*args): return subprocess.check_output(['git','-C',str(s),*args],text=True).strip()
git('init');git('config','core.autocrlf','false');git('config','user.name','HAMON coordination');git('config','user.email','hamon-coordination@local.invalid');git('add','.');git('commit','-m','Capture canonical RecallWeave learner component for diffusion receiving')
r=subprocess.run(['C:/Program Files/nodejs/node.exe',str(root/'baseline.mjs')],cwd=root,capture_output=True,text=True,encoding='utf-8')
(e/'baseline.stdout').write_text(r.stdout,encoding='utf-8');(e/'baseline.stderr').write_text(r.stderr,encoding='utf-8')
a={'canonical':x['canonical'],'canonical_tree':x['tree']['sha'],'native_head':git('rev-parse','HEAD'),'native_tree':git('rev-parse','HEAD^{tree}'),'projection':manifest,'contract_sha256':hashlib.sha256((e/'implementation-contract.md').read_bytes()).hexdigest(),'baseline_exit':r.returncode,'baseline_stdout':r.stdout,'baseline_stderr':r.stderr,'free':shutil.disk_usage(root).free}
(e/'baseline-receipt.json').write_text(json.dumps(a,indent=2),encoding='utf-8')
print(json.dumps(a))
