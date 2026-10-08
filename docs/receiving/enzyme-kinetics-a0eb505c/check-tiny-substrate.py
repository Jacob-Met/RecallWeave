#!/usr/bin/env python3
"""Focused receiving of the positive-subnormal rate-fraction correction."""
import argparse, csv, hashlib, json, os, pathlib, time, traceback
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
def values(page, quantity):
    return page.locator('#comparison-table [data-quantity="' + quantity + '"]').all_text_contents()
result = {"schema":"enzyme-subnormal-browser-v1",
          "page_sha256":sha(source/"courses/enzyme-kinetics-lab.html"),
          "model_sha256":sha(source/"src/enzyme-kinetics.mjs"),
          "driver_sha256":sha(pathlib.Path(__file__)),
          "checks":checks,"external_requests":requests,"page_errors":errors,
          "uid":os.getuid(),"network_namespace":os.readlink("/proc/self/ns/net")}
started = time.time()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        result["browser_version"] = browser.version
        context = browser.new_context(viewport={"width":1320,"height":1000},
                                      service_workers="block",accept_downloads=True)
        context.set_offline(True)
        def route(r):
            if r.request.url.startswith(("http:","https:","ws:","wss:")):
                requests.append(r.request.method)
                r.abort()
            else:
                r.continue_()
        context.route("**/*",route)
        try:
            page = context.new_page()
            page.on("pageerror",lambda error:errors.append(str(error)))
            page.goto((source/"courses/enzyme-kinetics-lab.html").as_uri())
            expect(page.locator("#results")).to_be_visible()
            page.locator("#inhibitor-ratio").fill("3")
            page.locator("#substrate").fill("5e-324")
            fractions = values(page,"relativeRate")
            rates = values(page,"rate")
            check("positive subnormal input displays analytic fractions and positive rates",
                  fractions == ["100%","25%","25%"] and all(float(rate)>0 for rate in rates)
                  and page.locator("#zero-note").is_hidden(),
                  {"substrate":page.locator("#substrate").input_value(),"fractions":fractions,"rates":rates})
            with page.expect_download() as download:
                page.locator("#download-comparison").click()
            target = out/"actual-subnormal-comparison.csv"
            download.value.save_as(str(target))
            with target.open(newline="") as stream:
                rows = list(csv.DictReader(stream))
            current = rows[:3]
            check("the actual downloaded CSV retains the admitted substrate and corrected fractions",
                  len(rows)==390 and all(row["row_type"]=="current" for row in current)
                  and all(row["substrate_concentration_units"]=="5e-324" for row in current)
                  and [float(row["rate_fraction_of_uninhibited"]) for row in current]==[1,.25,.25]
                  and all(float(row["initial_rate_product_units_per_min"])>0 for row in current),
                  {"rows":len(rows),"current":current,"sha256":sha(target)})
            page.locator("#substrate").fill("0")
            check("exact zero remains undefined rather than adopting the positive-input limit",
                  values(page,"relativeRate")==["Undefined"]*3 and values(page,"rate")==["0"]*3
                  and page.locator("#zero-note").is_visible())
            page.locator("#substrate").fill("4")
            check("the lesson example recovers its independently worked values",
                  values(page,"rate")==["8","5","2"]
                  and values(page,"relativeRate")==["100%","62.5%","25%"])
            page.wait_for_function("document.querySelector('#kinetics-plot').viewBox.baseVal.width === Math.round(document.querySelector('#plot-wrap').clientWidth)")
            page.screenshot(path=str(out/"01-final-desktop-s4.png"),full_page=True)
            check("the rebuilt page has no page errors or external requests",not errors and not requests)
        finally:
            context.close()
            browser.close()
            result["private_browser_closed"] = True
except BaseException as error:
    result["exception"]={"type":type(error).__name__,"message":str(error),"traceback":traceback.format_exc()}
    result["passed"]=False
finally:
    result.setdefault("passed",all(item["passed"] for item in checks) and not requests and not errors)
    result["seconds"]=round(time.time()-started,4)
    result["files"]=[{"path":path.name,"bytes":path.stat().st_size,"sha256":sha(path)}
                     for path in sorted(out.iterdir()) if path.is_file()]
    raw=(json.dumps(result,indent=2)+"\n").encode()
    (out/"result.json").write_bytes(raw)
    print(json.dumps({"passed":result["passed"],"checks":len(checks),"seconds":result["seconds"],
                      "receipt":str(out/"result.json"),"sha256":hashlib.sha256(raw).hexdigest(),
                      "exception":result.get("exception")}))
if not result["passed"]:
    raise SystemExit(1)
