import sys, pathlib, base64, gzip, hashlib, json
args = sys.argv[1:]
if len(args) == 2 and args[0] == "--gzip":
    compressed = pathlib.Path(args[1]).read_bytes()
elif len(args) == 1:
    encoded = b"".join(pathlib.Path(args[0]).read_bytes().split())
    compressed = base64.b64decode(encoded, validate=True)
else:
    raise SystemExit("Usage: read-receipt.py BASE64_FILE | --gzip GZIP_FILE")
assert len(compressed) == 4922
assert hashlib.sha256(compressed).hexdigest() == "872d4051bcbac6e3b25589d4e50145a958e2ec3244ea2ced575218426f9bc820"
raw = gzip.decompress(compressed)
assert len(raw) == 16236
assert hashlib.sha256(raw).hexdigest() == "92ee29802a9631333a291998d0ebaab005a48387a07a380cbda6ef2d2e7dad96"
receipt = json.loads(raw)
assert receipt["passed"] is True and receipt["browserExecuted"] is False
assert receipt["sourceBefore"] == receipt["sourceAfter"]
assert len(receipt["sourceBefore"]) == 14
assert sum(item["bytes"] for item in receipt["sourceBefore"].values()) == 124214
assert receipt["testSummary"] == {"tests": 11, "pass": 11, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}
assert len(receipt["processes"]) == 3
for process in receipt["processes"]:
    assert process["status"] == 0 and process["signal"] is None and process["error"] is None
    for key in ("stdout", "stderr"):
        stream = process[key]
        original = base64.b64decode(stream["base64"], validate=True)
        assert len(original) == stream["bytes"]
        assert hashlib.sha256(original).hexdigest() == stream["sha256"]
        assert original.decode("utf-8") == stream["utf8"]
    assert process["stderr"]["bytes"] == 0
print(json.dumps({"archive_and_streams_verified": True, "startedAt": receipt["startedAt"], "finishedAt": receipt["finishedAt"], "runtime": receipt["runtime"], "testSummary": receipt["testSummary"], "sourceFiles": 14, "sourceBytes": 124214, "sourceUnchanged": True, "defaultBuilderWroteExactFrozenPage": receipt["defaultBuilderWroteExactFrozenPage"], "browserExecuted": False}, indent=2))
