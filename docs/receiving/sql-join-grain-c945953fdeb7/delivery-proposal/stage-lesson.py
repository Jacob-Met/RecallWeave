"""Stage three sealed join-grain source files and admit the physical JSON once with the original parser; no app or SQL."""
import datetime, hashlib, json, os, pathlib, re, signal, stat, subprocess, sys, time, traceback

ROOT = pathlib.Path('/home/jacob/recallweave-sql-join-grain-c945953fdeb7')
PARENT = pathlib.Path('/home/jacob')
NODE = '/usr/bin/node'
MIN_DISK, MIN_MEMORY, OWNED_CAP = 2 * 1024**3, 2 * 1024**3, 256 * 1024
ALLOWED = ('courses/sql-join-grain.json', 'courses/sql-join-grain.md', 'courses/sql-join-grain.sql')
started = time.monotonic()
receipt = {'schema':'recallweave-sql-lesson-staging/v1','operator':'estate-c945953fdeb7/product_execution_next','started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':os.getpid(),'root':str(ROOT),'accepted':False,'resources':[],'created_paths':[],'calls':[],'SQL_calls':0,'browser_calls':0,'parser_calls':0}
child = None

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def pin(data):
    return {'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'git_blob':hashlib.sha1(b'blob '+str(len(data)).encode('ascii')+b'\0'+data).hexdigest()}

def identity(path):
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and not path.is_symlink(), 'regular file required: '+str(path))
    require(0<=before.st_size<=16*1024**2,'individual identity read exceeds bounded 16 MiB: '+str(path))
    data = path.read_bytes()
    after = path.lstat()
    require((before.st_ino,before.st_size,before.st_mode,before.st_mtime_ns)==(after.st_ino,after.st_size,after.st_mode,after.st_mtime_ns) and len(data)==before.st_size,'file changed during read: '+str(path))
    return dict(pin(data), mode=format(stat.S_IMODE(before.st_mode),'04o'), mtime_ns=str(before.st_mtime_ns), inode=str(before.st_ino), device=str(before.st_dev))

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

# The following metadata/resource functions are copied exactly from the admitted
# ThinkPad intake 2b444ea593e60a6a9c5298fce7ac4cffe5a8c0a6; aliases keep its guards unchanged.
need, START, FLOOR, R = require, started, MIN_DISK, receipt

def text_file(path, limit=65536):
    with open(path, "rb") as stream:
        raw = stream.read(limit + 1)
    need(len(raw) <= limit, "Bounded metadata file exceeded: " + path)
    return raw.decode("utf-8")

def optional_value(path):
    try:
        return text_file(path, 8192).strip()
    except FileNotFoundError:
        return None

