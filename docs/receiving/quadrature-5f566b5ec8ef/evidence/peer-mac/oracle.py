"""Independent rational oracle, frozen before reading the product model.

Only the stated coefficient/interval/mesh contract and blind lesson prompts are
inputs. Python fractions and polynomial antiderivatives form the reference;
no product source, test, explanation, answer key or report is imported.
"""
from pathlib import Path
from fractions import Fraction as F
from math import gcd
import json, random, hashlib, datetime

ROOT = Path(__file__).resolve().parent
MESHES = (2, 4, 8, 16, 32)
def value(c, x):
    # Deliberately use the polynomial's monomial expansion.
    return sum((F(a) * x**j for j, a in enumerate(c)), F(0))
def integral(c, a, b):
    return sum((F(v, j+1) * (F(b)**(j+1)-F(a)**(j+1)) for j,v in enumerate(c)), F(0))
def rational(v):
    v = F(v)
    return {"numerator": str(v.numerator), "denominator": str(v.denominator)}
def rule(c, a, b, n, kind):
    width = F(b-a, n)
    if kind == "midpoint":
        nodes = [(F(a) + F(2*i+1, 2)*width, width) for i in range(n)]
    else:
        nodes = []
        for i in range(n+1):
            if kind == "trapezoid":
                weight = width * (F(1,2) if i in (0,n) else 1)
            else:
                weight = width/F(3) * (1 if i in (0,n) else 4 if i%2 else 2)
            nodes.append((F(a)+i*width, weight))
    assert sum((w for _,w in nodes),F(0)) == b-a
    trace = [{"x":rational(x),"value":rational(value(c,x)),"weight":rational(w),"contribution":rational(w*value(c,x))} for x,w in nodes]
    estimate=sum((w*value(c,x) for x,w in nodes),F(0)); err=estimate-integral(c,a,b)
    degree=next((j for j in reversed(range(6)) if c[j]),None)
    return {"nodes":trace,"estimate":rational(estimate),"error":rational(err),"absoluteError":rational(abs(err)),"isExact":err==0,
            "guaranteedByDegree":degree is None or degree <= (3 if kind=="simpson" else 1)}
def readrat(r): return F(int(r["numerator"]),int(r["denominator"]))
def expected(c,a,b,n):
    levels=[]
    for mesh in MESHES:
        rules={k:rule(c,a,b,mesh,k) for k in ("midpoint","trapezoid","simpson")}
        for k,result in rules.items():
            now=readrat(result["absoluteError"])
            if not levels: ratio={"kind":"first"}
            else:
                prev=readrat(levels[-1]["rules"][k]["absoluteError"])
                ratio={"kind":"both-exact"} if prev==now==0 else {"kind":"reached-exact"} if now==0 else {"kind":"finite","value":rational(prev/now)}
            result["ratio"]=ratio
        levels.append({"subintervals":mesh,"rules":rules})
    selected=next(x["rules"] for x in levels if x["subintervals"]==n)
    # Refinements retain numerical totals; detailed selected nodes are separate.
    refinements=[{"subintervals":x["subintervals"],"rules":{k:{p:v for p,v in y.items() if p!="nodes"} for k,y in x["rules"].items()}} for x in levels]
    return {"input":{"coefficients":list(c),"lower":a,"upper":b,"subintervals":n},"polynomialDegree":next((j for j in reversed(range(6)) if c[j]),None),
            "exactIntegral":rational(integral(c,a,b)),"width":rational(F(b-a,n)),"rules":selected,"refinements":refinements}

def main():
    # All 55 translated admitted integer intervals, every monomial degree.
    inputs=[]
    for degree in range(6):
        for lower in range(-5,5):
            for upper in range(lower+1,6):
                c=[0]*6; c[degree]=1
                inputs.append((c,lower,upper,MESHES[len(inputs)%5]))
    fixed=[
        ([0]*6,-5,5,2),([0]*6,-5,-4,32),([9]*6,-5,5,32),
        ([-9]*6,-5,-4,32),([9,-9,9,-9,9,-9],4,5,16),
        ([0,0,1,-3,2,0],0,1,2),([0,0,-9,0,5,0],-1,1,4),
        ([0,0,0,0,0,1],-2,2,32),([1,-2,0,1,0,0],1,3,2),
        ([0,0,0,0,1,0],-1,1,8)]
    inputs.extend(fixed)
    rng=random.Random(50612)
    for i in range(128):
        a=rng.randrange(-5,5); b=rng.randrange(a+1,6)
        inputs.append(([rng.randrange(-9,10) for _ in range(6)],a,b,MESHES[i%5]))
    data=[expected(*args) for args in inputs]
    # Human transfers and nonmonotone case independently checked here.
    assert integral([1,-2,0,1,0,0],1,3)==14
    assert readrat(rule([0,0,1,-3,2,0],0,1,2,"midpoint")["estimate"])==F(-3,128)
    assert readrat(rule([0,0,1,-3,2,0],0,1,2,"midpoint")["error"])==F(-13,1920)
    assert readrat(rule([0,0,0,0,1,0],-1,1,8,"simpson")["estimate"])==F(77,192)
    assert readrat(rule([0,0,-9,0,5,0],-1,1,2,"trapezoid")["error"])==0
    assert readrat(rule([0,0,-9,0,5,0],-1,1,4,"trapezoid")["error"])==F(1,16)
    destination=ROOT/"oracle-expected.json"
    assert not destination.exists()
    destination.write_text(json.dumps({"provenance":"independent Python Fraction oracle frozen before product source/output disclosure","cases":data},separators=(",",":"))+"\n")
    pins={}
    for p in (ROOT/"blind-derived.json",Path(__file__).resolve(),destination,ROOT.parent/"course-questions-blind.json"):
        raw=p.read_bytes(); pins[str(p.relative_to(ROOT.parent))]={"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
    record={"at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"candidate_source_read":False,"candidate_outputs_read":False,"course_keys_read":False,"case_count":len(data),"translated_monomial_cases":330,"fixed_counterexamples":10,"mixed_cases":128,"levels_per_case":5,"methods_per_level":3,"files":pins,"answer_indexes":[1,2,0,3,1,2,0,3,1,2,0,3]}
    (ROOT/"blind-freeze.json").write_text(json.dumps(record,indent=2)+"\n")
    print(json.dumps(record,indent=2))
if __name__=="__main__": main()
