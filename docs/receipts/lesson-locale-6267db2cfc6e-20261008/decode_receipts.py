from pathlib import Path
import base64, gzip, hashlib, json, sys

root = Path(__file__).resolve().parent
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=False)
count = 0
for path in sorted((root / "carriers").rglob("*.envelope.json")):
    envelope = json.loads(path.read_bytes())
    assert envelope["schema"] == "immutable-evidence-envelope-v1"
    member = Path(envelope["archive_member"])
    assert not member.is_absolute() and ".." not in member.parts
    raw = base64.b64decode(envelope["payload_base64"], validate=True)
    assert len(raw) == envelope["carrier"]["bytes"]
    assert hashlib.sha256(raw).hexdigest() == envelope["carrier"]["sha256"]
    decoded = gzip.decompress(raw) if envelope["compression"] == "gzip" else raw
    assert len(decoded) == envelope["decoded"]["bytes"]
    assert hashlib.sha256(decoded).hexdigest() == envelope["decoded"]["sha256"]
    destination = out / member
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as handle:
        handle.write(raw)
    count += 1
print(f"Recovered and verified {count} exact evidence carriers.")
