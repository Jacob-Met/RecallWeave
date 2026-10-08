"""Build or verify the offline model-walkthrough.html from the same modular model walkthrough source."""
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
MODULES = ("knowledge.mjs", "model-walkthrough.mjs", "model-walkthrough-ui.mjs")


def bundle_module(name, available):
    source = (ROOT / "src" / name).read_text(encoding="utf-8")
    exports = re.findall(r"^export\s+(?:const|let|function|class)\s+(\w+)", source, re.M)

    def replace_import(match):
        names, path = match.groups()
        if path not in available:
            raise ValueError(f"{name}: unresolved local module {path}")
        fields = []
        for field in names.split(","):
            field = field.strip()
            if field:
                fields.append(re.sub(r"\s+as\s+", ": ", field))
        return "const { " + ", ".join(fields) + " } = __recallweaveWalkthroughModules[" + repr(path) + "];"

    source = re.sub(r"^import\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"];[ \t]*$",
                    replace_import, source, flags=re.M)
    source = re.sub(r"^export\s+(?=(?:const|let|function|class)\b)", "", source, flags=re.M)
    if re.search(r"^\s*(?:import|export)\s", source, re.M):
        raise ValueError(f"{name}: unsupported module syntax")
    return ("__recallweaveWalkthroughModules[" + repr("./" + name) + "] = (() => {\n" + source
            + "\nreturn { " + ", ".join(exports) + " };\n})();\n")


def build():
    template = (ROOT / "model-walkthrough/index.html").read_text(encoding="utf-8")
    style_marker = '<link rel="stylesheet" href="model-walkthrough.css">'
    script_marker = '<script type="module" src="../src/model-walkthrough-ui.mjs"></script>'
    if template.count(style_marker) != 1 or template.count(script_marker) != 1:
        raise ValueError("The model walkthrough template must contain one stylesheet and one module entry.")
    css = (ROOT / "model-walkthrough/model-walkthrough.css").read_text(encoding="utf-8")
    available = set()
    parts = []
    for name in MODULES:
        parts.append(bundle_module(name, available))
        available.add("./" + name)
    script = "(() => {\n'use strict';\nconst __recallweaveWalkthroughModules = Object.create(null);\n" + "\n".join(parts) + "\n})();"
    script = re.sub(r"</script", r"<\\/script", script, flags=re.I)
    return template.replace(style_marker, "<style>\n" + css + "\n</style>").replace(
        script_marker, "<script>\n" + script + "\n</script>").replace('href="../index.html"', 'href="demo.html"')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="refuse if model-walkthrough.html differs from its sources")
    options = parser.parse_args()
    expected = build()
    target = ROOT / "model-walkthrough.html"
    if options.check:
        if not target.is_file() or target.read_text(encoding="utf-8") != expected:
            raise SystemExit("model-walkthrough.html is out of date; run python3 tools/make_model_walkthrough.py")
        print("model-walkthrough.html matches its modular sources")
    else:
        target.write_text(expected, encoding="utf-8")
        print(f"Built {target.name}: {len(expected.encode('utf-8'))} bytes")


if __name__ == "__main__":
    main()
