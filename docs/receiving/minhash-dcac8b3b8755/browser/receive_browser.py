"""Independent UI receiver; frozen expected data precedes candidate source exposure."""
import argparse, datetime, hashlib, itertools, json, math, os, pathlib, platform, sys, traceback

def witness(path):
    p=pathlib.Path(path); b=p.read_bytes(); s=p.stat()
    return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),
            "git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest(),
            "mode":s.st_mode,"mtime_ns":str(s.st_mtime_ns),"inode":str(s.st_ino)}

def write_json(path,value):
    pathlib.Path(path).write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--html",required=True); ap.add_argument("--guide",required=True)
    ap.add_argument("--fixtures",required=True); ap.add_argument("--output",required=True)
    ap.add_argument("--chrome",required=True); args=ap.parse_args()
    html=pathlib.Path(args.html).resolve(strict=True)
    guide=pathlib.Path(args.guide).resolve(strict=True)
    fixtures=pathlib.Path(args.fixtures).resolve(strict=True)
    chrome=pathlib.Path(args.chrome).resolve(strict=True)
    output=pathlib.Path(args.output).absolute()
    if output.exists(): raise SystemExit("Output must be a new directory.")
    originals=[html,guide,pathlib.Path(__file__).resolve(),fixtures/"browser-criteria.json",
               fixtures/"expected-model-rows.json",fixtures/"oracle-cases.json",
               fixtures/"expected-probability-foundations.json"]
    before={str(p):witness(p) for p in originals}
    output.mkdir(); (output/"downloads").mkdir(); (output/"process-temp").mkdir()
    os.environ["TEMP"]=str(output/"process-temp"); os.environ["TMP"]=str(output/"process-temp")
    criteria=json.loads((fixtures/"browser-criteria.json").read_text(encoding="utf-8"))
    frozen=json.loads((fixtures/"expected-model-rows.json").read_text(encoding="utf-8"))
    expected={}
    for c in frozen["cases"]:
        m=dict(c["expected"]); m["format"]=m.pop("schema"); expected[c["id"]]=m
    receipt={"schema":"recallweave.independent-minhash-browser-receiving/1",
             "started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
             "identity":{"node":platform.node(),"user":os.environ.get("USERNAME"),
                         "python":sys.executable,"version":platform.python_version()},
             "source_before":before,"oracle_adapter":"Only top-level schema renamed to format; all raw oracle bytes retained.",
             "checks":[],"downloads":[],"snapshots":[],"requests":[],"page_errors":[],
             "console_errors":[],"storage_writes":[],"complete":False,"browser_closed":False}
    def check(name,actual,expected_value=True):
        ok=actual==expected_value
        receipt["checks"].append({"name":name,"passed":ok,"actual":actual,"expected":expected_value})
        if not ok: raise AssertionError(name)
    browser=None; context=None; pw=None
    try:
        from playwright.sync_api import sync_playwright
        import importlib.metadata
        receipt["identity"]["playwright"]=importlib.metadata.version("playwright")
        pw=sync_playwright().start()
        browser=pw.chromium.launch(executable_path=str(chrome),headless=True,
                                  args=["--disable-background-networking","--disable-sync","--no-first-run"],
                                  env=dict(os.environ))
        receipt["identity"]["chrome"]=browser.version
        context=browser.new_context(viewport={"width":1440,"height":1000},accept_downloads=True,
                                    service_workers="block")
        context.add_init_script("""
        window.__minhashStorageWrites=[];
        const originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){window.__minhashStorageWrites.push({kind:'setItem',key:String(k)});return originalSet.call(this,k,v);};
        const originalIDB=IDBFactory.prototype.open;
        IDBFactory.prototype.open=function(...args){window.__minhashStorageWrites.push({kind:'indexedDB.open',name:String(args[0])});return originalIDB.apply(this,args);};
        """)
        page=context.new_page()
        page.on("request",lambda r:receipt["requests"].append({"url":r.url,"method":r.method}))
        page.on("pageerror",lambda e:receipt["page_errors"].append(str(e)))
        page.on("console",lambda m:receipt["console_errors"].append(m.text) if m.type=="error" else None)
        page.goto(html.as_uri(),wait_until="load")
        def text(selector): return page.locator(selector).inner_text().strip()
        def snapshot(label):
            data=page.evaluate("""() => ({
                inputs:{a:document.querySelector('#set-a').value,b:document.querySelector('#set-b').value},
                resultsHidden:document.querySelector('#results').hidden,
                selected:document.querySelector('#permutation').value,
                visibleText:document.body.innerText,
                ranked:[...document.querySelectorAll('#ranked-labels li')].map(n=>n.textContent),
                firstRows:[...document.querySelectorAll('#first-rows tr')].map(n=>n.textContent),
                permutationRows:[...document.querySelectorAll('#permutation-rows tr')].map(n=>n.textContent)
            })""")
            path=output/(label+".dom.json"); write_json(path,data)
            receipt["snapshots"].append({"label":label,"path":path.name,**witness(path)})
        def submit(a=None,b=None):
            if a is not None: page.locator("#set-a").fill(a)
            if b is not None: page.locator("#set-b").fill(b)
            page.get_by_role("button",name="Compare all permutations",exact=True).click()
        def counts(name,m):
            check(name+" Jaccard",text("#jaccard"),str(len(m["intersection"]))+" / "+str(len(m["union"])))
            check(name+" full frequency",text("#frequency"),str(m["collisions"])+" / "+str(m["permutations"]))
            check(name+" reduced fraction",text("#reduced"),str(m["fraction"]["numerator"])+" / "+str(m["fraction"]["denominator"]))
        def row(name,r,total):
            check(name+" selected",page.locator("#permutation").input_value(),str(r["index"]))
            check(name+" minimum A",text("#min-a"),json.dumps(r["minA"],ensure_ascii=False)+" \u00b7 rank "+str(r["rankA"]))
            check(name+" minimum B",text("#min-b"),json.dumps(r["minB"],ensure_ascii=False)+" \u00b7 rank "+str(r["rankB"]))
            check(name+" collision",text("#row-collision"),"1 \u00b7 MATCH" if r["collision"] else "0 \u00b7 DIFFER")
            check(name+" previous boundary",page.locator("#previous").is_disabled(),r["index"]==1)
            check(name+" next boundary",page.locator("#next").is_disabled(),r["index"]==total)
            ranked=page.locator("#ranked-labels li").all_text_contents()
            check(name+" ranked label count",len(ranked),len(r["order"]))
            check(name+" literal quoted order",all(json.dumps(x,ensure_ascii=False) in ranked[i] for i,x in enumerate(r["order"])))
        def download(selector,label):
            with page.expect_download() as info: page.locator(selector).click()
            dl=info.value; dest=output/"downloads"/label; dl.save_as(str(dest))
            check(label+" download completed",dl.failure(),None)
            receipt["downloads"].append({"label":label,"suggested_filename":dl.suggested_filename,
                                         "path":str(dest.relative_to(output)),**witness(dest)})
            return dest
        def observe(label,m,a,b,index):
            p=download("#download-observation",label+".json"); value=json.loads(p.read_text(encoding="utf-8"))
            check(label+" exact fields",sorted(value),sorted(["format","assumptions","entered","selected_permutation","analysis"]))
            check(label+" format",value["format"],"recallweave.minhash-observation/1")
            obs=next(x for x in criteria["checks"] if x["id"]=="observation_download")
            check(label+" assumptions",value["assumptions"],obs["assumptions"])
            check(label+" entered literal text",value["entered"],{"a":a,"b":b})
            check(label+" selected row",value["selected_permutation"],index)
            check(label+" entire independent analysis",value["analysis"],m)
        check("initial A",json.loads(page.locator("#set-a").input_value()),["a","b"])
        check("initial B",json.loads(page.locator("#set-b").input_value()),["b","c"])
        check("initial results hidden",page.locator("#results").is_hidden())
        check("initial observation disabled",page.locator("#download-observation").is_disabled())
        a='[\n  "a", "b"\n]'; b='[ "b",\n "c" ]'
        submit(a,b); m=expected["partial_overlap"]
        check("applied results visible",page.locator("#results").is_visible())
        counts("partial",m); row("partial row 1",m["rows"][0],6)
        check("partial six table rows",page.locator("#permutation-rows tr").count(),6)
        check("details initially collapsed",page.locator("details[open]").count(),0)
        snapshot("partial-initial")
        page.screenshot(path=str(output/"desktop-partial.png"))
        page.locator("#next").click(); row("partial row 2",m["rows"][1],6)
        page.locator("#next").click(); row("partial row 3",m["rows"][2],6)
        observe("partial-selected-3",m,a,b,3)
        page.locator("details summary").click()
        page.locator("#permutation-rows tr").last.get_by_role("button").click()
        row("inspect row 6",m["rows"][5],6)
        page.locator("#previous").click(); row("previous row 5",m["rows"][4],6)
        page.locator("#permutation").select_option("1"); row("selected row 1",m["rows"][0],6)
        page.locator("#set-a").fill('["draft"]')
        check("editing retires results",page.locator("#results").is_hidden())
        check("editing disables download",page.locator("#download-observation").is_disabled())
        check("draft text retained",page.locator("#set-a").input_value(),'["draft"]')
        submit('["broken"',b)
        check("invalid JSON visible alert",page.locator("#error[role='alert']").is_visible() and bool(text("#error")))
        check("invalid JSON no stale results",page.locator("#results").is_hidden())
        check("invalid JSON no download",page.locator("#download-observation").is_disabled())
        submit('["a","b","c"]','["d","e","f"]')
        check("six-label refusal",page.locator("#error[role='alert']").is_visible() and bool(text("#error")))
        check("six-label no stale results",page.locator("#results").is_hidden())
        check("six-label no download",page.locator("#download-observation").is_disabled())
        submit(a,b); counts("recovered partial",m)
        for label in ["overlap","identical","disjoint","subset","boundary","literal"]:
            page.locator('[data-example="'+label+'"]').click()
            check(label+" example requires Apply",page.locator("#results").is_hidden())
            check(label+" example disables download",page.locator("#download-observation").is_disabled())
            aa=json.loads(page.locator("#set-a").input_value()); bb=json.loads(page.locator("#set-b").input_value())
            union=list(dict.fromkeys(aa+bb)); common=set(aa)&set(bb); n=len(union); k=len(common); g=math.gcd(k,n)
            arithmetic={"intersection":list(common),"union":union,"collisions":k*math.factorial(n-1),
                        "permutations":math.factorial(n),"fraction":{"numerator":k//g,"denominator":n//g}}
            submit(); counts(label+" example",arithmetic)
        m=expected["five_label_boundary"]
        a=json.dumps(m["inputA"]); b=json.dumps(m["inputB"]); submit(a,b); counts("boundary",m)
        check("boundary 120 rows",page.locator("#permutation-rows tr").count(),120)
        check("boundary five buckets",page.locator("#first-rows tr").count(),5)
        buckets=page.locator("#first-rows tr").evaluate_all("(rows) => rows.map(r=>[...r.cells].map(c=>c.textContent))")
        expected_buckets=[[json.dumps(g["label"],ensure_ascii=False),"A and B" if g["inA"] and g["inB"] else "A only" if g["inA"] else "B only",str(g["permutations"]),str(g["collisions"])] for g in m["byFirst"]]
        check("boundary literal bucket counts and membership",buckets,expected_buckets)
        page.locator("#permutation").select_option("120"); row("boundary last",m["rows"][-1],120)
        observe("boundary-selected-120",m,a,b,120); snapshot("boundary-last")
        page.locator("#first-rows").scroll_into_view_if_needed(); page.screenshot(path=str(output/"desktop-first-label-proof.png"))
        m=expected["literal_labels"]; a=json.dumps(m["inputA"],ensure_ascii=False); b=json.dumps(m["inputB"],ensure_ascii=False)
        submit(a,b); counts("literal",m); row("literal row 1",m["rows"][0],24)
        observe("literal-selected-1",m,a,b,1); snapshot("literal")
        m=expected["duplicate_entries"]; a='["x", "x", "y"]'; b='["y", "y"]'
        submit(a,b); counts("duplicate",m); observe("duplicate-selected-1",m,a,b,1)
        course=download("#download-course","probability-foundations.json")
        check("fixed course bytes",course.read_bytes()==(fixtures/"expected-probability-foundations.json").read_bytes())
        downloaded_guide=download("#download-guide","minhash-guide.md")
        check("fixed guide bytes",downloaded_guide.read_bytes()==guide.read_bytes())
        page.set_viewport_size({"width":390,"height":844})
        m=expected["five_label_boundary"]; submit(json.dumps(m["inputA"]),json.dumps(m["inputB"]))
        page.evaluate("window.scrollTo(0,0)")
        layout=page.evaluate("""() => ({
            viewport:innerWidth,document:document.documentElement.scrollWidth,
            tables:[...document.querySelectorAll('table')].map(t=>({
                width:t.scrollWidth,parentWidth:t.parentElement.clientWidth,
                parentOverflow:getComputedStyle(t.parentElement).overflowX
            }))
        })""")
        check("390px no document horizontal overflow",layout["document"]<=layout["viewport"])
        receipt["layout_390"]=layout
        page.screenshot(path=str(output/"mobile-top.png"))
        page.locator("#results").scroll_into_view_if_needed()
        page.screenshot(path=str(output/"mobile-results.png")); snapshot("mobile-boundary")
        receipt["storage_writes"]=page.evaluate("window.__minhashStorageWrites")
        check("no storage writes",receipt["storage_writes"],[])
        check("local storage empty",page.evaluate("localStorage.length"),0)
        check("session storage empty",page.evaluate("sessionStorage.length"),0)
        check("no external requests",[x for x in receipt["requests"] if not x["url"].startswith(("file:","blob:","data:"))],[])
        check("no application errors",receipt["page_errors"],[])
        check("no console errors",receipt["console_errors"],[])
        receipt["course_passed"]=True
    except BaseException as exc:
        receipt["error"]={"type":type(exc).__name__,"message":str(exc),"traceback":traceback.format_exc()}
    finally:
        try:
            if context is not None: context.close()
            if browser is not None: browser.close()
            if pw is not None: pw.stop()
            receipt["browser_closed"]=browser is None or not browser.is_connected()
        except BaseException as exc:
            receipt["cleanup_error"]={"type":type(exc).__name__,"message":str(exc)}
        after={str(p):witness(p) for p in originals}
        receipt["source_after"]=after; receipt["source_conserved"]=after==before
        receipt["complete"]=bool(receipt.get("course_passed") and receipt["browser_closed"] and receipt["source_conserved"] and not receipt.get("cleanup_error"))
        receipt["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
        receipt["artifacts"]={str(p.relative_to(output)):witness(p) for p in output.rglob("*") if p.is_file() and "process-temp" not in p.parts}
        write_json(output/"receiving.json",receipt)
    print(json.dumps({"complete":receipt["complete"],"checks":len(receipt["checks"]),
                     "passed":sum(c["passed"] for c in receipt["checks"]),"receipt":str(output/"receiving.json"),
                     "receipt_identity":witness(output/"receiving.json")}))
    return 0 if receipt["complete"] else 1
if __name__=="__main__": raise SystemExit(main())
