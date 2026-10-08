"""Bounded receiving of owner guide instruction and conditional-unit layout correction."""
from pathlib import Path
import hashlib
import json
import sys
from playwright.sync_api import expect
from browser_runner import ROOT,run_receiver

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def phase(page,context,out):
    source=ROOT/"source"
    verified=json.loads((ROOT/"evidence/final-composition-receipt.json").read_text(encoding="utf-8"))
    for entry in verified["files"]:
        assert digest(ROOT/entry["path"])==entry["sha256"]
    assert digest(source/"src/information-theory-ui.mjs")=="2f2ae2185265e1e02f5203b76a6d49dff621fa8fda04526475e38f71432dfd7b"
    assert digest(source/"src/information-theory.mjs")=="fd27c5edd17777515814fc5152e31c2a3407fdcaa851d83eb4ca345969ce7558"
    assert digest(source/"courses/information-theory.json")=="1ed27859b54da0f8a836f8e0d8f176f04727dbf3852e10c4b7310446a0f0742b"
    page.goto((source/"courses/information-theory-explorer.html").as_uri())
    expect(page.locator("#applied-summary")).to_have_text("8 cards · 2 X labels · 2 Y labels")
    with page.expect_download() as pending:
        page.locator("#download-guide").focus()
        page.locator("#download-guide").press("Enter")
    downloaded=pending.value
    assert downloaded.suggested_filename=="information-theory.md"
    guide=out/"information-theory.md"
    downloaded.save_as(str(guide))
    assert guide.read_bytes()==(source/"courses/information-theory.md").read_bytes()
    text=guide.read_text(encoding="utf-8")
    assert "The welcome page has a separate" not in text
    page.locator("#example-choice").select_option("rare")
    page.locator("#use-example").focus(); page.locator("#use-example").press("Enter")
    page.locator("#condition-axis").select_option("X")
    page.locator("#condition-value").select_option("1")
    expect(page.locator("#condition-heading")).to_have_text("What happens to Y after seeing X2?")
    expect(page.locator("#entropy-after")).to_have_text("1")
    expect(page.locator("#conditional-average")).to_have_text("0.2")
    expect(page.locator("#condition-message")).to_contain_text("increases uncertainty")
    measurements=[]
    panel=page.locator("section.panel:has(#conditioning-heading)")
    for name,width,height in (("desktop",1365,1000),("phone",390,844)):
        page.set_viewport_size({"width":width,"height":height})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
        cards=page.locator(".condition-summary>div")
        expect(cards).to_have_count(3)
        bounds=cards.evaluate_all("""cards => cards.map(card => {
            const output=card.querySelector("output"), unit=card.querySelector("small");
            const a=output.getBoundingClientRect(), b=unit.getBoundingClientRect();
            return {output:output.textContent,unit:unit.textContent,
                    outputBottom:a.bottom,unitTop:b.top,outputRight:a.right,unitLeft:b.left,
                    outputDisplay:getComputedStyle(output).display,unitDisplay:getComputedStyle(unit).display};
        })""")
        assert all(x["outputBottom"]<=x["unitTop"]+1 for x in bounds),bounds
        assert all(x["outputDisplay"]==x["unitDisplay"]=="block" for x in bounds),bounds
        panel.screenshot(path=str(out/("conditional-"+name+".png")))
        if name=="phone":
            page.locator(".hero").screenshot(path=str(out/"final-phone-course-card.png"))
        measurements.append({"viewport":{"width":width,"height":height},"cards":bounds})
    for entry in verified["files"]:
        assert digest(ROOT/entry["path"])==entry["sha256"]
    result={"schema":"recallweave.information-theory.peer-final-bounded-browser.v1","passed":True,
            "scope":"Only corrected guide download and conditional-card desktop/390px layout; no repeated12-case lab or16-question learner.",
            "guideSHA256":digest(guide),"pageSHA256":digest(source/"courses/information-theory-explorer.html"),
            "templateSHA256":digest(source/"courses/information-theory-explorer.template.html"),
            "unchangedUI":"2f2ae2185265e1e02f5203b76a6d49dff621fa8fda04526475e38f71432dfd7b",
            "measurements":measurements,"sourceUnchanged":True}
    print(json.dumps({"finalBoundedPassed":True,"guideSHA256":result["guideSHA256"],"viewports":2}),flush=True)
    (out/"bounded-receipt.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    return result

if __name__=="__main__":
    assert len(sys.argv)==2
    raise SystemExit(run_receiver(sys.argv[1],phase))
