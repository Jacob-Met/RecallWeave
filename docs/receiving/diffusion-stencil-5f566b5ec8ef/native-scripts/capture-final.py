from pathlib import Path
import json,hashlib
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parent;o=r/'evidence/visual-final';o.mkdir(exist_ok=False);p=r/'source/courses/diffusion-stencil-lab.html';before=hashlib.sha256(p.read_bytes()).hexdigest()
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless=True);c=b.new_context(viewport={'width':390,'height':844});c.route('**/*',lambda x:x.abort() if x.request.url.startswith(('http://','https://')) else x.continue_());a=c.new_page();a.goto(p.as_uri(),timeout=30000);a.screenshot(path=str(o/'default-phone.png'),full_page=True);a.screenshot(path=str(o/'default-phone-viewport.png'));d=a.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');b.close()
out={'purpose':'Additional default-phone visual capture only; not a repeated behavior gate','source_sha256':before,'source_unchanged':before==hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':d,'files':{x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in o.glob('*.png')}};(o/'receipt.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps(out))
