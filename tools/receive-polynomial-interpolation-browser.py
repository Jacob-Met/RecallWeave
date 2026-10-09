"""Receive only the new direct-open explorer and its actual downloaded lesson."""
from pathlib import Path
import argparse,json,hashlib,datetime,traceback
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--output',required=True);p.add_argument('--browser',required=True);a=p.parse_args()
root=Path(a.root).resolve();out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=False)
def sha(b):return hashlib.sha256(b).hexdigest()
def pins():return {x.relative_to(root).as_posix():sha(x.read_bytes()) for x in root.rglob('*') if x.is_file() and '.git' not in x.parts}
before=pins();checks=[];downloads=[];errors=[];external=[]
receipt={'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':before,'checks':checks,'downloads':downloads,'errors':errors,'externalRequests':external}
def check(name,condition,detail=None):
 assert condition,(name,detail)
 checks.append({'name':name,'detail':detail})
def save(page,selector,name):
 with page.expect_download() as event:page.locator(selector).click()
 download=event.value;target=out/name;download.save_as(target);b=target.read_bytes()
 downloads.append({'control':selector,'suggestedFilename':download.suggested_filename,'path':name,'bytes':len(b),'sha256':sha(b)})
 return b
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=a.browser,headless=True,args=['--no-first-run','--no-default-browser-check'])
  context=browser.new_context(viewport={'width':1360,'height':960},accept_downloads=True)
  def guard(route):
   url=route.request.url
   if url.startswith(('http://','https://')):external.append(url);route.abort()
   else:route.continue_()
  context.route('**/*',guard);page=context.new_page();page.set_default_timeout(15000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto((root/'courses/polynomial-interpolation-explorer.html').as_uri(),wait_until='load')
  check('initial selection remains an unapplied draft',page.locator('#samples fieldset').count()==3 and page.locator('#results').is_hidden() and page.locator('#download-observation').is_disabled() and page.locator('#download-course').is_enabled())
  page.get_by_role('textbox',name='Sample 3 y',exact=True).press('Enter');page.locator('#queries').focus()
  check('keyboard Apply survives blur and renders exact default forms',page.locator('#results').is_visible() and 'Actual polynomial degree: 2' in page.locator('#accepted').inner_text() and page.locator('#download-observation').is_enabled() and '1/4' in page.locator('#evaluations').inner_text() and 'Outside sample range' in page.locator('#evaluations').inner_text())
  page.screenshot(path=str(out/'explorer-desktop.png'),full_page=True)
  observation=json.loads(save(page,'#download-observation','observation-square.json'))
  original=json.loads((root.parent/'evidence/original-native.json').read_text(encoding='utf-8'))['modelReport']
  check('real observation download is the complete unchanged model report',observation==original,{'keys':list(observation),'input':observation['input']})
  page.get_by_role('textbox',name='Sample 1 x',exact=True).fill(' 2 ')
  check('one keystroke retires result and observation',page.locator('#results').is_hidden() and page.locator('#download-observation').is_disabled())
  page.get_by_role('textbox',name='Sample 1 x',exact=True).press('Enter')
  raw=json.loads(save(page,'#download-observation','observation-raw.json'))
  check('raw whitespace and unsorted authored order survive actual export',raw['input']['points'][0]['x']==' 2 ' and [n['x'] for n in raw['nodes']]==['2','0','1'] and raw['monomialCoefficients']==['0','0','1'])
  page.get_by_role('textbox',name='Sample 1 x',exact=True).fill('1/2');page.get_by_role('textbox',name='Sample 2 x',exact=True).fill('0.5');page.get_by_role('button',name='Apply experiment',exact=True).click()
  check('rationally duplicate nodes refuse and retain draft without stale download','duplicates' in page.locator('#status').inner_text() and page.get_by_role('textbox',name='Sample 2 x',exact=True).input_value()=='0.5' and page.locator('#results').is_hidden() and page.locator('#download-observation').is_disabled())
  course=save(page,'#download-course','polynomial-interpolation.json');guide=save(page,'#download-guide','polynomial-interpolation.md')
  check('exact accepted course and guide remain downloadable during invalid draft',course==(root/'courses/polynomial-interpolation.json').read_bytes() and guide==(root/'courses/polynomial-interpolation.md').read_bytes())
  page.locator('#preset').select_option('fraction')
  check('preset retires output but does not apply',page.locator('#results').is_hidden() and page.get_by_role('textbox',name='Sample 1 x',exact=True).input_value()=='-1/2')
  page.locator('#queries').fill('0\n\n1');page.get_by_role('button',name='Apply experiment',exact=True).click()
  check('inner blank query refuses without dropping an occurrence',page.locator('#results').is_hidden() and page.locator('#queries').input_value()=='0\n\n1' and page.locator('#download-observation').is_disabled())
  page.locator('#queries').fill('');page.get_by_role('button',name='Apply experiment',exact=True).click()
  no_queries=json.loads(save(page,'#download-observation','observation-no-queries.json'))
  check('blank optional query produces exact empty evaluation list',no_queries['evaluations']==[] and no_queries['input']['at']==[] and 'No query points' in page.locator('#evaluations').inner_text())
  page.locator('#preset').select_option('collapse');page.get_by_role('button',name='Apply experiment',exact=True).click()
  check('four supplied nodes correctly disclose actual lower degree','Actual polynomial degree: 1' in page.locator('#accepted').inner_text() and page.locator('#node-checks tbody tr').count()==4)
  page.locator('#preset').select_option('single');page.get_by_role('button',name='Apply experiment',exact=True).click()
  single=page.locator('#accepted').inner_text();page.locator('#preset').select_option('zero');page.get_by_role('button',name='Apply experiment',exact=True).click()
  check('nonzero constant and zero polynomial are visibly distinct','Actual polynomial degree: 0' in single and 'degree is undefined' in page.locator('#accepted').inner_text())
  for _ in range(5):page.locator('#add-sample').click()
  check('explicit row additions retire state and enforce eight-row UI bound',page.locator('#samples fieldset').count()==8 and page.locator('#add-sample').is_disabled() and page.locator('#results').is_hidden())
  for i in range(8):
   page.get_by_role('textbox',name=f'Sample {i+1} x',exact=True).fill(str(i-4))
   page.get_by_role('textbox',name=f'Sample {i+1} y',exact=True).fill(str((i-4)**2))
  page.locator('#queries').fill('\n'.join(str(i-8)for i in range(16)));page.get_by_role('button',name='Apply experiment',exact=True).click()
  maximum=json.loads(save(page,'#download-observation','observation-max.json'))
  check('complete max-row and max-query observation survives interface',len(maximum['nodes'])==8 and len(maximum['evaluations'])==16 and maximum['degree']==2 and sum(map(len,maximum['dividedDifferences']))==36)
  page.set_viewport_size({'width':390,'height':844});layout=page.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})')
  check('390px max-table layout contains the page and uses internal scroll',layout=={'viewport':390,'width':390},layout)
  page.screenshot(path=str(out/'explorer-phone-max.png'),full_page=True)
  page.get_by_role('button',name='Remove sample 2',exact=True).click()
  check('removing a sample retires report and relabels current order',page.locator('#samples fieldset').count()==7 and page.locator('#results').is_hidden() and page.get_by_role('textbox',name='Sample 2 x',exact=True).input_value()=='-2')
  page.locator('#preset').select_option('square');page.get_by_role('button',name='Apply experiment',exact=True).click()
  page.screenshot(path=str(out/'explorer-phone.png'),full_page=True)
  check('explorer uses no application storage',page.evaluate('localStorage.length')==0 and page.evaluate('sessionStorage.length')==0)
  deck=json.loads(course);questions={q['prompt']:q for q in deck['items']}
  page.goto((root/'demo.html').as_uri(),wait_until='load');page.locator('#deck-file').set_input_files(str(out/'polynomial-interpolation.json'))
  page.locator('#start-deck').click()
  check('actual downloaded original eighteen-question course imports',page.locator('#lesson-description').inner_text()==deck['title'] and page.title()==deck['title']+' — RecallWeave')
  seen=[];wrong=[]
  for i in range(18):
   prompt=page.locator('#session-content h2').inner_text();q=questions[prompt];assert q['id']not in seen;seen.append(q['id'])
   choice=(q['answer']+1)%len(q['options']) if i%2==0 else q['answer']
   if i%2==0:wrong.append(q['id'])
   page.locator('[data-choice="'+str(choice)+'"]').click()
   assert q['explanation'] in page.locator('#feedback-slot').inner_text() and q['transfer'] in page.locator('#feedback-slot').inner_text()
   page.locator('#next-button').click()
  first=page.locator('#first-try-summary').inner_text()
  check('all eighteen actual first answers preserve original feedback',len(seen)==18 and '9 of 18' in first,seen)
  page.locator('#application-reflection').fill('Exact node reproduction does not guarantee the unknown function between samples.')
  detail=page.locator('details').filter(has=page.locator('[data-reflection-item]')).first;detail.locator('summary').click()
  page.locator('[data-reflection-item]').first.fill('I will distinguish authored Newton order from the polynomial value.')
  page.locator('#practice-button').click();retried=[]
  for _ in range(9):
   prompt=page.locator('#session-content h2').inner_text();q=questions[prompt];retried.append(q['id'])
   page.locator('[data-practice-choice="'+str(q['answer'])+'"]').click();page.locator('#practice-next').click()
  check('nine missed questions retry in retained order without changing first record',retried==wrong and page.locator('#first-try-summary').inner_text()==first and '9 of 9 correctly on retry' in page.locator('#practice-status').inner_text())
  notes=save(page,'#save-notes-button','interpolation-study-notes.txt').decode('utf-8')
  check('downloaded notes preserve all original explanations and authored reflections',deck['title'] in notes and '9 of 18 connections correct on the first try.' in notes and '9 of 9 practice answers recorded; 9 correct on retry.' in notes and 'Exact node reproduction does not guarantee the unknown function between samples.' in notes and all(q['explanation'] in notes and q['transfer'] in notes for q in deck['items']))
  page.screenshot(path=str(out/'learner-phone.png'),full_page=True)
  check('no page errors or external requests',not errors and not external)
  context.close();browser.close()
 receipt['exit']=0
except Exception:
 receipt['exit']=1;receipt['failure']=traceback.format_exc()
 try:page.screenshot(path=str(out/'failure.png'),full_page=True)
 except Exception:pass
finally:
 receipt['ended']=datetime.datetime.now(datetime.timezone.utc).isoformat();receipt['sourceUnchanged']=pins()==before
 (out/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'exit':receipt['exit'],'checks':len(checks),'sourceUnchanged':receipt['sourceUnchanged'],'failure':receipt.get('failure')}))
 raise SystemExit(receipt['exit'])
