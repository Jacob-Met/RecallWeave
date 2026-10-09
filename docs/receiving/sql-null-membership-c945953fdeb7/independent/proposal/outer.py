import os,sys,json,time,stat,hashlib,subprocess,signal,traceback,datetime
from pathlib import Path

ROOT=Path('/Users/me/Developer/recallweave-sql-null-membership-receiving-c945953fdeb7')
PYTHON='/Library/Frameworks/Python.framework/Versions/3.13/bin/python3'
NODE='/opt/homebrew/bin/node'
MIN_DISK=256*1024**2
MIN_MEMORY=2*1024**3
STATIC_CAP=2*1024**2
STREAM_CAP=1024**2
STDIN_LIMIT=262144
STDIN_SECONDS=30
NODE_SECONDS=215
WIRE={'bytes':116638,'sha256':'0889c9f0f2844a07e0ac518f611120e53d4873a02596f6609cde7d7792bdf6f2','git_blob':'b717cf9c876a46f47fbfb122248836daeb863171'}
NAMES=('receiver.mjs','AUTHORITY.json','CONTRACT.json','EXPECTED-NOTES-FRAGMENTS.json')
START=time.monotonic()
R={'schema':'recallweave-sql-independent-outer-v1','controller_pid':os.getpid(),'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'accepted':False,'failure':None,'guards':[],'staging_created':False,'node_receiver_children':0,'native_SQL_calls':0,'browser_limit_seconds':180,'node_lifecycle_limit_seconds':NODE_SECONDS,'stdin_limit_seconds':STDIN_SECONDS,'live_profile_census_performed_by_outer':False,'external_controller_exit_pending':True}
child=None
authority=None
before=None
protected=None
node_start=None
streams=[]
def need(ok,message):
 if not ok:raise RuntimeError(message)
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def pin(b):
 return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode('ascii')+b'\0'+b).hexdigest()}
def identity(p):
 p=Path(p);s=p.lstat()
 need(stat.S_ISREG(s.st_mode) and not p.is_symlink(),'Regular protected file required: '+str(p))
 b=p.read_bytes();a=p.lstat()
 need((s.st_ino,s.st_size,s.st_mtime_ns)==(a.st_ino,a.st_size,a.st_mtime_ns) and len(b)==s.st_size,'Protected file changed during read: '+str(p))
 return dict(pin(b),mode=format(stat.S_IMODE(s.st_mode),'04o'),mtime_ns=str(s.st_mtime_ns),inode=str(s.st_ino))
def tree(root):
 root=Path(root);need(root.is_dir() and not root.is_symlink(),'Regular directory required: '+str(root))
 out={}
 def walk(p):
  for q in sorted(p.iterdir()):
   s=q.lstat();need(not stat.S_ISLNK(s.st_mode),'Unexpected protected symlink: '+str(q))
   if stat.S_ISDIR(s.st_mode):walk(q)
   else:
    need(stat.S_ISREG(s.st_mode),'Protected special file: '+str(q))
    out[q.relative_to(root).as_posix()]=identity(q)
 walk(root);return out
def static_allocation():
 if not ROOT.exists():return {'logical':0,'allocated':0,'charged':0}
 logical=0;allocated=0
 def walk(p):
  nonlocal logical,allocated
  for q in p.iterdir():
   if q==ROOT/'browser':continue
   s=q.lstat();need(not stat.S_ISLNK(s.st_mode),'Unexpected static-stage symlink: '+str(q))
   if stat.S_ISDIR(s.st_mode):walk(q)
   else:
    need(stat.S_ISREG(s.st_mode),'Static-stage special file: '+str(q))
    logical+=s.st_size;allocated+=s.st_blocks*512
 walk(ROOT)
 return {'logical':logical,'allocated':allocated,'charged':max(logical,allocated)}
