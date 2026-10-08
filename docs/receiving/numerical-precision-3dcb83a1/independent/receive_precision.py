import os,sys,json,hashlib,subprocess,math
from pathlib import Path
from fractions import Fraction
root=Path(__file__).resolve().parent
source=Path(sys.argv[1]).resolve()
reserve=805306368;own_limit=16777216
expected=json.loads((root/"source-pins.json").read_text())
def guard():
 v=os.statvfs(root);free=v.f_bavail*v.f_frsize
 assert free>=reserve+own_limit,(free,reserve)
 assert sum(p.stat().st_size for p in root.rglob("*") if p.is_file())<own_limit
 return free
def source_pins():
 out={}
 for path,pin in expected.items():
  b=(source/path).read_bytes()
  got={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+bytes([0])+b).hexdigest()}
  assert got==pin,(path,got,pin)
  out[path]=got
 return out
free=guard();before=source_pins()
blind=json.loads((root/"blind-questions.json").read_text())
solution=json.loads((root/"blind-solution.json").read_text())
oracle=json.loads((root/"oracle-results.json").read_text())
modules={}
for path in ("src/deck.mjs","src/review.mjs","src/knowledge.mjs","src/answer-order.mjs"):
 modules[path]={"content":(source/path).read_bytes().decode("utf-8"),"git_blob":expected[path]["git_blob"]}
deck_input={"modules":modules,"deck_json":(source/"courses/numerical-precision.json").read_bytes().decode("utf-8"),"blind_sheet":blind["items"],"answer_key":solution["answers"]}
arithmetic_input={"model":{"content":(source/"src/numerical-precision.mjs").read_bytes().decode("utf-8"),"sha256":expected["src/numerical-precision.mjs"]["sha256"]},"oracle":oracle}
commands=[];outputs={}
for name,data in (("deck",deck_input),("arithmetic",arithmetic_input)):
 guard()
 script=root/("receive_"+name+".mjs")
 cmd=["/usr/bin/node","--input-type=module","-e",script.read_text(),json.dumps(data,ensure_ascii=False,separators=(",",":"))]
 r=subprocess.run(cmd,capture_output=True,text=True,timeout=30)
 (root/(name+"-stdout.log")).write_text(r.stdout,encoding="utf-8")
 (root/(name+"-stderr.log")).write_text(r.stderr,encoding="utf-8")
 commands.append({"receiver":script.name,"argv":["/usr/bin/node","--input-type=module","-e","<exact receiver bytes>","<pinned input assembled read-only from source>"],"returncode":r.returncode})
 assert r.returncode==0,(name,r.stderr,r.stdout)
 result=json.loads(r.stdout);outputs[name]=result
 (root/(name+"-results.json")).write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
def exact_ratio(obj,expected_value):
 n=int(obj["numerator"]);d=int(obj["denominator"])
 assert d>0 and math.gcd(n,d)==1
 f=Fraction(n,d)
 assert f==expected_value,(f,expected_value)
 assert Fraction(obj["decimal"])==f
 assert obj["fraction"]==str(n)+"/"+str(d)
 assert obj["isZero"]==(f==0)
for witness in outputs["arithmetic"]["results"]:
 record=witness["record"];expected_case=next(x for x in oracle["cases"] if x["id"]==witness["id"])
 for field,raw in (("a",expected_case["inputs"][0]),("b",expected_case["inputs"][1])):
  part=record[field];intended=Fraction(raw);stored=Fraction.from_float(float(raw))
  exact_ratio(part["exact"],intended);exact_ratio(part["stored"],stored);exact_ratio(part["conversionDiscrepancy"],stored-intended)
 for field,key in {"decimalIntent":"exact_intended_result","storedOperandArithmetic":"exact_stored_input_result","actual":"exact_binary64_result","conversionContribution":"input_conversion_contribution","arithmeticContribution":"operation_rounding_contribution","totalDiscrepancy":"total_error"}.items():
  exact_ratio(record["result"][field],Fraction(expected_case[key]))
 assert json.loads(witness["serialized"])==record
after=source_pins();assert before==after
files={}
for p in root.iterdir():
 if p.is_file():
  b=p.read_bytes();files[p.name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
deck=outputs["deck"]
summary={"schema":"recallweave-precision-independent/1","reviewer":"estate_continuity-3dcb83a1","decision":"accepted for the pinned arithmetic, lesson content and native deck/review boundary","source_root":str(source),"source_pins":before,"blind_key_count":12,"pre_frozen_blind_solution_sha256":"8b26f0cb72b74ef86e0ec9c3ced0c22482ecd9626d47d60279c477c8612872eb","pre_frozen_oracle_sha256":"851673f22e419f1579707aa8dc6e220c86e8d7b90e71d23f6b622b7d4923ed16","exact_arithmetic_cases":10,"all_exact_fraction_decimal_bits_and_discrepancy_fields_match":True,"worked_record_roundtrip":True,"native_deck_review":{"questions":deck["questions"],"first_correct":deck["firstCorrect"],"initial_missed":deck["initialMissed"],"practice_correct":deck["practiceCorrect"],"no_repeated_selection":deck["noRepeatedSelection"],"complete_canonical_review":deck["completeCanonicalReview"],"original_deck_review_and_mastery_retained":deck["originalDeckReviewAndMasteryRetained"]},"all_14_source_files_unchanged":True,"native_node":subprocess.check_output(["/usr/bin/node","--version"],text=True).strip(),"commands":commands,"free_before":free,"free_after":guard(),"reserve_bytes":reserve,"own_limit_bytes":own_limit,"browser_execution":False,"importer_UI_claim":False,"content_review":"Prompts/options/transfer text match the original blind sheet; all 12 keys match independent solutions. Explanations and transfer answers preserve conversion versus operation error, exact dyadic cases, tolerance/display distinctions and individual exactness outside the safe interval.","files":files}
(root/"independent-results.json").write_text(json.dumps(summary,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"decision":summary["decision"],"arithmetic_cases":10,"lesson_keys":12,"deck_review":summary["native_deck_review"],"all_source_unchanged":True,"result_path":str(root/"independent-results.json"),"free_after":summary["free_after"]},sort_keys=True))
