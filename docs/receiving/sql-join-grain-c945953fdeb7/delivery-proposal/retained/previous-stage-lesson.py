"""Stage only three sealed SQL lesson files and admit the saved JSON once with the original parser."""
import datetime, hashlib, json, os, pathlib, re, signal, stat, subprocess, sys, time, traceback

ROOT = pathlib.Path('/Users/me/Developer/recallweave-sql-null-membership-c945953fdeb7')
INSTALL = pathlib.Path('/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7')
NODE = '/opt/homebrew/bin/node'
MIN_DISK, MIN_MEMORY, OWNED_CAP = 256 * 1024**2, 2 * 1024**3, 256 * 1024
ALLOWED = ('courses/sql-null-membership.json', 'courses/sql-null-membership.md', 'courses/sql-null-membership.sql')
started = time.monotonic()
receipt = {'schema':'recallweave-sql-lesson-staging/v1','operator':'estate-c945953fdeb7/product_execution_next','started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':os.getpid(),'root':str(ROOT),'accepted':False,'guards':[],'created_paths':[],'calls':[],'SQL_calls':0,'browser_calls':0,'parser_calls':0}
child = None

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def pin(data):
    return {'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(data)).encode('ascii')+b'\0'+data).hexdigest()}

def identity(path):
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and not path.is_symlink(), 'regular file required: '+str(path))
    data = path.read_bytes()
    after = path.lstat()
    require((before.st_ino,before.st_size,before.st_mode,before.st_mtime_ns)==(after.st_ino,after.st_size,after.st_mode,after.st_mtime_ns) and len(data)==before.st_size,'file changed during read: '+str(path))
    return dict(pin(data), mode=format(stat.S_IMODE(before.st_mode),'04o'), mtime_ns=str(before.st_mtime_ns), inode=str(before.st_ino))

def census(root):
    result={}
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs.sort(); files.sort()
        for name in dirs:
            p=pathlib.Path(directory)/name
            require(not p.is_symlink(),'unexpected directory symlink: '+str(p))
        for name in files:
            p=pathlib.Path(directory)/name
            result[p.relative_to(root).as_posix()]=identity(p)
    return result

def match_identity(actual, expected):
    keys=('bytes','sha256','mode') + (('git_blob',) if 'git_blob' in expected else ())
    return all(actual[k]==expected[k] for k in keys)

def owned_bytes():
    if not ROOT.exists():
        return 0
    return sum(x['bytes'] for x in census(ROOT).values())

def guard(label):
    d=os.statvfs('/Users/me')
    result=subprocess.run(['/usr/bin/vm_stat'],capture_output=True,text=True,check=True,timeout=3)
    vm=result.stdout
    m=re.search(r'page size of (\d+) bytes',vm)
    require(m is not None,'vm_stat page size absent')
    counters={}
    for key in ('Pages free','Pages inactive','Pages speculative'):
        found=re.search(r'^'+re.escape(key)+r':\s+(\d+)',vm,re.M)
        require(found is not None,'vm_stat counter absent: '+key)
        counters[key]=int(found.group(1))
    g={'label':label,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'free_disk_bytes':d.f_bavail*d.f_frsize,'conservative_memory_bytes':sum(counters.values())*int(m.group(1)),'page_bytes':int(m.group(1)),'counters':counters,'vm_stat_stdout':vm,'owned_bytes':owned_bytes()}
    receipt['guards'].append(g)
    require(g['free_disk_bytes']>=MIN_DISK and g['conservative_memory_bytes']>=MIN_MEMORY and g['owned_bytes']<=OWNED_CAP,'native capacity guard refused: '+label)
    return g

def write_new(path,data):
    require(len(data)<=131072,'single-file budget')
    with path.open('xb') as stream:
        stream.write(data); stream.flush(); os.fsync(stream.fileno())
    path.chmod(0o444)
    receipt['created_paths'].append(str(path))

def timeout(signum, frame):
    raise TimeoutError('20-second staging interval exhausted')