def guard(label):
 s=os.statvfs('/Users/me')
 vm=subprocess.run(['/usr/bin/vm_stat'],capture_output=True,text=True,timeout=5)
 need(vm.returncode==0,'vm_stat observation failed')
 page=int(vm.stdout.split('page size of ')[1].split(' bytes')[0]);counts={}
 for line in vm.stdout.splitlines():
  if ':' in line:
   k,v=line.split(':',1)
   if k in ('Pages free','Pages inactive','Pages speculative'):counts[k]=int(v.strip().rstrip('.'))
 need(set(counts)=={'Pages free','Pages inactive','Pages speculative'},'Complete conservative RAM observation required')
 g={'label':label,'utc':utc(),'free_disk_bytes':s.f_bavail*s.f_frsize,'conservative_memory_bytes':sum(counts.values())*page,'receiver_static':static_allocation()}
 R['guards'].append(g)
 need(g['free_disk_bytes']>=MIN_DISK and g['conservative_memory_bytes']>=MIN_MEMORY and g['receiver_static']['charged']<=STATIC_CAP,'Native resource admission refused: '+label)
 return g
def compare(got,want,label):
 need(set(got)==set(want),'Complete '+label+' path set changed')
 for name,e in want.items():
  need(all(got[name].get(k)==e[k] for k in ('bytes','sha256','git_blob','mode','mtime_ns','inode') if k in e),'Exact '+label+' identity changed: '+name)
