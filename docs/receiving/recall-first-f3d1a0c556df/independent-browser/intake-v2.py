from pathlib import Path
import hashlib,json,datetime,shutil
r=Path(r'C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df')
owner=Path(r'C:\Users\minec\hamon-recall-first-f3d1a0c556df')
mbytes=(owner/'evidence'/'CANDIDATE_FREEZE_v2.json').read_bytes()
assert hashlib.sha256(mbytes).hexdigest()=='0bd1c840c4338061f6ba46979db091c35b388a5ce142147c03a6c3f02de6edea'
manifest=json.loads(mbytes);out=r/'candidate-v2';out.mkdir(exist_ok=False)
for row in manifest['files']:
 b=(owner/'source'/row['path']).read_bytes()
 assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==row['git_blob']
 p=out/row['path'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
(r/'candidate-v2-freeze.json').write_bytes(mbytes)
old=r/'candidate'
oc=(old/'recall-first/styles.css').read_bytes();nc=(out/'recall-first/styles.css').read_bytes()
delta=b'.preview,.prompt-card,.course-title{overflow-wrap:anywhere}'
assert nc.replace(delta,b'',1)==oc
oh=(old/'recall-first.html').read_bytes();nh=(out/'recall-first.html').read_bytes()
assert oh.count(oc)==1 and oh.replace(oc,nc,1)==nh
unchanged=[]
for row in manifest['files']:
 p=row['path']
 if (old/p).read_bytes()==(out/p).read_bytes():unchanged.append(p)
assert len(unchanged)==7 and all(p in unchanged for p in ['src/deck.mjs','src/recall-first-ui.mjs','src/recall-first.mjs','templates/recall-first.html','data/deck.json'])
receipt={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'manifest_sha256':hashlib.sha256(mbytes).hexdigest(),'files_verified':10,'functional_groups_1_through_5_bound_to_unchanged_runtime_and_template':True,'unchanged_files':unchanged,'html_is_exact_v1_with_only_css_replacement':True,'css_added_rule':delta.decode(),'author_test_portability_change_not_part_of_browser_runtime':True,'capacity_free':shutil.disk_usage(r).free}
p=r/'candidate-v2-intake.json';p.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'intake_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'free_bytes':receipt['capacity_free'],'unchanged':unchanged}))
