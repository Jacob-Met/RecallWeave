"""Offline browser receiver. Requires installed Python Playwright and a native Chromium browser.
Uses a new private profile, blocks external requests and preserves actual downloads and failures.
"""
from pathlib import Path
import datetime
import hashlib
import json
import os
import platform
import shutil
import sys
import traceback
from playwright.sync_api import sync_playwright

import argparse
parser=argparse.ArgumentParser(description="Receive the local quadrature lab and existing learner in a fresh native browser.")
parser.add_argument("--source",required=True)
parser.add_argument("--out",required=True)
parser.add_argument("--browser",required=True)
parser.add_argument("--phase",choices=["all","layout-learner"],default="all")
parser.add_argument("--prior-downloads")
args=parser.parse_args()
SOURCE=Path(args.source).resolve()
OUT=Path(args.out).resolve()
CHROME=Path(args.browser).resolve()

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def run_receiver(label, lab_phase):
    """Run one named phase once; retain first failure and actual process outcome."""
    out = OUT
    out.mkdir(parents=True,exist_ok=False)
    temp = out / "temp"
    temp.mkdir(exist_ok=False)
    os.environ["TEMP"] = str(temp)
    os.environ["TMP"] = str(temp)
    os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
    before = {drive: shutil.disk_usage(drive + ":/").free for drive in ("C", "D", "G")}
    assert before["D"] > 1024 ** 3 and before["C"] > 256 * 1024 ** 2
    requests, errors, downloads, checks = [], [], [], []
    context = None
    phase = None
    failure = None
    storage = []
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        with sync_playwright() as pw:
            context = pw.chromium.launch_persistent_context(
                user_data_dir=str(temp / "profile"),
                executable_path=str(CHROME), headless=True,
                accept_downloads=True, downloads_path=str(temp / "downloads"),
                viewport={"width": 1365, "height": 1000},
                service_workers="block",
                args=["--no-first-run", "--no-default-browser-check",
                      "--disk-cache-dir=" + str(temp / "cache")],
            )
            context.set_default_timeout(8000)
            context.set_default_navigation_timeout(30000)
            def network(route):
                url = route.request.url
                if url.startswith(("file:", "data:", "blob:")):
                    route.continue_()
                else:
                    requests.append({"url": url, "method": route.request.method})
                    route.abort()
            context.route("**/*", network)
            context.expose_binding("__peerRecordStorage", lambda source, entry: storage.append(entry))
            context.add_init_script("""
                globalThis.__peerStorageCalls = [];
                for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) {
                  const original = Storage.prototype[method];
                  Storage.prototype[method] = function(...args) {
                    const entry = {method, key: args[0] ?? null};
                    globalThis.__peerStorageCalls.push(entry);
                    void globalThis.__peerRecordStorage(entry);
                    return original.apply(this, args);
                  };
                }
                const originalOpen = IDBFactory.prototype.open;
                IDBFactory.prototype.open = function(...args) {
                  const entry = {method:"indexedDB.open",key:args[0]};
                  globalThis.__peerStorageCalls.push(entry);
                  void globalThis.__peerRecordStorage(entry);
                  return originalOpen.apply(this,args);
                };
            """)
            def observe_page(observed_page):
                observed_page.on("pageerror", lambda error: errors.append(str(error)))
                observed_page.on("download", lambda download: downloads.append(download.suggested_filename))
            context.on("page", observe_page)
            for observed_page in context.pages:
                observe_page(observed_page)
            page = context.pages[0] if context.pages else context.new_page()
            try:
                phase = lab_phase(page, context, out)
            except BaseException:
                try:
                    page.screenshot(path=str(out / "failure.png"), full_page=True)
                    (out / "failure-dom.html").write_text(page.content(), encoding="utf-8")
                except BaseException as capture_error:
                    print(json.dumps({"failureCaptureError":repr(capture_error)}),flush=True)
                raise
            assert requests == [], requests
            assert errors == [], errors
            assert storage == [], storage
            checks.append("No external request, page error or browser-storage call in the receiving phase")
            browser_version = context.browser.version if context.browser else None
            context.close()
            context = None
    except BaseException as exc:
        failure = {"class": type(exc).__name__, "message": str(exc),
                   "traceback": traceback.format_exc()}
        print(json.dumps({"phase": label, "passed": False, "failure": failure}), flush=True)
        if context:
            try:
                page.screenshot(path=str(out / "failure.png"), full_page=True)
                (out / "failure-dom.html").write_text(page.content(), encoding="utf-8")
                storage = page.evaluate("globalThis.__peerStorageCalls || []")
            except BaseException as capture_error:
                failure["captureError"] = repr(capture_error)
            try:
                context.close()
            except BaseException as close_error:
                failure["closeError"] = repr(close_error)
    result = {"schema":"recallweave.quadrature.browser-process.v1",
              "phase":label, "passed":failure is None, "failure":failure,
              "startedUTC":started, "finishedUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "python":sys.version, "platform":platform.platform(),
              "chrome":str(CHROME), "browserVersion":locals().get("browser_version"),
              "freeBytesBefore":before,
              "freeBytesAfter":{drive:shutil.disk_usage(drive + ":/").free for drive in ("C","D","G")},
              "externalRequests":requests, "pageErrors":errors,
              "storageCallsAcrossPages":storage, "downloadNames":downloads,
              "checks":checks, "phaseReceipt":phase, "requestedPhase":args.phase,
              "runnerSHA256":sha(__file__), "privateProfile":str(temp / "profile")}
    print(json.dumps({"processExit":0 if failure is None else 1,"phase":label,
                      "passed":failure is None,"externalRequests":len(requests),
                      "pageErrors":len(errors),"downloads":downloads}), flush=True)
    (out / "process-receipt.json").write_text(json.dumps(result,indent=2) + "\n",encoding="utf-8")
    return 0 if failure is None else 1


