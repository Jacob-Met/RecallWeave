import sys,termios,base64,json,hashlib,io,tarfile
# In-memory source/custody receiving only. No product import, native replay or files.
settings=termios.tcgetattr(sys.stdin.fileno());settings[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin.fileno(),termios.TCSANOW,settings)
print('READY',flush=True)
def read_block(end):
 rows=[]
 for line in sys.stdin:
  if line.strip()==end:return base64.b64decode(''.join(rows),validate=True)
  rows.append(line.strip())
 raise RuntimeError('EOF before '+end)
def ids(b):
 return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'gitBlob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}
inputs=json.loads(read_block('SOURCE_END'))
expected={'receiver':'8960e1c4dbe4052e0c0aee180639df270bfc0d56','protocol':'aeda8c66cd1272117fda115215c1e6ab57eaab32','diff':'40b8fbcaa93d602e91ea15381b8e72794bbd06c2','observer':'5ca69ca68cde91c2439f3b795f280cbc5e552793','manifest':'18e01267848fb2d1ec6dba57492580c1e5d6ec74','original':'3633533974527f7a7310ed859fb45ef86f538678','helper':'e2e30db7e5362f4f0a16116f1172bd1db7e0213c'}
pins={k:ids(v.encode()) for k,v in inputs.items()}
assert set(inputs)==set(expected)
for k,v in expected.items():assert pins[k]['gitBlob']==v,(k,pins[k])
a=inputs['original'];b=inputs['receiver']
def between(s,start,end):
 i=s.index(start);j=s.index(end,i);return s[i:j]
fixture_a=between(a,'const before = {','const downloads =')
fixture_b=between(b,'const before = {','const downloads =')
assert fixture_a==fixture_b
start='  for (const [mode,url,width,height]';end='  assert.deepEqual(pageErrors,[]);'
body_a=between(a,start,end);body_b=between(b,start,end)
cut=body_b.index("    await loaded('after',afterPath);await compareLoaded();\n    await holdDigest();")
tail=body_b.rindex("  }\n")
inherited=body_b[:cut]+body_b[tail:]
assert inherited.endswith('\n\n  }\n')
inherited=inherited[:-len('\n\n  }\n')]+'\n  }\n'
assert inherited==body_a
assert body_a.count('passed(mode+')==5
manifest=json.loads(inputs['manifest']);protocol=json.loads(inputs['protocol'])
assert len(manifest['sources'])==13
assert {r['path']:r['sha256'] for r in protocol['nativeSourceClosure']}==manifest['sources']
assert manifest['receiver']['sha256']==pins['receiver']['sha256']
assert manifest['observer']['sha256']==pins['observer']['sha256']
assert manifest['owner177']['gitBlob']=='680e96107af0264c4b65a3ae26d84f803af0a27a'
assert manifest['sources']['src/course-comparison.mjs']=='9b2de709ca9f9366534df40c9f0b3b3fefc0121fdc68d62d49d69c368b347c43'
source={'format':'recall180-continuation-source-receiving/1','status':'accepted-source-only','sources':pins,'original_fixture_exact':ids(fixture_a.encode()),'original_ten_criteria_body_exact':ids(body_a.encode()),'explicit_nonsemantic_body_delta':'one extra blank line before closing two-mode loop after the new digest block is removed','source_paths':13,'product_execution':False,'browser_execution':False}
print('SOURCE_RECEIVING '+json.dumps(source),flush=True)
archive=read_block('ARCHIVE_END')
identity=ids(archive)
assert identity=={'bytes':664412,'sha256':'00e3602b6cc2979058ebb459a8d4a7152a62964ff161181725dfa8078294dd18','gitBlob':'9e5b238e655554600da58fc8afb0fb1afded7070'}
with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
 members=tar.getmembers();assert len(members)==199 and len({x.name for x in members})==199
 assert all(x.isfile() and not x.name.startswith('/') and '..' not in x.name.split('/') for x in members)
 blobs={x.name:tar.extractfile(x).read() for x in members}
 mb=blobs['author-custody-r1/manifest.json']
 assert ids(mb)['sha256']=='7e9442eac559856b604f731db216193c7360447fcd9423af0e6d3f87e68a6deb'
 manifest=json.loads(mb);assert set(blobs)==set(manifest['members'])|{'author-custody-r1/manifest.json'}
 for n,v in manifest['members'].items():assert ids(blobs[n])=={k:x for k,x in v.items() if k!='mtime_ns'},n
 r3=json.loads(blobs['candidate-evidence-r3/receiving.json'])
 assert r3['status']=='passed' and r3['source_before']==r3['source_after'] and r3['runtime_before']==r3['runtime_after']
 assert len(r3['source_before'])==29 and len(r3['runtime_before'])==71
 assert r3['borrowed_before']==r3['borrowed_after']
 assert json.loads(blobs['candidate-evidence-r1/receiving.json'])['status']=='failed'
 assert json.loads(blobs['candidate-evidence-r2/receiving.json'])['status']=='failed'
 assert blobs['candidate-r2/src/scenario_sequence.rs']==blobs['candidate-r3/src/scenario_sequence.rs']
 assert blobs['candidate-r2/src/bin/pneumatic-sequence.rs']==blobs['candidate-r3/src/bin/pneumatic-sequence.rs']
 selected={n:ids(blobs[n]) for n in ['author-custody-r1/README.md','author-custody-r1/manifest.json','author-custody-r1/composition.json','baseline-evidence/receiving.json','candidate-evidence-r1/receiving.json','candidate-evidence-r2/receiving.json','candidate-evidence-r3/receiving.json','stdio-startup-diagnostic-r1/receiving.json']}
 receipt={'format':'pneumatic47-primary-memory-transport/1','status':'passed','archive':identity,'members':199,'all_member_hashes_exact':True,'original_failures_retained':True,'r3_product_runtime_equals_r2':True,'source_before_after_records':29,'runtime_before_after_records':71,'readable_members':selected}
 print('ARCHIVE_RECEIVING '+json.dumps(receipt),flush=True)
