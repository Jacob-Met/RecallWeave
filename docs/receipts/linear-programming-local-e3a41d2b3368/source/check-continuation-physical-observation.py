import json,sys,hashlib
from fractions import Fraction as Q
b=sys.argv[1].encode();o=json.loads(b)
assert len(b)==7194 and hashlib.sha256(b).hexdigest()=='c9d2422e8ec89265bc3de723f32fa2f14f0a0dd0b49118ab20b879b0754b73e2'
assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='a18d25bc4e9b334d861528a22c11d60ca7c5da1a'
assert o['format']=='recallweave-linear-programming/1'
assert o['problem']=={'bounds':{'xmin':0,'xmax':4,'ymin':0,'ymax':4},'constraints':[{'a':2,'b':1,'c':5},{'a':1,'b':2,'c':5}],'objective':{'p':1,'q':1,'sense':'max'}}
rows=[('x-min',-1,0,0),('x-max',1,0,4),('y-min',0,-1,0),('y-max',0,1,4),('C1',2,1,5),('C2',1,2,5)]
assert o['boundaries']==[{'id':n,'a':a,'b':bb,'c':c,'origin':'rectangle' if i<4 else 'authored'} for i,(n,a,bb,c) in enumerate(rows)]
rawpairs=[];points=set()
for i,(n,a,bb,c) in enumerate(rows):
 for m,d,e,f in rows[i+1:]:
  determinant=a*e-bb*d
  pair={'first':n,'second':m}
  if not determinant:pair['kind']='parallel'
  else:
   x=Q(c*e-bb*f,determinant);y=Q(a*f-c*d,determinant)
   violated=[rn for rn,ra,rb,rc in rows if ra*x+rb*y>rc]
   pair.update(kind='intersection',point={'x':str(x),'y':str(y)},feasible=not violated,violated=violated)
   if not violated:points.add((x,y))
  rawpairs.append(pair)
ordered=sorted(points);ids={p:'V'+str(i+1) for i,p in enumerate(ordered)}
for pair in rawpairs:
 if pair.get('feasible'):pair['vertex']=ids[(Q(pair['point']['x']),Q(pair['point']['y']))]
assert o['pairs']==rawpairs,'complete fifteen original pair records'
assert ordered==[(Q(0),Q(0)),(Q(0),Q(5,2)),(Q(5,3),Q(5,3)),(Q(5,2),Q(0))]
max_value=max(x+y for x,y in ordered);expected_vertices=[]
for x,y in ordered:
 ident=ids[(x,y)]
 slacks=[{'id':n,'value':str(c-a*x-bb*y)} for n,a,bb,c in rows]
 expected_vertices.append({'id':ident,'x':str(x),'y':str(y),'objective':str(x+y),'active':[p['id'] for p in slacks if p['value']=='0'],'slacks':slacks,'pairs':[[p['first'],p['second']] for p in rawpairs if p.get('vertex')==ident],'optimal':x+y==max_value})
assert o['vertices']==expected_vertices,'all vertex coordinates, objectives, active rows, slacks, pair provenance and optimum marks'
assert o['region']=={'kind':'polygon','boundary':['V1','V4','V3','V2']}
assert o['optimum']=={'sense':'max','value':'10/3','kind':'point','vertices':['V3'],'wholeRegion':False}
assert o['inspection']=={'selectedVertex':'V3'}
print(json.dumps({'passed':True,'method':'Independent Python Fraction postprocessing of the one actual physical observation; no application/browser replay. Exact frozen rectangle and two half-planes used.','boundaryRows':6,'pairs':len(rawpairs),'parallelPairs':sum(p['kind']=='parallel' for p in rawpairs),'feasiblePairIntersections':sum(p.get('feasible',False) for p in rawpairs),'vertices':expected_vertices,'region':o['region'],'optimum':o['optimum'],'inspection':o['inspection']}))
