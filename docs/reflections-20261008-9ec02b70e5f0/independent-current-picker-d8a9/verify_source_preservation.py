"""Independent byte custody for the landed course implementation and receiving source.

This checks source preservation only. Browser behavior is recorded separately.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def native_function(text, name):
    start = re.search(r"^function " + re.escape(name) + r"\(", text, re.M)
    if start is None:
        raise AssertionError("Missing native function: " + name)
    following = re.search(r"^(?:function \w+\(|mountDeckPicker\()", text[start.end():], re.M)
    if following is None:
        raise AssertionError("Missing next top-level boundary: " + name)
    return text[start.start():start.end() + following.start()].rstrip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    here = Path(__file__).resolve().parent
    parser.add_argument("--pins", type=Path, default=here / "source-pins.json")
    parser.add_argument("--root", type=Path)
    parser.add_argument("--output", type=Path, default=here / "source-preservation.json")
    args = parser.parse_args()
    pins = json.loads(args.pins.read_text())
    root = args.root or Path(pins["source_root"])
    sources = {}
    for name, expected in pins["files"].items():
        raw = (root / name).read_bytes()
        actual = {"sha256": sha256(raw), "size": len(raw)}
        if actual != expected:
            raise AssertionError("Receiving source pin changed: " + name)
        sources[name] = actual
    if len(sources) != 15:
        raise AssertionError("This receiver expects all fifteen runtime/build paths")
    owner_blobs = json.loads((here / "landed-owner-blobs.json").read_text())
    observed_owner = {}
    for name, expected in owner_blobs.items():
        actual = git_blob((root / name).read_bytes())
        if actual != expected:
            raise AssertionError("Landed owner dependency changed: " + name)
        observed_owner[name] = actual
    old_raw = (here / "landed-app-source.mjs.source").read_bytes()
    if git_blob(old_raw) != "19ea1e64b7a83c9943e3a7ebff887b6224bcba09":
        raise AssertionError("Landed application before-image changed")
    old = old_raw.decode("utf-8")
    current = (root / "src/app.mjs").read_text()
    unchanged = {}
    for name in ["renderDeckContext", "setProgress", "renderMastery", "conceptLabel",
                 "renderQuestion", "submitAnswer", "escapeHtml", "renderPracticeSummary",
                 "renderPracticeQuestion", "renderSimulation", "bindWelcome"]:
        before = native_function(old, name)
        after = native_function(current, name)
        if after != before:
            raise AssertionError("Unrelated native function changed: " + name)
        unchanged[name] = sha256(before.encode())
    reset = native_function(current, "resetSession")
    added = "  reflections = createReflections(deck.items);\n"
    if reset.count(added) != 1 or reset.replace(added, "") != native_function(old, "resetSession"):
        raise AssertionError("Reset composition exceeds fresh notebook initialization")
    callback_pattern = r"  restoreTrace: state => \{[\s\S]*?\n  \}\n\}\);"
    old_callback = re.search(callback_pattern, old).group()
    new_callback = re.search(callback_pattern, current).group()
    if old_callback != new_callback:
        raise AssertionError("Landed trace restore callback changed")
    if current.count("reflections = createReflections(deck.items);") != 2:
        raise AssertionError("Notebook initialization must occur once initially and once on native reset")
    if sources["src/reflections.mjs"]["sha256"] != "92354bccb48deb7c3455d4f9d0e922f7b8b5d45d3d7bbf1968d23ad2818fe330":
        raise AssertionError("Original notebook state module changed")
    helpers = (here / "course-helpers.mjs.part").read_text()
    scenarios = (here / "course-scenarios.mjs.part").read_text()
    receiver = (here / "verify_course_notebook_receiving.mjs").read_text()
    if receiver.count(helpers + "\n") != 1 or receiver.count(scenarios + "\n") != 1:
        raise AssertionError("Independent insertion set changed")
    reduced = receiver.replace(helpers + "\n", "").replace(scenarios + "\n", "")
    if sha256(reduced.encode()) != "8ef5554e125ea85a31dcee1c596cc19354c50b2d98d113b0ed417e5ec131bfa2":
        raise AssertionError("Historical six scenarios or helpers changed")
    report = {"status": "passed", "kind": "source-preservation-only", "source_root": str(root),
              "source_files": sources, "landed_owner_blobs": observed_owner,
              "unchanged_native_functions_sha256": unchanged,
              "native_reset_delta": "one fresh createReflections(deck.items) assignment",
              "trace_restore_callback_sha256": sha256(old_callback.encode()),
              "historical_six_scenarios_and_helpers_unchanged": True,
              "receiver_sha256": sha256(receiver.encode()),
              "browser_behavior_qualified_by_this_script": False}
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"status": "passed", "source_files": len(sources),
                      "landed_owner_blobs": len(observed_owner),
                      "unchanged_native_functions": len(unchanged), "output": str(args.output)}))


if __name__ == "__main__":
    main()
