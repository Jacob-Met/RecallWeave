"""Independent committed-input and standalone-artifact receiving; no browser run."""
from __future__ import annotations
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys

INPUT_ROOT=Path(__file__).resolve().parent
ROOT=INPUT_ROOT/"qualified-df386b65"
PRODUCER=Path("/home/jacob/recallweave-union-find-44df5c2e45ae")
HEAD="df386b650c481b33bf8a960b50a704e4d75d5934"
TREE="fc636a22eb2553e4e96ab31faccc1368538c6d38"
FROZEN="02618a196ee049e90059aca70b968260a097c11a"
PATHS=("tools/build-union-find.mjs","src/deck.mjs","src/union-find.mjs",
       "src/union-find-ui.mjs","templates/union-find-explorer.html",
       "courses/union-find.json","courses/union-find.md","courses/union-find-explorer.html")
ARTIFACT="courses/union-find-explorer.html"
def stamp(): return datetime.now(timezone.utc).isoformat()
def sha(b): return hashlib.sha256(b).hexdigest()
def facts(b):
    return {"bytes":len(b),"sha256":sha(b),"git_blob":hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()}
def encode(x): return (json.dumps(x,ensure_ascii=False,indent=2,allow_nan=False)+"\n").encode()
def exclusive(p,b):
    p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("xb") as f:
        f.write(b);f.flush();os.fsync(f.fileno())
def git(*args):
    r=subprocess.run(["git","-C",str(PRODUCER),*args],capture_output=True,check=True,timeout=20)
    return r.stdout
started=stamp()
ROOT.mkdir()
if git("rev-parse",HEAD+"^{tree}").decode().strip()!=TREE:
    raise RuntimeError("source_tree_identity_mismatch")
if shutil.disk_usage(ROOT).free < 1024*1024*1024:
    raise RuntimeError("insufficient_private_receiving_headroom")
inputs={p:git("show",HEAD+":"+p) for p in PATHS}
before={p:facts(b) for p,b in inputs.items()}
for p,b in inputs.items():
    if p not in ("src/union-find-ui.mjs",ARTIFACT) and git("show",FROZEN+":"+p)!=b:
        raise RuntimeError("accepted_product_changed_before_receiving:"+p)
    exclusive(ROOT/"retained-source"/p,b)
for p in ("tools/build-union-find.mjs","src/deck.mjs"):
    imports=re.findall(r"^import[^\n]*\bfrom\s+['\"]([^'\"]+)['\"]",inputs[p].decode(),re.M)
    allowed={"node:fs/promises","node:path","node:url","../src/deck.mjs"} if p.startswith("tools/") else set()
    if any(i not in allowed for i in imports):
        raise RuntimeError("undeclared_builder_dependency:"+p)
previous_ui=git("show",FROZEN+":src/union-find-ui.mjs").decode()
width_line="  const width = 336 / roots.reduce((sum, root) => sum + leaves(root), 0);\n"
added_radius="  // Reserve four SVG units between adjacent root circles at the narrowest spacing.\n  const rootRadius = Math.min(23, (width - 4) / 2);\n  const nodeRadius = rootRadius - 5;\n"
if previous_ui.count(width_line)!=1:raise RuntimeError("width_anchor_not_unique")
expected_ui=previous_ui.replace(width_line,width_line+added_radius)
for old,new in (("r: 18, fill: '#fffefa', stroke: color(node)","r: nodeRadius, fill: '#fffefa', stroke: color(node)"),
                ("r: 23, fill: 'none', stroke: color(node)","r: rootRadius, fill: 'none', stroke: color(node)")):
    if expected_ui.count(old)!=1:raise RuntimeError("radius_anchor_not_unique")
    expected_ui=expected_ui.replace(old,new)
if expected_ui.encode()!=inputs["src/union-find-ui.mjs"]:
    raise RuntimeError("UI_delta_exceeds_root_authorized_radius_repair")
if sha(inputs["src/union-find-ui.mjs"])!="a2ac2ea58062c39b3d7aa0cd7ce7bb49f1e9ac6a068b578852f9fa022cc3c981":
    raise RuntimeError("reported_repaired_UI_pin_mismatch")
if sha(inputs[ARTIFACT])!="75ef4e4af235761ca131e4bb15f6b1fb2899653633643b95fa4c219e0ef9ceb7":
    raise RuntimeError("reported_repaired_HTML_pin_mismatch")
invocations=[]
def node(args,cwd):
    r=subprocess.run(["node",*args],cwd=cwd,capture_output=True,timeout=30)
    invocations.append({"command":["node",*args],"cwd":str(cwd),"exit_code":r.returncode,
        "stdout":r.stdout.decode("utf-8","replace"),"stderr":r.stderr.decode("utf-8","replace")})
    return r
