import datetime,fractions,hashlib,itertools,json,pathlib,platform,os
ROOT=pathlib.Path(__file__).parent
def pin(b):return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def witness(p):
 s=p.stat();return dict(pin(p.read_bytes()),mode=s.st_mode,mtime_ns=s.st_mtime_ns,inode=s.st_ino)
if platform.node()!="MSI" or os.environ.get("USERNAME","").lower()!="veria":raise RuntimeError("device identity")
before={n:witness(ROOT/n) for n in ("oracle-cases.json","PROOF.md")}
oracle=json.loads((ROOT/"oracle-cases.json").read_text(encoding="utf-8"))
output={"schema":"hamon.minhash-independent-model-oracle/1","created_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"candidate_seen":False,"method":"Independent Python itertools full enumeration from previously frozen literal inputs; exact fractions.Fraction arithmetic; no candidate imports or execution.","input_oracle":before["oracle-cases.json"],"interface":{"model":"analyzeMinHash(inputA,inputB)","index_and_ranks":"one-based","union_order":"first occurrence in A followed by first new occurrence in B","row_comparison":"exact order and rank after first-seen permutation enumeration; original mathematical union witnesses are compared by membership"},"cases":[]}
for case in oracle["cases"]:
 a=list(case["a"]);b=list(case["b"]);sa=list(dict.fromkeys(a));sb=list(dict.fromkeys(b));union=list(dict.fromkeys(a+b));inter=[x for x in union if x in sa and x in sb]
 if set(union)!=set(case["union"]) or set(inter)!=set(case["intersection"]):raise ValueError(case["id"]+" membership")
 rows=[]
 for index,perm in enumerate(itertools.permutations(union),1):
  order=list(perm);ma=min(sa,key=order.index);mb=min(sb,key=order.index)
  rows.append({"index":index,"order":order,"minA":ma,"minB":mb,"rankA":order.index(ma)+1,"rankB":order.index(mb)+1,"first":order[0],"collision":ma==mb})
 total=len(rows);collisions=sum(r["collision"] for r in rows);ratio=fractions.Fraction(collisions,total)
 if (total,collisions,ratio.numerator,ratio.denominator)!=(case["permutations"],case["collisions"],*case["fraction"]):raise ValueError(case["id"]+" exact counts")
 by_first=[{"label":x,"inA":x in sa,"inB":x in sb,"permutations":sum(r["first"]==x for r in rows),"collisions":sum(r["first"]==x and r["collision"] for r in rows)} for x in union]
 expected={"schema":"recallweave.minhash-analysis/1","inputA":a,"inputB":b,"setA":sa,"setB":sb,"union":union,"intersection":inter,"rows":rows,"permutations":total,"collisions":collisions,"fraction":{"numerator":ratio.numerator,"denominator":ratio.denominator},"byFirst":by_first}
 output["cases"].append({"id":case["id"],"expected":expected})
partial=next(c["expected"] for c in output["cases"] if c["id"]=="partial_overlap")
for fixed in oracle["partial_overlap_rows"]:
 row=next(r for r in partial["rows"] if r["order"]==fixed["order"])
 if (row["minA"],row["minB"],row["collision"])!=(fixed["min_a"],fixed["min_b"],fixed["collision"]):raise ValueError("explicit row differs")
after={n:witness(ROOT/n) for n in ("oracle-cases.json","PROOF.md")}
if before!=after:raise ValueError("frozen originals changed")
output["originals_conserved"]=True
raw=(json.dumps(output,ensure_ascii=True,separators=(",",":"))+"\n").encode("utf-8")
with (ROOT/"expected-model-rows.json").open("xb") as f:f.write(raw)
print(json.dumps({"cases":len(output["cases"]),"rows":sum(len(c["expected"]["rows"]) for c in output["cases"]),"identity":pin(raw),"generator":pin(pathlib.Path(__file__).read_bytes()),"originals_conserved":True,"candidate_seen":False}))
