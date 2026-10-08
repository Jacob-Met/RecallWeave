"""Actual, private Chrome receiving through authored page controls and downloads."""
from pathlib import Path
import hashlib
import json
import sys
from playwright.sync_api import expect
from browser_runner import ROOT, run_receiver
from observation_oracle import verify_model, approximately, METRIC_MAP
from learner_phase import receive_learner

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def reduced(value):
    n, d = value["reducedNumerator"], value["reducedDenominator"]
    return str(n) if d == 1 else str(n) + "/" + str(d)

def save_download(page, selector, directory, filename):
    directory.mkdir(parents=True, exist_ok=True)
    with page.expect_download() as pending:
        page.locator(selector).focus()
        page.locator(selector).press("Enter")
    download = pending.value
    assert download.suggested_filename == filename
    target = directory / filename
    assert not target.exists()
    download.save_as(str(target))
    assert target.is_file()
    return target

def phase(page, context, out):
    source = ROOT / "source"
    checks, cases_seen = [], []
    before = {p.relative_to(source).as_posix(): digest(p) for p in source.rglob("*") if p.is_file()}
    assert before["courses/information-theory-explorer.html"] == "cc22b1a3e1ee5c434a08ce54421426b971ea203f95e56559198fffaf5bb98dd0"
    oracle = json.loads((ROOT / "peer/browser-oracle-subset.json").read_text(encoding="utf-8"))
    by_name = {c["name"]: c for c in oracle["cases"]}
    page.goto((source / "courses/information-theory-explorer.html").as_uri())
    expect(page.locator("#applied-result")).to_be_visible()
    expect(page.locator("#applied-summary")).to_have_text("8 cards · 2 X labels · 2 Y labels")
    expect(page.locator("#count-table")).to_have_value("3 1\n1 3")
    assert page.locator("img").count() == 0
    assert page.locator("script[src],link[rel=stylesheet]").count() == 0
    assert page.locator("#mutual-information").get_attribute("data-bits") is not None
    checks.append("Pinned standalone page opens directly from file and applies its authored noisy example without imports or downloads")
    page.screenshot(path=str(out / "initial-desktop.png"), full_page=True)
    old_input = page.locator("#count-table").input_value()
    old_mi = page.locator("#mutual-information").get_attribute("data-bits")
    page.locator("#example-choice").select_option("independent")
    assert page.locator("#count-table").input_value() == old_input
    assert page.locator("#mutual-information").get_attribute("data-bits") == old_mi
    expect(page.locator("#example-note")).to_contain_text("same Y distribution")
    page.locator("#use-example").focus()
    page.locator("#use-example").press("Enter")
    expect(page.locator("#count-table")).to_have_value("1 1\n1 1")
    expect(page.locator("#independence-verdict")).to_have_attribute("data-independent", "true")
    checks.append("Selecting an example changes only its note; explicit keyboard Use example applies its counts")
    for detail in ("factorization-details", "cell-details", "entropy-details"):
        toggle = page.locator("#" + detail + " > summary")
        toggle.focus()
        toggle.press("Enter")
        assert page.locator("#" + detail).get_attribute("open") is not None
    for case in oracle["cases"]:
        expected = case["expected"]
        text = "\n".join(" ".join(str(n) for n in row) for row in expected["counts"])
        if case["name"] == "rare":
            text = "  " + text.replace("\n", "  \n") + "  \n"
        page.locator("#count-table").fill(text)
        expect(page.locator("#applied-result")).to_be_hidden()
        expect(page.locator("#download-observation")).to_be_disabled()
        expect(page.locator("#condition-axis")).to_be_disabled()
        expect(page.locator("#table-status")).to_contain_text("Draft changed")
        assert page.locator("#table-error").is_hidden()
        applied_text = page.locator("#count-table").input_value()
        page.locator("#apply-table").focus()
        page.locator("#apply-table").press("Enter")
        expect(page.locator("#applied-result")).to_be_visible()
        expect(page.locator("#download-observation")).to_be_enabled()
        expect(page.locator("#result-heading")).to_be_focused()
        assert page.locator("#condition-axis").input_value() == "X"
        assert page.locator("#condition-value").input_value() == "0"
        for selector, metric in (
            ("entropy-x","hX"),("entropy-y","hY"),("entropy-joint","hXY"),
            ("mutual-information","mutualInformation"),("remaining-x","hXGivenY"),("remaining-y","hYGivenX"),
        ):
            approximately(float(page.locator("#" + selector).get_attribute("data-bits")),
                          expected["metrics"][metric], "mutualInformationBits" if metric == "mutualInformation" else metric)
        expect(page.locator("#joint-table td[data-row]")).to_have_count(len(expected["cells"]))
        expect(page.locator("#cell-contributions tbody tr")).to_have_count(len(expected["cells"]))
        expect(page.locator("#factorization-table tbody tr")).to_have_count(len(expected["cells"]))
        for index, cell in enumerate(expected["cells"]):
            joint = page.locator('#joint-table td[data-row="' + str(cell["row"]) + '"][data-column="' + str(cell["column"]) + '"]')
            assert joint.get_attribute("data-probability") == reduced(cell["jointProbability"])
            expect(joint.locator("strong")).to_have_text(str(cell["count"]) + (" card" if cell["count"] == 1 else " cards"))
            contribution = page.locator("#cell-contributions tbody tr").nth(index)
            values = contribution.locator("th,td").all_text_contents()
            assert values[1:3] == [reduced(cell["jointProbability"]), reduced(cell["independentProductProbability"])]
            approximately(float(contribution.locator("td").nth(5).get_attribute("data-bits")),
                          cell["mutualInformationContributionBits"], "signedContributionBits")
            if cell["zeroCell"]:
                assert values[3] == values[5] == "Excluded (p = 0)"
                assert values[4] == values[6] == "0"
            factor = page.locator("#factorization-table tbody tr").nth(index).locator("th,td").all_text_contents()
            a, b = cell["crossProducts"]
            assert factor[1:] == [str(a), str(b), "Yes" if a == b else "No"]
        expect(page.locator("#independence-verdict")).to_have_attribute("data-independent", str(expected["independentExactly"]).lower())
        for axis, targets, probabilities, entropy_before, average in (
            ("X",expected["yGivenX"],expected["columnProbabilities"],"hY","hYGivenX"),
            ("Y",expected["xGivenY"],expected["rowProbabilities"],"hX","hXGivenY"),
        ):
            page.locator("#condition-axis").select_option(axis)
            expect(page.locator("#condition-value option")).to_have_count(len(targets))
            assert page.locator("#condition-value").input_value() == "0"
            for index, target in enumerate(targets):
                page.locator("#condition-value").select_option(str(index))
                rows = page.locator("#conditional-distribution tbody tr")
                expect(rows).to_have_count(len(probabilities))
                for i, probability in enumerate(probabilities):
                    vals = rows.nth(i).locator("th,td").all_text_contents()
                    assert vals[1] == reduced(probability)
                    assert vals[2] == ("Undefined" if target["distribution"] is None else reduced(target["distribution"][i]))
                approximately(float(page.locator("#entropy-before").get_attribute("data-bits")),expected["metrics"][entropy_before],"before")
                approximately(float(page.locator("#conditional-average").get_attribute("data-bits")),expected["metrics"][average],"average")
                after = page.locator("#entropy-after")
                if target["distribution"] is None:
                    expect(after).to_have_text("Undefined")
                    expect(after).to_have_attribute("data-bits","null")
                    expect(page.locator("#condition-message")).to_contain_text("weight in the average is zero")
                else:
                    approximately(float(after.get_attribute("data-bits")),target["entropyBits"],"after")
                if case["name"] == "rare" and axis == "X" and index == 1:
                    expect(page.locator("#condition-message")).to_contain_text("increases uncertainty")
                    expect(after).to_have_text("1")
                    page.locator("#conditioning-heading").scroll_into_view_if_needed()
                    page.screenshot(path=str(out / "rare-observation-desktop.png"))
        if case["name"].startswith("near_"):
            text_value = page.locator("#mutual-information").inner_text()
            assert "e-" in text_value and float(text_value) > 0
        observation_file = save_download(page, "#download-observation", out / "observations" / case["name"], "information-observation.json")
        observation = json.loads(observation_file.read_text(encoding="utf-8"))
        assert observation["format"] == "recallweave-information-observation/1"
        assert observation["appliedText"] == applied_text
        assert observation["conditioning"] == {"observedAxis":"Y","observedIndex":expected["columnCount"]-1,"observedLabel":"Y"+str(expected["columnCount"])}
        case_receipt = verify_model(observation["analysis"], case)
        case_receipt["observationSHA256"] = digest(observation_file)
        cases_seen.append(case_receipt)
        print(json.dumps({"browserCasePassed":case["name"],"cells":len(expected["cells"])}),flush=True)
    checks.append("All12 frozen cases render every cell/exact check and both full conditional directions; actual observation downloads match the independent oracle")
    checks.append("All six raw metric values remain correct; near dependence is visibly nonzero, signed noisy terms stay negative, and zero observations remain undefined")
    maximum = by_name["maximum"]["expected"]["counts"]
    page.locator("#count-table").fill("\n".join(" ".join(str(n) for n in row) for row in maximum))
    page.locator("#apply-table").focus(); page.locator("#apply-table").press("Enter")
    page.locator("#condition-axis").select_option("Y"); page.locator("#condition-value").select_option("3")
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    page.locator("#joint-table").focus()
    before_scroll = page.locator("#joint-table").evaluate("(el)=>el.scrollLeft")
    for _ in range(6): page.locator("#joint-table").press("ArrowRight")
    page.wait_for_function("document.querySelector('#joint-table').scrollLeft > 0")
    assert page.locator("#joint-table").evaluate("(el)=>el.scrollLeft") > before_scroll
    page.locator("#cell-contributions").focus()
    for _ in range(6): page.locator("#cell-contributions").press("ArrowRight")
    page.wait_for_function("document.querySelector('#cell-contributions').scrollLeft > 0")
    page.screenshot(path=str(out / "maximum-phone-full.png"),full_page=True)
    page.locator(".hero").screenshot(path=str(out / "phone-lesson-card.png"))
    checks.append("390px page has no document overflow; real arrow keys scroll every-cell tables within their own focusable regions")
    page.locator("#count-table").fill("1 1\n1 1")
    page.locator("#apply-table").focus(); page.locator("#apply-table").press("Enter")
    assert page.locator("#condition-axis").input_value() == "X"
    assert page.locator("#condition-value").input_value() == "0"
    expect(page.locator("#condition-value option")).to_have_count(2)
    checks.append("Four-category selected index retires cleanly when applying a two-category table")
    for invalid in ("0 0\n0 0","1 2\n3","1.5 0\n0 1","1 0\n\n0 1","<img src=x> 0\n0 1","1000 0\n0 1"):
        page.locator("#count-table").fill(invalid)
        page.locator("#apply-table").focus(); page.locator("#apply-table").press("Enter")
        expect(page.locator("#table-error")).to_be_visible()
        expect(page.locator("#count-table")).to_have_attribute("aria-invalid","true")
        expect(page.locator("#count-table")).to_be_focused()
        expect(page.locator("#applied-result")).to_be_hidden()
        expect(page.locator("#download-observation")).to_be_disabled()
        assert page.locator("img").count() == 0
    checks.append("Six invalid drafts cannot expose or download an old result; literal markup input stays inert and the error returns focus")
    course = save_download(page,"#download-course",out / "fixed-downloads","information-theory.json")
    guide = save_download(page,"#download-guide",out / "fixed-downloads","information-theory.md")
    assert course.read_bytes() == (source / "courses/information-theory.json").read_bytes()
    assert guide.read_bytes() == (source / "courses/information-theory.md").read_bytes()
    expect(page.locator("#applied-result")).to_be_hidden()
    checks.append("Course and corrected guide download as exact fixed bytes even while the table is an invalid draft")
    page.set_viewport_size({"width":1365,"height":1000})
    link = page.locator('a[href="../demo.html"]')
    expect(link).to_have_attribute("rel","noopener")
    with page.expect_popup() as opened:
        link.focus(); link.press("Enter")
    learner = opened.value
    learner.wait_for_load_state()
    assert learner.url == (source / "demo.html").as_uri()
    learner_receipt = receive_learner(learner,source / "demo.html",course,
                                    ROOT / "peer/derived-answers-before-key.json",out / "learner")
    checks.append("Explicit local learner link opens the unchanged receiver, which imports the actual downloaded course and completes all16/review/retry/notes")
    learner.close()
    assert {p.relative_to(source).as_posix():digest(p) for p in source.rglob("*") if p.is_file()} == before
    result = {"schema":"recallweave.information-theory.peer-lab-browser.v1","passed":True,"checks":checks,
              "cases":cases_seen,"sourceBeforeAndAfter":before,"courseSHA256":digest(course),"guideSHA256":digest(guide),
              "learnerReceipt":"learner/learner-receipt.json","learnerChecks":len(learner_receipt["checks"])}
    print(json.dumps({"labChecks":len(checks),"cases":len(cases_seen),"learnerChecks":len(learner_receipt["checks"]),"passed":True}),flush=True)
    (out / "lab-receipt.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    return result

if __name__ == "__main__":
    assert len(sys.argv) == 2
    raise SystemExit(run_receiver(sys.argv[1],phase))
