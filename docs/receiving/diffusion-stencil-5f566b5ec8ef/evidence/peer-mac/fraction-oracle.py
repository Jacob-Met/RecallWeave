from fractions import Fraction as F
import json,random,hashlib
from pathlib import Path
root=Path('D:/HAMON/recallweave-diffusion-5f566b5ec8ef/evidence/peer-mac')
def rational(x): return {'numerator':str(x.numerator),'denominator':str(x.denominator)}
def expect(data):
 r=F(data['numerator'],data['denominator']); w=[r,1-2*r,r]
 old=list(map(F,data['values'])); mean=sum(old)/8; rows=[]
 for n in range(data['steps']+1):
  tr=None
  if n:
   before=old
   old=[r*before[(j-1)%8]+(1-2*r)*before[j]+r*before[(j+1)%8] for j in range(8)]
   tr=[{'cell':j,'indices':[(j-1)%8,j,(j+1)%8],'previous':[rational(before[k]) for k in [(j-1)%8,j,(j+1)%8]],'terms':[rational(a*before[k]) for a,k in zip(w,[(j-1)%8,j,(j+1)%8])],'value':rational(old[j])} for j in range(8)]
  assert sum(old)==8*mean
  rows.append({'values':list(map(rational,old)),'sum':rational(sum(old)),'mean':rational(mean),'minimum':rational(min(old)),'maximum':rational(max(old)),'squaredDeviations':rational(sum((v-mean)**2 for v in old)),'transition':tr})
 return {'input':data,'weights':list(map(rational,w)),'alternatingMultiplier':rational(1-4*r),'convexWeights':r<=F(1,2),'rows':rows}
cases=[]
for d in range(1,17):
 for n in range(d+1): cases.append({'values':[-7,3,19,-2,0,11,-20,6],'numerator':n,'denominator':d,'steps':2})
rng=random.Random(52535285)
for _ in range(32):
 d=rng.randrange(1,17);cases.append({'values':[rng.randrange(-20,21) for _ in range(8)],'numerator':rng.randrange(d+1),'denominator':d,'steps':24})
for values in ([8,0,0,0,0,0,0,0],[1,-1]*4,[2,0]*4,[-3]*8):
 for n,d in [(0,1),(1,4),(1,2),(3,4),(1,1)]:cases.append({'values':values,'numerator':n,'denominator':d,'steps':4})
result=[expect(x) for x in cases]
(root/'oracle-expected.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps({'cases':len(cases),'sha256':hashlib.sha256((root/'oracle-expected.json').read_bytes()).hexdigest(),'bytes':(root/'oracle-expected.json').stat().st_size}))
