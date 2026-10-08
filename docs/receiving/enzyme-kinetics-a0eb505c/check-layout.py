#!/usr/bin/env python3
"""Focused receiving for the observed narrow unit-spacing correction."""
import argparse, hashlib, json, os, pathlib, time, traceback
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True, type=pathlib.Path)
parser.add_argument("--out", required=True, type=pathlib.Path)
args = parser.parse_args()
source, out = args.source.resolve(), args.out.resolve()
out.mkdir(parents=True, exist_ok=False)
checks, requests, errors = [], [], []
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def check(name, condition, detail=None):
    checks.append({"name":name, "passed":bool(condition), "detail":detail})
    if not condition:
        raise AssertionError(name + ": " + repr(detail))
result = {"schema":"enzyme-narrow-layout-v1","page_sha256":sha(source/"courses/enzyme-kinetics-lab.html"),
          "template_sha256":sha(source/"templates/enzyme-kinetics-lab.html"),
          "checks":checks,"external_requests":requests,"page_errors":errors,"uid":os.getuid(),
          "network_namespace":os.readlink("/proc/self/ns/net")}
started = time.time()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        result["browser_version"] = browser.version
        context = browser.new_context(viewport={"width":390,"height":844},service_workers="block")
        context.set_offline(True)
        def route(r):
            if r.request.url.startswith(("http:","https:","ws:","wss:")):
                requests.append(r.request.method)
                r.abort()
            else:
                r.continue_()
        context.route("**/*",route)
        page = context.new_page()
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.goto((source/"courses/enzyme-kinetics-lab.html").as_uri())
        expect(page.locator("#results")).to_be_visible()
        page.wait_for_function("document.querySelector('#kinetics-plot').viewBox.baseVal.width === Math.round(document.querySelector('#plot-wrap').clientWidth)")
        boxes = page.eval_on_selector_all(".constants dd", """nodes => nodes.map(dd => {
          const range = document.createRange(); range.selectNodeContents(dd.firstChild);
          const number = range.getBoundingClientRect(), unit = dd.querySelector('small').getBoundingClientRect();
          return {numberBottom:number.bottom,unitTop:unit.top,unitRight:unit.right,
                  containerRight:dd.getBoundingClientRect().right};
        })""")
        check("mobile fixed parameters show their unit labels on separate unclipped lines",
              all(box["unitTop"] >= box["numberBottom"] and box["unitRight"] <= box["containerRight"] + 1 for box in boxes),boxes)
        check("the changed page still has no horizontal document overflow",
              page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        page.locator("#explain-pure").check()
        page.screenshot(path=str(out/"01-narrow-final.png"),full_page=True)
        table = page.locator(".table-scroll")
        table.focus()
        before = table.evaluate("node => node.scrollLeft")
        for _ in range(20):
            page.keyboard.press("ArrowRight")
        page.wait_for_function("document.querySelector('.table-scroll').scrollLeft > 0")
        after = table.evaluate("node => ({left:node.scrollLeft,width:node.clientWidth,scroll:node.scrollWidth})")
        check("actual arrow-key input scrolls the focused comparison table horizontally",
              before == 0 and after["left"] > 0,after)
        table.screenshot(path=str(out/"02-table-keyboard-scroll.png"))
        check("actual pure-case values remain visible in the final DOM",
              page.locator('[data-model="pure_noncompetitive"] [data-quantity="rate"]').inner_text() == "1.25"
              and "25%" in page.locator("#explanation-text").inner_text())
        check("the focused layout check made no external request or page error",not requests and not errors)
        context.close()
        browser.close()
        result["private_browser_closed"] = True
except BaseException as error:
    result["exception"] = {"type":type(error).__name__,"message":str(error),"traceback":traceback.format_exc()}
    result["passed"] = False
finally:
    result.setdefault("passed",all(check["passed"] for check in checks) and not requests and not errors)
    result["seconds"] = round(time.time()-started,4)
    result["files"] = [{"path":p.name,"bytes":p.stat().st_size,"sha256":sha(p)} for p in sorted(out.iterdir()) if p.is_file()]
    raw = (json.dumps(result,indent=2)+"\n").encode()
    (out/"result.json").write_bytes(raw)
    print(json.dumps({"passed":result["passed"],"checks":len(checks),"seconds":result["seconds"],
                      "receipt":str(out/"result.json"),"sha256":hashlib.sha256(raw).hexdigest(),
                      "exception":result.get("exception")}))
if not result["passed"]:
    raise SystemExit(1)
