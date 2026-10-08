from pathlib import Path
import sys,os,json,hashlib,datetime,time,traceback,shutil
ROOT=Path(r'C:\Users\minec\hamon-recall-first-receiving-f3d1a0c556df')
OUT=ROOT/'browser-v1'; OUT.mkdir(exist_ok=False)
TMP=OUT/'tmp';TMP.mkdir();os.environ['TEMP']=str(TMP);os.environ['TMP']=str(TMP)
DEPS=Path(r'C:\Users\minec\hamon-recall-locale-f3d1a0c556df\deps');sys.path.insert(0,str(DEPS))
from playwright.sync_api import sync_playwright
FIX=ROOT/'fixtures';SOURCE=ROOT/'candidate';ENTRY=(SOURCE/'recall-first.html').as_uri()
manifest=json.loads((ROOT/'candidate-v1-freeze.json').read_text())
expected=json.loads((ROOT/'expected.json').read_text())
bundled=json.loads((ROOT/'base-data-deck.json').read_text(encoding='utf8'))
custom=json.loads((FIX/'three-items.json').read_text(encoding='utf8'))
results=[];contexts=[];network=[];errors=[];current=None
START=time.monotonic()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sourcecheck():
 for row in manifest['files']:
  assert sha(SOURCE/row['path'])==row['sha256'],row['path']
 return len(manifest['files'])
def check(value,message):
 if not value:raise AssertionError(message)