def resources(label):
    mem = {}
    for line in text_file("/proc/meminfo").splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            mem[key] = value.strip()
    need(re.fullmatch(r"\d+ kB", mem.get("MemAvailable", "")), "MemAvailable unavailable")
    available = int(mem["MemAvailable"].split()[0]) * 1024
    group_lines = text_file("/proc/self/cgroup").splitlines()
    groups = [line.split(":", 2)[2] for line in group_lines if line.startswith("0::")]
    need(len(group_lines) == 1 and len(groups) == 1 and groups[0].startswith("/") and
         all(part not in (".", "..") for part in groups[0].split("/")),
         "Single unified cgroup v2 membership required; hybrid layouts refused")
    mounts = []
    for line in text_file("/proc/self/mountinfo", 262144).splitlines():
        left, separator, right = line.partition(" - ")
        fields = left.split()
        if separator and right.split()[0] == "cgroup2":
            mounts.append((fields[3], fields[4], line))
    need(len(mounts) == 1 and mounts[0][:2] == ("/", "/sys/fs/cgroup"),
         "Standard visible cgroup v2 mount required; no fallback")
    root = "/sys/fs/cgroup"
    current = root + (groups[0].rstrip("/") if groups[0] != "/" else "")
    rows = []
    budgets = [available]
    pid_budgets = []
    while True:
        need(len(rows) < 16, "Cgroup ancestor depth cap")
        row = {"path": current}
        for filename in ("memory.current", "memory.max", "memory.high",
                         "pids.current", "pids.max", "cpu.max"):
            row[filename] = optional_value(current + "/" + filename)
        memory_pair = (row["memory.current"], row["memory.max"])
        need(all(x is None for x in memory_pair) or all(x is not None for x in memory_pair),
             "Incomplete memory-controller pair")
        if row["memory.current"] is not None:
            usage = int(row["memory.current"])
            need(usage >= 0, "Negative memory usage")
            for filename in ("memory.max", "memory.high"):
                raw_limit = row[filename]
                if raw_limit is not None and raw_limit != "max":
                    limit = int(raw_limit)
                    need(limit >= 0, "Negative memory limit")
                    headroom = max(0, limit - usage)
                    row[filename + "_headroom_bytes"] = headroom
                    budgets.append(headroom)
        pid_pair = (row["pids.current"], row["pids.max"])
        need(all(x is None for x in pid_pair) or all(x is not None for x in pid_pair),
             "Incomplete PID-controller pair")
        if row["pids.current"] is not None and row["pids.max"] != "max":
            pid_budgets.append(max(0, int(row["pids.max"]) - int(row["pids.current"])))
        rows.append(row)
        if current == root:
            break
        current = os.path.dirname(current)
        need(current == root or current.startswith(root + "/"), "Cgroup root escape")
    disk = os.statvfs("/home/jacob")
    free = disk.f_bavail * disk.f_frsize
    result = {"label": label, "elapsed_seconds": time.monotonic() - START,
              "home_free_bytes": free, "MemAvailable_bytes": available,
              "visible_cgroup_v2": groups[0], "selected_mount_record": mounts[0][2],
              "ancestors": rows, "effective_available_bytes": min(budgets),
              "visible_pid_headroom": min(pid_budgets) if pid_budgets else None,
              "affinity_cpu_count": len(os.sched_getaffinity(0)),
              "disk_floor_bytes": FLOOR, "memory_floor_bytes": FLOOR,
              "scope": "Current MemAvailable and all visible memory.max/high headrooms; not a future reservation or a claim about hidden ancestors."}
    R.setdefault("resources", []).append(result)
    need(free >= FLOOR and result["effective_available_bytes"] >= FLOOR,
         "Unchanged 2 GiB disk/effective-memory admission refused")
    return result

