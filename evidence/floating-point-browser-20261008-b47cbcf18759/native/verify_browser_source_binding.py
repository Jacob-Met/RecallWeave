#!/usr/bin/env python3
"""Read-only artifact/source binding; does not execute browser or course code."""
import datetime,hashlib,json,os,pathlib,sys
if sys.flags.optimize: raise RuntimeError("optimized_execution_refused")
root=pathlib.Path('/home/jacob/recallweave-publication-b47cbcf18759')
custody=root/'browser-evidence-windows'
source=root/'intake-813/source-current-813'
v=os.statvfs(root); assert v.f_bavail*v.f_frsize>=33554432,'insufficient_receipt_capacity'
def sha(b):return hashlib.sha256(b).hexdigest()
def read_receipt(directory,expected):
 p=custody/'evidence'/directory/'receiving.json'; b=p.read_bytes()
 assert sha(b)==expected
 return json.loads(b)
current_dir='browser-receiving-current-20261008T171509Z'
labels_dir='browser-receiving-labels-20261008T173628Z'
current=read_receipt(current_dir,'b43e572dc72cca696c2ee844a3932b9d12459ef77b3104a29377285abb38d46b')
labels=read_receipt(labels_dir,'1daf01eb273d88dd2a7eb9ab4dd4519900a3a73be7056ac5159293292d421516')
assert current['status']==labels['status']=='passed'
assert current['sourceUnchanged'] is True and current['sourceBefore']==current['sourceAfter']
assert current['passedGroups']==3 and current['failedGroups']==0 and current['passedChecks']==14
assert len(current['sourceBefore'])==40
assert len({x['path'] for x in current['sourceBefore']})==40
for item in current['sourceBefore']:
 rel=pathlib.PurePosixPath(item['path']);assert not rel.is_absolute() and '..' not in rel.parts
 b=(source/rel).read_bytes();assert len(b)==item['bytes'] and sha(b)==item['sha256'],item['path']
assert current['sourceIntegration']['head']=='81363271da63c5428fcb4cafba39fc89c3557b82'
assert current['sourceIntegration']['tree']=='bae6038f3f48a13ebe55abffdaf3e0d378516dd7'
assert current['learnerSnapshot']==current['sourceIntegration']['head']
assert current['learnerTree']==current['sourceIntegration']['tree']
assert not current['lifecycleErrors']
assert len(current['groups'])==3 and sum(len(g['checks']) for g in current['groups'])==14
for g in current['groups']:
 assert g['status']=='passed'
 for key in ('pageErrors','consoleErrors','requestFailures','blockedRequests'):assert not g[key],(g['name'],key)
assert len(current['downloads'])==7 and len(current['captures'])==5 and len(labels['captures'])==3
verified=[]
for dn,items in [(current_dir,current['downloads']+current['captures']),(labels_dir,labels['captures'])]:
 for item in items:
  rel=pathlib.PurePosixPath(item['path'].replace('\\','/'))
  assert not rel.is_absolute() and '..' not in rel.parts
  b=(custody/'evidence'/dn/rel).read_bytes();assert len(b)==item['bytes'] and sha(b)==item['sha256']
  verified.append({'path':dn+'/'+str(rel),'bytes':len(b),'sha256':sha(b)})
assert not labels['errors'] and not labels['requests']
obs={x['label']:x for x in labels['observations']}
assert set(obs)=={'v2-negative-wide','v3-positive-wide','v3-positive-compact'}
negative=obs['v2-negative-wide']['collisions']
assert len(negative)==1 and negative[0]['a']=='b' and negative[0]['b']=='b′'
assert negative[0]['width']>0 and negative[0]['height']>0
assert not obs['v3-positive-wide']['collisions'] and not obs['v3-positive-compact']['collisions']
pins={x['path']:x['sha256'] for x in current['sourceBefore']}
assert pins['src/floating-point-ui.mjs']=='892cd0be2de4ff4594635d464c49748ec6c5df99b37239e8889591343aa31157'
assert pins['courses/floating-point-lab.html']=='a3e821c4fa514bd1b939ed9da97946bd089e0bb545bd36b0096d9c4bb530c418'
assert pins['src/floating-point.mjs']=='34346c16c71eab9560e246e5cfce2f7c65ab7d181e8b1ad876fc52021549c15a'
assert pins['courses/floating-point-lab.html'] in labels['sourcePins'].values()
out={'schema':'hamon.recallweave.browser_source_binding.v1','created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'verified','source_snapshot':'cd71ea9b54de260aab2d2c1ba2b8d3cd80e6286a','source_tree':'3c185c8bc89eb53bac2674f9331561b4508b844e','receiving_main':current['learnerSnapshot'],'receiving_main_tree':current['learnerTree'],'source_files':current['sourceBefore'],'all_40_native_source_files_match_browser_before_and_after':True,'physical_artifacts':verified,'current_receipt_sha256':'b43e572dc72cca696c2ee844a3932b9d12459ef77b3104a29377285abb38d46b','label_receipt_sha256':'1daf01eb273d88dd2a7eb9ab4dd4519900a3a73be7056ac5159293292d421516','groups':3,'checks':14,'negative_label_overlap':negative[0],'successor_label_collisions':0,'verifier_sha256':sha(pathlib.Path(__file__).read_bytes()),'boundary':'Offline source/artifact identity verification against retained actual browser receipts; no new browser/test run and no claim of receiving against later main until separate complete-tree comparison.','source_mutations':0,'api_calls':0}
b=(json.dumps(out,indent=2)+'\n').encode()
path=custody/'browser-source-binding.json'
with path.open('xb') as f:f.write(b);f.flush();os.fsync(f.fileno())
assert path.read_bytes()==b
print(json.dumps({'path':str(path),'sha256':sha(b),'source_files':40,'verified_downloads':7,'verified_screenshots':8,'api_calls':0}),flush=True)
