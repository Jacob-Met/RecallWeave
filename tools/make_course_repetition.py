"""Build or verify the self-contained question review from the accepted repetition helper."""
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
MODULES = ("deck.mjs", "course-repetition.mjs", "course-repetition-ui.mjs")


def bundle_module(name, available):
    source = (ROOT / "src" / name).read_text(encoding="utf-8")
    exports = re.findall(r"^export\s+(?:const|let|function|class)\s+(\w+)", source, re.M)

    def replace_import(match):
        names, path = match.groups()
        if path not in available:
            raise ValueError(f"{name}: unresolved local module {path}")
        fields = [re.sub(r"\s+as\s+", ": ", field.strip())
                  for field in names.split(",") if field.strip()]
        return "const { " + ", ".join(fields) + " } = __recallweaveRepetitionModules[" + repr(path) + "];"

    source = re.sub(r"^import\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"];[ \t]*$",
                    replace_import, source, flags=re.M)
    source = re.sub(r"^export\s+(?=(?:const|let|function|class)\b)", "", source, flags=re.M)
    if re.search(r"^\s*(?:import|export)\s", source, re.M):
        raise ValueError(f"{name}: unsupported module syntax")
    return ("__recallweaveRepetitionModules[" + repr("./" + name) + "] = (() => {\n"
            + source + "\nreturn { " + ", ".join(exports) + " };\n})();\n")


def build():
    template = (ROOT / "course-repetition/index.html").read_text(encoding="utf-8")
    marker = '<script type="module" src="../src/course-repetition-ui.mjs"></script>'
    if template.count(marker) != 1:
        raise ValueError("The question review template must contain exactly one module entry.")
    available = set()
    parts = []
    for name in MODULES:
        parts.append(bundle_module(name, available))
        available.add("./" + name)
    script = ("(() => {\n'use strict';\nconst __recallweaveRepetitionModules = Object.create(null);\n"
              + "\n".join(parts) + "\n})();")
    script = re.sub(r"</script", r"<\\/script", script, flags=re.I)
    return template.replace(marker, "<script>\n" + script + "\n</script>").replace(
        'href="../author.html"', 'href="author.html"').replace('href="../demo.html"', 'href="demo.html"')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="refuse if course-repetition.html differs from its sources")
    options = parser.parse_args()
    expected = build()
    target = ROOT / "course-repetition.html"
    if options.check:
        if not target.is_file() or target.read_bytes() != expected.encode("utf-8"):
            raise SystemExit("course-repetition.html is out of date; run python3 tools/make_course_repetition.py")
        print("course-repetition.html matches its modular sources")
    else:
        target.write_bytes(expected.encode("utf-8"))
        print(f"Built {target.name}: {len(expected.encode('utf-8'))} bytes")


if __name__ == "__main__":
    main()