signal.signal(signal.SIGALRM,timeout)
signal.setitimer(signal.ITIMER_REAL,20)
exit_code=1
try:
    require(sys.version_info[:3]==(3,13,7),'offered Python version')
    raw=sys.argv[1].encode('utf8')
    require(len(raw)<=131072,'staging input budget')
    data=json.loads(raw)
    receipt['input_pin']=pin(raw)
    actual_source=sys.orig_argv[sys.orig_argv.index('-c')+1].encode('utf8')
    require(pin(actual_source)==data['staging_source_pin'],'staging source identity')
    receipt['source_pin']=pin(actual_source)
    require(data['root']==str(ROOT) and data['install']==str(INSTALL),'fixed scope')
    require(tuple(sorted(data['files']))==ALLOWED,'exact three-file set')
    require(pathlib.Path('/Users/me/Developer').is_dir() and pathlib.Path('/Users/me/Developer').resolve()==pathlib.Path('/Users/me/Developer'),'existing ordinary Developer directory')
    require(not os.path.lexists(ROOT),'new lesson target already exists')
    require(INSTALL.is_dir() and not INSTALL.is_symlink() and INSTALL.resolve()==INSTALL,'existing ordinary installation root')
    guard('initial-read-and-runtime-admission')
    runtime_before={}
    for configured, expected in data['runtime_pins'].items():
        resolved=pathlib.Path(configured).resolve(strict=True)
        actual=identity(resolved)
        require(match_identity(actual,expected),'runtime identity changed: '+configured)
        runtime_before[configured]=dict(actual,resolved=str(resolved))
    receipt['runtime_before']=runtime_before
    installed_before=census(INSTALL)
    require(set(installed_before)==set(data['installed_pins']),'exact installed 19-file set')
    for relative, expected in data['installed_pins'].items():
        require(match_identity(installed_before[relative],expected),'installed identity changed: '+relative)
    receipt['installed_before']=installed_before
    for relative, f in data['files'].items():
        require(pin(f['content'].encode('utf8'))==f['pin'],'delivery input pin: '+relative)
    require(pin(data['original_parser']['content'].encode('utf8'))==data['original_parser']['pin'],'original parser input')
    require(pin(data['parser_program']['content'].encode('utf8'))==data['parser_program']['pin'],'parser program input')
    guard('immediately-before-exclusive-staging')
    ROOT.mkdir(mode=0o700)
    receipt['created_paths'].append(str(ROOT))
    (ROOT/'courses').mkdir(mode=0o700)
    receipt['created_paths'].append(str(ROOT/'courses'))
    for relative in ALLOWED:
        write_new(ROOT/relative,data['files'][relative]['content'].encode('utf8'))
    before_parser=census(ROOT)
    require(set(before_parser)==set(ALLOWED),'three files before parser')
    for relative,f in data['files'].items():
        require(match_identity(before_parser[relative],dict(f['pin'],mode='0444')),'written source identity: '+relative)
    receipt['delivery_before_parser']=before_parser
    parser_input={'course_path':str(ROOT/ALLOWED[0]),'course_pin':data['files'][ALLOWED[0]]['pin'],'original_parser':data['original_parser'],'node_pin':{k:data['runtime_pins'][NODE][k] for k in ('bytes','sha256','git_blob')},'expected_ids':data['expected_ids'],'expected_concepts':data['expected_concepts']}
    parser_bytes=(json.dumps(parser_input,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8')
    require(len(parser_bytes)<=32768,'parser stdin budget')
    parser_start=time.monotonic()
    args=[NODE,'--input-type=module','-e',data['parser_program']['content']]
    node_env=dict(os.environ)
    node_env.pop('NODE_OPTIONS',None)
    node_env.pop('NODE_PATH',None)
    child=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd='/tmp',env=node_env)
    call={'executable':NODE,'args':args[1:],'cwd':'/tmp','pid':child.pid,'stdin_pin':pin(parser_bytes),'source_pin':data['parser_program']['pin']}
    receipt['calls'].append(call)
    receipt['parser_calls']=1
    try:
        stdout,stderr=child.communicate(parser_bytes,timeout=8)
    except BaseException:
        if child.poll() is None:
            child.kill()
        stdout,stderr=child.communicate(timeout=2)
        call.update({'exit_code':child.returncode,'stdout':stdout.decode('utf8',errors='replace'),'stderr':stderr.decode('utf8',errors='replace'),'interrupted':True})
        raise
    call.update({'exit_code':child.returncode,'elapsed_seconds':time.monotonic()-parser_start,'stdout':stdout.decode('utf8'),'stderr':stderr.decode('utf8'),'stdout_pin':pin(stdout),'stderr_pin':pin(stderr),'wait_reaped':child.poll() is not None})
    require(len(stdout)<=16384 and len(stderr)<=16384,'parser stream budget')
    require(child.returncode==0 and stderr==b'','original parser admission failed')
    parser_result=json.loads(stdout)
    require(parser_result['accepted'] is True and parser_result['parseDeck_calls']==1,'parser result')
    receipt['parser_result']=parser_result
    delivery_after=census(ROOT)
    require(delivery_after==before_parser,'delivered bytes/modes/mtimes changed by parser')
    installed_after=census(INSTALL)
    require(installed_after==installed_before,'existing installation changed')
    runtime_after={}
    for configured in data['runtime_pins']:
        resolved=pathlib.Path(configured).resolve(strict=True)
        runtime_after[configured]=dict(identity(resolved),resolved=str(resolved))
    require(runtime_after==runtime_before,'runtime bytes/modes/mtimes changed')
    receipt['installed_after']=installed_after
    receipt['runtime_after']=runtime_after
    receipt['delivery_after_parser']=delivery_after
    receipt['preserved_existing_installation']=True
    receipt['preserved_runtime']=True
    receipt['preserved_delivery']=True
    guard('before-final-delivery-record')
    manifest={'schema':'recallweave-sql-lesson-delivery/v1','root':str(ROOT),'repository':'Jacob-Met/RecallWeave','issue':'https://github.com/Jacob-Met/RecallWeave/issues/257','qualified_source_parent':'ec07bf3989132130759e5c00c6cb02eef19709d3','files':delivery_after,'guide_portability_proof':data['guide_portability_proof'],'independent_SQL_receipt':data['independent_SQL_receipt'],'SQL_qualification':'Python 3.13.7 / SQLite 3.50.4; one earlier independent memory database run. No SQL is executed by this staging program.','original_parser':data['original_parser']['pin'],'parser_result':parser_result,'learner_entry':str(INSTALL/'Open RecallWeave.command'),'learner_entry_mode':'--no-open from /tmp; physical saved JSON selected through the original learner file input','installed_marker':data['installed_pins']['INSTALLATION.json'],'reader_boundary':'The retained installation is unchanged. Strict UTF-8 picker and combined-output corrections remain with #7/#181/#109/#159.','guide_note':'From this delivery root, the documented courses/sql-null-membership.sql redirection resolves. Optional guide links point to pinned foundations source and issue #257.','staging_source':data['staging_source_pin'],'staging_input':pin(raw),'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime':runtime_after,'browser_receiving':'Pending; staging and one parser admission do not establish an actual learner or saved-notes result.'}
    manifest_bytes=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf8')
    require(owned_bytes()+len(manifest_bytes)<=OWNED_CAP,'final delivery allocation')
    write_new(ROOT/'DELIVERY.json',manifest_bytes)
    final=census(ROOT)
    require(set(final)==set(ALLOWED)|{'DELIVERY.json'},'final four-file set')
    require(sum(v['bytes'] for v in final.values())<=OWNED_CAP,'final owned byte cap')
    receipt['final_files']=final
    receipt['final_owned_bytes']=sum(v['bytes'] for v in final.values())
    receipt['delivery_record_content']=manifest_bytes.decode('utf8')
    receipt['accepted']=True
    exit_code=0
except BaseException as exc:
    receipt['failure']={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc()}
    receipt['partial_files_preserved_without_cleanup']=True
finally:
    if child is not None and child.poll() is None:
        child.kill()
        child.wait(timeout=2)
    receipt['owned_parser_child']={'pid':None if child is None else child.pid,'actual_exit_code':None if child is None else child.returncode,'wait_reaped':child is not None and child.poll() is not None}
    signal.setitimer(signal.ITIMER_REAL,0)
    receipt['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    receipt['elapsed_seconds']=time.monotonic()-started
    receipt['requested_exit_code']=exit_code
    encoded=(json.dumps(receipt,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8')
    require(len(encoded)<=131072,'complete returned-receipt byte cap')
    sys.stdout.buffer.write(encoded);sys.stdout.buffer.flush()
sys.exit(exit_code)
