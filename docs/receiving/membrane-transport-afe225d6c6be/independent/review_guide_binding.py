# SPDX-License-Identifier: MIT
"""Bind a frozen course and worked guide to an immutable author commit."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

review = Path(sys.argv[1])
repository = Path(sys.argv[2])
commit = sys.argv[3]
items_path = review / "candidate/membrane-transport-r1.json"
guide_path = review / "candidate/membrane-transport-r1.md"
deck = json.loads(items_path.read_text())
guide = guide_path.read_text()
sources = []
for name, local in [
    ("courses/membrane-transport.json", items_path),
    ("courses/membrane-transport.md", guide_path),
]:
    data = local.read_bytes()
    committed = subprocess.check_output(
        ["git", "show", f"{commit}:{name}"], cwd=repository
    )
    assert data == committed, f"Commit/source difference: {name}"
    git_blob = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    sources.append(
        {
            "path": name,
            "review_copy": str(local),
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "git_blob": git_blob,
            "committed_bytes_equal": True,
        }
    )

parts = re.split(r"(?m)^### `([^`]+)` — .*\n", guide)
sections = dict(zip(parts[1::2], parts[2::2], strict=True))
assert list(sections) == [item["id"] for item in deck["items"]]
bindings = []
for item in deck["items"]:
    section = sections[item["id"]]
    answer = re.search(r"\*\*Answer:\*\* “([^”]+)”", section)
    assert answer is not None
    assert answer.group(1) == item["options"][item["answer"]], item["id"]
    distractor_count = len(re.findall(r"(?m)^- \*\*", section))
    transfer_count = len(re.findall(r"(?m)^\*\*Transfer —", section))
    assert distractor_count == 3, item["id"]
    assert transfer_count == 1, item["id"]
    bindings.append(
        {
            "id": item["id"],
            "answer_quotation_matches_json": True,
            "distractor_entries": distractor_count,
            "worked_transfers": transfer_count,
        }
    )

report = {
    "passed": True,
    "author_commit": commit,
    "author_parent": subprocess.check_output(
        ["git", "rev-parse", f"{commit}^"], cwd=repository, text=True
    ).strip(),
    "author_tree": subprocess.check_output(
        ["git", "rev-parse", f"{commit}^{{tree}}"], cwd=repository, text=True
    ).strip(),
    "sources": sources,
    "guide_bindings": bindings,
    "scope": "Exact source and guide structure; scientific judgment is separate.",
}
(review / "guide-binding.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
