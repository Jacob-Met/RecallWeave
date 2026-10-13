"""Receive only the MinHash directory mapping and generated card integration."""
import datetime, hashlib, json, os, pathlib, platform, re, shutil, subprocess, sys

ROOT=pathlib.Path(__file__).resolve().parent
PACKET=ROOT/"source-packet.json"
NODE=pathlib.Path(r"C:\Program Files\nodejs\node.EXE")
def w(p):
    b=p.read_bytes();s=p.stat()
    return {"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest(),"mode":s.st_mode,"mtime_ns":str(s.st_mtime_ns),"inode":str(s.st_ino)}
def write_json(p,v):p.write_bytes((json.dumps(v,ensure_ascii=True,indent=2)+"\n").encode())
def inventory(root):return {p.relative_to(root).as_posix():w(p) for p in sorted(root.rglob("*")) if p.is_file()}
def main():
    packet=json.loads(PACKET.read_text(encoding="utf-8"))
    receipt={"schema":"recallweave.minhash-directory-receiving/1","parent":"4fe1af561ea65d9a70cbf134565fba0adfda1d74","started_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"identity":{"node":platform.node(),"user":os.environ.get("USERNAME"),"python":sys.executable,"python_version":platform.python_version()},"checks":[],"commands":[],"complete":False}
    originals={"observer":w(pathlib.Path(__file__)),"source_packet":w(PACKET)}
    def check(name,actual,expected=True):
        ok=actual==expected;receipt["checks"].append({"name":name,"passed":ok,"actual":actual,"expected":expected})
        if not ok:raise AssertionError(name)
    def run(label,args,cwd):
        argv=[str(NODE),*args];p=subprocess.run(argv,cwd=cwd,capture_output=True,timeout=30)
        (ROOT/(label+".stdout")).write_bytes(p.stdout);(ROOT/(label+".stderr")).write_bytes(p.stderr)
        receipt["commands"].append({"label":label,"argv":argv,"cwd":str(cwd),"exit":p.returncode,"stdout":p.stdout.decode("utf-8"),"stderr":p.stderr.decode("utf-8")})
        return p
    try:
        check("actual device identity",[platform.node(),os.environ.get("USERNAME")],["MSI","Veria"])
        check("parent source pin",packet["parent"],receipt["parent"])
        check("closure size",len(packet["files"]),137)
        original=ROOT/"original";candidate=ROOT/"candidate"
        original.mkdir();candidate.mkdir()
        for f in packet["files"]:
            rel=pathlib.PurePosixPath(f["path"])
            if rel.is_absolute() or ".." in rel.parts:raise ValueError("Invalid source path")
            b=f["content"].encode("utf-8")
            if len(b)!=f["bytes"] or hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()!=f["git_blob"]:raise ValueError("Source mismatch: "+f["path"])
            p=original/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
        before=inventory(original)
        check("all source blob identities match",all(before[f["path"]]["git_blob"]==f["git_blob"] for f in packet["files"]))
        v=run("node-version",["--version"],ROOT);check("native Node version",v.stdout.decode().strip(),"v24.19.0")
        p=run("original-unmapped-check",["tools/build-site-directory.mjs","--check"],original)
        check("original unmapped check refuses",p.returncode,1)
        check("original exact missing-link diagnostic",p.stderr.decode().strip(),"Every published lab must be linked from catalog/companions.json.")
        check("original refusal no success stdout",p.stdout.decode("utf-8"),"")
        check("original check preserves all source bytes and metadata",inventory(original),before)
        for f in packet["files"]:
            p=candidate/f["path"];p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original/f["path"],p)
        mapping=candidate/"catalog/companions.json";old_mapping=mapping.read_bytes()
        old_span=b'  "courses/probability-foundations.json": [],'
        new_span=b'  "courses/probability-foundations.json": [\n    "courses/minhash-explorer.html"\n  ],'
        check("one intended mapping span",old_mapping.count(old_span),1)
        mapping.write_bytes(old_mapping.replace(old_span,new_span,1))
        old_map=json.loads(old_mapping);new_map=json.loads(mapping.read_bytes())
        check("mapping key order conserved",list(new_map),list(old_map))
        check("only probability mapping changes",[k for k in old_map if old_map[k]!=new_map[k]],["courses/probability-foundations.json"])
        check("probability links exact lab",new_map["courses/probability-foundations.json"],["courses/minhash-explorer.html"])
        candidate_before=inventory(candidate)
        built=run("candidate-build",["tools/build-site-directory.mjs"],candidate)
        check("candidate real build succeeds",built.returncode,0)
        check("candidate build stderr empty",built.stderr.decode(),"")
        after_build=inventory(candidate)
        changed=[k for k in candidate_before if candidate_before[k]!=after_build[k]]
        check("build changes only generated directory",changed,["explore.html"])
        checked=run("candidate-parity-check",["tools/build-site-directory.mjs","--check"],candidate)
        check("candidate exact parity succeeds",checked.returncode,0)
        check("candidate parity stderr empty",checked.stderr.decode(),"")
        check("parity check preserves all candidate files",inventory(candidate),after_build)
        old_html=(original/"explore.html").read_text(encoding="utf-8");new_html=(candidate/"explore.html").read_text(encoding="utf-8")
        pattern=r'<article class="course-card"[\s\S]*?</article>'
        old_cards=re.findall(pattern,old_html);new_cards=re.findall(pattern,new_html)
        check("all 44 cards retained",[len(old_cards),len(new_cards)],[44,44])
        indices=[i for i,c in enumerate(old_cards) if 'href="courses/probability-foundations.json"' in c]
        check("one original probability card",len(indices),1);index=indices[0]
        check("all 43 other cards byte-exact",[i for i,(a,b) in enumerate(zip(old_cards,new_cards)) if a!=b],[index])
        old_card=old_cards[index]
        expected_card=old_card.replace('data-lab="false"','data-lab="true"',1).replace('<span>12 questions \u00b7 4 concepts</span></div>','<span>12 questions \u00b7 4 concepts</span><span class="lab-tag">Interactive lab</span></div>',1).replace('<p class="guide-note">Study the course and work through its companion guide.</p>','<ul class="lab-links"><li><a href="courses/minhash-explorer.html">MinHash \u00b7 The first label tells the story <span aria-hidden="true">\u2197</span></a></li></ul>',1)
        check("literal new probability card",new_cards[index],expected_card)
        expected_html=old_html.replace(old_card,expected_card,1).replace('<strong>39</strong><span>labs &amp;<br>explorers</span>','<strong>40</strong><span>labs &amp;<br>explorers</span>',1).replace('44 courses \u00b7 39 labs','44 courses \u00b7 40 labs',1)
        check("entire generated page differs only by expected card and two totals",new_html,expected_html)
        check("new lab link appears once",new_html.count('href="courses/minhash-explorer.html"'),1)
        check("linked standalone artifact remains exact",w(candidate/"courses/minhash-explorer.html")["git_blob"],"c601c22c99c53aef15de4f21ed4a3fa3ec69b0ce")
        check("shared builder remains exact",w(candidate/"tools/build-site-directory.mjs")["git_blob"],"47c33ca3d8a8671d54e1068d8d0151229a008fca")
        check("original closure remains exact",inventory(original),before)
        final=inventory(candidate)
        check("only two product bytes changed",[k for k in before if before[k]["git_blob"]!=final[k]["git_blob"]],["catalog/companions.json","explore.html"])
        receipt["source_original"]=before;receipt["source_candidate"]=final
        receipt["product_outputs"]={k:final[k] for k in ["catalog/companions.json","explore.html"]}
        receipt["complete"]=True
    except BaseException as e:
        import traceback
        receipt["error"]={"type":type(e).__name__,"message":str(e),"traceback":traceback.format_exc()}
    finally:
        receipt["observer_packet_before"]=originals
        receipt["observer_packet_after"]={"observer":w(pathlib.Path(__file__)),"source_packet":w(PACKET)}
        receipt["observer_packet_conserved"]=receipt["observer_packet_before"]==receipt["observer_packet_after"]
        receipt["complete"]=receipt["complete"] and receipt["observer_packet_conserved"]
        receipt["finished_utc"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
        write_json(ROOT/"receiving.json",receipt)
    print(json.dumps({"complete":receipt["complete"],"checks":len(receipt["checks"]),"passed":sum(x["passed"] for x in receipt["checks"]),"receipt":w(ROOT/"receiving.json"),"outputs":receipt.get("product_outputs")}))
    return 0 if receipt["complete"] else 1
if __name__=="__main__":raise SystemExit(main())
