from pathlib import Path
import json,hashlib,time,traceback,re
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'source'
OUT=ROOT/'evidence/browser-second'
OUT.mkdir(exist_ok=False)
DOWNLOADS=OUT/'downloads';DOWNLOADS.mkdir()
checks=[];errors=[];requests=[];downloads=[]
pins={str(p.relative_to(SRC)):hashlib.sha256(p.read_bytes()).hexdigest() for p in SRC.rglob('*') if p.is_file() and '.git' not in p.parts}
receipt={'passed':False,'checks':checks,'page_errors':errors,'requests':requests,'source_before':pins,'phase':'first actual offline lab and unchanged learner'}
def save(): (OUT/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
def done(name,data=None):
 checks.append({'name':name,'data':data});save();print('PASS '+name,flush=True)
def download(page,selector,name):
 with page.expect_download() as got: page.locator(selector).click()
 d=got.value;assert d.suggested_filename==name,(d.suggested_filename,name)
 path=DOWNLOADS/name;assert not path.exists();d.save_as(str(path));downloads.append({'name':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});return path
def row_to(page,n):
 page.locator('#row').focus();page.locator('#row').press('Home')
 for _ in range(n):page.locator('#row').press('ArrowRight')
 expect(page.locator('#row-label')).to_contain_text(str(n)+' of')
def preset(page,name):
 page.locator('#preset').select_option(name);expect(page.locator('#download-observation')).to_be_disabled();page.locator('#apply').click()
def stat(page,label):
 return page.locator('#stats .stat').filter(has=page.locator('dt').filter(has_text=re.compile('^'+re.escape(label)+').locator('dd').inner_text()
started=time.monotonic()
with sync_playwright() as pw:
 browser=None
 try:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',headless=True)
  context=browser.new_context(viewport={'width':1365,'height':1000},accept_downloads=True)
  context.route('**/*',lambda route: route.abort() if route.request.url.startswith(('http://','https://')) else route.continue_())
  context.on('request',lambda req:requests.append(req.url) if req.url.startswith(('http://','https://')) else None)
  page=context.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_default_timeout(8000);page.set_default_navigation_timeout(30000)
  page.goto((SRC/'courses/diffusion-stencil-lab.html').as_uri())
  expect(page.locator('#status')).to_contain_text('Applied.')
  assert page.locator('#values tbody tr').count()==8
  assert stat(page,'Sum')=='8' and stat(page,'Mean')=='1'
  assert page.locator('#contributions').is_hidden()
  assert page.locator('#history tbody tr').count()==9
  done('default pulse accepted with exact initial metrics and complete history')
  row_to(page,1);page.locator('#cell').select_option('7')
  expect(page.locator('#contribution-summary')).to_have_text('Step 1, cell 7: 0 + 0 + 2 = 2.')
  assert page.locator('#contributions tbody tr').nth(2).locator('td').all_text_contents()==['Right','0','8','1/4','2']
  assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='4'
  done('actual keyboard row and cell selection show simultaneous wraparound old values')
  page.screenshot(path=str(OUT/'lab-desktop.png'),full_page=True)
  before=page.locator('#applied-summary').inner_text()
  page.locator('#numerator').fill('1.5')
  expect(page.locator('#download-observation')).to_be_disabled()
  assert page.locator('#inspect-controls').is_disabled()
  page.locator('#apply').click();expect(page.locator('#status')).to_contain_text('Not applied')
  assert page.locator('#applied-summary').inner_text()==before
  course=download(page,'#download-course','diffusion-stencil.json')
  guide=download(page,'#download-guide','diffusion-stencil.md')
  assert course.read_bytes()==(SRC/'courses/diffusion-stencil.json').read_bytes()
  assert guide.read_bytes()==(SRC/'courses/diffusion-stencil.md').read_bytes()
  done('invalid draft preserves accepted output and retires observation; fixed downloads remain byte exact')
  page.locator('#numerator').fill('1');page.locator('#numerator').press('Enter')
  expect(page.locator('#status')).to_contain_text('Applied.')
  expect(page.locator('#download-observation')).to_be_enabled()
  assert not page.locator('#inspect-controls').is_disabled()
  done('Enter applies complete repaired numeric snapshot without blur retirement')
  preset(page,'boundary');row_to(page,1)
  assert stat(page,'Squared deviations from mean')=='8'
  assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='-1'
  row_to(page,2);assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='1'
  assert stat(page,'Squared deviations from mean')=='8'
  done('boundary alternating pattern flips twice without damping')
  preset(page,'growing');row_to(page,3)
  assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='-8'
  assert stat(page,'Sum')=='0' and stat(page,'Squared deviations from mean')=='512'
  expect(page.locator('#regime')).to_contain_text('Negative center weight')
  observation=download(page,'#download-observation','diffusion-observation.json')
  obs=json.loads(observation.read_text())
  assert obs['selected']=={'step':3,'cell':0}
  assert obs['experiment']['input']=={'values':[1,-1,1,-1,1,-1,1,-1],'numerator':3,'denominator':4,'steps':8}
  assert len(obs['experiment']['rows'])==9 and obs['experiment']['rows'][3]['values'][0]=={'numerator':'-8','denominator':'1'}
  done('growing mode conserves sum and complete observation captures exact applied identity',{'observationSHA256':hashlib.sha256(observation.read_bytes()).hexdigest()})
  for j,v in enumerate([-2,6,0,0,0,0,0,0]):page.locator('#initial-'+str(j)).fill(str(v))
  page.locator('#numerator').fill('7');page.locator('#denominator').fill('13');page.locator('#steps').fill('24');page.locator('#apply').click()
  row_to(page,24);assert stat(page,'Mean')=='1/2' and stat(page,'Sum')=='4'
  page.set_viewport_size({'width':390,'height':844})
  dims=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,svg:document.querySelector("#plot").getBoundingClientRect().width})')
  assert dims['scroll']<=dims['width'],dims
  page.locator('#history').locator('xpath=..').locator('xpath=..').locator('summary').click()
  page.screenshot(path=str(OUT/'lab-phone.png'),full_page=True)
  assert page.locator('#history').evaluate('(x)=>x.parentElement.scrollWidth>x.parentElement.clientWidth')
  done('signed maximum horizon remains exact and 390px layout confines long history to local scrolling',dims)
  assert page.evaluate('localStorage.length===0 && sessionStorage.length===0')
  assert errors==[] and requests==[]
  done('offline lab has no network requests, stored state or page errors')
  # Actual unchanged learner, consuming the real downloaded course.
  deck=json.loads(course.read_text());blindpath=ROOT/'evidence/peer-mac/blind-answers.json'
  blind=json.loads(blindpath.read_text());answers={x['id']:x['answerIndex'] for x in blind}
  assert len(answers)==len(deck['items'])==12
  assert all(answers[x['id']]==x['answer'] for x in deck['items'])
  prompts={x['prompt']:x for x in deck['items']};deliberate=deck['items'][0]['id']
  page.set_viewport_size({'width':1365,'height':1000});page.goto((SRC/'demo.html').as_uri())
  old=page.locator('#step-count').inner_text();page.locator('#deck-file').set_input_files(str(course))
  expect(page.locator('#deck-preview')).to_be_visible()
  expect(page.locator('#deck-preview-title')).to_have_text(deck['title'])
  assert page.locator('#deck-preview .deck-questions li').count()==12
  assert page.locator('#step-count').inner_text()==old
  page.locator('#start-deck').focus();page.locator('#start-deck').press('Enter')
  expect(page.locator('.question-card h2')).to_be_visible()
  done('actual downloaded lesson previews12 and Start this deck directly begins unchanged learner')
  seen=[];missed=None
  for i in range(12):
   prompt=page.locator('.question-card h2').inner_text();q=prompts[prompt];assert q['id'] not in seen
   choice=(answers[q['id']]+1)%4 if q['id']==deliberate else answers[q['id']]
   button=page.locator('[data-choice="'+str(choice)+'"]');assert q['options'][choice] in button.inner_text()
   button.focus();button.press('Enter');text=page.locator('#feedback-slot').inner_text()
   assert q['explanation'] in text and q['transfer'] in text and q['options'][answers[q['id']]] in text
   seen.append(q['id'])
   if q['id']==deliberate:missed=q
   page.locator('#next-button').focus();page.locator('#next-button').press('Enter')
  expect(page.locator('#first-try-summary')).to_contain_text('11 of 12')
  assert page.locator('.review-item').count()==12
  detail=page.locator('.review-item').nth(seen.index(deliberate));detail.locator('summary').click()
  note='Conservation is one constraint; the alternating component can grow. <literal note>'
  application='At r=1/2, the alternating amplitude stays fixed while its sign flips.'
  page.locator('[data-reflection-item="'+deliberate+'"]').fill(note)
  page.locator('#application-reflection').fill(application)
  summary=page.locator('#first-try-summary').inner_text();mastery=page.locator('.mastery-box output').all_text_contents()
  page.locator('#practice-button').click();expect(page.locator('.practice-card h2')).to_have_text(missed['prompt'])
  page.locator('[data-practice-choice="'+str(answers[deliberate])+'"]').click();page.locator('#practice-next').click()
  expect(page.locator('#practice-status')).to_contain_text('1 of 1 correctly on retry')
  assert page.locator('#first-try-summary').inner_text()==summary
  assert page.locator('.mastery-box output').all_text_contents()==mastery
  assert page.locator('[data-reflection-item="'+deliberate+'"]').input_value()==note
  done('all12 blind-key questions, one deliberate miss, exact feedback and separate retry preserve first answers and notes',{'order':seen,'blindSHA256':hashlib.sha256(blindpath.read_bytes()).hexdigest()})
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/'learner-phone.png'),full_page=True)
  with page.expect_download() as got:page.locator('#save-notes-button').click()
  nd=got.value;np=DOWNLOADS/nd.suggested_filename;nd.save_as(str(np));nt=np.read_text(encoding='utf-8')
  assert note in nt and application in nt and '11 of 12 connections correct on the first try.' in nt and 'correct on retry' in nt
  for q in deck['items']:assert q['prompt'] in nt and q['explanation'] in nt and q['transfer'] in nt
  done('actual downloaded study notes retain full lesson, original reflection and separate retry at phone width',{'notes':np.name,'sha256':hashlib.sha256(np.read_bytes()).hexdigest()})
  assert errors==[] and requests==[]
  assert page.evaluate('localStorage.length===0 && sessionStorage.length===0')
  receipt['passed']=True;receipt['browser']=browser.version;receipt['downloads']=downloads
 except BaseException as exc:
  receipt['error']=str(exc);receipt['traceback']=traceback.format_exc()
  if browser:
   try: page.screenshot(path=str(OUT/'failure.png'),full_page=True);(OUT/'failure.html').write_text(page.content(),encoding='utf-8')
   except Exception as e:receipt['failure_capture_error']=str(e)
  print(traceback.format_exc(),flush=True)
 finally:
  if browser:
   try:browser.close()
   except Exception as e:receipt['close_error']=str(e)
  receipt['source_after']={p:hashlib.sha256((SRC/p).read_bytes()).hexdigest() for p in pins}
  receipt['source_unchanged']=receipt['source_after']==pins
  receipt['duration']=time.monotonic()-started;save()
  print(json.dumps({'passed':receipt['passed'],'checks':len(checks),'error':receipt.get('error'),'source_unchanged':receipt['source_unchanged']}),flush=True)
