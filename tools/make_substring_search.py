#!/usr/bin/env python3
"""Build the standalone substring explorer from its exact local source closure."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def render(root=ROOT):
    template = (root / "templates/substring-search-explorer.html").read_text(encoding="utf-8")
    core = (root / "src/substring-search.mjs").read_text(encoding="utf-8")
    ui = (root / "src/substring-search-ui.mjs").read_text(encoding="utf-8")
    css = (root / "src/substring-search.css").read_text(encoding="utf-8")
    course = (root / "courses/substring-search.json").read_bytes().decode("utf-8")
    json.loads(course)
    import_line = "import { buildSearchComparison, EXAMPLES } from './substring-search.mjs';\n"
    if not ui.startswith(import_line):
        raise ValueError("The expected single local model import changed; review the builder.")
    script = core + "\n" + ui[len(import_line):]
    if "</script" in script.lower() or "</style" in css.lower():
        raise ValueError("Source contains a closing raw-text delimiter; review safe embedding.")
    payload = json.dumps(course, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    replacements = {
        "/* SUBSTRING_STYLE */": css,
        "/* SUBSTRING_COURSE */": payload,
        "/* SUBSTRING_SCRIPT */": script,
    }
    for marker, value in replacements.items():
        if template.count(marker) != 1:
            raise ValueError("Expected exactly one template marker: " + marker)
        template = template.replace(marker, value)
    return template.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check the existing artifact without writing it")
    args = parser.parse_args()
    output = ROOT / "courses/substring-search-explorer.html"
    data = render()
    if args.check:
        if not output.is_file() or output.read_bytes() != data:
            raise SystemExit("Substring explorer is missing or differs from its source closure.")
        print("Substring explorer matches its exact source closure.")
    else:
        output.write_bytes(data)
        print("Built " + str(output.relative_to(ROOT)) + " (" + str(len(data)) + " bytes).")


if __name__ == "__main__":
    main()