def write(name,data):(OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def key(page,id):
 page.locator('#'+id).focus();page.keyboard.press('Enter')
def select(page,name):
 page.locator('#deck-file').set_input_files(str(FIX/name))
def checked(page):page.wait_for_function("document.querySelector('#status').textContent.startsWith('Course checked.')")
def start_custom(page):
 select(page,'three-items.json');checked(page);key(page,'start-course')
def snapshot(page):
 return {'session':page.locator('#session').inner_text(),'answer':page.locator('#recall-answer').input_value() if page.locator('#recall-answer').count() else None,'reference':page.locator('#reference').count()}
def same(page,before):check(snapshot(page)==before,'current learner work changed')
def hidden(page,item):
 check(page.locator('#active-heading').inner_text()==item['prompt'],'source-order prompt mismatch')
 text=page.locator('#prompt-card').inner_text()
 for value in item['options']+[item['explanation'],item['transfer']]:check(value not in text,'reference leaked before reveal')
 check(page.locator('#reference').count()==0,'reference exists before reveal')
def reveal(page,item,answer=None):
 key(page,'reveal')
 check(page.locator('#reference p').all_text_contents()==[item['options'][item['answer']],item['explanation'],item['transfer']],'reference text mismatch')
 check(page.locator('#reference b,#reference em').count()==0,'literal markup rendered as elements')
 if answer:check(page.locator('.own-answer p').inner_text()==answer,'own answer changed')
def shot(page,name):page.screenshot(path=str(OUT/name),full_page=False)
def fresh(browser,width=1100,gate=False):
 context=browser.new_context(viewport={'width':width,'height':850},locale='en-US',service_workers='block',accept_downloads=False)
 contexts.append(context)
 def block(route):
  network.append(route.request.url);route.abort()
 context.route('http://**/*',block);context.route('https://**/*',block)
 context.add_init_script("""window.__receiverEvents=[];for(const type of ['click','keydown','input','change'])document.addEventListener(type,e=>window.__receiverEvents.push({type,trusted:e.isTrusted,target:e.target.id||e.target.tagName,key:e.key||null}),true);""")
 if gate:
  context.add_init_script("""(()=>{
const original=File.prototype.arrayBuffer;
const gate={pending:{},entered:[],released:[],release(name){if(!this.pending[name])throw Error('no pending read');this.released.push(name);this.pending[name]();delete this.pending[name];}};
window.__receiverReadGate=gate;
File.prototype.arrayBuffer=async function(){const bytes=await original.call(this);if(this.name==='gate-valid-a.json'||this.name==='gate-invalid-a.json'){gate.entered.push(this.name);await new Promise(resolve=>gate.pending[this.name]=resolve);}return bytes;};
})();""")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_default_timeout(7000);page.goto(ENTRY,wait_until='load');page.wait_for_selector('#start-course')
 return page,context
def finish(page,context):
 data={'trusted_events':page.evaluate("window.__receiverEvents.filter(x=>x.trusted)"),'url':page.url}
 context.close();return data
def group1(browser):
 p,c=fresh(browser);check(p.locator('#prompt-card').count()==0,'started without consent')
 check(bundled['title'] in p.locator('#preview').inner_text(),'bundled title missing')
 for field in ['attribution','license']:check(bundled[field] in p.locator('#preview').inner_text(),'bundled credit missing')
 key(p,'start-course');hidden(p,bundled['items'][0]);shot(p,'01-bundled-before-reveal.png')
 p.locator('#recall-answer').fill('My own explanation.')
 p.keyboard.press('Tab');check(p.evaluate('document.activeElement.id')=='reveal','keyboard order to reveal')
 p.keyboard.press('Enter')
 check(p.locator('#reference p').all_text_contents()==[bundled['items'][0]['options'][bundled['items'][0]['answer']],bundled['items'][0]['explanation'],bundled['items'][0]['transfer']],'bundled reference exactness')
 check(p.locator('.own-answer p').inner_text()=='My own explanation.','own bundled response lost')
 shot(p,'01-bundled-revealed.png');key(p,'judge-ready');hidden(p,bundled['items'][1])
 for field in ['attribution','license']:check(bundled[field] in p.locator('#session .credits').inner_text(),'session credit missing')
 return finish(p,c)
def group2(browser):
 p,c=fresh(browser);key(p,'start-course');p.locator('#recall-answer').fill('preserved old draft')
 before=snapshot(p);select(p,'three-items.json');checked(p);same(p,before);key(p,'start-course')
 for idx,record in enumerate(expected['attempts'][:3]):
  item=custom['items'][idx];hidden(p,item);p.locator('#recall-answer').fill(record['answer']);reveal(p,item,record['answer'])
  key(p,'judge-revisit' if record['judgment']=='Revisit' else 'judge-ready')
 check(p.locator('#active-heading').inner_text()=='First pass complete','first pass not complete')
 check(p.locator('#begin-revisit').inner_text()=='Revisit marked prompts (2)','revisit set wrong')
 check(p.locator('.attempts details').count()==3,'first pass item count')
 key(p,'begin-revisit')
 for idx,record in zip([0,2],expected['attempts'][3:]):
  item=custom['items'][idx];hidden(p,item);p.locator('#recall-answer').fill(record['answer']);reveal(p,item,record['answer']);key(p,'judge-revisit' if record['judgment']=='Revisit' else 'judge-ready')
 check(p.locator('#active-heading').inner_text()=='Revisit pass complete','second pass not complete')
 check(p.locator('#begin-revisit').count()==0,'third pass offered')
 detail=p.locator('.attempts details')
 check(detail.count()==3,'summary item count')
 retained=[]
 for index,item in enumerate(custom['items']):
  row=detail.nth(index);row.locator('summary').click()
  check(row.locator('summary').inner_text()==item['prompt'],'summary source order')
  records=[r for r in expected['attempts'] if r['id']==item['id']]
  headings=row.locator('h3').all_text_contents()
  desired=[('First pass' if r['pass']==1 else 'Revisit pass')+' · '+r['judgment']+' (self-reported)' for r in records]+['Reference answer']
  check(headings==desired,'attempt judgment/pass label changed')
  bodies=row.locator('p.literal').all_text_contents()
  check(bodies[:len(records)]==[r['answer'] or 'No written answer.' for r in records],'prior attempt overwritten')
  retained.extend(records)
 check(len(retained)==5,'attempt count is not five')
 check('not correctness or mastery estimates' in p.locator('#session').inner_text(),'self-report boundary missing')
 p.locator('.attempts').scroll_into_view_if_needed();shot(p,'02-two-pass-preserved-history.png')
 out=finish(p,c);out['attempts_observed']=retained;return out
def group3(browser):
 p,c=fresh(browser);start_custom(p);area=p.locator('#recall-answer');area.focus()
 p.keyboard.insert_text('\U0001f642'*2001)
 check(area.evaluate('(e)=>e.value.length')==4000,'textarea did not enforce 4000 UTF16 units')
 check(area.input_value()=='\U0001f642'*2000,'surrogate-safe maximum changed')
 p.keyboard.insert_text('X');check(area.evaluate('(e)=>e.value.length')==4000,'overlimit append stored')
 reveal(p,custom['items'][0],'\U0001f642'*2000);key(p,'judge-revisit')
 p.locator('#recall-answer').fill('must survive canceled restart');reveal(p,custom['items'][1],'must survive canceled restart')
 before=snapshot(p);key(p,'restart');check(p.locator('#restart-confirm').is_visible(),'no restart confirmation');key(p,'cancel-restart');same(p,before)
 key(p,'restart');key(p,'confirm-restart');hidden(p,custom['items'][0]);check(p.locator('#recall-answer').input_value()=='','confirmed restart retained draft')
 for item in custom['items']:
  hidden(p,item);reveal(p,item);key(p,'judge-ready')
 alltext=p.locator('#session').inner_text()
 check('must survive canceled restart' not in alltext and '\U0001f642' not in alltext,'confirmed restart retained attempts')
 check(p.locator('.attempts h3').all_text_contents().count('First pass · Ready for now (self-reported)')==3,'fresh record count')
 check(p.locator('#begin-revisit').count()==0,'cleared revisit survived restart')
 out=finish(p,c);out['accepted_utf16_units']=4000;out['attempted_utf16_units']=4002;return out
def group4(browser):
 p,c=fresh(browser);start_custom(p);reveal(p,custom['items'][0]);key(p,'judge-revisit')
 p.locator('#recall-answer').fill('unchanged through every import');before=snapshot(p)
 cases=[]
 for name in expected['invalid_files']:
  select(p,name);p.wait_for_function("document.querySelector('#status').textContent.startsWith('Course refused:')")
  same(p,before);check(not p.locator('#preview').is_visible(),'invalid file exposed preview')
  cases.append({'file':name,'message':p.locator('#status').inner_text()})
 for name in ['exact-262144.json','replacement-b.json']:
  select(p,name);checked(p);same(p,before);key(p,'cancel-preview');same(p,before)
 p.locator('#deck-file').set_input_files([]);p.wait_for_function("document.querySelector('#status').textContent.startsWith('No course selected.')");same(p,before)
 reveal(p,custom['items'][1],'unchanged through every import');key(p,'judge-ready');reveal(p,custom['items'][2]);key(p,'judge-ready')
 first=p.locator('.attempts details').nth(0);first.locator('summary').click();check('First pass · Revisit (self-reported)' in first.inner_text(),'prior history lost through import')
 out=finish(p,c);out['invalid_files']=cases;out['cap_accepted_bytes']=262144;out['empty_input_not_os_dialog_cancel']=True;return out
def group5(browser):
 p,c=fresh(browser,gate=True);start_custom(p);p.locator('#recall-answer').fill('stale completion preserves me');before=snapshot(p);branches=[]
 for name in ['gate-valid-a.json','gate-invalid-a.json']:
  select(p,name);p.wait_for_function("(name)=>Boolean(window.__receiverReadGate.pending[name])",arg=name)
  select(p,'replacement-b.json');checked(p);same(p,before)
  check('Replacement preview B' in p.locator('#preview').inner_text(),'fast B preview absent')
  p.evaluate("(name)=>window.__receiverReadGate.release(name)",name)
  p.wait_for_timeout(60);same(p,before)
  check('Replacement preview B' in p.locator('#preview').inner_text(),'stale read replaced fast B')
  check(p.locator('#status').inner_text().startswith('Course checked.'),'stale read replaced successful status')
  key(p,'cancel-preview');same(p,before);branches.append(name)
 gate=p.evaluate("({entered:window.__receiverReadGate.entered,released:window.__receiverReadGate.released,pending:Object.keys(window.__receiverReadGate.pending)})")
 check(not gate['pending'],'held read unresolved')
 out=finish(p,c);out['actual_gate']='File.prototype.arrayBuffer after original bytes read';out['gate']=gate;return out
def widths(p,phase):
 return p.evaluate("""phase=>({phase,viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,overflow:[...document.querySelectorAll('h2,.concept,.course-title,.preview,.prompt-card,.credits')].map(e=>({tag:e.tagName,id:e.id,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth})).filter(x=>x.right>innerWidth+1||x.scroll>x.client+1)})""",phase)
def group6(browser):
 p,c=fresh(browser,width=390);select(p,'long-unbroken-concept80.json');checked(p)
 measured=[widths(p,'preview')]
 p.locator('#preview').scroll_into_view_if_needed();shot(p,'06-long-preview-390.png')
 key(p,'start-course')
 long=json.loads((FIX/'long-unbroken-concept80.json').read_text());item=long['items'][0]
 hidden(p,item);measured.append(widths(p,'prompt'));p.locator('#prompt-card').scroll_into_view_if_needed();shot(p,'06-long-prompt-390.png')
 reveal(p,item);measured.append(widths(p,'revealed'))
 p.locator('#reference').scroll_into_view_if_needed();shot(p,'06-long-revealed-390.png')
 for value in [long['attribution'],long['license']]:check(value in p.locator('#session .credits').inner_text(),'long credits missing')
 key(p,'judge-ready');check(p.locator('#active-heading').inner_text()=='First pass complete','narrow keyboard judgment failed')
 out=finish(p,c);out['widths']=measured;write('06-widths.json',measured)
 check(all(x['document']<=x['viewport']+1 and x['body']<=x['viewport']+1 for x in measured),'390px imported long fields overflow; see 06-widths.json and screenshots')
 return out
try:
 check(shutil.disk_usage(ROOT).free>2_000_000_000,'capacity insufficient')
 sourcecheck()
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True,args=['--disable-background-networking','--disable-component-update','--no-first-run'])
  runtime={'python':sys.version,'browser':browser.version,'playwright':'1.63.0','browser_profile':'new private ephemeral, own TEMP'}
  for number,fn in enumerate([group1,group2,group3,group4,group5,group6],1):
   before=time.monotonic();current=number
   try:
    detail=fn(browser);result={'group':number,'name':fn.__name__,'passed':True,'detail':detail}
   except Exception as e:
    result={'group':number,'name':fn.__name__,'passed':False,'error':repr(e),'traceback':traceback.format_exc()}
    for n,context in enumerate(contexts):
     try:
      for k,page in enumerate(context.pages):page.screenshot(path=str(OUT/('failure-%s-%s-%s.png'%(number,n,k))),full_page=False)
     except Exception:pass
   result['seconds']=round(time.monotonic()-before,3);results.append(result);write('groups.json',results)
   print(json.dumps({'group':number,'passed':result['passed'],'error':result.get('error'),'seconds':result['seconds']}),flush=True)
   for context in contexts:
    try:context.close()
    except Exception:pass
   contexts=[]
  browser.close()
 receipt={'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime':runtime,'groups':results,'passed':sum(x['passed'] for x in results),'total':len(results),'blocked_network_requests':network,'page_errors':errors,'source_files_unchanged':sourcecheck(),'elapsed_seconds':round(time.monotonic()-START,3),'direct_file':ENTRY,'actions_started':0,'provider_calls':0,'user_sessions_used':0,'all_contexts_closed':True,'driver_sha256':sha(Path(__file__)),'candidate_freeze_sha256':sha(ROOT/'candidate-v1-freeze.json'),'blind_freeze_sha256':sha(ROOT/'blind-freeze.json')}
 write('receipt.json',receipt);print(json.dumps({'receipt':str(OUT/'receipt.json'),'sha256':sha(OUT/'receipt.json'),'passed':receipt['passed'],'total':receipt['total']}),flush=True)
except BaseException:
 write('controller-failure.json',{'group':current,'error':traceback.format_exc(),'results':results});raise