raise SystemExit(0 if receipt['passed'] and receipt['source_unchanged'] else 1)
))).locator('dd').inner_text()
started=time.monotonic()
with sync_playwright() as pw:
 browser=None
 try:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',headless=True)
  context=browser.new_context(viewport={'width':1365,'height':1000},accept_downloads=True)
  context.route('**/*',lambda route: route.abort() if route.request.url.startswith(('http://','https://')) else route.continue_())
  context.on('request',lambda req:requests.append(req.url) if req.url.startswith(('http://','https://')) else None)
  page=context.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_default_timeout(8000);page.set_default_navigation_timeout(30000)
  page.goto((SRC/'courses/diffusion-stencil-lab.html').as_uri())
  expect(page.locator('#status')).to_contain_text('Applied.')
  assert page.locator('#values tbody tr').count()==8
  assert stat(page,'Sum')=='8' and stat(page,'Mean')=='1'
  assert page.locator('#contributions').is_hidden()
  assert page.locator('#history tbody tr').count()==9
  done('default pulse accepted with exact initial metrics and complete history')
  row_to(page,1);page.locator('#cell').select_option('7')
  expect(page.locator('#contribution-summary')).to_have_text('Step 1, cell 7: 0 + 0 + 2 = 2.')
  assert page.locator('#contributions tbody tr').nth(2).all_text_contents()==['Right0821/42'] if False else True
  assert page.locator('#contributions tbody tr').nth(2).locator('td').all_text_contents()==['Right','0','8','1/4','2']
  assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='4'
  done('actual keyboard row and cell selection show simultaneous wraparound old values')
  page.screenshot(path=str(OUT/'lab-desktop.png'),full_page=True)
  before=page.locator('#applied-summary').inner_text()
  page.locator('#numerator').fill('1.5')
  expect(page.locator('#download-observation')).to_be_disabled()
  assert page.locator('#inspect-controls').is_disabled()
  page.locator('#apply').click();expect(page.locator('#status')).to_contain_text('Not applied')
  assert page.locator('#applied-summary').inner_text()==before
  course=download(page,'#download-course','diffusion-stencil.json')
  guide=download(page,'#download-guide','diffusion-stencil.md')
  assert course.read_bytes()==(SRC/'courses/diffusion-stencil.json').read_bytes()
  assert guide.read_bytes()==(SRC/'courses/diffusion-stencil.md').read_bytes()
  done('invalid draft preserves accepted output and retires observation; fixed downloads remain byte exact')
  page.locator('#numerator').fill('1');page.locator('#numerator').press('Enter')
  expect(page.locator('#status')).to_contain_text('Applied.')
  expect(page.locator('#download-observation')).to_be_enabled()
  assert not page.locator('#inspect-controls').is_disabled()
  done('Enter applies complete repaired numeric snapshot without blur retirement')
  preset(page,'boundary');row_to(page,1)
  assert stat(page,'Squared deviations from mean')=='8'
  assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='-1'
  row_to(page,2);assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='1'
  assert stat(page,'Squared deviations from mean')=='8'
  done('boundary alternating pattern flips twice without damping')
  preset(page,'growing');row_to(page,3)
  assert page.locator('#values tbody tr').nth(0).locator('td').nth(1).inner_text()=='-8'
  assert stat(page,'Sum')=='0' and stat(page,'Squared deviations from mean')=='512'
  expect(page.locator('#regime')).to_contain_text('Negative center weight')
  observation=download(page,'#download-observation','diffusion-observation.json')
  obs=json.loads(observation.read_text())
  assert obs['selected']=={'step':3,'cell':0}
  assert obs['experiment']['input']=={'values':[1,-1,1,-1,1,-1,1,-1],'numerator':3,'denominator':4,'steps':8}
  assert len(obs['experiment']['rows'])==9 and obs['experiment']['rows'][3]['values'][0]=={'numerator':'-8','denominator':'1'}
  done('growing mode conserves sum and complete observation captures exact applied identity',{'observationSHA256':hashlib.sha256(observation.read_bytes()).hexdigest()})
  for j,v in enumerate([-2,6,0,0,0,0,0,0]):page.locator('#initial-'+str(j)).fill(str(v))
  page.locator('#numerator').fill('7');page.locator('#denominator').fill('13');page.locator('#steps').fill('24');page.locator('#apply').click()
  row_to(page,24);assert stat(page,'Mean')=='1/2' and stat(page,'Sum')=='4'
  page.set_viewport_size({'width':390,'height':844})
  dims=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,svg:document.querySelector("#plot").getBoundingClientRect().width})')
  assert dims['scroll']<=dims['width'],dims
  page.locator('#history').locator('xpath=..').locator('xpath=..').locator('summary').click()
  page.screenshot(path=str(OUT/'lab-phone.png'),full_page=True)
  assert page.locator('#history').evaluate('(x)=>x.parentElement.scrollWidth>x.parentElement.clientWidth')
  done('signed maximum horizon remains exact and 390px layout confines long history to local scrolling',dims)
  assert page.evaluate('localStorage.length===0 && sessionStorage.length===0')
  assert errors==[] and requests==[]
  done('offline lab has no network requests, stored state or page errors')
  # Actual unchanged learner, consuming the real downloaded course.
  deck=json.loads(course.read_text());blindpath=ROOT/'evidence/peer-mac/blind-answers.json'
  blind=json.loads(blindpath.read_text());answers={x['id']:x['answerIndex'] for x in blind}
  assert len(answers)==len(deck['items'])==12
  assert all(answers[x['id']]==x['answer'] for x in deck['items'])
  prompts={x['prompt']:x for x in deck['items']};deliberate=deck['items'][0]['id']
  page.set_viewport_size({'width':1365,'height':1000});page.goto((SRC/'demo.html').as_uri())
  old=page.locator('#step-count').inner_text();page.locator('#deck-file').set_input_files(str(course))
  expect(page.locator('#deck-preview')).to_be_visible()
  expect(page.locator('#deck-preview-title')).to_have_text(deck['title'])
  assert page.locator('#deck-preview .deck-questions li').count()==12
  assert page.locator('#step-count').inner_text()==old
  page.locator('#start-deck').focus();page.locator('#start-deck').press('Enter')
  expect(page.locator('.question-card h2')).to_be_visible()
  done('actual downloaded lesson previews12 and Start this deck directly begins unchanged learner')
  seen=[];missed=None
  for i in range(12):
   prompt=page.locator('.question-card h2').inner_text();q=prompts[prompt];assert q['id'] not in seen
   choice=(answers[q['id']]+1)%4 if q['id']==deliberate else answers[q['id']]
   button=page.locator('[data-choice="'+str(choice)+'"]');assert q['options'][choice] in button.inner_text()
   button.focus();button.press('Enter');text=page.locator('#feedback-slot').inner_text()
   assert q['explanation'] in text and q['transfer'] in text and q['options'][answers[q['id']]] in text
   seen.append(q['id'])
   if q['id']==deliberate:missed=q
   page.locator('#next-button').focus();page.locator('#next-button').press('Enter')
  expect(page.locator('#first-try-summary')).to_contain_text('11 of 12')
  assert page.locator('.review-item').count()==12
  detail=page.locator('.review-item').nth(seen.index(deliberate));detail.locator('summary').click()
  note='Conservation is one constraint; the alternating component can grow. <literal note>'
  application='At r=1/2, the alternating amplitude stays fixed while its sign flips.'
  page.locator('[data-reflection-item="'+deliberate+'"]').fill(note)
  page.locator('#application-reflection').fill(application)
  summary=page.locator('#first-try-summary').inner_text();mastery=page.locator('.mastery-box output').all_text_contents()
  page.locator('#practice-button').click();expect(page.locator('.practice-card h2')).to_have_text(missed['prompt'])
  page.locator('[data-practice-choice="'+str(answers[deliberate])+'"]').click();page.locator('#practice-next').click()
  expect(page.locator('#practice-status')).to_contain_text('1 of 1 correctly on retry')
  assert page.locator('#first-try-summary').inner_text()==summary
  assert page.locator('.mastery-box output').all_text_contents()==mastery
  assert page.locator('[data-reflection-item="'+deliberate+'"]').input_value()==note
  done('all12 blind-key questions, one deliberate miss, exact feedback and separate retry preserve first answers and notes',{'order':seen,'blindSHA256':hashlib.sha256(blindpath.read_bytes()).hexdigest()})
  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/'learner-phone.png'),full_page=True)
  with page.expect_download() as got:page.locator('#save-notes-button').click()
  nd=got.value;np=DOWNLOADS/nd.suggested_filename;nd.save_as(str(np));nt=np.read_text(encoding='utf-8')
  assert note in nt and application in nt and '11 of 12 connections correct on the first try.' in nt and 'correct on retry' in nt
  for q in deck['items']:assert q['prompt'] in nt and q['explanation'] in nt and q['transfer'] in nt
  done('actual downloaded study notes retain full lesson, original reflection and separate retry at phone width',{'notes':np.name,'sha256':hashlib.sha256(np.read_bytes()).hexdigest()})
  assert errors==[] and requests==[]
  assert page.evaluate('localStorage.length===0 && sessionStorage.length===0')
  receipt['passed']=True;receipt['browser']=browser.version;receipt['downloads']=downloads
 except BaseException as exc:
  receipt['error']=str(exc);receipt['traceback']=traceback.format_exc()
  if browser:
   try: page.screenshot(path=str(OUT/'failure.png'),full_page=True);(OUT/'failure.html').write_text(page.content(),encoding='utf-8')
   except Exception as e:receipt['failure_capture_error']=str(e)
  print(traceback.format_exc(),flush=True)
 finally:
  if browser:
   try:browser.close()
   except Exception as e:receipt['close_error']=str(e)
  receipt['source_after']={p:hashlib.sha256((SRC/p).read_bytes()).hexdigest() for p in pins}
  receipt['source_unchanged']=receipt['source_after']==pins
  receipt['duration']=time.monotonic()-started;save()
  print(json.dumps({'passed':receipt['passed'],'checks':len(checks),'error':receipt.get('error'),'source_unchanged':receipt['source_unchanged']}),flush=True)
raise SystemExit(0 if receipt['passed'] and receipt['source_unchanged'] else 1)
