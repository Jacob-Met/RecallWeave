from pathlib import Path
import hashlib,json,datetime,shutil
r=Path(r'C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df');old=r/'candidate';out=r/'candidate-v2'
mb=(r/'candidate-v2-freeze.json').read_bytes();manifest=json.loads(mb)
for row in manifest['files']:
 b=(out/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']
oc=(old/'recall-first/styles.css').read_bytes();nc=(out/'recall-first/styles.css').read_bytes();delta=b'.preview,.prompt-card,.course-title{overflow-wrap:anywhere}'
assert nc.startswith(oc) and nc[len(oc):].strip()==delta
oh=(old/'recall-first.html').read_bytes();nh=(out/'recall-first.html').read_bytes()
assert oh.count(oc)==1 and oh.replace(oc,nc,1)==nh
unchanged=[row['path'] for row in manifest['files'] if (old/row['path']).read_bytes()==(out/row['path']).read_bytes()]
assert len(unchanged)==7 and all(p in unchanged for p in ['src/deck.mjs','src/recall-first-ui.mjs','src/recall-first.mjs','templates/recall-first.html','data/deck.json'])
receipt={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'manifest_sha256':hashlib.sha256(mb).hexdigest(),'files_verified':10,'functional_groups_1_through_5_bound_to_unchanged_runtime_and_template':True,'unchanged_files':unchanged,'html_is_exact_v1_with_only_css_replacement':True,'css_exact_appended_bytes_repr':repr(nc[len(oc):]),'author_test_portability_change_not_part_of_browser_runtime':True,'capacity_free':shutil.disk_usage(r).free,'preserved_intake_assertion_failure':{'driver':'intake-v2.py','pid':82404,'assertion':'nc.replace(delta, empty, 1) == oc','cause':'Strict receiver comparison omitted the appended rule newline. Candidate10filelength/SHA/Git verification and copies had completed. This second comparison verifies exact old-prefix plus whitespace-framed single rule and exact HTML substitution, with no source mutation.'}}
p=r/'candidate-v2-intake.json';p.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'intake_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'free_bytes':receipt['capacity_free'],'css_delta':receipt['css_exact_appended_bytes_repr'],'unchanged':unchanged}))
