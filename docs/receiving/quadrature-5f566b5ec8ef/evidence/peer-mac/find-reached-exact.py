"""Post-disclosure extra branch search using only the previously frozen oracle."""
from pathlib import Path
from fractions import Fraction
from math import lcm
import json,hashlib
import oracle
root=Path(__file__).resolve().parent
values=[0]+[sign*i for i in range(1,10) for sign in (1,-1)]
intervals=sorted([(a,b) for a in range(-5,5) for b in range(a+1,6)],key=lambda ab:(max(abs(ab[0]),abs(ab[1])),ab))
attempts=0;found=None
for a,b in intervals:
 if found: break
 for n in (4,8,16,32):
  if found: break
  for kind in ("midpoint","trapezoid"):
   exact=[];previous=[]
   for d in range(2,6):
    coeff=[0]*6;coeff[d]=1
    exact.append(oracle.readrat(oracle.rule(coeff,a,b,n,kind)["error"]))
    previous.append(oracle.readrat(oracle.rule(coeff,a,b,n//2,kind)["error"]))
   scale=lcm(*(e.denominator for e in exact))
   ints=[int(e*scale) for e in exact]
   for c3 in values:
    if found: break
    for c4 in values:
     if found: break
     for c5 in values:
      attempts+=1; numerator=-(ints[1]*c3+ints[2]*c4+ints[3]*c5)
      if numerator%ints[0]:continue
      c2=numerator//ints[0]
      if not -9<=c2<=9:continue
      coeff=[0,0,c2,c3,c4,c5]
      prior=sum((previous[j]*coeff[j+2] for j in range(4)),Fraction(0))
      if prior==0:continue
      fine=oracle.rule(coeff,a,b,n,kind);coarse=oracle.rule(coeff,a,b,n//2,kind)
      assert oracle.readrat(fine["absoluteError"])==0 and oracle.readrat(coarse["absoluteError"])>0
      found={"input":{"coefficients":coeff,"lower":a,"upper":b,"subintervals":n},"method":kind,"previous_n":n//2,"previous":{k:v for k,v in coarse.items() if k!="nodes"},"current":{k:v for k,v in fine.items() if k!="nodes"},"exactIntegral":oracle.rational(oracle.integral(coeff,a,b))}
      break
   if found:break
result={"phase":"Additional admitted ratio-branch search after model disclosure; all expectations still computed solely by frozen Fraction oracle","candidate_source_used_for_math":False,"checked_combinations":attempts,"found":found,"oracle_sha256":hashlib.sha256((root/"oracle.py").read_bytes()).hexdigest()}
(root/"reached-exact-search.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result))
