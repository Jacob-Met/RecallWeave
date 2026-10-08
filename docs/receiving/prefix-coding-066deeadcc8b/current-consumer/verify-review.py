#!/usr/bin/env python3
"""Cold verification of current-parent RecallWeave learner receiving. No product execution."""
from pathlib import Path,PurePosixPath
import sys,json,hashlib,tarfile,io,re,copy,struct
ARCHIVE_SHA='cfea306e9bc4933c90be3ae28e7dde148127f1569e0ffb22cbbc1ac312917e58'
ARCHIVE_BYTES=1417284
MANIFEST_SHA='5ea491d601b6e9471a9d95088007bdc91d2720f7c2ebfd6504de7224ae7115d6'
NOTES_SHA='561da5b492953c8e2efffcc3d98c3f57eb2db025630d3c3a6a9cbebafe4b607d'
def need(v,message):
    if not v:raise ValueError(message)
def sha(b):return hashlib.sha256(b).hexdigest()
def git(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
class MemoryPath:
    def __init__(self,files,path=''):self.files=files;self.path=path
    def __truediv__(self,name):return MemoryPath(self.files,(self.path+'/' if self.path else '')+str(name))
    @property
    def parent(self):return MemoryPath(self.files,self.path.rsplit('/',1)[0] if '/' in self.path else '')
    def read_bytes(self):return self.files[self.path]
def unpack(raw):
    files={}
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:*') as t:
        for m in t.getmembers():
            p=PurePosixPath(m.name)
            need(m.isfile() and not p.is_absolute() and '..' not in p.parts and m.name not in files,'ordinary safe unique archive member')
            b=t.extractfile(m).read();need(len(b)==m.size,'member byte count');files[m.name]=b
    return files
def reconstruct_demo(files):
    def get(p):return files['source/'+p].decode()
    html=get('index.html');css=get('styles.css')
    html=html.replace('  <link rel="stylesheet" href="./styles.css">\n','').replace('  <script type="module" src="./src/app.mjs"></script>\n','')
    html=html.replace('</head>','<style>\n'+css+'\n</style>\n</head>')
    order=['knowledge','review','reflections','session-export','answer-order','deck','deck-picker','trace-archive','trace-archive-ui','lesson-archive','lesson-archive-ui','app']
    parts=[]
    for name in order:
        text=get('src/'+name+'.mjs')
        text=re.sub(r'^export (const|function) ',r'\1 ',text,flags=re.M)
        if name in ('session-export','deck-picker','trace-archive','trace-archive-ui','lesson-archive','lesson-archive-ui','app'):
            text=re.sub(r'^import .*;\n','',text,flags=re.M)
        if name=='lesson-archive':
            text='const {LESSON_ARCHIVE_MAX_BYTES, createLessonArchive, readLessonArchive} = (() => {\n'+text+'\nreturn {LESSON_ARCHIVE_MAX_BYTES, createLessonArchive, readLessonArchive};\n})();'
        if name=='app':
            old="const dataResponse = await fetch('./data/deck.json');\nif (!dataResponse.ok) throw new Error('The local demo deck could not be loaded.');\nconst bundledSource = await dataResponse.json();\nconst bundledDeck = validateDeck(bundledSource);"
            new="const bundledSource = JSON.parse(document.querySelector('#deck-json').textContent);\nconst bundledDeck = validateDeck(bundledSource);"
            need(text.count(old)==1,'current bundled loader');text=text.replace(old,new)
        parts.append(text)
    deck=get('data/deck.json').replace('<','\\u003c')
    return html.replace('</body>','<script id="deck-json" type="application/json">'+deck+'</script>\n<script>\n'+'\n'.join(parts)+'\n</script>\n</body>').encode()
def verify_files(files):
    j=lambda p:json.loads(files[p])
    manifest=j('evidence/current-source-manifest.json');freeze=j('original-prefix-freeze.json')
    commit=j('evidence/current-commit.json');tree=j('evidence/current-tree.json')
    need(commit['sha']==manifest['commit']=='aa057fe7eaf3a152ae44c8e3816f76adf20a11f7','current commit')
    need(commit['tree']['sha']==tree['sha']==manifest['tree']=='82c88ef5729646ddad2c6d6917f82dea89a5e35e','current tree')
    leaves={r['path']:r for r in tree['tree'] if r['type']=='blob'}
    need(len(leaves)==1687 and not tree.get('truncated') and not any(PurePosixPath(p).name=='AGENTS.md' for p in leaves),'complete current primary tree')
    inputs=j('current-source-inputs.json')
    need(json.loads(inputs['commit_raw'])==commit and json.loads(inputs['tree_raw'])==tree,'direct primary capture identity')
    need(len(inputs['files'])==8,'eight newly read current files')
    for r in inputs['files']:
        p=r['path'];b=r['content'].encode()
        need(r['encoding'] in ('utf-8','utf8') and b==files['source/'+p] and r['sha']==git(b)==leaves[p]['sha'],'direct source bytes: '+p)
    need(sha(files['original-prefix-freeze.json'])=='626654f57ba2e0e69d7a38f582cdd24aef416fa77afcf33a38923ce6c3a32932','original accepted ten-file freeze')
    need(len(manifest['source'])==49 and {r['path'] for r in manifest['source']}=={p[7:] for p in files if p.startswith('source/')},'complete 49-file current source')
    counts={'canonical_current':0,'accepted_prefix':0}
    for r in manifest['source']:
        p=r['path'];b=files['source/'+p]
        need((len(b),sha(b),git(b))==(r['bytes'],r['sha256'],r['git_blob']),'source hash: '+p);counts[r['role']]+=1
        if r['role']=='canonical_current':
            need(leaves[p]['sha']==git(b) and leaves[p]['size']==len(b) and leaves[p]['mode']=='100644','canonical current blob/mode: '+p)
        else:
            need(p not in leaves and {k:r[k] for k in ('bytes','sha256','git_blob')}=={k:freeze['source'][p][k] for k in ('bytes','sha256','git_blob')},'accepted prefix preserved: '+p)
    need(counts=={'canonical_current':39,'accepted_prefix':10},'source role counts')
    imports={};seen=set()
    def walk(p):
        if p in seen:return
        seen.add(p);out=[]
        for _,specifier in re.findall(r'(?m)^import\s+(?:[^;]+?\s+from\s+)?([\'"])(.*?)\1\s*;',files['source/'+p].decode()):
            need(specifier.startswith('./'),'unexpected runtime import')
            target=(PurePosixPath(p).parent/specifier).as_posix();need('source/'+target in files,'closed current runtime import');out.append(target);walk(target)
        imports[p]=out
    walk('src/app.mjs')
    need(len(seen)==12 and imports==manifest['runtime_imports'],'all current runtime imports')
    required=re.findall(r'\(ROOT / "([^"]+)"\)\.read_text\(\)',files['source/tools/make_demo.py'].decode())
    need(required==manifest['builder_inputs'] and len(required)==15 and set(seen)<=set(required),'current generated-demo source closure')
    for p in required+['tools/make_demo.py']:need(files['build/'+p]==files['source/'+p],'actual builder input bytes: '+p)
    demo=files['source/demo.html']
    need(reconstruct_demo(files)==demo==files['build/demo.html']==files['current-learner/detached/demo.html'],'independent generated demo reconstruction')
    build=j('evidence/current-build.json')
    need(build['returncode']==0 and build['demo_bytes']==len(demo)==97565 and build['demo_sha256']==sha(demo) and build['demo_git_blob']==git(demo),'actual canonical build outcome')
    need(build['argv']==['/Users/me/hamon-mcp-lab/surgeon-cache-9319fb3272b2/venv/bin/python','-B','/Users/me/recall-prefix-current-review-066deeadcc8b/build/tools/make_demo.py'],'actual native build argv')
    for name in ('stdout','stderr'):need(sha(files['evidence/current-build.'+name+'.bin'])==build[name+'_sha256'],'actual build stream')
    old=files['receive_learner.mjs'];new=files['receive_current_learner.mjs'];observer=j('evidence/current-observer-freeze.json')
    need(sha(old)==observer['original_driver_sha256']=='7dc1db53236684778b828be01ec065004998ecfcd8a66b1e531897b60eb5abcd','original receiver pin')
    need(sha(new)==observer['current_driver_sha256']=='7f0ac3da605455c5f9a17c3e0814d1c86e269abac8f4015a6c4a3d4341fcfa1c','current observer pin')
    a=old.decode();b=new.decode();start=" await page.locator('#deck-file').setInputFiles"
    need(a[a.index(start):a.index(" if(mode==='baseline'){\n")]==b[b.index(start):b.index(" const detachedNames=")],'unchanged semantic learner observer')
    oldnotes=files['verify_learner_evidence.py'].decode();newnotes=files['verify_current_notes.py'].decode()
    start="    answers=report['answers']";end="    if baseline:"
    need(oldnotes[oldnotes.index(start):oldnotes.index(end)]==newnotes[newnotes.index(start):newnotes.index(end)],'unchanged semantic notes verifier')
    need(sha(files['verify_current_notes.py'])==NOTES_SHA,'own current notes helper')
    scope={'__name__':'saved_notes_helper'};exec(compile(files['verify_current_notes.py'],'verify_current_notes.py','exec'),scope)
    mem=MemoryPath(files);r=j('current-learner/report.json');notes=scope['verify'](mem,mem/'current-learner/report.json',mem/'inputs/exported-prefix-coding.json')
    need(r['schema']=='recall-prefix-current-direct-learner-browser-v1' and r['node']=='v26.3.0','actual current browser runtime')
    need(r['delivery']['source']=='demo.html' and r['delivery']['bytes']==len(demo) and r['delivery']['sha256']==sha(demo) and r['origin']=='file://'+r['delivery']['path'],'actual direct-file source binding')
    need(len(r['requests'])==1 and r['requests'][0]=={'method':'GET','url':r['origin']},'one exact document request')
    need(r['finalObservation']==j('current-learner/final-observation.json'),'saved final observation')
    process=j('evidence/current-learner-process.json')
    need(process['returncode']==0 and process['argv']==r['argv'],'actual browser process')
    for name in ('stdout','stderr'):
        b=files['evidence/current-learner-process.'+name+'.bin'];need(len(b)==process[name]['bytes'] and sha(b)==process[name]['sha256'],'actual browser stream')
    course=files['inputs/exported-prefix-coding.json'];custody=j('evidence/original-actual-download.json')
    need(course==files['source/courses/prefix-coding.json'] and sha(course)==custody['copied_sha256']==custody['download']['sha256']=='611e3eac54d2ecc05d4ee3ef5123a3c7d71934c61612a155b6306a5cba249e53','original actual downloaded course bytes')
    need(custody['original_archive_sha256']=='4baefe516dc067db510340e16d3b48956e53db58de58803fc95d1ebfe8379749','original packet provenance')
    images=[]
    for p in sorted(x for x in files if x.startswith('current-learner/') and x.endswith('.png')):
        b=files[p];need(b[:8]==b'\x89PNG\r\n\x1a\n' and b[12:16]==b'IHDR','PNG source')
        w,h=struct.unpack('>II',b[16:24]);need(w==375 and h>=900,'actual 375px image')
        images.append({'path':p,'bytes':len(b),'sha256':sha(b),'width':w,'height':h})
    need(len(images)==4,'four actual learner images')
    visual=j('evidence/visual-review.json')
    need(visual['image']=='current-learner/complete-375.png' and visual['sha256']==sha(files[visual['image']]),'visual inspection source')
    course_obj=json.loads(course);first=r['answers'][0];item=next(x for x in course_obj['items'] if x['id']==first['id'])
    raw=files['current-learner/study-notes-after-practice.txt'];from_=('Your first answer: '+item['options'][first['choice']]+'\n').encode();to=('Your first answer: '+item['options'][item['answer']]+'\n').encode()
    altered=raw.replace(from_,to,1);need(altered!=raw,'negative prepared')
    rejected=False
    try:scope['verify'](mem,mem/'current-learner/report.json',mem/'inputs/exported-prefix-coding.json',False,{'study-notes-after-practice':altered})
    except ValueError as e:need('download first answer' in str(e),'negative semantic attribution');rejected=True
    need(rejected,'practice wrongly relabelled as first answer accepted')
    expected_notes={'schema':'recall-prefix-current-notes-verification-v1','result':notes,'practice_answer_relabelled_as_first_rejected':True,'native_browser_runs_during_verification':0}
    need(j('current-notes-verification.json')==expected_notes,'independent saved notes result')
    return {'schema':'recall-prefix-current-learner-verification-v1','accepted':True,'parent':commit['sha'],'tree':tree['sha'],
      'canonical_leaves':len(leaves),'source':counts,'runtime_modules':12,'generated_demo':{'bytes':len(demo),'sha256':sha(demo),'git_blob':git(demo),'independently_reconstructed':True},
      'actual_browser':{'node':r['node'],'chrome':r['browser'],'checks_passed':131,'checks_failed':0,'direct_file_document_requests':1,'images':images},
      'learner':notes,'first_answer_semantic_negative_rejected':True,'original_explorer_course_model_runs_repeated':False,
      'product_execution_during_verification':False,'current_unfinished_lesson_archive_feature_acceptance':False,'integration_or_deployment_claim':False}
def verify_archive(root):
    raw=(root/'native-packet.tar.xz').read_bytes();need(len(raw)==ARCHIVE_BYTES and sha(raw)==ARCHIVE_SHA,'native archive pin')
    files=unpack(raw);mb=files['native-manifest.json'];need(sha(mb)==MANIFEST_SHA and mb==(root/'native-manifest.json').read_bytes(),'native manifest pin')
    rows=json.loads(mb)['files'];need(len(rows)+1==len(files) and {r['path'] for r in rows}==set(files)-{'native-manifest.json'},'complete ordinary artifact coverage')
    for r in rows:
        b=files[r['path']];need((len(b),sha(b))==(r['bytes'],r['sha256']),'native artifact: '+r['path'])
    result=verify_files(files);result['native_archive']={'bytes':len(raw),'sha256':sha(raw),'ordinary_members':len(files),'listed_artifacts':len(rows)}
    return result
def main():
    root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent
    receipt=json.loads((root/'receipt.json').read_bytes());need(receipt['accepted'] is True and receipt['schema']=='recall-prefix-current-learner-receipt-v1','current receiving receipt')
    rows=receipt['artifacts'];need({r['path'] for r in rows}=={'README.md','native-manifest.json','native-packet.tar.xz','verify-review.py','verification.json'},'complete exposed artifacts')
    for r in rows:
        b=(root/r['path']).read_bytes();need((len(b),sha(b))==(r['bytes'],r['sha256']),'exposed artifact: '+r['path'])
    value=verify_archive(root);b=(json.dumps(value,indent=2)+'\n').encode();need(b==(root/'verification.json').read_bytes(),'cold output equality')
    if len(sys.argv)>2:
        target=Path(sys.argv[2]).resolve();need(target.parent!=root.resolve(),'write outside freeze');target.write_bytes(b)
    print(b.decode(),end='')
if __name__=='__main__':main()