def receive(page, context, out):
    checks=[]
    def mark(name, **details):
        checks.append(dict(name=name,passed=True,**details))
        print(json.dumps(dict(passed=name)),flush=True)
    def download(selector, name):
        with page.expect_download() as event:
            page.locator(selector).click()
        result=event.value
        assert result.failure() is None
        target=out/name
        result.save_as(str(target))
        return target
    def preset(name):
        page.locator("#preset").select_option(name)
        page.locator("#apply-preset").click()
        assert page.locator("#results").is_visible()
    inputs={str(p.relative_to(SOURCE)):sha(p) for p in SOURCE.rglob("*") if p.is_file()}
    if args.phase=="all":
        page.goto((SOURCE/"courses/quadrature-lab.html").as_uri(),wait_until="load")
        assert page.locator("#results").is_hidden()
        assert page.locator("#download-observation").is_disabled()
        assert page.locator("#method").is_disabled()
        mark("Opening the local lab does not apply or save a calculation")
        page.locator("#apply").click()
        assert page.locator("#exact-integral").inner_text().startswith("8/3")
        cells=page.locator("#estimates tr").evaluate_all("(rows)=>rows.map(r=>Array.from(r.cells,c=>c.textContent))")
        assert [r[1:4] for r in cells]==[["5/2","-1/6","1/6"],["3","1/3","1/3"],["8/3","0","0"]]
        assert page.locator("#nodes tr").count()==2
        assert page.locator("#refinement tr").count()==5
        assert page.locator("#result-title").evaluate("(e)=>e===document.activeElement")
        mark("Applied quadratic shows the exact three estimates, signed errors and full refinement table")
        page.locator("#c0").fill("1")
        assert page.locator("#results").is_hidden()
        assert page.locator("#download-observation").is_disabled()
        page.locator("#c0").press("Enter")
        assert page.locator("#results").is_visible()
        assert page.locator("#exact-integral").inner_text().startswith("14/3")
        assert page.locator("#result-title").evaluate("(e)=>e===document.activeElement")
        page.locator("#method").select_option("simpson")
        assert page.locator("#results").is_visible()
        assert page.locator("#nodes tr").count()==3
        assert page.locator("#exact-integral").inner_text().startswith("14/3")
        mark("Actual keyboard submit survives input blur; method inspection keeps the applied polynomial")
        for selector,value in [("#c0","10"),("#c0","0.5"),("#lower",""),("#lower","2")]:
            preset("quadratic")
            page.locator(selector).fill(value)
            page.locator("#apply").click()
            assert page.locator("#results").is_hidden()
            assert page.locator("#download-observation").is_disabled()
            assert page.locator("#status").get_attribute("data-kind")=="error"
        mark("Invalid coefficients, blank bounds and non-increasing bounds retire visible output")
        expected={"quadratic":"8/3","cubic":"6","quartic":"2/5","missed":"-1/60",
                  "coincidence":"-4","odd":"0","negative":"-6","zero":"0"}
        for name,exact in expected.items():
            preset(name)
            assert page.locator("#exact-integral").inner_text().split()[0]==exact
            assert page.locator("#estimates tr").count()==3
            assert page.locator("#refinement tr").count()==5
            assert page.locator("#graph .function-curve").count()==1
            assert "NaN" not in page.locator("#graph").inner_html()
        mark("All eight original examples apply with their expected integral and finite diagram")
        preset("quadratic")
        page.locator("#subintervals").select_option("32")
        assert page.locator("#results").is_hidden()
        page.locator("#apply").click()
        for method,count in [("midpoint",32),("trapezoid",33),("simpson",33)]:
            page.locator("#method").select_option(method)
            assert page.locator("#nodes tr").count()==count
        mark("Mesh edits retire the result and all three maximum-mesh node tables remain inspectable")
        preset("quartic")
        page.locator("#method").select_option("simpson")
        obs=download("#download-observation","quadrature-observation.json")
        report=json.loads(obs.read_text(encoding="utf-8"))
        assert report["inspectedMethod"]=="simpson"
        assert report["input"]==dict(coefficients=[0,0,0,0,1,0],lower=-1,upper=1,subintervals=2)
        assert report["exactIntegral"]["fraction"]=="2/5"
        assert report["rules"]["simpson"]["estimate"]["fraction"]=="2/3"
        assert len(report["refinement"])==5
        assert len(report["rules"]["midpoint"]["nodes"])==2
        assert len(report["rules"]["trapezoid"]["nodes"])==3
        assert len(report["rules"]["simpson"]["nodes"])==3
        lesson=download("#download-course","quadrature.json")
        guide=download("#download-guide","quadrature.md")
        assert lesson.read_bytes()==(SOURCE/"courses/quadrature.json").read_bytes()
        assert guide.read_bytes()==(SOURCE/"courses/quadrature.md").read_bytes()
        mark("Actual browser downloads preserve full exact observation, original lesson and guide",
             observationSHA256=sha(obs),courseSHA256=sha(lesson),guideSHA256=sha(guide))
    else:
        assert args.prior_downloads, "--prior-downloads is required for a continuation phase"
        previous=Path(args.prior_downloads).resolve()
        lesson=previous/"quadrature.json"; guide=previous/"quadrature.md"; obs=previous/"quadrature-observation.json"
        assert lesson.read_bytes()==(SOURCE/"courses/quadrature.json").read_bytes()
        assert guide.read_bytes()==(SOURCE/"courses/quadrature.md").read_bytes()
        assert json.loads(obs.read_text(encoding="utf-8"))["inspectedMethod"]=="simpson"
        page.goto((SOURCE/"courses/quadrature-lab.html").as_uri(),wait_until="load")
        preset("quartic")
        page.locator("#method").select_option("simpson")
    page.screenshot(path=str(out/"desktop.png"),full_page=True)
    page.set_viewport_size(dict(width=390,height=844))
    page.locator("#graph").scroll_into_view_if_needed()
    layout=page.evaluate("""()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      boxes:Array.from(document.querySelectorAll('main,.workspace,.controls,.output,#graph,.scroll-table'),
      e=>({selector:e.id||e.className,width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,
      scrollWidth:e.scrollWidth}))})""")
    (out/"phone-layout.json").write_text(json.dumps(layout,indent=2)+"\n",encoding="utf-8")
    assert layout["scrollWidth"]<=layout["width"],layout
    assert page.locator("#graph").bounding_box()["width"]>=300
    assert page.locator("#graph text.tick").first.evaluate("(e)=>parseFloat(getComputedStyle(e).fontSize)")>=12
    page.screenshot(path=str(out/"phone.png"),full_page=True)
    mark("390-pixel layout keeps the page in its viewport and the graph labels readable")
    page.set_viewport_size(dict(width=1365,height=1000))
    deck=json.loads(lesson.read_text(encoding="utf-8"))
    page.goto((SOURCE/"demo.html").as_uri(),wait_until="load")
    initial=page.locator("#session-content").inner_text()
    page.locator("#deck-file").set_input_files(str(lesson))
    page.locator("#start-deck").wait_for(state="visible")
    assert deck["title"] in page.locator("#deck-preview").inner_text()
    assert page.locator("#session-content").inner_text()==initial
    page.locator("#start-deck").click()
    page.locator(".question-card h2").wait_for(state="visible")
    assert page.locator("#start-button").count()==0
    mark("Downloaded lesson previews without replacement, then one explicit start enters its first question")
    seen=[]; missed=[]; transcript=[]
    for turn in range(12):
        prompt=page.locator(".question-card h2").inner_text()
        item=next(i for i in deck["items"] if i["prompt"]==prompt)
        assert item["id"] not in seen
        seen.append(item["id"])
        chosen=item["answer"] if turn%2==0 else (item["answer"]+1)%len(item["options"])
        if chosen!=item["answer"]:missed.append(item["id"])
        page.locator('[data-choice="'+str(chosen)+'"]').click()
        feedback=page.locator("#feedback-slot").inner_text()
        assert item["explanation"] in feedback and item["transfer"] in feedback
        transcript.append(dict(item=item["id"],choice=chosen,correct=chosen==item["answer"]))
        page.locator("#next-button").click()
    assert len(set(seen))==12
    assert "6 of 12" in page.locator("#first-try-summary").inner_text()
    assert page.locator(".review-item").count()==12
    summary=page.locator("#first-try-summary").inner_text()
    first_notes=download("#save-notes-button","notes-before-practice.txt")
    page.locator("#practice-button").click()
    for item_id in missed:
        item=next(i for i in deck["items"] if i["id"]==item_id)
        assert page.locator(".practice-card h2").inner_text()==item["prompt"]
        page.locator('[data-practice-choice="'+str(item["answer"])+'"]').click()
        assert item["explanation"] in page.locator("#practice-feedback").inner_text()
        page.locator("#practice-next").click()
    assert page.locator("#first-try-summary").inner_text()==summary
    assert "6 of 6 correctly on retry" in page.locator("#practice-status").inner_text()
    notes=download("#save-notes-button","notes-after-practice.txt")
    text=notes.read_text(encoding="utf-8")
    assert "6 of 12 connections correct on the first try" in text
    assert "Complete: 6 of 6 practice answers recorded; 6 correct on retry" in text
    for item in deck["items"]:
        for value in [item["prompt"],item["explanation"],item["transfer"]]:
            assert value in text
    assert deck["attribution"] in text and deck["license"] in text
    def estimates(text):
        return text.split("ESTIMATED MASTERY")[1].split("PRACTICE")[0]
    assert estimates(first_notes.read_text(encoding="utf-8"))==estimates(text)
    mark("Unchanged actual learner completes twelve questions, six separate retries and exact-content notes",
         transcript=transcript,notesSHA256=sha(notes),firstNotesSHA256=sha(first_notes))
    page.screenshot(path=str(out/"learner.png"),full_page=True)
    after={str(p.relative_to(SOURCE)):sha(p) for p in SOURCE.rglob("*") if p.is_file()}
    assert inputs==after
    return dict(checks=checks,inputs=inputs,inputsUnchanged=True,downloads={
      "observation":sha(obs),"course":sha(lesson),"guide":sha(guide),"notes":sha(notes)})
if __name__=="__main__":
    raise SystemExit(run_receiver("quadrature",receive))
