import datetime,json,os,subprocess
p=subprocess.run(['/bin/ps','-p','89436,89478','-o','pid=,ppid=,command='],capture_output=True,text=True,timeout=3)
r={'schema':'recallweave-sql-staging-external-closure/v1','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'collector_pid':os.getpid(),'owned_pids':[89436,89478],'ps_exit_code':p.returncode,'ps_stdout':p.stdout,'ps_stderr':p.stderr,'owned_pids_absent':p.returncode==1 and not p.stdout.strip() and not p.stderr,'new_files':0,'SQL_calls':0,'parser_calls':0,'browser_calls':0}
print(json.dumps(r,separators=(',',':')))
raise SystemExit(0 if r['owned_pids_absent'] else 1)
