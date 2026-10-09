import os,sys,stat,json,time,hashlib,base64,subprocess,signal,datetime
from pathlib import Path
ROOT=Path('/Users/me/Developer/recallweave-sql-null-membership-receiving-c945953fdeb7')
EXPECTED=json.loads(sys.argv[1])
START=time.monotonic()
def deadline(sig,frame):raise TimeoutError('30-second read-only SQL receiving custody deadline')
signal.signal(signal.SIGALRM,deadline);signal.alarm(30)
def need(ok,msg):
 if not ok:raise RuntimeError(msg)
def pin(b):
 return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(b)).encode('ascii')+b'\0'+b).hexdigest()}
def read(p):
 s=p.lstat();need(stat.S_ISREG(s.st_mode) and not p.is_symlink(),'Read-only regular file required: '+str(p))
 need(s.st_size<=16*1024**2,'Known file read bound')
 b=p.read_bytes();a=p.lstat()
 need((s.st_ino,s.st_mtime_ns,s.st_size)==(a.st_ino,a.st_mtime_ns,a.st_size) and len(b)==s.st_size,'File changed during custody read: '+str(p))
 return b,dict(pin(b),mode=format(stat.S_IMODE(s.st_mode),'04o'),mtime_ns=str(s.st_mtime_ns),inode=str(s.st_ino))
def guard():
 s=os.statvfs('/Users/me');v=subprocess.run(['/usr/bin/vm_stat'],capture_output=True,text=True,timeout=5)
 need(v.returncode==0,'Read-only custody memory observer')
 page=int(v.stdout.split('page size of ')[1].split(' bytes')[0]);counts={}
 for line in v.stdout.splitlines():
  if ':' in line:
   k,val=line.split(':',1)
   if k in ('Pages free','Pages inactive','Pages speculative'):counts[k]=int(val.strip().rstrip('.'))
 need(set(counts)=={'Pages free','Pages inactive','Pages speculative'},'Complete conservative memory fields')
 g={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'free_disk_bytes':s.f_bavail*s.f_frsize,'conservative_memory_bytes':sum(counts.values())*page}
 need(g['free_disk_bytes']>=256*1024**2 and g['conservative_memory_bytes']>=2*1024**3,'Read-only custody resource floor')
 return g
def inventory(root):
 out={}
 def walk(p):
  for q in sorted(p.iterdir()):
   s=q.lstat();need(not stat.S_ISLNK(s.st_mode),'Unexpected input symlink')
   if stat.S_ISDIR(s.st_mode):walk(q)
   else:out[q.relative_to(root).as_posix()]=read(q)[1]
 walk(root);return out
def compare(got,want,label):
 need(set(got)==set(want),'Complete '+label+' path census')
 for n,p in want.items():need(all(got[n].get(k)==p[k] for k in ('bytes','sha256','git_blob','mode','mtime_ns','inode') if k in p),'Exact '+label+' identity: '+n)
g=guard()
need(ROOT.is_dir() and not ROOT.is_symlink(),'Known receiving stage required')
authority_bytes,authority_pin=read(ROOT/'AUTHORITY.json')
need(all(authority_pin[k]==EXPECTED['authority'][k] for k in ('bytes','sha256','git_blob')),'Frozen authority pin')
authority=json.loads(authority_bytes.decode('utf-8'))
known_pids=set(EXPECTED['owned_pids'])
ps=subprocess.run(['/bin/ps','-axo','pid=,ppid=,pgid=,command='],capture_output=True,text=True,timeout=5)
need(ps.returncode==0,'External owned-process census')
profile=str(ROOT/'browser'/'profile')
remaining=[]
for line in ps.stdout.splitlines():
 parts=line.strip().split(None,3)
 if len(parts)<3:continue
 pid,ppid,pgid=map(int,parts[:3]);command=parts[3] if len(parts)>3 else ''
 chrome_with_profile=command.startswith('/Applications/Google Chrome.app/Contents/') and profile in command
 if pid in known_pids or pgid==EXPECTED['owned_node_pgid'] or chrome_with_profile:remaining.append({'pid':pid,'ppid':ppid,'pgid':pgid,'command':command})
need(not remaining,'Owned receiver/browser is not closed; custody refused without actuation')
installed=inventory(Path(authority['installed_root']));delivered=inventory(Path(authority['delivery_root']))
compare(installed,authority['installed_files'],'installed')
compare(delivered,authority['delivery_files'],'delivered')
runtime_paths={'python':Path('/Library/Frameworks/Python.framework/Versions/3.13/bin/python3').resolve(strict=True),'python_framework':Path('/Library/Frameworks/Python.framework/Versions/3.13/Python'),'node':Path('/opt/homebrew/bin/node').resolve(strict=True),'chrome_entry':Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome').resolve(strict=True)}
runtime={k:read(p)[1] for k,p in runtime_paths.items()};compare(runtime,authority['runtime'],'runtime')
files=[]
logical=0
allocated=0
def collect(p):
 global logical,allocated
 for q in sorted(p.iterdir()):
  if q==ROOT/'browser':continue
  s=q.lstat();need(not stat.S_ISLNK(s.st_mode),'Static custody symlink')
  if stat.S_ISDIR(s.st_mode):collect(q)
  else:
   b,i=read(q);rel=q.relative_to(ROOT).as_posix();logical+=len(b);allocated+=s.st_blocks*512
   need(len(b)<=1024**2 and max(logical,allocated)<=2*1024**2,'Original static custody cap')
   if q.suffix.lower()=='.png':
    need(b.startswith(b'\x89PNG\r\n\x1a\n'),'Original PNG signature')
    files.append({'path':rel,**i,'binary_original':True,'body_route':'Use the separately selected RDC read_file image content for this exact path, then compare decoded byte pins; do not redraw.'})
   else:
    b.decode('utf-8')
    files.append({'path':rel,**i,'base64':base64.b64encode(b).decode('ascii')})
collect(ROOT)
downloads=[]
download_root=ROOT/'browser'/'downloads'
if download_root.exists():
 need(download_root.is_dir() and not download_root.is_symlink(),'Known download directory')
 for q in sorted(download_root.iterdir()):
  b,i=read(q);need(len(b)<=1024**2 and q.name.startswith('recallweave-study-notes-') and q.suffix=='.txt','Only original physical study-notes artifact')
  b.decode('utf-8');downloads.append({'path':q.relative_to(ROOT).as_posix(),**i,'base64':base64.b64encode(b).decode('ascii')})
need(len(downloads)<=1,'One frozen physical download boundary')
second=[]
for f in files:second.append({'path':f['path'],**read(ROOT/f['path'])[1]})
need(all(all(f[k]==s[k] for k in ('path','bytes','sha256','git_blob','mode','mtime_ns','inode')) for f,s in zip(files,second)),'Original static files changed through export')
R={'schema':'recallweave-sql-readonly-native-custody-v1','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'collector_pid':os.getpid(),'guard':g,'owned_pid_set':sorted(known_pids),'owned_node_pgid':EXPECTED['owned_node_pgid'],'selected_owned_processes':remaining,'installed':installed,'delivered':delivered,'runtime':runtime,'static_file_count':len(files),'static_logical_bytes':logical,'static_allocated_bytes':allocated,'static_files_unchanged_through_export':True,'files':files,'original_downloads':downloads,'filesystem_writes':0,'application_calls':0,'browser_calls':0,'SQL_or_model_or_exporter_oracle_calls':0,'elapsed_seconds':time.monotonic()-START,'external_collector_exit_pending':True}
print('SQL_CUSTODY_JSON '+json.dumps(R,ensure_ascii=False),flush=True)
signal.alarm(0)
