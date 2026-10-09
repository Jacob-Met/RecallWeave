import sys,os,json,time,datetime,hashlib,pathlib,stat,shutil,subprocess,signal,traceback,platform
START=time.monotonic()
def require(ok,message):
 if not ok: raise ValueError(message)
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def pin_text(s):
 b=s.encode('utf-8');return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()}
def pin_file(expected):
 p=pathlib.Path(expected['path']);st=p.stat()
 require(stat.S_ISREG(st.st_mode),'Runtime must be regular: '+str(p))
 require(st.st_size==expected['bytes'],'Runtime byte count: '+str(p))
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 out={'path':str(p),'bytes':st.st_size,'mode':oct(stat.S_IMODE(st.st_mode)),'mtime_ns':str(st.st_mtime_ns),'sha256':h.hexdigest()}
 require(out==expected,'Runtime identity: '+str(p))
 return out
def guard():
 vm=subprocess.run(['/usr/bin/vm_stat'],capture_output=True,text=True,timeout=3)
 require(vm.returncode==0,'vm_stat failed')
 page=int(vm.stdout.split('page size of ')[1].split(' bytes')[0]);counts={}
 for line in vm.stdout.splitlines():
  if ':' in line:
   k,v=line.split(':',1)
   if k in ('Pages free','Pages inactive','Pages speculative'):counts[k]=int(v.strip().rstrip('.'))
 require(len(counts)==3,'Incomplete conservative memory observation')
 free=shutil.disk_usage('/Users/me').free;mem=sum(counts.values())*page
 g={'at':utc(),'free_disk_bytes':free,'conservative_memory_bytes':mem,'page_bytes':page,'counters':counts,'vm_stat_stdout':vm.stdout,'vm_stat_stderr':vm.stderr,'disk_floor_bytes':268435456,'memory_floor_bytes':2147483648}
 require(free>=268435456 and mem>=2147483648,'Fresh resource guard refused')
 return g
def deadline(signum,frame):raise TimeoutError('20-second independent SQL deadline exceeded')
def statements(s):
 result=[];part=''
 for line in s.splitlines(keepends=True):
  if line.lstrip().startswith('--'):continue
  part+=line
  if sqlite3.complete_statement(part):
   result.append(part.strip());part=''
 require(not part.strip(),'Incomplete SQL statement tail')
 return result
def compare(actual,expected,path,issues):
 if type(actual) is not type(expected):issues.append({'path':path,'expected_type':type(expected).__name__,'actual_type':type(actual).__name__});return
 if isinstance(expected,list):
  if len(actual)!=len(expected):issues.append({'path':path,'expected_length':len(expected),'actual_length':len(actual)});return
  for i,(a,e) in enumerate(zip(actual,expected)):compare(a,e,path+'/'+str(i),issues)
 elif actual!=expected:issues.append({'path':path,'expected':expected,'actual':actual})
result={'schema':'recallweave-sql-null-membership-root-native-receipt/v1','operator':'estate-c945953fdeb7/root','started_at':utc(),'pid':os.getpid(),'physical_files_written':0,'candidate_select_calls':0,'database_connections':0,'accepted':False}
conn=None
try:
 signal.signal(signal.SIGALRM,deadline);signal.alarm(20)
 raw=sys.argv[1]
 require(len(raw.encode('utf-8'))<=131072,'Input byte budget')
 spec=json.loads(raw);result['input_pin']=pin_text(raw);result['original_authority']=spec['original_authority']
 result['guard_before']=guard();result['runtime_before']=[pin_file(p) for p in spec['runtime']['pins']]
 require(platform.python_version()==spec['runtime']['python_version'],'Python version mismatch')
 import sqlite3,_sqlite3
 require(sqlite3.sqlite_version==spec['runtime']['sqlite_version'],'SQLite version mismatch')
 require(str(pathlib.Path(sys.executable).resolve())==spec['runtime']['pins'][0]['path'],'Interpreter location mismatch')
 require(str(pathlib.Path(_sqlite3.__file__).resolve())==spec['runtime']['pins'][2]['path'],'SQLite extension location mismatch')
 result['runtime']={'python':platform.python_version(),'sqlite':sqlite3.sqlite_version,'executable':sys.executable,'platform':platform.platform(),'uid':os.getuid(),'sqlite_extension':_sqlite3.__file__}
 ws=spec['worksheet'];actual_pin=pin_text(ws['text'])
 require(actual_pin=={k:ws[k] for k in ('bytes','sha256','git_blob')},'Exact worksheet input pin')
 result['worksheet_pin']=actual_pin
 setup=statements(spec['setup_sql']);whole=statements(ws['text'])
 require(len(setup)==4 and len(whole)==16,'Exact four setup and twelve query statement count')
 require(whole[:4]==setup,'Worksheet setup literal mismatch')
 require(whole[4:]==[e['sql'].strip() for e in spec['expected']],'Worksheet query literal/order mismatch')
 require(len(spec['expected'])==12,'Fixed twelve-query authority')
 result['literal_statement_admission']=True
 conn=sqlite3.connect(':memory:');result['database_connections']=1
 conn.set_progress_handler(lambda: 1 if time.monotonic()-START>19 else 0,1000)
 for statement in whole[:4]:conn.execute(statement)
 result['setup_statements']=4;result['changes_after_setup']=conn.total_changes
 require(conn.total_changes==6,'Exact fictional fixture insertion count')
 records=[];issues=[]
 for n,(statement,e) in enumerate(zip(whole[4:],spec['expected'])):
  result['candidate_select_calls']+=1
  cursor=conn.execute(statement);cols=[d[0] for d in cursor.description];rows=[list(row) for row in cursor.fetchall()]
  compare(cols,e['columns'],e['id']+'/columns',issues);compare(rows,e['rows'],e['id']+'/rows',issues)
  records.append({'id':e['id'],'number':n+1,'columns':cols,'rows':rows,'sql':statement})
 result['records']=records;result['comparison_issues']=issues;result['changes_after_queries']=conn.total_changes
 require(conn.total_changes==6,'A supposed read-only query changed the fixture')
 require(not issues,'Native worksheet differs from independently frozen authority')
 row_count=sum(len(r['rows']) for r in records);cell_count=sum(len(r['rows'])*len(r['columns']) for r in records)
 require((row_count,cell_count)==(29,110),'Complete result size mismatch')
 result['result_rows']=row_count;result['result_cells']=cell_count
 conn.close();conn=None;result['database_closed']=True
 result['runtime_after']=[pin_file(p) for p in spec['runtime']['pins']]
 result['runtime_unchanged']=result['runtime_before']==result['runtime_after']
 result['input_unchanged']=pin_text(raw)==result['input_pin']
 result['guard_after']=guard();result['accepted']=True
except Exception as exc:
 result['error']={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc()}
finally:
 if conn is not None:
  conn.close();result['database_closed']=True
 signal.alarm(0)
 result['finished_at']=utc();result['elapsed_seconds']=time.monotonic()-START
 result['source_or_product_retries']=0;result['real_database_connections']=0
 text=json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n'
 if len(text.encode('utf-8'))>65536:
  print(json.dumps({'accepted':False,'error':'Output budget exceeded','bytes':len(text.encode('utf-8')),'no_retry':True}));sys.exit(1)
 print(text,end='',flush=True)
sys.exit(0 if result['accepted'] else 1)
