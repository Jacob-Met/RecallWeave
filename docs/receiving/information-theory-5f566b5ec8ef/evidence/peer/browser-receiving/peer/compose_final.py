from pathlib import Path
import json,hashlib,difflib,subprocess,datetime
r=Path("D:/HAMON/recallweave-information-peer-5f566b5ec8ef"); s=r/"source"
oldPins={"courses/information-theory.md":"a912b583a31b9102d39bad7d19be260790218c1de48cb06d7b999bfb8dd39f10","courses/information-theory-explorer.template.html":"aad9d20d37c96d934bfea65336454b077bb4e3edb0cac6683740bb4ccad2d2af","courses/information-theory-explorer.html":"cc22b1a3e1ee5c434a08ce54421426b971ea203f95e56559198fffaf5bb98dd0"}
old={path:(s/path).read_bytes() for path in oldPins}
for path,wanted in oldPins.items():
    assert hashlib.sha256(old[path]).hexdigest()==wanted
    assert (r/"evidence/qualified-first-page-source"/Path(path).name).read_bytes()==old[path]
unchanged={path:hashlib.sha256((s/path).read_bytes()).hexdigest() for path in ("src/information-theory.mjs","src/information-theory-ui.mjs","courses/information-theory.json","tools/build-information-theory.mjs","demo.html")}
guideOld=old["courses/information-theory.md"].decode("utf-8")
oldSentence="Import the downloaded course JSON, inspect the preview, then choose **Start this deck**. The welcome page has a separate **Start** action that begins the questions."
newSentence="Import the downloaded course JSON, inspect the preview, then choose **Start this deck** to begin the questions."
assert guideOld.count(oldSentence)==1
guideNew=guideOld.replace(oldSentence,newSentence)
templateOld=old["courses/information-theory-explorer.template.html"].decode("utf-8")
templateNew=templateOld
for a,b in ((".condition-summary output{font:",".condition-summary output{display:block;font:"),(".condition-summary small{font-size:",".condition-summary small{display:block;font-size:")):
    assert templateNew.count(a)==1
    templateNew=templateNew.replace(a,b)
(s/"courses/information-theory.md").write_text(guideNew,encoding="utf-8",newline="\n")
(s/"courses/information-theory-explorer.template.html").write_text(templateNew,encoding="utf-8",newline="\n")
run=subprocess.run(["C:/Program Files/nodejs/node.EXE","tools/build-information-theory.mjs"],cwd=s,capture_output=True,text=True,timeout=30)
print(json.dumps({"buildExit":run.returncode,"stdout":run.stdout,"stderr":run.stderr}),flush=True)
assert run.returncode==0
newPins={"courses/information-theory.md":"18a2796afa5dd8c8df813c302b904a588b9286e196322005520515204121720a","courses/information-theory-explorer.template.html":"66549626df3ff12872138ac89d023b5372770a5db5ec2d1334730b26dc31b196","courses/information-theory-explorer.html":"338f7ca9e32cd85eb8983c35ec62773ce6fdb8724b927e3dd79c6a93e594a8db"}
files=[]
for path,wanted in newPins.items():
    data=(s/path).read_bytes(); assert hashlib.sha256(data).hexdigest()==wanted,path
    files.append({"path":"source/"+path,"sha256":wanted,"bytes":len(data)})
for path,wanted in unchanged.items(): assert hashlib.sha256((s/path).read_bytes()).hexdigest()==wanted,path
diff="".join(difflib.unified_diff(guideOld.splitlines(True),guideNew.splitlines(True),fromfile="guide-v2",tofile="guide-v3"))+"".join(difflib.unified_diff(templateOld.splitlines(True),templateNew.splitlines(True),fromfile="template-v1",tofile="template-v2"))
v={"schema":"recallweave.information-theory.peer-final-composition.v1","method":"Owner-supplied exact deltas applied to previously qualified preserved MSI inputs; unchanged builder produces all three owner-supplied final hashes.","files":files,"unchanged":unchanged,"buildExit":run.returncode,"stdout":run.stdout,"stderr":run.stderr,"diff":diff,"sourceReadPhase":"Earlier native start_process transfer did not yield JSON to orchestration and was inconclusive; three subsequent read_file calls returned complete final files, but composition does not depend on those strings.","firstSourcesRetained":"evidence/qualified-first-page-source/","utc":datetime.datetime.now(datetime.timezone.utc).isoformat()}
print(json.dumps({"finalPinsMatch":True,"files":files,"diff":diff}),flush=True)
(r/"evidence/final-composition-receipt.json").write_text(json.dumps(v,indent=2)+"\n",encoding="utf-8")
