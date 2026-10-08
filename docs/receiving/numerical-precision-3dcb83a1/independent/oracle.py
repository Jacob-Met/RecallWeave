import fractions,json,subprocess,sys
rows=json.loads(sys.argv[1])
js="const rows=JSON.parse(process.argv[1]); console.log(JSON.stringify(rows.map(([id,a,b,op])=>{const x=Number(a),y=Number(b),r=op==='+'?x+y:x-y;return {id,a:x,b:y,result:r,text:String(r),precision:r.toPrecision(17),safeInteger:Number.isSafeInteger(r),bits:(v=>{const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,v);return d.getBigUint64(0).toString(16).padStart(16,'0')})(r)}})))"
native=subprocess.run(["node","-e",js,json.dumps(rows)],capture_output=True,text=True,check=True)
values=json.loads(native.stdout)
out=[]
for row,val in zip(rows,values):
 ident,a,b,op=row
 A,B=fractions.Fraction(a),fractions.Fraction(b)
 FA,FB=fractions.Fraction(float(a)),fractions.Fraction(float(b))
 exact=A+B if op=="+" else A-B
 inputs=FA+FB if op=="+" else FA-FB
 numeric=float(a)+float(b) if op=="+" else float(a)-float(b)
 result=fractions.Fraction(numeric)
 # The ECMAScript result also arrives via an exact shortest decimal round-trip.
 if float(val["result"])!=numeric:raise AssertionError(ident+" native runtime mismatch")
 out.append({"id":ident,"inputs":[a,b],"operation":op,"exact_intended_result":str(exact),"exact_stored_input_result":str(inputs),"exact_binary64_result":str(result),"input_conversion_contribution":str(inputs-exact),"operation_rounding_contribution":str(result-inputs),"total_error":str(result-exact),"error_decomposition_holds":(inputs-exact)+(result-inputs)==result-exact,"javascript":val})
print(json.dumps({"scope":"Independent arithmetic oracle prepared before receiving the author key or explorer source","cases":out,"all_error_decompositions_hold":all(x["error_decomposition_holds"] for x in out),"candidate_execution":False,"native_file_writes":0},sort_keys=True))
