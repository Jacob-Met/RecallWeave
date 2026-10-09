import json,sys
d=json.loads(sys.argv[1])
assert d['schema']=='recallweave.lp.mac-installed-continuation/1' and d['terminal']['passed']
assert [g['id'] for g in d['groups']]==['L2-installed-fractional-use','L3-three-physical-downloads','L4-same-installed-url-reopened','L5-integrity-and-owned-closure']
assert all(g['passed'] for g in d['groups'])
assert d['inputs']['driver']['gitBlob']=='0f654871b830adf7e41d4243a9935cf9dd9a0ce7'
assert d['inputs']['plan']['gitBlob']=='134d66dbf1ceb54b8e87b857b81fc3405ace70c0'
assert d['continuationFreeze']=='dfd2eb3d9dede88fe747ffdb8d2e892ed5c9f6d7'
assert d['prefixAmendment']=='75c50d1e72ab98912be376bfa4770bc42e7bf601'
integrity={}
for k,n in [('installed',14),('retainedInputs',6),('runtime',4),('priorEvidence',11)]:
 assert d[k+'Before']==d[k+'After'],k
 v=d[k+'Before'];count=len(v['files']) if k=='installed' else len(v)
 assert count==n,k;integrity[k]={'count':count,'beforeAfterEqual':True}
assert len(d['installedBefore']['directories'])==4
assert d['carriedL1']['newInvocations']==0 and d['carriedL1']['originalOverallPassed']==False
assert [(c['pid'],c['flag'],c['newInvocation']) for c in d['carriedL1']['commands']]==[(99091,'--check',False),(99096,'--no-open',False)]
assert len(d['processes'])==1
p=d['processes'][0];assert p['label']=='chrome' and p['pid']==41991 and p['exitCode']==0 and p['terminal'] and p['signal'] is None and p['groupRetiredAt']
assert d['processCensus'][-1]['entries']==[]
acts=d['actions']
for target in ['load-preset','download-observation','download-course','download-guide']:
 clicks=[a for a in acts if a['kind']=='click' and a.get('id')==target]
 assert len(clicks)==1 and clicks[0]['trusted'],target
assert not any(a['kind']=='click' and a.get('id')=='apply' for a in acts)
assert not any(a['kind']=='submit' for a in acts)
for target,prefix,value in [('preset','A fr','fractional'),('vertex-select','V3','V3')]:
 events=[a for a in acts if a.get('id')==target]
 assert [a['key'] for a in events if a['kind']=='keypress']==list(prefix),target
 assert all(a['trusted'] and not a['ctrlKey'] and not a['altKey'] and not a['metaKey'] for a in events if a['kind'] in ('keydown','keypress','keyup'))
 for kind in ('input','change'):assert any(a['kind']==kind and a['trusted'] and a['value']==value for a in events)
assert d['pageErrors']==[]
assert not [e for e in d['protocolErrors'] if e['phase']=='active']
assert d['initial']['preset']=='unique' and d['reopened']['preset']=='unique'
assert d['fractional']['selectedVertex']=='V3' and d['fractional']['preset']=='fractional'
assert d['initial']['url']==d['fractional']['url']==d['reopened']['url']==d['fileUrl']
assert d['initial']['storage']==d['fractional']['storage']==d['reopened']['storage']=={'local':0,'session':0}
assert len(d['downloadArtifacts'])==3
assert len([e for e in d['downloadEvents'] if e['method']=='Browser.downloadWillBegin'])==3
outside=[q for q in d['pageRequests'] if q['url']!=d['fileUrl'] and not q['url'].startswith(('blob:','data:')) and q['url']!='about:blank']
assert outside==[]
print(json.dumps({'identityChecksPassed':True,'integrity':integrity,'carriedL1Pids':[x['pid'] for x in d['carriedL1']['commands']],'actions':acts,'initial':d['initial'],'fractional':d['fractional'],'reopened':d['reopened'],'processes':d['processes'],'browserVersion':d['browserVersion'],'browserCloseIntent':d['browserCloseIntent'],'protocolErrors':d['protocolErrors'],'transportEvents':d['transportEvents'],'transportDisposition':d['transportDisposition'],'pageErrors':d['pageErrors'],'pageRequests':d['pageRequests'],'finalCensus':d['processCensus'][-1],'downloadEvents':d['downloadEvents'],'terminal':d['terminal']},ensure_ascii=False))
