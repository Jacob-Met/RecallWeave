from pathlib import Path
import json,hashlib,datetime,traceback
from playwright.sync_api import sync_playwright
R=Path('D:/HAMON/recallweave-interpolation-explorer-5f566b5ec8ef')
S=R/'source';O=R/'evidence/visual-final';O.mkdir(exist_ok=False)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
names=['src/polynomial-interpolation-ui.mjs','templates/polynomial-interpolation-explorer.html','courses/polynomial-interpolation-explorer.html','docs/polynomial-interpolation-explorer.md']
before={p:sha(S/p) for p in names};assert before[names[2]]=='e01889801311cc21ffa3899866f451112994df6e0b391cae0932391986d65dff'
r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':before,'scope':'Only final instructional spacing visual receiving; no repeat of the original 22 interaction/course controls.','errors':[],'external':[]}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless=True,args=['--no-first-run','--no-default-browser-check'])
  c=b.new_context(viewport={'width':1360,'height':960});page=c.new_page()
  def guard(route):
   if route.request.url.startswith(('https://','http://')):r['external'].append(route.request.url);route.abort()
   else:route.continue_()
  c.route('**/*',guard);page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.goto((S/names[2]).as_uri(),wait_until='load')
  page.get_by_role('button',name='Apply experiment',exact=True).click()
  assert page.locator('#results').is_visible()
  page.screenshot(path=str(O/'desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  r['phoneLayout']=page.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})')
  assert r['phoneLayout']=={'viewport':390,'width':390}
  page.screenshot(path=str(O/'phone.png'),full_page=True)
  assert not r['errors'] and not r['external']
  c.close();b.close()
 r['exit']=0
except Exception:r['exit']=1;r['failure']=traceback.format_exc()
finally:
 r['sourceUnchanged']={p:sha(S/p) for p in names}==before
 r['artifacts']=[{'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(O.glob('*.png'))]
 (O/'receipt.json').write_bytes((json.dumps(r,indent=2)+'\n').encode('utf-8'))
 print(json.dumps(r));raise SystemExit(r['exit'])
