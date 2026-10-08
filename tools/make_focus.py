#!/usr/bin/env python3
"""Build the dependency-free, directly openable Lesson focus page."""
from pathlib import Path
import argparse
import re

ROOT = Path(__file__).resolve().parents[1]


def build():
    template = (ROOT / "focus/index.html").read_text(encoding="utf-8")
    css = (ROOT / "focus/focus.css").read_text(encoding="utf-8")
    modules = []
    for path in ("src/deck.mjs", "src/course-focus.mjs", "src/course-focus-ui.mjs"):
        source = (ROOT / path).read_text(encoding="utf-8")
        source = re.sub(r"^import [^\n]+;\n", "", source, flags=re.MULTILINE)
        source = re.sub(r"^export (?=(?:const|function|class)\b)", "", source, flags=re.MULTILINE)
        if re.search(r"^\s*(?:import|export)\s", source, re.MULTILINE):
            raise ValueError(f"Unbundled module syntax in {path}")
        if "</script" in source.lower():
            raise ValueError(f"Unsafe script terminator in {path}")
        modules.append(f"// {path}\n{source}")
    stylesheet = '<link rel="stylesheet" href="./focus.css">'
    entry = '<script type="module" src="../src/course-focus-ui.mjs"></script>'
    if template.count(stylesheet) != 1 or template.count(entry) != 1:
        raise ValueError("Expected one stylesheet and module entry point")
    result = template.replace(stylesheet, f"<style>\n{css}</style>")
    result = result.replace(entry, '<script type="module">\n' + "\n".join(modules) + "</script>")
    for name in ("demo.html", "author.html"):
        result = result.replace(f'href="../{name}"', f'href="{name}"')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the checked-in standalone file")
    args = parser.parse_args()
    output = ROOT / "focus.html"
    result = build()
    if args.check:
        if not output.exists() or output.read_bytes() != result.encode("utf-8"):
            raise SystemExit("focus.html differs from its sources. Run python3 tools/make_focus.py.")
        print("focus.html matches its modular sources.")
    else:
        output.write_text(result, encoding="utf-8", newline="\n")
        print(f"Built focus.html ({len(result.encode('utf-8')):,} UTF-8 bytes).")


if __name__ == "__main__":
    main()
