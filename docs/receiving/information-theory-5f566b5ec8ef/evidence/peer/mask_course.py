"""Freeze course bytes and reveal only stems/options before peer answer derivation."""
from pathlib import Path
import argparse
import hashlib
import json
from datetime import datetime, timezone

parser = argparse.ArgumentParser()
parser.add_argument("--source", type=Path, required=True)
parser.add_argument("--sha256", required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
raw = args.source.read_bytes()
actual = hashlib.sha256(raw).hexdigest()
assert actual == args.sha256, "Course changed before masked receiving"
course = json.loads(raw)
items = course["items"]
assert len(items) == 16, "Contract expects sixteen authored questions"
assert len({item["id"] for item in items}) == 16
revealed = {"format": course.get("format"), "title": course["title"],
            "concepts": course["concepts"],
            "items": [{key: item[key] for key in ("id", "concept", "prerequisites", "prompt", "options")}
                      for item in items]}
args.output.mkdir(parents=True, exist_ok=False)
(args.output / "sealed-course.json").write_bytes(raw)
masked = (json.dumps(revealed, ensure_ascii=False, indent=2) + "\n").encode()
(args.output / "masked-question-stems.json").write_bytes(masked)
receipt = {"schema": "recallweave.information-theory.peer-masked-course.v1",
           "utc": datetime.now(timezone.utc).isoformat(), "courseSHA256": actual,
           "maskedSHA256": hashlib.sha256(masked).hexdigest(), "items": len(items),
           "revealedItemFields": ["id", "concept", "prerequisites", "prompt", "options"],
           "withheldItemFields": ["answer", "explanation", "transfer"],
           "gate": "Peer derives selected answer indices and reasoning into a separate frozen file before comparing the sealed answers or reading explanations/transfer prompts.",
           "sourceUnchanged": hashlib.sha256(args.source.read_bytes()).hexdigest() == actual}
print(json.dumps(receipt), flush=True)
(args.output / "mask-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
