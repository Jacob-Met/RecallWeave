import json,sys,hashlib
raw=sys.argv[1].encode();p=json.loads(raw);o=json.loads(sys.argv[2]);ver=json.loads(sys.argv[3])
assert len(raw)==16446 and hashlib.sha256(raw).hexdigest()=='5d219ad7f7a7a22aae7bbc8792bf0cc3b07f77533e1341a552c412e28cd56f73'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='0fa25ecd260bbffb80d2e7ee55d27ea8c062a3e8'
kept={k:p[k] for k in ['identity','installedFiles','installedDirectories','installedTotalBytes','retainedInputs','nativeAdmissionsAlreadyClosed','limits']}
runtime_before=json.dumps(p['runtime'],sort_keys=True)
p.update(o)
p['runtime']['chrome']['versionProvenance']='Original bundle metadata plus actual first-epoch Browser.getVersion observation in df4aa070aa79b0394b6f8ac84c31ceb681ab3f04. The continuation must observe the same product/revision again.'
p['runtime']['chrome']['priorActualBrowserVersion']=ver
assert all(p[k]==v for k,v in kept.items())
assert len(p['installedFiles'])==14 and len(p['retainedInputs'])==6 and len(p['runtime'])==4
for item in p['installedFiles']+p['retainedInputs']:
 for k,v in item.get('nativeMetadata',{}).items():
  if k.endswith('Ns') or k in ('device','inode'):assert isinstance(v,str),(k,v)
assert len(p['priorEpoch']['evidenceFiles'])==11
assert len(set(x['path'] for x in p['priorEpoch']['evidenceFiles']))==11
b=(json.dumps(p,ensure_ascii=False,indent=2)+'\n').encode()
ident={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'gitBlob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}
print(json.dumps({'text':b.decode(),'identity':ident,'checks':{'originalInstalledSourceIdentityLimitsPreserved':True,'installedFiles':14,'sourceFiles':6,'runtimeFiles':4,'priorEvidenceFiles':11,'newLauncherInvocations':0,'newGroups':4}}))
