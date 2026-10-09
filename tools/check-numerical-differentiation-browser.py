"""Actual isolated Chrome receiving. No installs, network or personal browser profile."""
from pathlib import Path
import argparse,json,hashlib,datetime,traceback
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--output',required=True);p.add_argument('--browser',required=True);p.add_argument('--learner-only',action='store_true');p.add_argument('--course');a=p.parse_args()
root=Path(a.root).resolve();out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=False)
checks=[];errors=[];external=[];downloads=[]
def sha(b):return hashlib.sha256(b).hexdigest()
def pins():
 return {str(x.relative_to(root)).replace('\\','/'):sha(x.read_bytes()) for x in root.rglob('*') if x.is_file() and '.git' not in x.parts}
before=pins();receipt={'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'root':str(root),'browser':a.browser,'source':before,'checks':checks,'errors':errors,'externalRequests':external,'downloads':downloads}
def check(name,condition,detail=None):
 assert condition,(name,detail)
 checks.append({'name':name,'detail':detail})
def save_download(page,selector,name):
 with page.expect_download() as event:page.locator(selector).click()
 d=event.value;target=out/name;d.save_as(target)
 b=target.read_bytes();downloads.append({'control':selector,'suggestedFilename':d.suggested_filename,'path':name,'size':len(b),'sha256':sha(b)});return b
def overflow(page):
 return page.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=a.browser,headless=True,args=['--no-first-run','--no-default-browser-check'])
  context=browser.new_context(viewport={'width':1360,'height':960},accept_downloads=True)
  def request_guard(route):
   u=route.request.url
   if u.startswith(('http://','https://')):external.append(u);route.abort()
   else:route.continue_()
  context.route('**/*',request_guard)
  page=context.new_page();page.set_default_timeout(12000)
  page.on('pageerror',lambda err:errors.append(str(err)))
  if a.learner_only:
   if not a.course:raise ValueError('--learner-only needs the retained actual --course download.')
   course=Path(a.course).read_bytes()
   check('retained downloaded course still equals authored bytes',course==(root/'courses/numerical-differentiation.json').read_bytes())
  else:
   page.goto((root/'courses/numerical-differentiation-lab.html').as_uri(),wait_until='load')
   check('default exact quadratic',page.locator('.metrics strong').all_text_contents()==['2','2','0'])
   check('central secant is parallel and distinct from tangent',page.locator('svg').evaluate("""svg=>{const lines=[...svg.querySelectorAll('line')];const tangent=lines[1],secant=lines[2];return Math.abs((+tangent.getAttribute('y2')-+tangent.getAttribute('y1'))-(+secant.getAttribute('y2')-+secant.getAttribute('y1')))<1e-8 && +secant.getAttribute('y1')<+tangent.getAttribute('y1');}"""))
   page.screenshot(path=str(out/'lab-desktop.png'),full_page=True)
   page.locator('#method').focus();page.keyboard.press('ArrowUp')
   check('keyboard method inspection',page.locator('.metrics strong').all_text_contents()==['2','3/2','-1/2'])
   record=json.loads(save_download(page,'#save-record','worked-backward.json'))
   check('complete actual worked download',record['inspectedMethod']=='backward' and len(record['report']['levels'])==6 and record['report']['levels'][1]['methods']['backward']['estimate']['fraction']=='3/2')
   page.locator('#c2').fill('2')
   check('input immediately retires output and export',page.locator('#results').is_hidden() and page.locator('#save-record').is_disabled())
   page.locator('#c2').press('Enter');page.locator('#method').focus()
   check('Enter apply survives input blur',page.locator('.metrics strong').all_text_contents()==['4','3','-1'] and page.locator('#save-record').is_enabled())
   page.locator('#point').fill('6');page.get_by_role('button',name='Calculate',exact=True).click()
   check('invalid draft is retained without stale report',page.locator('#point').input_value()=='6' and page.locator('#results').is_hidden() and 'Evaluation point' in page.locator('#status').inner_text() and page.locator('#save-record').is_disabled())
   page.locator('#preset').select_option('cancellation')
   check('preset fills draft without applying',page.locator('#results').is_hidden() and page.locator('#c3').input_value()=='-1')
   page.get_by_role('button',name='Calculate',exact=True).click();page.locator('#method').select_option('forward')
   check('coarse exact cancellation',page.locator('.metrics strong').all_text_contents()==['0','0','0'])
   page.locator('#step').select_option('2')
   check('step edit retires admitted result',page.locator('#results').is_hidden() and page.locator('#save-record').is_disabled())
   page.get_by_role('button',name='Calculate',exact=True).click()
   check('smaller step leaves accidental exactness',page.locator('.metrics strong').all_text_contents()==['0','1/4','1/4'])
   page.locator('#method').select_option('central')
   check('central signed error stays distinct from magnitude',page.locator('.metrics strong').all_text_contents()==['0','-1/4','-1/4'] and 'Absolute error: 1/4' in page.locator('.outcome').inner_text())
   for i in range(6):page.locator('#c'+str(i)).fill(str(9 if i%2==0 else -9))
   page.locator('#point').fill('5');page.locator('#step').select_option('32');page.get_by_role('button',name='Calculate',exact=True).click()
   page.set_viewport_size({'width':390,'height':844})
   layout=overflow(page);(out/'phone-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf8')
   check('extreme signed quintic phone layout',layout['width']==layout['viewport']==390 and page.locator('#results').is_visible(),layout)
   page.screenshot(path=str(out/'lab-phone-extreme.png'),full_page=True)
   page.locator('#preset').select_option('quadratic');page.get_by_role('button',name='Calculate',exact=True).click()
   page.screenshot(path=str(out/'lab-phone.png'),full_page=True)
   course=save_download(page,'#save-course','numerical-differentiation.json')
   guide=save_download(page,'#save-guide','numerical-differentiation.md')
   check('course and guide downloads match authored bytes',course==(root/'courses/numerical-differentiation.json').read_bytes() and guide==(root/'courses/numerical-differentiation.md').read_bytes())
  deck=json.loads(course);questions={q['prompt']:q for q in deck['items']}
  page.set_viewport_size({'width':390,'height':844})
  page.goto((root/'demo.html').as_uri(),wait_until='load')
  page.locator('#deck-file').set_input_files(a.course if a.learner_only else str(out/'numerical-differentiation.json'))
  page.locator('#start-deck').click()
  check('actual downloaded course imports',page.locator('#lesson-description').inner_text()==deck['title'] and page.title()==deck['title']+' — RecallWeave')
  seen=[];wrong=[]
  for i in range(12):
   prompt=page.locator('#session-content h2').inner_text();q=questions[prompt]
   assert q['id'] not in seen;seen.append(q['id'])
   choice=(q['answer']+1)%len(q['options']) if i%2==0 else q['answer']
   if i%2==0:wrong.append(q['id'])
   page.locator('[data-choice="'+str(choice)+'"]').click()
   assert q['explanation'] in page.locator('#feedback-slot').inner_text()
   assert q['transfer'] in page.locator('#feedback-slot').inner_text()
   page.locator('#next-button').click()
  first=page.locator('#first-try-summary').inner_text()
  check('twelve actual first answers with six misses',len(seen)==12 and '6 of 12' in first,seen)
  page.locator('#application-reflection').fill('Exact secant slope need not mean the secant is the tangent.')
  detail=page.locator('details').filter(has=page.locator('[data-reflection-item]')).first
  detail.locator('summary').click()
  page.locator('[data-reflection-item]').first.fill('I will compare signed and absolute errors separately.')
  page.locator('#practice-button').click()
  retried=[]
  for i in range(6):
   prompt=page.locator('#session-content h2').inner_text();q=questions[prompt];retried.append(q['id'])
   page.locator('[data-practice-choice="'+str(q['answer'])+'"]').click();page.locator('#practice-next').click()
  check('retry preserves first record and order',retried==wrong and page.locator('#first-try-summary').inner_text()==first and '6 of 6 correctly on retry' in page.locator('#practice-status').inner_text(),retried)
  notes=save_download(page,'#save-notes-button','study-notes.txt').decode('utf8')
  check('actual study notes preserve course, first/retry and writing',deck['title'] in notes and '6 of 12 connections correct on the first try.' in notes and '6 of 6 practice answers recorded; 6 correct on retry.' in notes and 'Exact secant slope need not mean the secant is the tangent.' in notes and 'I will compare signed and absolute errors separately.' in notes and all(q['explanation'] in notes and q['transfer'] in notes for q in deck['items']))
  page.screenshot(path=str(out/'learner-phone.png'),full_page=True)
  check('no page errors or external request',not errors and not external)
  context.close();browser.close()
 receipt['exit']=0
except Exception:
 receipt['exit']=1;receipt['failure']=traceback.format_exc()
 try:page.screenshot(path=str(out/'failure.png'),full_page=True)
 except Exception:pass
finally:
 receipt['ended']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 receipt['sourceUnchanged']=pins()==before
 (out/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({'exit':receipt['exit'],'checks':len(checks),'sourceUnchanged':receipt['sourceUnchanged'],'failure':receipt.get('failure')}))
 raise SystemExit(receipt['exit'])
