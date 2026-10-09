#!/usr/bin/env python3
"""Bundle the owned quantum lesson as one deterministic, directly openable page."""
import base64
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MAX_INPUT_BYTES = 262144
MAX_HTML_BYTES = 1048576
OUTPUT = ROOT / "courses/quantum-states-lab.html"


def read(relative):
    with (ROOT / relative).open("rb") as source:
        raw = source.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        raise ValueError(f"{relative} exceeds {MAX_INPUT_BYTES} bytes.")
    raw.decode("utf-8", errors="strict")
    return raw


def build():
    template = read("courses/quantum-states-lab.template.html").decode("utf-8")
    core = read("courses/quantum-states-core.mjs").decode("utf-8")
    ui = read("courses/quantum-states-ui.mjs").decode("utf-8")
    expected = "import { BASIS_ORDER, MAX_GATES, simulateCircuit } from './quantum-states-core.mjs';\n"
    if not ui.startswith(expected):
        raise ValueError("The interface must retain its explicit local core import.")
    core = re.sub(r"^export (?=(?:const|function) )", "", core, flags=re.MULTILINE)
    ui = ui[len(expected):]
    if re.search(r"^\s*(?:import|export)\b", core + "\n" + ui, re.MULTILINE):
        raise ValueError("Unbundled module statement.")
    if "</script" in (core + ui).lower():
        raise ValueError("Embedded source contains a script terminator.")
    course = read("courses/quantum-states.json")
    guide = read("courses/quantum-states.md")
    json.loads(course.decode("utf-8"))
    data = json.dumps({
        "course": base64.b64encode(course).decode("ascii"),
        "guide": base64.b64encode(guide).decode("ascii")
    }, separators=(",", ":"))
    for marker, value in [("@@DATA@@", data), ("@@CORE@@", core), ("@@UI@@", ui)]:
        if template.count(marker) != 1:
            raise ValueError(f"Template must contain exactly one {marker}.")
        template = template.replace(marker, value)
    raw = template.encode("utf-8")
    if len(raw) > MAX_HTML_BYTES:
        raise ValueError("Generated HTML exceeds one MiB.")
    return raw


def main():
    if sys.argv[1:] not in ([], ["--check"]):
        print("Usage: python3 tools/build_quantum_states_lab.py [--check]", file=sys.stderr)
        return 2
    try:
        raw = build()
        if sys.argv[1:]:
            if OUTPUT.read_bytes() != raw:
                raise ValueError("quantum-states-lab.html is stale; run the builder.")
            print("quantum-states-lab.html matches all five owned inputs.")
        else:
            OUTPUT.write_bytes(raw)
            print(f"Built quantum-states-lab.html ({len(raw)} bytes).")
        return 0
    except (OSError, ValueError, UnicodeError) as error:
        print(f"Quantum lab: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
