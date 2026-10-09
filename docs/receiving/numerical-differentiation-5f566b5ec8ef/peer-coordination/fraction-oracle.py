from pathlib import Path
from fractions import Fraction as F
import random,json,hashlib,datetime
R=Path(__file__).parent;OWNER=R.parent.parent
DEN=[1,2,4,8,16,32]
def rat(x):
 x=F(x);return {'numerator':str(x.numerator),'denominator':str(x.denominator),'fraction':str(x)}
def value(c,x):return sum((F(a)*x**k for k,a in enumerate(c)),F(0))
def analyze(c,x,selected):
 x=F(x);degree=next((k for k in range(5,-1,-1) if c[k]),None)
 derivative=sum((F(k*c[k])*x**(k-1) for k in range(1,6)),F(0))
 levels=[]
 for d in DEN:
  h=F(1,d);nodes=[x-h,x,x+h];samples=[value(c,t) for t in nodes]
  differences={'forward':samples[2]-samples[1],'backward':samples[1]-samples[0],'central':samples[2]-samples[0]}
  methods={}
  for method,diff in differences.items():
   divisor=2*h if method=='central' else h;q=diff/divisor;e=q-derivative
   methods[method]={'difference':rat(diff),'divisor':rat(divisor),'estimate':rat(q),'signedError':rat(e),'absoluteError':rat(abs(e)),'exact':e==0,'degreeGuaranteed':degree is None or degree<=(2 if method=='central' else 1)}
  levels.append({'stepDenominator':d,'h':rat(h),'nodes':[rat(t) for t in nodes],'values':[rat(v) for v in samples],'methods':methods,'centralSecantHeightAtPoint':rat((samples[0]+samples[2])/2)})
 return {'degree':degree,'derivative':rat(derivative),'selectedIndex':DEN.index(selected),'levels':levels}
cases=[]
def add(label,c,x,selected=None):
 d=selected or DEN[len(cases)%6]
 cases.append({'id':label,'input':{'coefficients':c,'point':x,'stepDenominator':d},'expected':analyze(c,x,d)})
for k in range(6):
 for scale in [-9,1,9]:
  for x in range(-5,6):
   c=[0]*6;c[k]=scale;add(f'monomial-{k}-scale-{scale}-point-{x}',c,x)
for x in range(-5,6):add(f'zero-point-{x}',[0]*6,x)
rng=random.Random(202610090611)
for i in range(128):add(f'seeded-mixed-{i}',[rng.randint(-9,9) for _ in range(6)],rng.randint(-5,5))
specials=[('forward-lucky-coarse',[0,0,1,-1,0,0],0),('backward-lucky-coarse',[0,0,1,1,0,0],0),('central-lucky-coarse',[0,0,0,-1,0,1],0),('central-even-origin',[0,0,0,0,1,0],0),('central-even-translated',[0,0,0,0,1,0],1),('central-secant-offset',[0,0,1,0,0,0],1),('max-positive',[9]*6,5),('max-negative',[-9]*6,-5),('alternating-extreme',[-9,9,-9,9,-9,9],-5)]
for label,c,x in specials:add(label,c,x)
assert len(cases)==346
payload={'schema':'independent.differentiation.fraction-oracle.v1','method':'Python Fraction direct polynomial samples and analytic derivative; frozen before reading implementation/course/owner tests.','denominators':DEN,'caseCount':len(cases),'levelCount':len(cases)*6,'ruleCount':len(cases)*18,'cases':cases}
def write(name,obj):(R/name).write_bytes((json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8'))
contract=OWNER/'CONTRACT.json'
assert hashlib.sha256(contract.read_bytes()).hexdigest()=='d29aa14f7643ad5abf36575ea94f2f314105cde21566ae213658d2a1379cf44b'
write('oracle-expected.json',payload)
pins={}
for path in [contract,OWNER/'evidence/course-questions-blind.json',R/'blind-answers.json',R/'boundary-expectations.json',Path(__file__),R/'oracle-expected.json']:
 pins[str(path)]={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
write('blind-freeze.json',{'actor':'chatgpt:5f566b5ec8ef:coordination','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceKeysExplanationsOwnerTestsRead':False,'maskedQuestionsAndTransfers':12,'cases':346,'levels':2076,'rules':6228,'pins':pins})
print(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cases':346,'pins':pins},indent=2))
