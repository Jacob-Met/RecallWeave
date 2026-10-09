import json,sys
d=json.loads(sys.argv[1]);checks={}
for k,n in [('runtime',4),('source',6),('installed',14),('prior',15),('staged',5)]:
 assert d[k+'_before']==d[k+'_after'],k
 assert len(d[k+'_before'])==n,k
 checks[k]={'files':n,'losslessBeforeAfterEqual':True}
assert d['errors']==[] and d['receiver_invocations']==1
for k in ['installer_invocations','author_control_invocations','desktop_opener_invocations','installed_launcher_invocations']:assert d[k]==0,k
assert d['receiver']['pid']==41984 and d['receiver']['exit']==0 and d['receiver']['reaped'] and d['receiver']['ownedNodeGroupAbsent']
assert d['receiverReceipt']['gitBlob']=='0fc84a6e9661e9cb4aeeaec6c0484a8adcdebef4'
assert d['receiverTerminal']['passed'] and len(d['groups'])==4 and all(x['passed'] for x in d['groups'])
assert d['carriedGroup']['passed'] and not d['carriedGroup']['originalOverallPassed'] and d['carriedGroup']['newInvocations']==0
assert d['finalNativeCensus']['entries']==[] and len(d['downloads'])==3
print(json.dumps({'passed':True,'source':'e3392fd502142f00c54f4c19912143c5eae3e5ef','checks':checks,'receiver':{k:d['receiver'][k] for k in ['pid','exit','wallSeconds','reaped','ownedNodeGroupAbsent']},'supervisorPid':d['pid'],'started':d['started'],'finished':d['finished'],'accounting':d['receivingAccountingBeforeFinalReceipt'],'admissions':d['admissions'],'newNativeProcessOrBrowserInvocationsByPostprocessor':0,'authorizedNativeTextReads':7}))
