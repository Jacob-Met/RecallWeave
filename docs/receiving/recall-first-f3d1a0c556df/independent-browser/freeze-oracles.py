import pathlib,json,copy,hashlib,datetime,base64
R=pathlib.Path(r"C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df");F=R/"fixtures";F.mkdir(exist_ok=False)
deck={"format":"recallweave-deck/1","title":"Independent Recall First — Δ","attribution":"Independent browser receiving fixture; no supplied course rewritten.","license":"CC0 — synthetic receiving content","concepts":["first","second"],"items":[]}
for ident,concept,pre,index,n in [("z-first","second",["first"],2,1),("a-second","first",[],1,2),("m-third","second",["first"],0,3)]:
 opts=[f"OPTION-{n}-A literal <b>text</b>",f"OPTION-{n}-B & quoted \"value\"",f"OPTION-{n}-C"]
 opts[index]=f"EXACT-CORRECT-{n} <b>literal</b> & \"answer\""
 deck["items"].append({"id":ident,"concept":concept,"prerequisites":pre,"prompt":f"PROMPT-{n}: independently recall this step.","options":opts,"answer":index,"explanation":f"EXACT-EXPLANATION-{n}: synthetic literal <em>words</em>.","transfer":f"EXACT-TRANSFER-{n}: connect to a new case."})
def encode(v):return (json.dumps(v,ensure_ascii=False,separators=(",",":"))+"\n").encode()
def put(n,b):p=F/n;p.write_bytes(b);return {"path":n,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
entries=[put("three-items.json",encode(deck))]
other=copy.deepcopy(deck);other["title"]="Replacement preview B";other["items"][0]["prompt"]="REPLACEMENT-B-FIRST-PROMPT"
entries.append(put("replacement-b.json",encode(other)))
entries.append(put("gate-valid-a.json",encode(deck)));entries.append(put("gate-invalid-a.json",b'{"title":'))
base=encode(deck);entries.append(put("exact-262144.json",base+b" "*(262144-len(base))))
entries.append(put("over-262145.json",base+b" "*(262145-len(base))))
bad=copy.deepcopy(deck);bad["title"]="MALFORMED-MARKER"
entries.append(put("malformed-utf8.json",encode(bad).replace(b"MALFORMED-MARKER",b"MALFORMED-\xc3\x28")))
entries.append(put("utf16.json",json.dumps(deck,ensure_ascii=False).encode("utf-16")))
entries.append(put("invalid-json.json",b'{"title":'))
bad=copy.deepcopy(deck);bad["format"]="unknown/1";entries.append(put("invalid-format.json",encode(bad)))
bad=copy.deepcopy(deck);bad["items"][1]["id"]=bad["items"][0]["id"];entries.append(put("duplicate-id.json",encode(bad)))
bad=copy.deepcopy(deck);bad["items"][1]["prerequisites"]=["second"];entries.append(put("cycle.json",encode(bad)))
long={"title":"T"*160,"attribution":"A"*2000,"license":"L"*2000,"concepts":["edge"],"items":[{"id":"long","concept":"edge","prerequisites":[],"prompt":"P"*2000,"options":["D"*1000,"C"*1000],"answer":1,"explanation":"E"*4000,"transfer":"F"*2000}]}
entries.append(put("long-unbroken.json",encode(long)))
expected={"primary_source_order":["z-first","a-second","m-third"],"revisit_order":["z-first","m-third"],"attempts":[{"pass":1,"id":"z-first","answer":"first-one <b>literal</b>","judgment":"Revisit"},{"pass":1,"id":"a-second","answer":"","judgment":"Ready for now"},{"pass":1,"id":"m-third","answer":"first-three","judgment":"Revisit"},{"pass":2,"id":"z-first","answer":"second-one","judgment":"Ready for now"},{"pass":2,"id":"m-third","answer":"second-three","judgment":"Revisit"}],"correct_options":[i["options"][i["answer"]] for i in deck["items"]],"explanations":[i["explanation"] for i in deck["items"]],"transfers":[i["transfer"] for i in deck["items"]],"valid_files":["three-items.json","replacement-b.json","gate-valid-a.json","exact-262144.json","long-unbroken.json"],"invalid_files":["gate-invalid-a.json","over-262145.json","malformed-utf8.json","utf16.json","invalid-json.json","invalid-format.json","duplicate-id.json","cycle.json"],"own_answer_utf16_limit":4000,"bounded_revisit_passes":1}
(R/"expected.json").write_text(json.dumps(expected,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(R/"fixture-manifest.json").write_text(json.dumps(entries,indent=2)+"\n",encoding="utf-8")
files=["blind-oracles.json","base-src-deck.mjs","base-data-deck.json","expected.json","fixture-manifest.json"]+["fixtures/"+e["path"] for e in entries]
freeze={"schema":"hamon.recall-first.blind-oracle-freeze.v1","at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"candidate_implementation_seen":False,"actor":"estate-f3d1a0c556df/source_lane","base":"698902f9c9c1d5c5023092b85b3632a7cb7a01ed","groups":6,"files":[{"path":n,"bytes":(R/n).stat().st_size,"sha256":hashlib.sha256((R/n).read_bytes()).hexdigest()} for n in files]}
(R/"blind-freeze.json").write_text(json.dumps(freeze,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"groups":6,"fixtures":len(entries),"freeze_sha256":hashlib.sha256((R/"blind-freeze.json").read_bytes()).hexdigest(),"frozen_at":freeze["at"],"oracles_sha256":hashlib.sha256((R/"blind-oracles.json").read_bytes()).hexdigest()}),flush=True)
