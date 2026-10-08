import pathlib,json,hashlib,datetime
R=pathlib.Path(r"C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df")
d=json.loads((R/"fixtures/long-unbroken.json").read_text());d["concepts"]=["K"*80];d["items"][0]["concept"]="K"*80
p=R/"fixtures/long-unbroken-concept80.json";p.write_text(json.dumps(d,separators=(",",":"))+"\n",encoding="utf-8")
r={"schema":"hamon.recall-first.additive-blind-oracle.v1","at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"original_freeze_sha256":"0afa02de387c11dc99c158d67ce816f19b4cb9bc06d5bf9c722f11e272b4db4c","candidate_implementation_inspected":False,"reason":"Root specifically requested long unbroken concept usability, which original long-field fixture left at four characters.","additional_fixture":{"path":"fixtures/long-unbroken-concept80.json","sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"bytes":p.stat().st_size},"same_group":6,"expectation":"At390px the80-character concept remains usable and does not cause horizontal document overflow before or after Reveal; all original long-field expectations retained.","original_files_unchanged":True}
(R/"blind-concept-addendum.json").write_text(json.dumps(r,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"addendum_sha256":hashlib.sha256((R/"blind-concept-addendum.json").read_bytes()).hexdigest(),"fixture_sha256":r["additional_fixture"]["sha256"]}),flush=True)