node_version=node(["--version"],ROOT).stdout.decode().strip()
fixture=ROOT/"fresh-build"
fixture.mkdir()
for p,b in inputs.items():
    if p!=ARTIFACT: exclusive(fixture/p,b)
if (fixture/ARTIFACT).exists():raise RuntimeError("fresh_build_has_preexisting_artifact")
build=node(["tools/build-union-find.mjs"],fixture)
if build.returncode:raise RuntimeError("fresh_builder_failed")
built=(fixture/ARTIFACT).read_bytes()
if built!=inputs[ARTIFACT]:raise RuntimeError("fresh_generated_html_differs_from_commit")
check=node(["tools/build-union-find.mjs","--check"],fixture)
if check.returncode:raise RuntimeError("fresh_artifact_check_failed")
source_after={p:facts((fixture/p).read_bytes()) for p in PATHS}
if source_after!=before:raise RuntimeError("build_changed_declared_inputs")

class Surface(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.script_depth=0;self.scripts=[];self.current=[]
        self.resource_loads=[];self.styles=[];self.style_depth=0;self.style_current=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="script":
            self.script_depth+=1;self.current=[]
            if "src" in a:self.resource_loads.append({"tag":tag,"attribute":"src","value":a["src"]})
        if tag=="style":self.style_depth+=1;self.style_current=[]
        for name in ("src","srcset","data","poster"):
            if tag in ("img","iframe","frame","embed","object","audio","video","source","track") and name in a:
                self.resource_loads.append({"tag":tag,"attribute":name,"value":a[name]})
        if tag=="link" and "href" in a:
            self.resource_loads.append({"tag":tag,"attribute":"href","value":a["href"]})
    def handle_endtag(self,tag):
        if tag=="script" and self.script_depth:
            self.scripts.append("".join(self.current));self.current=[];self.script_depth-=1
        if tag=="style" and self.style_depth:
            self.styles.append("".join(self.style_current));self.style_current=[];self.style_depth-=1
    def handle_data(self,data):
        if self.script_depth:self.current.append(data)
        if self.style_depth:self.style_current.append(data)
surface=Surface();surface.feed(built.decode());surface.close()
if len(surface.scripts)!=1 or surface.resource_loads:
    raise RuntimeError("standalone_executable_or_resource_closure_changed")
if any(re.search(r"@import\b|url\s*\(",css,re.I) for css in surface.styles):
    raise RuntimeError("css_external_resource_boundary_unqualified")
script=surface.scripts[0]
def constant(name,text):
    selected=[line for line in text.splitlines() if line.startswith("const "+name+" = ")]
    if len(selected)!=1 or not selected[0].endswith(";"):
        raise RuntimeError("embedded_constant_boundary:"+name)
    return json.loads(selected[0][len("const "+name+" = "):-1]).encode()
embedded_course=constant("COURSE_TEXT",script)
embedded_guide=constant("GUIDE_TEXT",script)
if embedded_course!=inputs["courses/union-find.json"] or embedded_guide!=inputs["courses/union-find.md"]:
    raise RuntimeError("embedded_download_source_bytes_differ")
if re.search(r"^\s*(?:import|export)\s",script,re.M):
    raise RuntimeError("standalone_script_has_module_dependency")
exclusive(ROOT/"extracted-script.js",script.encode())
syntax=node(["--check",str(ROOT/"extracted-script.js")],ROOT)
if syntax.returncode:raise RuntimeError("standalone_script_syntax_failed")
# Each refusal control is confined to a separate private fixture. Source is never mutated.
stale=ROOT/"stale-artifact"
stale.mkdir()
for p,b in inputs.items():exclusive(stale/p,b+(b"\n" if p==ARTIFACT else b""))
stale_before=(stale/ARTIFACT).read_bytes()
stale_check=node(["tools/build-union-find.mjs","--check"],stale)
if stale_check.returncode==0 or b"Rebuild the union-find explorer." not in stale_check.stderr:
    raise RuntimeError("one_byte_stale_artifact_not_refused")
if (stale/ARTIFACT).read_bytes()!=stale_before:
    raise RuntimeError("check_modified_stale_artifact")
variant=ROOT/"exact-course-byte-control"
variant.mkdir()
for p,b in inputs.items():exclusive(variant/p,b+(b"\n" if p=="courses/union-find.json" else b""))
variant_check=node(["tools/build-union-find.mjs","--check"],variant)
if variant_check.returncode==0 or b"Rebuild the union-find explorer." not in variant_check.stderr:
    raise RuntimeError("semantically_identical_changed_course_bytes_not_refused")
if (variant/ARTIFACT).read_bytes()!=inputs[ARTIFACT]:
    raise RuntimeError("refusal_changed_variant_artifact")
variant_build=node(["tools/build-union-find.mjs"],variant)
if variant_build.returncode:raise RuntimeError("variant_rebuild_failed")
variant_bytes=(variant/ARTIFACT).read_bytes()
variant_surface=Surface();variant_surface.feed(variant_bytes.decode());variant_surface.close()
if len(variant_surface.scripts)!=1:raise RuntimeError("variant_script_count")
if constant("COURSE_TEXT",variant_surface.scripts[0])!=inputs["courses/union-find.json"]+b"\n":
    raise RuntimeError("rebuilt_variant_did_not_preserve_exact_course_bytes")
if constant("GUIDE_TEXT",variant_surface.scripts[0])!=embedded_guide:
    raise RuntimeError("course_variant_changed_guide")
if json.loads(inputs["courses/union-find.json"])!=json.loads(inputs["courses/union-find.json"]+b"\n"):
    raise RuntimeError("course_byte_control_changed_json_value")
after={p:facts(git("show",HEAD+":"+p)) for p in PATHS}
if after!=before:raise RuntimeError("producer_object_identity_changed")
receipt={"schema":"hamon.union_find_independent_artifact_receiving.v1",
    "worker":"estate-44df5c2e45ae/estate_coordination","state":"artifact_receiving_accept",
    "started_at":started,"finished_at":stamp(),"host":platform.node(),"platform":platform.platform(),
    "python":sys.version,"node":node_version,"producer_source":str(PRODUCER),
    "producer_commit":HEAD,"producer_tree":TREE,"accepted_product_commit":FROZEN,
    "receiver_sha256":sha(Path(__file__).read_bytes()),"inputs":before,
    "six_accepted_inputs_unchanged":True,"producer_objects_unchanged":True,
    "visual_delta":{"previous_UI":facts(previous_ui.encode()),"received_UI":before["src/union-find-ui.mjs"],"exact_root_authorized_radius_change":True,"other_six_inputs_unchanged":True},
    "initial_receiver_failure":json.loads((INPUT_ROOT/"attempt-1-failure.json").read_bytes()),
    "fresh_build_no_preexisting_artifact":True,"fresh_build_exit":build.returncode,
    "fresh_build_exact_bytes":True,"fresh_check_exit":check.returncode,
    "all_eight_fresh_input_and_artifact_bytes_exact":True,
    "artifact":facts(built),"inline_script_count":len(surface.scripts),"inline_style_count":len(surface.styles),
    "external_resource_elements":surface.resource_loads,"css_resource_directives":0,
    "embedded_course":facts(embedded_course),"embedded_guide":facts(embedded_guide),
    "extracted_script":facts(script.encode()),"script_syntax_exit":syntax.returncode,
    "stale_one_byte_artifact_control":{"exit_code":stale_check.returncode,"refused":True,"artifact_unchanged":True,"artifact":facts(stale_before)},
    "course_byte_identity_control":{"json_value_unchanged":True,"changed_course":facts(inputs["courses/union-find.json"]+b"\n"),
       "stale_check_exit":variant_check.returncode,"refused":True,"check_did_not_write":True,
       "rebuild_exit":variant_build.returncode,"rebuilt_exact_variant_embedded":True,
       "guide_unchanged":True,"variant_artifact":facts(variant_bytes)},
    "native_commands":invocations,
    "limits":["Read-only committed source; all generated/control writes are in this exclusive receiving fixture.",
      "No full browser run or dynamic network-isolation claim; root owns browser/offline/accessibility receiving.",
      "No course/algorithm re-review; source_integration owns the independent oracle and source-packet custody.",
      "No README or catalog review claimed here after coordination separated the sibling's four-link/catalog inspection.",
      "No source edit, GitHub publication, live merge, service change, workflow dispatch or native lease.",
      "Static resource-element and CSS closure is distinct from a full dynamic browser request observation.",
      "This receipt is pinned to producer df386b65; later source changes need qualified receiving."]}
exclusive(ROOT/"artifact-receiving.json",encode(receipt))
summary={k:receipt[k] for k in ("state","finished_at","node","producer_commit","producer_tree","fresh_build_exact_bytes","artifact","embedded_course","embedded_guide","script_syntax_exit")}
summary.update(receipt=facts((ROOT/"artifact-receiving.json").read_bytes()),
    stale_control_exit=stale_check.returncode,course_byte_control_exit=variant_check.returncode,variant_rebuild_exit=variant_build.returncode)
print(json.dumps(summary,sort_keys=True))
