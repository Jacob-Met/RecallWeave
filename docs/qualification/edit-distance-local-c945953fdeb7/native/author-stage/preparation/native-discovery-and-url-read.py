import os,json,hashlib,shutil,subprocess,re,urllib.request,datetime
from pathlib import Path
applications=Path("/Users/me/Applications")
stage=Path("/Users/me/Developer/recallweave-edit-distance-local-c945953fdeb7")
target=applications/"RecallWeaveEditDistance-c945953fdeb7"
disk=shutil.disk_usage(applications).free
v=subprocess.run(["/usr/bin/vm_stat"],capture_output=True,text=True,check=True,timeout=5).stdout
page=int(re.search(r"page size of (\d+) bytes",v).group(1))
memory=sum(int(re.search(r"^"+re.escape(k)+r":\s+(\d+)",v,re.M).group(1)) for k in ["Pages free","Pages inactive","Pages speculative"])*page
assert disk>=256*1024*1024 and memory>=2*1024**3,(disk,memory)
names=[p.name for p in applications.iterdir()]
assert len(names)<=500,"Application-directory listing is unexpectedly large"
result={"utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"free_disk":disk,"conservative_memory":memory,"reserved_stage_absent":not os.path.lexists(stage),"reserved_target_absent":not os.path.lexists(target),"matching_application_names":[n for n in names if "recall" in n.lower() or "edit-distance" in n.lower()],"native_or_source_files_written":0}
url="https://raw.githubusercontent.com/Jacob-Met/RecallWeave/cb2f0ad1bc59bac7541004cde174179923e6cb75/docs/delivery/edit-distance-offline-cf5799f6d38b/RecallWeave-edit-distance-offline.zip"
result["original_public_artifact_url"]=url
try:
 with urllib.request.urlopen(url,timeout=15) as response:
  data=response.read(53536)
  result["download"]={"status":response.status,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()}
  result["download"]["exact_original"]=len(data)==53535 and result["download"]["sha256"]=="a86d823d70be98d08fd804ce9d8bccdb071b586adf5c30c0784a96a5db2a03e9"
except Exception as error:
 result["download"]={"error_type":type(error).__name__,"error":str(error),"no_alternate_endpoint_or_retry":True}
print(json.dumps(result,separators=(",",":")))
