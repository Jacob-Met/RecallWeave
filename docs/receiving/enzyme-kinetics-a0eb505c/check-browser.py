#!/usr/bin/env python3
"""Receive the actual standalone file in an isolated, offline Chromium context."""
import argparse, csv, hashlib, io, json, os, pathlib, time, traceback
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True, type=pathlib.Path)
parser.add_argument("--out", required=True, type=pathlib.Path)
args = parser.parse_args()
source = args.source.resolve()
out = args.out.resolve()
out.mkdir(parents=True, exist_ok=False)
checks, errors, network, downloads = [], [], [], []
started = time.time()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def check(name, condition, detail=None):
    checks.append({"name": name, "passed": bool(condition), "detail": detail})
    if not condition:
        raise AssertionError(name + ": " + repr(detail))

def near(a, b):
    return abs(a - b) <= 2e-10 * max(1, abs(b))

def rates(page):
    return page.eval_on_selector_all("#comparison-table tbody tr", """rows => Object.fromEntries(rows.map(row => [
      row.dataset.model, Object.fromEntries([...row.querySelectorAll('[data-quantity]')].map(cell =>
      [cell.dataset.quantity, cell.dataset.value === undefined ? null : Number(cell.dataset.value)]))
    ]))""")

result = {"schema": "recallweave-enzyme-browser-receiving-v1", "source": str(source), "uid": os.getuid(),
          "page_sha256": sha(source / "courses/enzyme-kinetics-lab.html"),
          "course_sha256": sha(source / "courses/enzymes-energy-and-control.json"),
          "checks": checks, "page_errors": errors, "external_requests": network, "downloads": downloads,
          "network_namespace": os.readlink("/proc/self/ns/net")}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        result["browser_version"] = browser.version
        context = browser.new_context(viewport={"width": 1320, "height": 1050},
                                      accept_downloads=True, service_workers="block")
        context.set_offline(True)
        def route(request_route):
            if request_route.request.url.startswith(("http:", "https:", "ws:", "wss:")):
                network.append({"method": request_route.request.method, "scheme": request_route.request.url.split(":")[0]})
                request_route.abort()
            else:
                request_route.continue_()
        context.route("**/*", route)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto((source / "courses/enzyme-kinetics-lab.html").as_uri())
        expect(page.locator("#results")).to_be_visible()
        current = rates(page)
        check("actual initial table equals the independently worked S=1, r=3 case",
              near(current["uninhibited"]["rate"], 5) and near(current["competitive"]["rate"], 2)
              and near(current["pure_noncompetitive"]["rate"], 1.25)
              and near(current["competitive"]["relativeRate"], 40)
              and near(current["pure_noncompetitive"]["relativeRate"], 25), current)
        check("all three curve paths and distinct marker shapes are rendered",
              page.locator("#plot-curves path").count() == 3 and page.locator("#plot-probes circle").count() == 1
              and page.locator("#plot-probes rect").count() == 1
              and page.locator("#plot-probes path.probe").count() == 1)
        page.screenshot(path=str(out / "01-desktop-comparison.png"), full_page=True)

        page.locator("#substrate-slider").focus()
        page.keyboard.press("ArrowRight")
        next_s = float(page.locator("#substrate").input_value())
        check("native slider keyboard input changes only substrate",
              next_s > 1 and float(page.locator("#inhibitor-ratio").input_value()) == 3, {"substrate": next_s})
        page.locator('[data-substrate-preset="4"]').click()
        current = rates(page)
        check("course S=4 button produces rates 8,5,2 without changing inhibitor",
              [current[id]["rate"] for id in ["uninhibited", "competitive", "pure_noncompetitive"]] == [8, 5, 2]
              and float(page.locator("#inhibitor-ratio").input_value()) == 3, current)
        page.locator('[data-substrate-preset="16"]').click()
        current = rates(page)
        check("course S=16 raises competitive fraction to 85 percent and leaves pure fraction at 25",
              near(current["competitive"]["relativeRate"], 85)
              and near(current["pure_noncompetitive"]["relativeRate"], 25)
              and near(current["uninhibited"]["rate"], 160 / 17), current)

        page.locator("#explain-pure").focus()
        page.keyboard.press("Space")
        expect(page.locator("#explain-pure")).to_be_checked()
        check("keyboard model choice changes the explanation and selected row without changing rates",
              page.locator("#explanation-title").inner_text() == "Pure noncompetitive"
              and page.locator("#comparison-table tr.selected").get_attribute("data-model") == "pure_noncompetitive"
              and rates(page) == current)
        check("the scientific boundary is visible in the actual page",
              "Binding at a separate site alone does not identify a rate law." in page.locator(".assumptions").inner_text()
              and "Pure noncompetitive" in page.locator(".assumptions").inner_text())

        page.locator("#no-inhibitor").click()
        expect(page.locator("#coincident-note")).to_be_visible()
        current = rates(page)
        check("zero inhibitor makes all current rates and parameters coincide",
              current["uninhibited"] == current["competitive"] == current["pure_noncompetitive"], current)

        page.locator("#inhibitor-ratio").fill("3")
        page.locator("#substrate").fill("0")
        expect(page.locator("#zero-note")).to_be_visible()
        current = rates(page)
        check("zero substrate renders undefined fractions instead of zero or one hundred percent",
              all(row["rate"] == 0 and row["relativeRate"] is None for row in current.values())
              and "undefined" in page.locator("#explanation-text").inner_text().lower(), current)

        page.locator("#substrate").fill("")
        expect(page.locator("#results")).to_be_hidden()
        expect(page.locator("#invalid-results")).to_be_visible()
        check("invalid text clears actual graph cells and disables current-data download",
              page.locator("#download-comparison").is_disabled()
              and page.locator("#plot-curves").inner_html() == ""
              and page.locator("#results [data-value]").count() == 0
              and page.locator("#substrate").get_attribute("aria-invalid") == "true")
        check("invalid model inputs leave the independent course download available",
              page.locator("#download-course").is_enabled())
        page.locator("#substrate").fill("33")
        check("out-of-domain input remains refused", page.locator("#results").is_hidden()
              and "0 to 32" in page.locator("#lab-status").inner_text())
        page.locator("#substrate").fill("1e")
        check("an incomplete exponent remains refused", page.locator("#results").is_hidden())

        page.locator("#substrate").fill("4")
        expect(page.locator("#results")).to_be_visible()
        check("repairing the field restores a fresh comparison and clears invalid state",
              near(rates(page)["competitive"]["rate"], 5)
              and page.locator("#substrate").get_attribute("aria-invalid") is None
              and page.locator("#download-comparison").is_enabled())

        with page.expect_download() as event:
            page.locator("#download-comparison").click()
        downloaded = event.value
        csv_path = out / "actual-comparison.csv"
        downloaded.save_as(str(csv_path))
        rows = list(csv.DictReader(io.StringIO(csv_path.read_text())))
        check("actual CSV preserves the three worked current rows and the complete curve grid",
              len(rows) == 390
              and [row["row_type"] for row in rows[:3]] == ["current"] * 3
              and [float(row["initial_rate_product_units_per_min"]) for row in rows[:3]] == [8, 5, 2]
              and [float(row["rate_fraction_of_uninhibited"]) for row in rows[:3]] == [1, 0.625, 0.25]
              and rows[-1]["substrate_concentration_units"] == "32",
              {"data_rows": len(rows), "suggested_filename": downloaded.suggested_filename})
        zero_rows = [row for row in rows if row["substrate_concentration_units"] == "0"]
        check("actual CSV represents all zero-substrate fractions as empty cells",
              len(zero_rows) == 3 and all(row["rate_fraction_of_uninhibited"] == "" for row in zero_rows))
        downloads.append({"kind": "comparison", "path": csv_path.name, "sha256": sha(csv_path),
                          "bytes": csv_path.stat().st_size, "suggested_filename": downloaded.suggested_filename})

        with page.expect_download() as event:
            page.locator("#download-course").click()
        downloaded = event.value
        course_path = out / "actual-enzyme-deck.json"
        downloaded.save_as(str(course_path))
        check("actual course download equals the exact qualified twelve-question input",
              course_path.read_bytes() == (source / "courses/enzymes-energy-and-control.json").read_bytes()
              and sha(course_path) == "f8539cc5ba82cdae6f128986cdec2d09b62d846c2cf3bc9bc221d406264ff64a"
              and downloaded.suggested_filename == "enzymes-energy-and-control.json")
        downloads.append({"kind": "course", "path": course_path.name, "sha256": sha(course_path),
                          "bytes": course_path.stat().st_size, "suggested_filename": downloaded.suggested_filename})

        unexpected_downloads = []
        page.on("download", lambda download: unexpected_downloads.append(download.suggested_filename))
        page.locator("#substrate").evaluate("input => { input.value = 'bad'; }")
        page.locator("#download-comparison").click()
        page.wait_for_timeout(120)
        check("download admission rechecks a changed field even without its input event",
              page.locator("#results").is_hidden() and page.locator("#download-comparison").is_disabled()
              and unexpected_downloads == [])

        page.locator("#reset-example").click()
        page.locator("#explain-pure").check()
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator("#plot-heading").scroll_into_view_if_needed()
        page.wait_for_function("document.querySelector('#kinetics-plot').viewBox.baseVal.width === Math.max(260, Math.round(document.querySelector('#plot-wrap').clientWidth))")
        geometry = page.evaluate("""() => {
          const table = document.querySelector('.table-scroll');
          const svg = document.querySelector('#kinetics-plot');
          const text = svg.querySelector('text');
          return {viewport: innerWidth, document: document.documentElement.scrollWidth,
                  tableClient: table.clientWidth, tableScroll: table.scrollWidth,
                  plotWidth: svg.getBoundingClientRect().width,
                  graphTextPx: parseFloat(getComputedStyle(text).fontSize) *
                    svg.getBoundingClientRect().width / svg.viewBox.baseVal.width};
        }""")
        check("narrow receiving has no page overflow and retains readable native graph labels",
              geometry["document"] <= geometry["viewport"] and geometry["graphTextPx"] >= 11
              and geometry["plotWidth"] >= 260, geometry)
        page.locator(".table-scroll").focus()
        page.keyboard.press("End")
        check("the narrow comparison table is an explicit keyboard-focusable scroll region",
              page.locator(".table-scroll").get_attribute("tabindex") == "0"
              and page.locator(".table-scroll").get_attribute("role") == "region"
              and geometry["tableScroll"] > geometry["tableClient"])
        page.screenshot(path=str(out / "02-narrow-comparison.png"), full_page=True)
        check("no page error or external network request occurred", errors == [] and network == [],
              {"page_errors": errors, "external_requests": network})
        context.close()
        browser.close()
        result["private_browser_closed"] = True
except BaseException as error:
    result["exception"] = {"type": type(error).__name__, "message": str(error), "traceback": traceback.format_exc()}
    result["passed"] = False
finally:
    result["elapsed_seconds"] = round(time.time() - started, 4)
    result.setdefault("passed", all(check["passed"] for check in checks) and not errors and not network)
    result["files"] = [{"path": path.name, "bytes": path.stat().st_size, "sha256": sha(path)}
                       for path in sorted(out.iterdir()) if path.is_file()]
    raw = (json.dumps(result, indent=2, ensure_ascii=False) + "\n").encode()
    (out / "result.json").write_bytes(raw)
    print(json.dumps({"passed": result["passed"], "checks": len(checks), "seconds": result["elapsed_seconds"],
                      "receipt": str(out / "result.json"), "sha256": hashlib.sha256(raw).hexdigest(),
                      "exception": result.get("exception")}))
if not result["passed"]:
    raise SystemExit(1)