def runtime():
 paths={'python':str(Path(PYTHON).resolve(strict=True)),'python_framework':'/Library/Frameworks/Python.framework/Versions/3.13/Python','node':str(Path(NODE).resolve(strict=True)),'chrome_entry':str(Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome').resolve(strict=True))}
 return {name:dict(identity(p),resolved=p) for name,p in paths.items()}
def boundary():
 return {'installed':tree(authority['installed_root']),'delivered':tree(authority['delivery_root']),'runtime':runtime()}
def admit(b):
 compare(b['installed'],authority['installed_files'],'installed')
 compare(b['delivered'],authority['delivery_files'],'delivered')
 compare(b['runtime'],authority['runtime'],'runtime')
 need(sys.version_info[:3]==(3,13,7),'Existing Python version changed')
def exclusive_file(p,b,mode=0o600):
 need(len(b)<=STREAM_CAP,'Per-file evidence bound exceeded')
 a=static_allocation()
 need(a['charged']+((len(b)+4095)//4096)*4096<=STATIC_CAP,'Static capacity before exclusive write')
 with open(p,'xb') as f:
  f.write(b);f.flush();os.fsync(f.fileno())
 os.chmod(p,mode)
 need(pin(Path(p).read_bytes())==pin(b),'Exclusive file readback mismatch')
 return identity(p)
def save_json(name,obj):
 return exclusive_file(ROOT/name,(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
def input_deadline(signum,frame):raise TimeoutError('30-second complete stdin payload deadline')
def owned_census():
 if child is None:return []
 q=subprocess.run(['/bin/ps','-axo','pid=,ppid=,pgid=,command='],capture_output=True,text=True,timeout=5)
 need(q.returncode==0,'Owned process-group census failed')
 selected=[]
 for line in q.stdout.splitlines():
  parts=line.strip().split(None,3)
  if len(parts)<3:continue
  pid,ppid,pgid=map(int,parts[:3])
  if pid==child.pid or pgid==child.pid:selected.append({'pid':pid,'ppid':ppid,'pgid':pgid,'command':parts[3] if len(parts)>3 else ''})
 return selected
def stop_owned(reason):
 if child is None:return
 R.setdefault('owned_stops',[]).append({'reason':reason,'utc':utc(),'pid':child.pid,'pgid':child.pid})
 try:os.killpg(child.pid,signal.SIGTERM)
 except ProcessLookupError:pass
 try:child.wait(timeout=2)
 except subprocess.TimeoutExpired:
  try:os.killpg(child.pid,signal.SIGKILL)
  except ProcessLookupError:pass
  child.wait(timeout=3)
 R['node_exit_after_owned_stop']=child.returncode
try:
 need(not ROOT.exists() and not ROOT.is_symlink(),'Exclusive receiver root already exists')
 need(ROOT.parent.is_dir() and not ROOT.parent.is_symlink(),'Receiver parent directory unavailable')
 guard('before-one-stdin-payload')
 print('SQL_RECEIVING_OUTER_JSON '+json.dumps({'ready':True,'pid':os.getpid(),'expected_wire':WIRE,'explicit_LF_required':True,'stdin_seconds':STDIN_SECONDS,'staging_created':False}),flush=True)
 signal.signal(signal.SIGALRM,input_deadline);signal.alarm(STDIN_SECONDS)
 wire=sys.stdin.buffer.readline(STDIN_LIMIT+1)
 signal.alarm(0)
 need(wire.endswith(b'\n') and len(wire)<=STDIN_LIMIT and pin(wire)==WIRE,'Exact complete stdin payload refused')
 payload=json.loads(wire.decode('utf-8'))
 need(set(payload)=={'schema','files','authority','root'} and payload['schema']=='recallweave-sql-receiver-exclusive-materialization-v1' and payload['root']==str(ROOT),'Exact materialization payload schema')
 need([f['path'] for f in payload['files']]==list(NAMES),'Exact four flat receiving inputs required')
 for f in payload['files']:
  need(set(f)=={'path','content','pin'} and pin(f['content'].encode('utf-8'))==f['pin'],'Receiving input pin mismatch')
 authority=payload['authority']
 byname={f['path']:f for f in payload['files']}
 need(json.loads(byname['AUTHORITY.json']['content'])==authority and authority['receiver_root']==str(ROOT),'Bound original authority identity')
 need(byname['receiver.mjs']['pin']==authority['receiver_source'] and byname['EXPECTED-NOTES-FRAGMENTS.json']['pin']==authority['notes_fragments'] and byname['CONTRACT.json']['pin']['git_blob']==authority['effective_contract'],'Frozen receiver/contract/notes binding')
 R['wire']=pin(wire);R['authority_contract']=authority['effective_contract'];R['input_pins']={n:byname[n]['pin'] for n in NAMES}
 before=boundary();admit(before);R['protected_before']=before
 guard('before-exclusive-materialization')
 ROOT.mkdir(mode=0o700);R['staging_created']=True
 for n in NAMES:exclusive_file(ROOT/n,byname[n]['content'].encode('utf-8'),0o444)
 protected={n:identity(ROOT/n) for n in NAMES}
 preparation={'schema':'recallweave-sql-receiving-preparation-v1','utc':utc(),'pid':os.getpid(),'wire':pin(wire),'source_inputs':protected,'receiver_execution_before_this_record':False,'effective_contract':authority['effective_contract'],'input_file_count':4,'source_input_bytes':sum(p['bytes'] for p in protected.values())}
 save_json('SOURCE-PREPARATION.json',preparation)
 protected['SOURCE-PREPARATION.json']=identity(ROOT/'SOURCE-PREPARATION.json')
 R['receiver_protected_before']=protected
 guard('before-one-node-receiver')
 out=open(ROOT/'node.stdout.txt','xb',buffering=0);err=open(ROOT/'node.stderr.txt','xb',buffering=0);streams=[out,err]
 node_start=time.monotonic()
 command=[NODE,str(ROOT/'receiver.mjs')]
 child=subprocess.Popen(command,cwd='/tmp',stdin=subprocess.DEVNULL,stdout=out,stderr=err,start_new_session=True)
 R['node_receiver_children']=1;R['node_command']={'argv':command,'cwd':'/tmp','pid':child.pid,'owned_process_group':child.pid,'started_utc':utc(),'limit_seconds':NODE_SECONDS}
 print('SQL_RECEIVING_OUTER_JSON '+json.dumps({'started':True,'controller_pid':os.getpid(),'node_pid':child.pid,'source_inputs':R['input_pins'],'wire':R['wire']}),flush=True)
 while True:
  remaining=NODE_SECONDS-(time.monotonic()-node_start)
  need(remaining>0,'215-second Node lifecycle deadline exceeded')
  try:
   code=child.wait(timeout=min(.25,remaining));break
  except subprocess.TimeoutExpired:
   a=static_allocation()
   need(a['charged']<=STATIC_CAP,'Static receiver allocation exceeded while child active')
   need((ROOT/'node.stdout.txt').stat().st_size<=STREAM_CAP and (ROOT/'node.stderr.txt').stat().st_size<=STREAM_CAP,'Owned Node stream cap exceeded')
 R['node_actual_exit']=code;R['node_elapsed_seconds']=time.monotonic()-node_start
 for f in streams:f.flush();os.fsync(f.fileno());f.close()
 streams=[]
 R['node_stdout']=identity(ROOT/'node.stdout.txt');R['node_stderr']=identity(ROOT/'node.stderr.txt')
 need(code==0,'Independent Node receiver exited nonzero')
 node_receipt_path=ROOT/'results'/'receipt.json'
 need(node_receipt_path.exists(),'Actual Node receipt absent')
 node_receipt=json.loads(node_receipt_path.read_text(encoding='utf-8'))
 R['node_receipt_pin']=identity(node_receipt_path)
 R['node_result']={'accepted':node_receipt.get('accepted'),'groups':node_receipt.get('groups'),'failure':node_receipt.get('failure'),'browser':node_receipt.get('browser'),'actual_commands':node_receipt.get('actual_commands')}
 need(node_receipt.get('accepted') is True and set(node_receipt.get('groups',{}))=={'L1','L2','L3','L4'} and all(node_receipt['groups'][k].get('pass') is True for k in ('L1','L2','L3','L4')),'Complete independent L1-L4 acceptance absent')
 R['accepted']=True
except BaseException as e:
 R['accepted']=False;R['failure']={'type':type(e).__name__,'message':str(e),'traceback':traceback.format_exc()}
 print(R['failure']['traceback'],file=sys.stderr,flush=True)
 try:stop_owned('outer refusal or nonzero child')
 except BaseException as ce:R['owned_stop_error']={'type':type(ce).__name__,'message':str(ce),'traceback':traceback.format_exc()}
finally:
 signal.alarm(0)
 for f in streams:
  try:f.flush();os.fsync(f.fileno());f.close()
  except BaseException as ce:R.setdefault('stream_close_errors',[]).append(str(ce));R['accepted']=False
 if child is not None:
  R['node_wait_returncode']=child.poll()
  R['node_elapsed_seconds']=time.monotonic()-node_start
  try:
   remaining=owned_census();R['owned_processes_after_wait']=remaining
   if remaining:
    stop_owned('remaining owned process group after wait')
    R['owned_processes_after_stop']=owned_census()
    need(not R['owned_processes_after_stop'],'Owned process group closure incomplete')
    R['accepted']=False
  except BaseException as ce:
   R['accepted']=False;R['closure_observation_error']={'type':type(ce).__name__,'message':str(ce),'traceback':traceback.format_exc()}
 if before is not None:
  try:
   after=boundary();R['protected_after']=after;R['protected_unchanged']=after==before
   need(after==before,'Installed/delivered/runtime preservation failed')
  except BaseException as ce:
   R['accepted']=False;R['preservation_error']={'type':type(ce).__name__,'message':str(ce),'traceback':traceback.format_exc()}
 if protected is not None:
  try:
   after_inputs={n:identity(ROOT/n) for n in protected};R['receiver_protected_after']=after_inputs;R['receiver_inputs_unchanged']=after_inputs==protected
   need(after_inputs==protected,'Frozen receiving inputs or preparation changed')
  except BaseException as ce:
   R['accepted']=False;R['receiver_preservation_error']={'type':type(ce).__name__,'message':str(ce),'traceback':traceback.format_exc()}
 if R['staging_created']:
  for n in ('node.stdout.txt','node.stderr.txt'):
   if (ROOT/n).exists():
    try:R[n.replace('.','_')]=identity(ROOT/n)
    except BaseException as ce:R.setdefault('stream_identity_errors',[]).append(str(ce));R['accepted']=False
  try:guard('after-owned-child-closure')
  except BaseException as ce:R['accepted']=False;R['final_guard_error']={'type':type(ce).__name__,'message':str(ce)}
 R['completed_utc']=utc();R['total_elapsed_seconds']=time.monotonic()-START
 R['controller_requested_exit_code']=0 if R['accepted'] else 1
 if R['staging_created']:
  try:R['physical_outer_receipt']=save_json('OUTER-RECEIPT.json',R)
  except BaseException as ce:
   R['accepted']=False;R['controller_requested_exit_code']=1;R['outer_receipt_write_error']={'type':type(ce).__name__,'message':str(ce),'traceback':traceback.format_exc()}
 print('SQL_RECEIVING_OUTER_JSON '+json.dumps(R,ensure_ascii=False),flush=True)
 sys.exit(0 if R['accepted'] else 1)
