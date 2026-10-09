"""Build or verify the self-contained CSV exporter from its unchanged core modules."""
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]
MODULES = ("deck.mjs", "course-csv.mjs", "course-csv-export.mjs", "course-csv-export-ui.mjs")


def bundle_module(name, available):
    source = (ROOT / "src" / name).read_text(encoding="utf-8")
    exports = re.findall(r"^export\s+(?:const|let|function|class)\s+(\w+)", source, re.M)

    def replace_import(match):
        names, path = match.groups()
        if path not in available:
            raise ValueError(f"{name}: unresolved local module {path}")
        fields = [re.sub(r"\s+as\s+", ": ", field.strip())
                  for field in names.split(",") if field.strip()]
        return "const { " + ", ".join(fields) + " } = __recallweaveCsvExportModules[" + repr(path) + "];"

    source = re.sub(r"^import\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"];[ \t]*$",
                    replace_import, source, flags=re.M)
    source = re.sub(r"^export\s+(?=(?:const|let|function|class)\b)", "", source, flags=re.M)
    if re.search(r"^\s*(?:import|export)\s", source, re.M):
        raise ValueError(f"{name}: unsupported module syntax")
    return ("__recallweaveCsvExportModules[" + repr("./" + name) + "] = (() => {\n"
            + source + "\nreturn { " + ", ".join(exports) + " };\n})();\n")


def build():
    template = (ROOT / "csv-export/index.html").read_text(encoding="utf-8")
    marker = '<script type="module" src="../src/course-csv-export-ui.mjs"></script>'
    if template.count(marker) != 1:
        raise ValueError("The CSV export template must contain exactly one module entry.")
    available = set()
    parts = []
    for name in MODULES:
        parts.append(bundle_module(name, available))
        available.add("./" + name)
    script = ("(() => {\n'use strict';\nconst __recallweaveCsvExportModules = Object.create(null);\n"
              + "\n".join(parts) + "\n})();")
    script = re.sub(r"</script", r"<\\/script", script, flags=re.I)
    return template.replace(marker, "<script>\n" + script + "\n</script>").replace(
        'href="../author.html"', 'href="author.html"').replace('href="../demo.html"', 'href="demo.html"')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="refuse if csv-export.html differs from its sources")
    options = parser.parse_args()
    expected = build()
    target = ROOT / "csv-export.html"
    if options.check:
        if not target.is_file() or target.read_bytes() != expected.encode("utf-8"):
            raise SystemExit("csv-export.html is out of date; run python3 tools/make_csv_export.py")
        print("csv-export.html matches its modular sources")
    else:
        target.write_bytes(expected.encode("utf-8"))
        print(f"Built {target.name}: {len(expected.encode('utf-8'))} bytes")


if __name__ == "__main__":
    main()