def guard(label):
    result=resources(label)
    result['owned_bytes']=owned_bytes()
    require(result['owned_bytes']<=OWNED_CAP,'owned delivery byte cap: '+label)
    return result

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
    require(sys.platform=='linux' and os.getuid()==1000 and os.geteuid()==1000,'known ordinary Linux UID1000')
    require(sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode,'isolated no-site no-bytecode entry')
    require(sys.version_info[:3]==(3,14,4),'observed existing Python version')
    require(len(sys.argv)==2,'one exact staging input argument')
    require(os.path.realpath('/usr/bin/python3')==os.path.realpath(sys.executable)==os.path.realpath('/proc/self/exe'),'selected Python executable binding')
    raw=sys.argv[1].encode('utf8')
    require(len(raw)<=131072,'staging input budget')
    data=json.loads(raw)
    receipt['input_pin']=pin(raw)
    actual_source=sys.orig_argv[sys.orig_argv.index('-c')+1].encode('utf8')
    require(pin(actual_source)==data['staging_source_pin'],'staging source identity')
    receipt['source_pin']=pin(actual_source)
    require(data['root']==str(ROOT) and data['parent']==str(PARENT),'fixed separate delivery scope')
    require(tuple(sorted(data['files']))==ALLOWED,'exact three-file set')
    parent_stat=PARENT.lstat()
    require(stat.S_ISDIR(parent_stat.st_mode) and not PARENT.is_symlink() and PARENT.resolve()==PARENT and parent_stat.st_uid==os.getuid(),'existing ordinary owned home directory')
    require(os.access(PARENT,os.W_OK|os.X_OK),'ordinary destination parent is not writable/searchable')
    require(not os.path.lexists(ROOT),'new lesson target already exists')
    require(set(data['runtime_pins'])=={'/usr/bin/python3',NODE},'only observed Python and Node executable pins')
    receipt['destination_parent']={'path':str(PARENT),'uid':parent_stat.st_uid,'mode':format(stat.S_IMODE(parent_stat.st_mode),'04o'),'inode':str(parent_stat.st_ino),'device':str(parent_stat.st_dev),'writable_searchable_at_check':True}
    guard('initial-read-and-runtime-admission')
    runtime_before={}
    for configured, expected in data['runtime_pins'].items():
        resolved=pathlib.Path(configured).resolve(strict=True)
        actual=identity(resolved)
        require(str(resolved)==expected['resolved'] and match_identity(actual,expected) and all(actual[key]==expected[key] for key in ('mtime_ns','inode','device')),'runtime identity changed since actual intake: '+configured)
        runtime_before[configured]=dict(actual,resolved=str(resolved))
    receipt['runtime_before']=runtime_before
    receipt['runtime_scope']='Only the actual observed Python and Node executable bodies/identities. No full OS or Node shared-library closure is claimed.'
    receipt['actual_runtime_intake']=data['actual_runtime_intake']
    for relative, f in data['files'].items():
        require(pin(f['content'].encode('utf8'))==f['pin'],'delivery input pin: '+relative)
    require(pin(data['original_parser']['content'].encode('utf8'))==data['original_parser']['pin'],'original parser input')
    require(pin(data['parser_program']['content'].encode('utf8'))==data['parser_program']['pin'],'parser program input')
    guard('immediately-before-exclusive-staging')
    require(not os.path.lexists(ROOT),'new lesson target appeared before exclusive mkdir')
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
    parser_guard=guard('immediately-before-one-original-parser')
    require(parser_guard['visible_pid_headroom'] is None or parser_guard['visible_pid_headroom']>=1,'no current visible PID headroom for the one parser child')
    parser_start=time.monotonic()
    args=[NODE,'--input-type=module','-e',data['parser_program']['content']]
    node_env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C'}
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
    runtime_after={}
    for configured in data['runtime_pins']:
        resolved=pathlib.Path(configured).resolve(strict=True)
        runtime_after[configured]=dict(identity(resolved),resolved=str(resolved))
    require(runtime_after==runtime_before,'runtime bytes/modes/mtimes changed')
    receipt['runtime_after']=runtime_after
    receipt['delivery_after_parser']=delivery_after
    receipt['preserved_runtime']=True
    receipt['preserved_delivery']=True
    guard('before-final-delivery-record')
    manifest={
      'schema':'recallweave-sql-join-grain-source-delivery/v1',
      'root':str(ROOT),
      'repository':'Jacob-Met/RecallWeave',
      'issue':'https://github.com/Jacob-Met/RecallWeave/issues/276',
      'qualified_source_parent':'ec07bf3989132130759e5c00c6cb02eef19709d3',
      'files':delivery_after,
      'original_parser':data['original_parser']['pin'],
      'parser_result':parser_result,
      'source_authority':data['source_authority'],
      'SQL_qualification':'This delivery does not execute or qualify SQL. The original source target remains SQLite3.50.4; actual ThinkPad SQLite3.46.1 intake is metadata only. Any separately admitted SQL result has separate source/runtime/exit evidence.',
      'delivery_kind':'Three unchanged source files plus this final identity record. No application, launcher, catalog or installation is created or used.',
      'reader_boundary':'No installed learner or importer is invoked. Existing original/strict-UTF8/combined-output owners and the retained Mac installation remain outside this operation.',
      'guide_context':{
        'meaning':'The unchanged guide is repository-layout source. Its same-directory course JSON and SQL links resolve in this delivery; optional foundation, demo and README relative links require the full repository layout.',
        'local_worksheet':'From this delivery root, the guide command refers to courses/sql-join-grain.sql. No SQLite shell is invoked here.',
        'optional_context_source_urls':data['guide_context_source_urls'],
        'source_url_limit':'The pinned GitHub URLs identify original source; they are not installed or running learner entrypoints.'
      },
      'staging_source':data['staging_source_pin'],
      'staging_input':pin(raw),
      'actual_runtime_intake':data['actual_runtime_intake'],
      'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'runtime':runtime_after,
      'runtime_scope':receipt['runtime_scope'],
      'learner_receiving':'Not requested or executed by this step; one structural parser acceptance does not establish an actual learner session or saved notes.'
    }
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
