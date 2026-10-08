#!/usr/bin/env python3
"""Verify the frozen original RecallWeave receiving packet, using only saved bytes.

No product module, browser, provider or application is executed. The five executed
Python helpers below are the receiver's own pinned evidence/oracle programs.
Usage: python3 verify-review.py PACKET_DIRECTORY [OUTPUT_JSON]
"""
from pathlib import Path,PurePosixPath
import json,hashlib,tarfile,io,copy,gzip,sys

PACKET_SHA='4baefe516dc067db510340e16d3b48956e53db58de58803fc95d1ebfe8379749'
MANIFEST_SHA='847c4ee13369cd90a1789d35126e4f141c31e0d1052752dee83af2d3ddcb8c91'
HELPERS={
 'verify_foundation.py':'a1a735bad2301d559f65c7b258642ec06d048f1f73af550c7646a58d5225c8d0',
 'verify_model_evidence.py':'8db9cb9f1a7f7bb7a26a649240e1414b3b2fb10d5c5de81ed93b81228e7d622d',
 'verify_learner_evidence.py':'00063c90797cafa735c51cb0d424121107aa729a0bce6a1f2597285fb94cd751',
 'verify_ui_evidence.py':'a7faf547d26bc8a3ec7a173cee1f35b8f8de3adfa49d7712047b195d0d2ebf98',
 'oracle.py':'01b04c69436f9e6d18c7e408faeaf47a98b4d413f8ac5b80857ad4280c86ec5f'}
def need(v,message):
    if not v:raise ValueError(message)
def sha(b):return hashlib.sha256(b).hexdigest()
def unpack(raw):
    files={}
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:*') as t:
        for m in t.getmembers():
            p=PurePosixPath(m.name)
            need(m.isfile() and not p.is_absolute() and '..' not in p.parts and m.name not in files,'ordinary safe unique archive member')
            b=t.extractfile(m).read();need(len(b)==m.size,'member byte count');files[m.name]=b
    return files
def own(files,name):
    need(sha(files[name])==HELPERS[name],'independent helper pin: '+name)
    scope={'__name__':'saved_independent_helper','__file__':name};exec(compile(files[name],name,'exec'),scope);return scope
def verify_archive(root):
    archive=(root/'native-packet.tar.xz').read_bytes()
    need(len(archive)==7143848 and sha(archive)==PACKET_SHA,'native archive pin')
    files=unpack(archive);mb=files['native-manifest.json']
    need(len(files)==295 and mb==(root/'native-manifest.json').read_bytes() and sha(mb)==MANIFEST_SHA,'native manifest identity/count')
    manifest=json.loads(mb);need(len(manifest['files'])==294,'native listed count')
    need({r['path'] for r in manifest['files']}==set(files)-{'native-manifest.json'},'complete native manifest coverage')
    for r in manifest['files']:
        b=files[r['path']];need(len(b)==r['bytes'] and sha(b)==r['sha256'],'native artifact: '+r['path'])
    nested=files['model-component-packet.tar.xz']
    need(len(nested)==326776 and sha(nested)=='b59f7e3ac3377e7962575c29d77a9f8d999385532f24fe10cce9acf0c8f75aa2','original model checkpoint')
    inside=unpack(nested);cm=json.loads(inside['component-manifest.json'])
    need(len(inside)==36 and len(cm['files'])==35,'original model checkpoint counts')
    for r in cm['files']:
        b=inside[r['path']];need(len(b)==r['bytes'] and sha(b)==r['sha256'],'model checkpoint artifact')
        need(r['path'] not in files or files[r['path']]==b,'model checkpoint duplicate changed')
        files[r['path']]=b
    for name in HELPERS:need(sha(files[name])==HELPERS[name],'own verifier/oracle source pin')
    foundation=own(files,'verify_foundation.py');f=foundation['verify'](files)
    need(f.pop('complete_explorer_acceptance') is False,'foundation-only historical scope')
    f['scope']='Model and course foundation; explorer acceptance is separately computed below.'
    ui=own(files,'verify_ui_evidence.py')['verify'](files)
    fixture=json.loads(gzip.decompress(files['oracle-fixtures.json.gz']))
    bad=copy.deepcopy(json.loads(files['model-v2-results/report.json']))
    bad['cases'][0]['actual']['totals']['payloadBits']+=1
    rejected=[]
    try:own(files,'verify_model_evidence.py')['verify_model_record'](bad,fixture)
    except ValueError as e:
        need('complete model differs' in str(e),'model negative semantic boundary');rejected.append('changed raw model payload with saved success flags intact')
    need(len(rejected)==1,'altered raw model accepted')
    course=json.loads(files['course-v1/courses/prefix-coding.json']);report=json.loads(files['course-v1-learner/report.json'])
    first=next(i for i in course['items'] if i['id']==report['answers'][0]['id'])
    raw=files['course-v1-learner/study-notes-after-practice.txt']
    altered=raw.replace(('Explanation: '+first['explanation']+'\n').encode(),b'Explanation: removed in receiver negative.\n',1)
    need(altered!=raw,'learner negative prepared')
    mem=foundation['MemoryPath'](files)
    try:own(files,'verify_learner_evidence.py')['verify'](mem,mem/'course-v1-learner/report.json',mem/'course-v1/courses/prefix-coding.json',False,{'study-notes-after-practice':altered})
    except ValueError as e:
        need('download explanation missing' in str(e),'learner negative semantic boundary');rejected.append('omitted real downloaded lesson explanation')
    need(len(rejected)==2,'altered learner notes accepted')
    return {'schema':'recall-prefix-independent-complete-verification-v1','accepted':True,
      'source_baseline':'6f920f177ae90a09958146d41612a0e83f52702f','source_tree':'c2be5240d1ffa17c7e66b3fb8fe74aa334ec10b2',
      'native_archive':{'bytes':len(archive),'sha256':PACKET_SHA,'ordinary_members':295,'listed_artifacts':294},
      'nested_model_archive':{'ordinary_members':36,'listed_artifacts':35,'both_complete_raw_reports_preserved':True},
      'foundation':f,'explorer':ui,'additional_semantic_negatives':rejected,'actual_receiver_Node_process_records':10,
      'product_execution_during_verification':False,'current_parent_composition_included':False,'integration_or_deployment_claim':False}
def main():
    root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent
    receipt=json.loads((root/'receipt.json').read_bytes())
    need(receipt['schema']=='recall-prefix-independent-receiving-receipt-v1' and receipt['accepted'] is True,'final receiving receipt')
    rows=receipt['artifacts'];need(len(rows)==6,'complete six sibling artifact bindings')
    need({r['path'] for r in rows}=={'README.md','archive-freeze.json','native-manifest.json','native-packet.tar.xz','verification.json','verify-review.py'},'final packet artifact names')
    for r in rows:
        b=(root/r['path']).read_bytes();need(len(b)==r['bytes'] and sha(b)==r['sha256'],'frozen sibling artifact: '+r['path'])
    result=verify_archive(root);b=(json.dumps(result,indent=2)+'\n').encode()
    need(b==(root/'verification.json').read_bytes(),'complete verification reproduces byte-identically')
    if len(sys.argv)>2:
        target=Path(sys.argv[2]).resolve()
        need(target.parent!=root.resolve(),'write replay output outside frozen packet')
        target.write_bytes(b)
    print(b.decode(),end='')
if __name__=='__main__':main()
