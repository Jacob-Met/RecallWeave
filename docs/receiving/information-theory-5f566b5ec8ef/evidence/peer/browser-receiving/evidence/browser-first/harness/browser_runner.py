"""Common isolated native browser runner. No browser starts when imported."""
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

ROOT = Path(__file__).resolve().parents[1]
CHROME = Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe")

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def run_receiver(label, lab_phase):
    """Run one named phase once; retain first failure and actual process outcome."""
    out = ROOT / "evidence" / label
    out.mkdir(exist_ok=False)
    temp = ROOT / "temp" / label
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
    result = {"schema":"recallweave.information-theory.peer-browser-process.v1",
              "phase":label, "passed":failure is None, "failure":failure,
              "startedUTC":started, "finishedUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "python":sys.version, "platform":platform.platform(),
              "chrome":str(CHROME), "browserVersion":locals().get("browser_version"),
              "freeBytesBefore":before,
              "freeBytesAfter":{drive:shutil.disk_usage(drive + ":/").free for drive in ("C","D","G")},
              "externalRequests":requests, "pageErrors":errors,
              "storageCallsAcrossPages":storage, "downloadNames":downloads,
              "checks":checks, "phaseReceipt":phase,
              "runnerSHA256":sha(__file__), "privateProfile":str(temp / "profile")}
    print(json.dumps({"processExit":0 if failure is None else 1,"phase":label,
                      "passed":failure is None,"externalRequests":len(requests),
                      "pageErrors":len(errors),"downloads":downloads}), flush=True)
    (out / "process-receipt.json").write_text(json.dumps(result,indent=2) + "\n",encoding="utf-8")
    return 0 if failure is None else 1
