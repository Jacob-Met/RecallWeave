import sys,termios,base64,gzip,tarfile,io,json,hashlib,zlib,struct,binascii
a=termios.tcgetattr(0);a[3]&=~(termios.ICANON|termios.ECHO);termios.tcsetattr(0,termios.TCSANOW,a)
raw=sys.stdin.buffer.read(259192)
arc=base64.b64decode(raw,validate=True)
H=lambda b:hashlib.sha256(b).hexdigest()
G=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
assert len(arc)==194393 and H(arc)=='e1fa0b32b3080876005d58faf981fc2c861bd0409e514af96e1308e550f75ceb'
assert G(arc)=='b2be451581720c4f881203490adfaa0fdb733a86'
t=tarfile.open(fileobj=io.BytesIO(arc),mode='r:gz');ms=t.getmembers()
assert len(ms)==37 and len({m.name for m in ms})==37 and all(m.isfile() and not m.name.startswith('/') and '..' not in m.name.split('/') for m in ms)
files={m.name:t.extractfile(m).read() for m in ms}
man=json.loads(files['manifest.json'])
assert H(files['manifest.json'])=='139e6ec75573caca4823b49f14e223957ac04c5fa9a03fb12d075af9ea0f84fa'
assert len(man['files'])==36 and {f['path'] for f in man['files']}==set(files)-{'manifest.json'}
for f in man['files']:
 b=files[f['path']];assert len(b)==f['bytes'] and H(b)==f['sha256'] and G(b)==f['gitBlob']
r=json.loads(files['original/renderer-receiving.json']);d=json.loads(files['original/driver-result.json']);c=json.loads(files['custody/receiving.json'])
assert r['accepted'] and r['inputsUnchanged'] and not r['errors'] and len(r['requests'])==2
assert r['before']==r['after'] and len(r['before'])==13
assert d['pid']==94488 and d['exitCode']==0 and d['signal'] is None and d['elapsedMs']==2550.3259
assert r['browserPid']==76288 and r['browserClosed'] and r['browserExitCode']==0 and r['browserSignal'] is None and r['ownProfileRemoved']
assert r['elapsedMs']==2387.7041 and c['accepted'] and c['originalFileCount']==19
assert len([x for x in files if x.startswith('original/')])==19
ctx=json.loads(files['original/admission-context.json'])
s=files['original/receive-renderer-r2.mjs'].decode()
assert H(s.encode())=='74381dc66562de16743d02fd2e399a353b6f29e8dd25c43f17a736794e0c7bd1'
for e in reversed(ctx['edits']):
 assert s.count(e['after'])==1;s=s.replace(e['after'],e['before'])
assert len(s.encode())==14355 and H(s.encode())=='f01c7fd8bf4829efdceeb7c533c59c414c00c1752d77771dc885b4995c93e1d2'
for v in ['r1','r2']:
 intake=json.loads(files['original/intake-'+v+'.json'])
 assert len(intake['files'])==7
 for f in intake['files']:
  b=f['text'].encode();assert b==files['received-source/'+v+'/'+f['path']] and H(b)==f['sha256'] and G(b)==f['gitBlob']
for artifact in r['artifacts']:
 b=files['original/'+artifact['path'].split('\\')[-1]];assert len(b)==artifact['bytes'] and H(b)==artifact['sha256'] and G(b)==artifact['gitBlob']
pngs=[]
for name in sorted(n for n in files if n.endswith('.png')):
 b=files[name];assert b[:8]==b'\x89PNG\r\n\x1a\n';pos=8;ids=[];chunks=[]
 while pos<len(b):
  n=struct.unpack('>I',b[pos:pos+4])[0];kind=b[pos+4:pos+8];data=b[pos+8:pos+8+n];crc=struct.unpack('>I',b[pos+8+n:pos+12+n])[0]
  assert (binascii.crc32(kind+data)&0xffffffff)==crc;chunks.append(kind.decode())
  if kind==b'IHDR':w,h,depth,typ,comp,filt,inter=struct.unpack('>IIBBBBB',data)
  if kind==b'IDAT':ids.append(data)
  pos+=12+n
  if kind==b'IEND':break
 assert pos==len(b) and depth==8 and typ in (2,6) and comp==0 and filt==0 and inter==0
 assert w==(1280 if '1280' in name else 390)
 bpp={2:3,6:4}[typ];stride=w*bpp;inflated=zlib.decompress(b''.join(ids));assert len(inflated)==(stride+1)*h
 prev=bytearray(stride);pixels=bytearray()
 for y in range(h):
  start=y*(stride+1);ft=inflated[start];row=bytearray(inflated[start+1:start+1+stride]);assert ft in range(5)
  for x in range(stride):
   left=row[x-bpp] if x>=bpp else 0;up=prev[x];ul=prev[x-bpp] if x>=bpp else 0
   if ft==1:p=left
   elif ft==2:p=up
   elif ft==3:p=(left+up)//2
   elif ft==4:
    q=left+up-ul;dist=[abs(q-left),abs(q-up),abs(q-ul)];p=[left,up,ul][dist.index(min(dist))]
   else:p=0
   row[x]=(row[x]+p)&255
  pixels.extend(row);prev=row
 pngs.append({'path':name,'bytes':len(b),'sha256':H(b),'width':w,'height':h,'colorType':typ,'decodedPixelBytes':len(pixels),'decodedPixelSha256':H(pixels),'chunkCrcZlibAndFilterChecks':True})
geo=[]
assert [(o['version'],o['width']) for o in r['observations']]==[('r1',1280),('r1',390),('r2',1280),('r2',390)]
for o in r['observations']:
 p=o['paragraphs'];s=o['summaries']
 assert [x['quoted'] for x in p]==['"a b"','"a b"','"a  b"','"a  b"']
 assert [x['quoted'] for x in s]==['"a b"','"a  b"']
 if o['version']=='r1':assert p[0]['width']==p[2]['width'] and s[0]['width']==s[1]['width']
 else:assert p[2]['width']>p[0]['width'] and s[1]['width']>s[0]['width']
 geo.append({'version':o['version'],'width':o['width'],'paragraphWidths':[p[0]['width'],p[2]['width']],'summaryWidths':[s[0]['width'],s[1]['width']]})
out={'schema':'recall180-renderer-independent-transport/1','accepted':True,'scope':'Independent CPython archive/member/source/receipt and PNG decoding of original completed fixed-report renderer/CSS slice. No browser, comparator or product execution.','archive':{'bytes':len(arc),'sha256':H(arc),'gitBlob':G(arc)},'members':len(ms),'manifestPayloads':len(man['files']),'originalFiles':19,'embeddedSourceFiles':14,'receiptSha256':H(files['custody/receiving.json']),'exactFiveEditInverse':True,'recordedInputEquality':13,'pngs':pngs,'recordedGeometry':geo,'runtime':sys.version}
print(json.dumps(out,separators=(',',':')))
