#!/usr/bin/env python3
"""Verify retained author evidence without executing product, browser, or broad oracle."""
from pathlib import Path,PurePosixPath
import sys,json,hashlib,tarfile,io,re,struct,math,copy
ARCHIVE_BYTES=1375888
ARCHIVE_SHA='41c4975c4936a6e5126dcc533d8c94f0ae9e4a42858cfa9fe5eb7ed3efa2357a'
MANIFEST_SHA='04d0115bd9b97e177d61f72bd9e1634a4f562fcbebe4319d5a8e96e88aa41a4f'
ROOT='/Users/me/recall-prefix-066deeadcc8b/'
def need(v,message):
    if not v:raise ValueError(message)
def sha(b):return hashlib.sha256(b).hexdigest()
def git(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def unpack(raw):
    files={}
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:*') as t:
        for m in t.getmembers():
            p=PurePosixPath(m.name)
            need(m.isfile() and not p.is_absolute() and '..' not in p.parts and m.name not in files,'ordinary safe unique member')
            b=t.extractfile(m).read();need(len(b)==m.size,'member byte size');files[m.name]=b
    return files
def pin(b,row):
    need(len(b)==row['bytes'] and sha(b)==row['sha256'],'byte/hash pin')
    if 'git_blob' in row:need(git(b)==row['git_blob'],'Git blob pin')
def rebuild(files,version):
    model=re.sub(r'^export ','',files['source/src/prefix-coding.mjs'].decode(),flags=re.M)
    ui=files['source/src/prefix-coding-ui.mjs'].decode();ui=re.sub(r'^import [^\n]+\n','',ui,count=1);ui=re.sub(r'^export ','',ui,flags=re.M)
    deck=files['source/courses/prefix-coding.json'].decode()
    literal=json.dumps(deck,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    name='source/templates/prefix-coding-explorer.html' if version=='v2' else 'attempts/ui-v1/source/templates/prefix-coding-explorer.html'
    html=files[name].decode()
    for marker,text in [('/* PREFIX_MODEL */',model),('/* PREFIX_DECK */','const LESSON_JSON = '+literal+';'),('/* PREFIX_UI */',ui)]:
        need(html.count(marker)==1,'single build marker')
        html=html.replace(marker,re.sub(r'</script',lambda m:'<\\/script',text,flags=re.I))
    return html.encode()
def verify_example(obj):
    need(obj['format']=='recallweave.prefix-coding/1','example format')
    m=obj['model'];rows=m['rows']
    need(rows==sorted(rows,key=lambda r:tuple(ord(c) for c in r['symbol'])) and len(rows)==4,'literal sorted example rows')
    need(len({r['symbol'] for r in rows})==4 and all(type(r['count']) is int and 1<=r['count']<=10000 for r in rows),'example input domain')
    nodes=[{'id':i,'weight':r['count'],'symbol':r['symbol'],'left':None,'right':None} for i,r in enumerate(rows)]
    queue=list(range(4));steps=[];cost=0
    key=lambda i:(nodes[i]['weight'],i)
    queue.sort(key=key)
    while len(queue)>1:
        before=queue[:];left,right=queue[:2];queue=queue[2:];parent=len(nodes);added=nodes[left]['weight']+nodes[right]['weight']
        nodes.append({'id':parent,'weight':added,'symbol':None,'left':left,'right':right});cost+=added;queue.append(parent);queue.sort(key=key)
        steps.append({'index':len(steps)+1,'before':before,'left':left,'right':right,'parent':parent,'after':queue[:],'addedCost':added,'accumulatedCost':cost})
    codes={}
    def walk(i,bits):
        n=nodes[i]
        if n['symbol'] is not None:codes[n['symbol']]=bits
        else:walk(n['left'],bits+'0');walk(n['right'],bits+'1')
    walk(queue[0],'')
    book=[{'symbol':r['symbol'],'count':r['count'],'code':codes[r['symbol']],'length':len(codes[r['symbol']]),'cost':r['count']*len(codes[r['symbol']])} for r in rows]
    total=sum(r['count'] for r in rows);payload=sum(x['cost'] for x in book)
    totals={'totalCount':total,'payloadBits':payload,'fixedWidth':2,'fixedPayloadBits':total*2,'averageBits':payload/total,'savedPayloadBits':total*2-payload,'mergeWeightSum':cost}
    expected={'rows':rows,'nodes':nodes,'root':queue[0],'steps':steps,'codebook':book,'totals':totals}
    need(m==expected,'complete saved example model arithmetic/queue')
    need(type(obj['inspection']['step']) is int and 0<=obj['inspection']['step']<=3,'inspected step')
    bits=obj['decoding']['bits'];need(re.fullmatch('[01]*',bits) is not None,'saved decoder input')
    node=queue[0];start=0;symbols=[];segments=[]
    for end,bit in enumerate(bits,1):
        node=nodes[node]['left' if bit=='0' else 'right']
        if nodes[node]['symbol'] is not None:
            s=nodes[node]['symbol'];symbols.append(s);segments.append({'symbol':s,'code':bits[start:end],'start':start,'end':end});start=end;node=queue[0]
    need(node==queue[0] and obj['decoding']=={'bits':bits,'symbols':symbols,'segments':segments},'complete decoder and offsets')
    return {'rows':rows,'payload_bits':payload,'fixed_payload_bits':2*total,'decoded_symbols':symbols,'step':obj['inspection']['step']}
def verify_notes(files,report):
    course=json.loads(files['source/courses/prefix-coding.json']);items={x['id']:x for x in course['items']}
    answers=report['lessonAnswers'];need(len(answers)==12 and {a['id'] for a in answers}==set(items),'all actual author lesson answers')
    need(sum(a['correct'] for a in answers)==9 and all(a['correct']==(a['choice']==items[a['id']]['answer']) for a in answers),'actual first answer attribution')
    notes=[]
    for index,row in enumerate(report['downloads'][3:]):
        raw=files['evidence/browser-v2/downloads/'+row['guid']];text=raw.decode();notes.append(text)
        need(re.fullmatch(r'recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt',row['suggestedFilename']) is not None,'actual maintained notes filename')
        for key in ('title','attribution','license'):need(course[key] in text,'complete notes '+key)
        need('9 of 12 connections correct on the first try.' in text,'first result in notes')
        sections=re.split(r'\n(?=\d+\. )',text);need(len(sections)==13,'twelve actual notes sections')
        for i,(answer,section) in enumerate(zip(answers,sections[1:])):
            item=items[answer['id']]
            need(section.startswith(str(i+1)+'. '+item['prompt']+'\n'),'notes complete question order')
            need('Your first answer: '+item['options'][answer['choice']]+'\n' in section,'notes first answer')
            need('First try: '+('correct' if answer['correct'] else 'needs review')+'\n' in section,'notes first correctness')
            need('Correct answer: '+item['options'][item['answer']]+'\n' in section,'notes correct answer')
            need('Explanation: '+item['explanation']+'\n' in section and 'Apply the idea: '+item['transfer']+'\n' in section,'complete explanation and transfer')
            need('Your explanation — reflection, not scored:\n  Not written.\n' in section,'unwritten reflection attribution')
            if not answer['correct']:
                required='Practice answer: '+item['options'][item['answer']]+'\nPractice result: correct on retry\n' if index else 'Practice answer: not recorded.\n'
                need(required in section,'separate practice answer')
    before,after=notes
    need(before.count('Practice answer:')==3 and after.count('Practice answer:')==3,'practice denominator')
    need('Not started. 3 missed connections are available for practice.' in before and 'Complete: 3 of 3 practice answers recorded; 3 correct on retry.' in after,'actual separate practice completion')
    def mastery(text):return text.split('ESTIMATED MASTERY — MODEL STATE, NOT A GRADE\n',1)[1].split('\nPRACTICE\n',1)[0]
    need(mastery(before)==mastery(after),'first estimate preservation')
    return {'questions':12,'first_correct':9,'first_wrong':3,'separate_correct_practice':3,'actual_notes_downloads':2,'question_sections_recomputed':24,'authored_reflections_not_written':True}
def testlog(raw,wanted):
    text=raw.decode();counts={k:int(v) for k,v in re.findall(r'^ℹ (tests|pass|fail|cancelled|skipped|todo) (\d+)$',text,re.M)}
    need(counts=={'tests':wanted,'pass':wanted,'fail':0,'cancelled':0,'skipped':0,'todo':0},'actual native test summary')
    need(len(re.findall(r'^✔ ',text,re.M))==wanted,'actual individual native passes')
    return counts
def verify_files(files):
    j=lambda p:json.loads(files[p])
    freeze=j('candidate-v2-freeze.json');capsule=j('baseline-source-capsule.json')
    need(sha(files['candidate-v2-freeze.json'])=='626654f57ba2e0e69d7a38f582cdd24aef416fa77afcf33a38923ce6c3a32932','accepted ten-file freeze')
    need(sha(files['baseline-source-capsule.json'])=='2ca3096b5b8ae9559210793ab87bc7ee1a564822f50ed31ec0320286dd32f4b0','original author capsule')
    commit=j('independent-provenance/evidence/canonical-commit.json');tree=j('independent-provenance/evidence/canonical-tree.json')
    need(commit['sha']==freeze['base']==capsule['base_commit']=='6f920f177ae90a09958146d41612a0e83f52702f','original source parent')
    need(commit['tree']['sha']==tree['sha']==freeze['baseline_tree']==capsule['base_tree']=='c2be5240d1ffa17c7e66b3fb8fe74aa334ec10b2','original source tree')
    leaves={r['path']:r for r in tree['tree'] if r['type']=='blob'};need(len(leaves)==1179 and not tree.get('truncated') and not any(PurePosixPath(p).name=='AGENTS.md' for p in leaves),'complete independent parent tree')
    base_rows=[]
    for i in range(4):base_rows+=j('baseline-part-'+str(i)+'.json')
    need(len(base_rows)==36 and {x['path'] for x in base_rows}=={x['path'] for x in capsule['files']}==set(freeze['canonical_unchanged_files']),'complete baseline capsule')
    for row in base_rows:
        p=row['path'];b=files['source/'+p];need(row['content'].encode()==b,'direct author baseline bytes')
        leaf=leaves[p];need(git(b)==row['sha']==leaf['sha'] and len(b)==row['size']==leaf['size'] and row['mode']==leaf['mode']=='100644','canonical baseline source/mode')
        need(git(b)==freeze['canonical_unchanged_files'][p],'canonical freeze Git identity');cap=next(r for r in capsule['files'] if r['path']==p)
        need(cap['sha256']==sha(b) and cap['sha']==git(b),'canonical capsule hash')
    need(len(freeze['source'])==10,'ten accepted source files')
    for p,row in freeze['source'].items():pin(files['source/'+p],row);need(p not in leaves,'new additive path')
    parity='source/tests/prefix-coding-build.test.mjs'
    need(len(files[parity])==379 and sha(files[parity])=='00d26267bd12e72c8bb0efe5643c1c26fe0bc9482d04d9f8c984d856b3595c3b','separate parity source')
    need({p[7:] for p in files if p.startswith('source/')}==set(freeze['source'])|set(freeze['canonical_unchanged_files'])|{'tests/prefix-coding-build.test.mjs'},'47 final source files')
    for v in ('v1','v2'):
        p='attempts/ui-v1/source/courses/prefix-coding-explorer.html' if v=='v1' else 'source/courses/prefix-coding-explorer.html'
        need(rebuild(files,v)==files[p],'independent exact '+v+' explorer reconstruction')
    line='.layout>*{min-width:0}\n'
    for p in ['templates/prefix-coding-explorer.html','courses/prefix-coding-explorer.html']:
        new=files['source/'+p].decode();old=files['attempts/ui-v1/source/'+p].decode()
        need(new.count(line)==1 and new.replace(line,'',1)==old,'single grid fix: '+p)
    need(files['attempts/ui-v1/source/src/prefix-coding-ui.mjs']==files['source/src/prefix-coding-ui.mjs'],'UI runtime bytes unchanged')
    old=files['attempts/model-v1/prefix-coding.mjs'];new=files['source/src/prefix-coding.mjs'].decode()
    guards=["  for (let i = 0; i < rows.length; i++) {\n    if (!Object.prototype.hasOwnProperty.call(rows, i)) fail('Every symbol row must be present.');\n  }\n","  for (let i = 0; i < symbols.length; i++) {\n    if (!Object.prototype.hasOwnProperty.call(symbols, i)) fail('Every message symbol must be present.');\n  }\n"]
    for guard in guards:need(new.count(guard)==1,'exact dense guard');new=new.replace(guard,'',1)
    need(new.encode()==old and sha(old)=='d6973ac2985b6a093d805477172ada5ba9877e80248712bca5f07294bceda9b5','only two own-index guards')
    pin(old,j('model-freeze.json'));pin(files['source/src/prefix-coding.mjs'],j('model-v2-freeze.json'))
    need(files['model-freeze.json']==files['attempts/model-v1/freeze.json'],'original model freeze preserved')
    need(len(re.findall(r'^test\(',files['attempts/model-v1/author-tests.mjs'].decode(),re.M))==9,'nine original author model methods preserved as source')
    sparse=[]
    for v,refused,code in [('v1',False,1),('v2',True,0)]:
        p='independent-provenance/model-'+v+'-sparse.json';r=j(p)
        source=old if v=='v1' else files['source/src/prefix-coding.mjs']
        need([x['name'] for x in r['cases']]==['sparse-model-rows','one-hole-message','known-hole-known-message'],'exact sparse scenarios')
        if v=='v1':
            need(r['cases'][1]['returned']=={'bits':'','symbols':[None],'segments':[None]} and r['cases'][2]['returned']['bits']=='01' and r['cases'][2]['returned']['symbols']==['A',None,'B'],'preserved actual sparse omissions')
        need(r['sha256']==sha(source) and len(r['cases'])==3 and all(x['refused'] is refused for x in r['cases']),'existing independent sparse result')
        proc=j('independent-provenance/evidence/model-'+v+'-sparse-process.json')
        need(proc['returncode']==code and proc['argv'][1].endswith('/receive_sparse.mjs'),'existing sparse actual process')
        for stream in ('stdout','stderr'):
            raw=files['independent-provenance/evidence/model-'+v+'-sparse-process.'+stream+'.bin'];pin(raw,proc[stream])
        sparse.append({'version':v,'refusals':sum(x['refused'] for x in r['cases']),'cases':3})
    need(sha(files['independent-provenance/receive_sparse.mjs'])=='0102eb4e794943e6c10e44eb6b9540969c6c73061697c7a3b0b1193427985e2a','existing unchanged sparse probe')
    observer=files['source/tools/check_prefix_coding_browser.mjs'].decode()
    oldobserver=files['attempts/ui-v1/source/tools/check_prefix_coding_browser.mjs'].decode()
    change="  if(expectedName instanceof RegExp)assert.match(entry.suggestedFilename,expectedName);\n  else assert.equal(entry.suggestedFilename,expectedName);"
    need(observer.count(change)==1,'specific filename observer change');observer=observer.replace(change,"  assert.equal(entry.suggestedFilename,expectedName);",1)
    pattern=r"/^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/"
    need(observer.count(pattern)==2,'two notes download observers');observer=observer.replace(pattern,"'recallweave-study-notes.txt'")
    need(observer==oldobserver,'only author filename observer correction')
    images=[];browsers=[];example_results=[]
    for v,wanted,groups,downloads,pngs,code in [('v1','failed',5,3,2,1),('v2','passed',8,5,7,0)]:
        prefix='evidence/browser-'+v+'/';r=j(prefix+'receipt.json')
        need(r['state']==wanted and len(r['checks'])==groups and len(set(r['checks']))==groups and len(r['downloads'])==downloads and len(r['screenshots'])==pngs,'actual browser outcome/counts')
        need(not r['pageErrors'],'no author page JavaScript error')
        wanted_requests=[ROOT+'source/courses/prefix-coding-explorer.html']+([ROOT+'source/demo.html'] if v=='v2' else [])
        need(r['pageRequests']==['file://'+p for p in wanted_requests],'actual direct-file page requests')
        for p,row in r['sourceBefore'].items():
            path='attempts/ui-v1/source/'+p if v=='v1' and 'attempts/ui-v1/source/'+p in files else 'source/'+p
            pin(files[path],row)
        if v=='v2':need(r['sourceBefore']==r['sourceAfter'] and len(r['sourceBefore'])==14,'v2 fourteen-source stability')
        for i,row in enumerate(r['downloads']):
            need(row['state']=='completed' and row['totalBytes']==row['receivedBytes']==row['bytes'] and row['filePath']==ROOT+prefix+'downloads/'+row['guid'],'actual completed download identity')
            raw=files[prefix+'downloads/'+row['guid']];pin(raw,row)
            if i<2:example_results.append({'run':v,'index':i,**verify_example(json.loads(raw))})
            elif i==2:need(raw==files['source/courses/prefix-coding.json'] and row['suggestedFilename']=='prefix-coding.json','byte-exact actual lesson download')
        for row in r['screenshots']:
            p=prefix+row['path'];raw=files[p];pin(raw,row);need(raw[:8]==b'\x89PNG\r\n\x1a\n' and raw[12:16]==b'IHDR','actual screenshot PNG')
            w,h=struct.unpack('>II',raw[16:24]);need(w>0 and h>0,'nonempty screenshot');images.append({'path':p,'bytes':len(raw),'sha256':sha(raw),'width':w,'height':h})
        proc=j('evidence/browser-'+v+'-process.json')
        need(proc['exit']==code and proc['argv']==['/opt/homebrew/bin/node',ROOT+'source/tools/check_prefix_coding_browser.mjs','--output',ROOT+'evidence/browser-'+v],'actual author browser process')
        out=j('evidence/browser-'+v+'-process.stdout');need(out['state']==wanted and out['checks']==groups and out['downloads']==downloads and out['screenshots']==pngs,'raw process stdout counts')
        need(files['evidence/browser-'+v+'-process.stderr']==b'','author wrapper stderr')
        if v=='v1':
            need(r['lessonAnswers']==[] and '"width":375,"scroll":500,"body":500' in r['failure'] and r['failure']==out['failure'],'original real width failure before learner')
        else:
            need(r['narrow']==r['learnerNarrow']=={'width':375,'scroll':375,'body':375},'actual v2 narrow geometry')
            need('failure' not in r,'v2 no failure');notes=verify_notes(files,r)
        browsers.append({'version':v,'state':wanted,'passed_groups':groups,'actual_downloads':downloads,'screenshots':pngs,'wrapper_exit':code})
    need(example_results[0]|{'run':'v2'}==example_results[2] and example_results[1]|{'run':'v2'}==example_results[3],'same normal downloaded examples across layout fix')
    layout=j('evidence/layout-v1/receipt.json')
    need(layout['state']=='passed' and layout['checks']==[] and layout['downloads']==[] and layout['lessonAnswers']==[],'layout diagnostic is not a functional acceptance run')
    need({k:layout['metrics'][k] for k in ('width','scroll','body')}=={'width':375,'scroll':500,'body':500},'diagnosed original overflow')
    need(any(x['tag']=='ASIDE' and x['minWidth']=='auto' and x['rect']['right']>500 for x in layout['metrics']['overflow']),'actual overflowing grid child')
    need(layout['sourceBefore']==layout['sourceAfter']==j('evidence/browser-v1/receipt.json')['sourceBefore'] and not layout['pageErrors'],'diagnostic original source/error capture')
    for row in layout['screenshots']:
        p='evidence/layout-v1/'+row['path'];raw=files[p];pin(raw,row);w,h=struct.unpack('>II',raw[16:24]);images.append({'path':p,'bytes':len(raw),'sha256':sha(raw),'width':w,'height':h})
    need(len(images)==10,'all ten actual author PNGs')
    need(j('evidence/model-v2-process.json')=={'argv':['/opt/homebrew/bin/node','--test',ROOT+'source/tests/prefix-coding.test.mjs'],'exit':0},'model v2 author process')
    model_gate=testlog(files['evidence/model-v2.stdout'],10);need(files['evidence/model-v2.stderr']==b'','model stderr')
    focused=j('evidence/focused-v2-processes.json');need(focused['node']=='v26.3.0' and focused['canonical_unchanged']==36 and focused['owned_unchanged'] is True,'focused source/runtime record')
    need(len(focused['processes'])==2 and all(x['exit']==0 for x in focused['processes']),'focused process outcomes')
    need(focused['processes'][0]['argv'][-1]=='--check' and files['evidence/focused-v2-0.stdout']==b'Prefix-coding standalone matches its exact sources.\n','actual builder parity check')
    need(focused['processes'][1]['argv'][1:]==['--test','tests/deck.test.mjs','tests/knowledge.test.mjs','tests/review.test.mjs','tests/prefix-coding.test.mjs','tests/prefix-coding-course.test.mjs'],'exact focused test scope')
    focused_gate=testlog(files['evidence/focused-v2-1.stdout'],44)
    for x in focused['processes']:need(files['evidence/'+x['stderr']]==b'','focused stderr')
    build=j('evidence/build-v2.json');need(build['exit']==0 and build['argv']==['/opt/homebrew/bin/node',ROOT+'source/tools/build-prefix-coding.mjs'],'actual final build command')
    parity_record=j('evidence/build-parity-test.json');need(parity_record['argv']==['/opt/homebrew/bin/node','--test','tests/prefix-coding-build.test.mjs'],'exact later parity argv');need(parity_record['exit']==0 and parity_record['source_sha256']==sha(files[parity]) and parity_record['source_bytes']==379,'separate parity actual process')
    parity_gate=testlog(files['evidence/build-parity-test.stdout'],1)
    need(files['evidence/build-parity-test.stderr']==b'','parity stderr')
    course_receipt=j('product-course-author/receipt.json');need(len(course_receipt['artifacts'])==7,'complete product author packet')
    for p,row in course_receipt['artifacts'].items():pin(files['product-course-author/'+p],row)
    course_proc=j('product-course-author/focused-v1.json')
    need(course_proc['returncode']==0 and course_proc['before']==course_proc['after'] and len(course_proc['before'])==12 and course_proc['node']=='v26.3.0','product course native source/returncode')
    for p,row in course_proc['before'].items():pin(files['source/'+p],row)
    need(course_proc['log_sha256']==sha(files['product-course-author/focused-v1.log'])==course_proc['stdout_sha256'],'product raw log binding')
    course_gate=testlog(files['product-course-author/focused-v1.log'],8)
    bad=copy.deepcopy(json.loads(files['evidence/browser-v2/downloads/'+j('evidence/browser-v2/receipt.json')['downloads'][0]['guid']]))
    bad['model']['totals']['payloadBits']+=1;rejected=False
    try:verify_example(bad)
    except ValueError as e:need('complete saved example model' in str(e),'saved-example negative boundary');rejected=True
    need(rejected,'saved incorrect payload accepted')
    r=j('evidence/browser-v2/receipt.json');changed=dict(files);last=r['downloads'][-1];p='evidence/browser-v2/downloads/'+last['guid']
    before=changed[p];changed[p]=before.replace(b'Practice result: correct on retry\n',b'Practice result: result omitted\n',1);need(changed[p]!=before,'notes negative prepared')
    rejected=False
    try:verify_notes(changed,r)
    except ValueError as e:need('separate practice answer' in str(e),'notes negative boundary');rejected=True
    need(rejected,'omitted practice result accepted')
    return {'schema':'recall-prefix-author-custody-verification-v1','accepted':True,'source_parent':commit['sha'],'source_tree':tree['sha'],
      'canonical_leaves':1179,'canonical_source_files':36,'accepted_owned_source_files':10,'separate_parity_test_files':1,
      'exact_explorer_reconstruction':['v1','v2'],'only_ui_production_successor_change':'.layout>*{min-width:0}',
      'model_successor_only_two_dense_guards':True,'existing_independent_sparse_probes':sparse,
      'author_original_model_v1_test_source_methods':9,'author_original_model_v1_raw_run_log_present':False,
      'native_gates':{'model_v2':model_gate,'focused_v2':focused_gate,'product_course_v1':course_gate,'later_parity_test':parity_gate},
      'author_browser_runs':browsers,'original_layout_diagnostic':{'viewport':375,'document_width':500,'functional_group_count':0},
      'notes':notes,'saved_example_checks':example_results,'screenshots':images,'semantic_negatives':['changed saved payload rejected','omitted actual practice result rejected'],
      'product_execution_during_verification':False,'broad_model_oracle_repeated':False,'current_parent_learner_acceptance_included':False,'integration_or_deployment_claim':False}
def verify_archive(root):
    raw=(root/'native-packet.tar.xz').read_bytes();need(len(raw)==ARCHIVE_BYTES and sha(raw)==ARCHIVE_SHA,'author archive pin')
    files=unpack(raw);mb=files['native-manifest.json'];need(sha(mb)==MANIFEST_SHA and mb==(root/'native-manifest.json').read_bytes(),'manifest identity')
    manifest=json.loads(mb);rows=manifest['files']
    need(len(files)==130 and len(rows)==129 and {r['path'] for r in rows}==set(files)-{'native-manifest.json'},'complete archive coverage')
    need(sum(r['role']=='author_raw' for r in rows)==117 and sum(r['bytes'] for r in rows if r['role']=='author_raw')==2784355,'complete author input set')
    need(sum(r['role']=='independent_provenance' for r in rows)==12,'bounded independent provenance supplement')
    for r in rows:pin(files[r['path']],r)
    result=verify_files(files);result['native_archive']={'bytes':len(raw),'sha256':sha(raw),'ordinary_members':130,'author_raw_files':117,'independent_provenance_files':12}
    return result
def main():
    root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent
    receipt=json.loads((root/'receipt.json').read_bytes())
    need(receipt['schema']=='recall-prefix-author-custody-receipt-v1' and receipt['accepted'] is True,'author custody receipt')
    rows=receipt['artifacts'];need({r['path'] for r in rows}=={'README.md','native-manifest.json','native-packet.tar.xz','verification.json','verify-review.py','preparation-history.json'},'complete exposed author packet')
    for r in rows:pin((root/r['path']).read_bytes(),r)
    result=verify_archive(root);b=(json.dumps(result,indent=2)+'\n').encode();need(b==(root/'verification.json').read_bytes(),'cold verification byte equality')
    if len(sys.argv)>2:
        target=Path(sys.argv[2]).resolve();need(target.parent!=root.resolve(),'write outside freeze');target.write_bytes(b)
    print(b.decode(),end='')
if __name__=='__main__':main()
