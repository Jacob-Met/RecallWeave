#!/usr/bin/env python3
"""Package an explicit selection from the checked, complete offline course pack."""
import argparse
from hashlib import sha256
import importlib.util
from io import BytesIO
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FORMAT = "recallweave-selected-course-pack-v1"


def load_full_pack_producer():
    path = Path(__file__).with_name("build-offline-pack.py")
    spec = importlib.util.spec_from_file_location("recallweave_full_pack", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


FULL_PACK = load_full_pack_producer()


class CatalogSpan(FULL_PACK.CatalogData):
    """Locate the checked JSON script without rewriting the rest of the page."""

    def __init__(self, text):
        super().__init__()
        self.line_offsets = [0] + [match.end() for match in re.finditer("\n", text)]
        self.start = None
        self.end = None

    def absolute_position(self):
        line, column = self.getpos()
        return self.line_offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        previous = self.count
        super().handle_starttag(tag, attrs)
        if self.count != previous:
            self.start = self.absolute_position() + len(self.get_starttag_text())

    def handle_endtag(self, tag):
        if tag == "script" and self.inside:
            self.end = self.absolute_position()
        super().handle_endtag(tag)


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError("The compiled catalog layout changed; update the selected-pack adapter.")
    return text.replace(old, new, 1)


def selected_catalog(catalog, selection):
    parser = CatalogSpan(catalog)
    parser.feed(catalog)
    parser.close()
    if parser.count != 1 or parser.inside or parser.start is None or parser.end is None:
        raise ValueError("The compiled catalog must contain one complete course-data script.")
    sources = FULL_PACK.strict_json("".join(parser.parts))
    by_path = {source["path"]: source for source in sources}
    unknown = [path for path in selection if path not in by_path]
    if unknown:
        raise ValueError("Courses are not registered in the checked catalog: " + ", ".join(unknown))
    chosen = [by_path[path] for path in selection]
    # JSON strings retain the original course text, including CRLF. Escaping '<'
    # prevents authored text from closing the surrounding HTML script element.
    payload = json.dumps(chosen, ensure_ascii=True, separators=(",", ":"), allow_nan=False)
    payload = payload.replace("<", "\\u003c")
    result = catalog[:parser.start] + payload + catalog[parser.end:]
    result = replace_once(result, "<title>Course catalog · RecallWeave</title>",
                          "<title>Selected course pack · RecallWeave</title>")
    result = replace_once(
        result,
        '<p class="intro-description">Explore every published course across science, mathematics and computing. See the ideas it connects, download the lesson, and study it in the RecallWeave learner.</p>',
        '<p class="intro-description">This pack contains your selected courses, in the order chosen. Download a lesson below and study it in the bundled RecallWeave learner.</p>',
    )
    # Deck studio is a separate online tool, not a bundled selected-pack file.
    result = replace_once(
        result,
        "<a href=\"author.html\" target=\"_blank\" rel=\"noopener\">Have a lesson to share? Open Deck studio ",
        "<a href=\"https://jacobmetoyer.com/RecallWeave/author.html\" target=\"_blank\" rel=\"noopener\">Have a lesson to share? Open Deck studio online ",
    )
    return result.encode("utf-8")


def build_selected_pack(selection, root=ROOT):
    """Return deterministic ZIP bytes; validate all source inputs before output."""
    if not isinstance(selection, (list, tuple)) or not 1 <= len(selection) <= 128:
        raise ValueError("Select 1-128 registered course paths in the desired order.")
    if any(not isinstance(path, str) or
           not re.fullmatch(r"courses/[a-z0-9][a-z0-9-]*\.json", path)
           for path in selection):
        raise ValueError("Each selection must name a JSON file directly inside courses/.")
    if len(set(selection)) != len(selection):
        raise ValueError("Select each course only once.")

    # The established producer checks the registry, bounded regular source files,
    # and exact parity between every original course and the compiled catalog.
    # No committed ZIP is trusted or changed, and no source file is rewritten.
    complete, _ = FULL_PACK.build_pack(Path(root))
    with zipfile.ZipFile(BytesIO(complete)) as original:
        catalog = original.read("RecallWeave/catalog.html").decode("utf-8")
        projected = selected_catalog(catalog, selection)
        members = {path: original.read("RecallWeave/" + path) for path in selection}
        members["demo.html"] = original.read("RecallWeave/demo.html")
    members["catalog.html"] = projected
    selection_record = {
        "format": "recallweave-course-selection-v1",
        "courses": list(selection),
        "complete_pack": {"bytes": len(complete), "sha256": sha256(complete).hexdigest()},
    }
    members["SELECTED-COURSES.json"] = (
        json.dumps(selection_record, ensure_ascii=True, indent=2) + "\n"
    ).encode("utf-8")
    heading = "RecallWeave offline course pack\n\n"
    if not FULL_PACK.START_HERE.startswith(heading):
        raise ValueError("The full-pack opening instructions changed; update the selected-pack adapter.")
    instructions = "RecallWeave selected course pack\n\nSelected courses, in the requested order:\n"
    instructions += "".join(f"{index}. {path}\n" for index, path in enumerate(selection, 1))
    instructions += (
        "\nOnly these registered course files are included. The unchanged learner\n"
        "still opens its starter lesson until you preview and start a selected course.\n"
        "This selection does not change the published catalog or recommend a study order.\n\n"
        + FULL_PACK.START_HERE[len(heading):]
    )
    members["START-HERE.txt"] = instructions.encode("utf-8")
    manifest = {
        "format": FORMAT,
        "files": [{"path": path, "bytes": len(data), "sha256": sha256(data).hexdigest()}
                  for path, data in sorted(members.items())],
    }
    members["SHA256SUMS.json"] = (
        json.dumps(manifest, ensure_ascii=True, indent=2) + "\n"
    ).encode("utf-8")
    if any(len(data) > FULL_PACK.MAX_MEMBER_BYTES for data in members.values()):
        raise ValueError("A selected-pack member exceeds the full producer's input size limit.")
    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
        for path, data in sorted(members.items()):
            entry = zipfile.ZipInfo("RecallWeave/" + path, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.create_version = 20
            entry.extract_version = 20
            entry.external_attr = (stat.S_IFREG | 0o644) << 16
            entry.compress_type = zipfile.ZIP_STORED
            archive.writestr(entry, data)
    data = output.getvalue()
    if len(data) > FULL_PACK.MAX_ZIP_BYTES:
        raise ValueError("The selected pack exceeds the full producer's ZIP size limit.")
    return data


def write_new_pack(destination, data):
    """Create only a new output; an existing file or symlink is never replaced."""
    destination = Path(destination)
    if destination.suffix.lower() != ".zip":
        raise ValueError("Choose a new output filename ending in .zip.")
    with destination.open("xb") as output:
        own = os.fstat(output.fileno())
        try:
            output.write(data)
            output.flush()
        except BaseException:
            # Preserve an incomplete new file for diagnosis if its path was
            # concurrently replaced; never unlink somebody else's replacement.
            try:
                output.close()
            except OSError:
                pass
            try:
                current = destination.lstat()
                if (current.st_dev, current.st_ino) == (own.st_dev, own.st_ino):
                    destination.unlink()
            except FileNotFoundError:
                pass
            raise


def main(args=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="new destination ZIP; never overwritten")
    parser.add_argument("courses", nargs="+", help="registered courses/*.json paths, in the desired order")
    options = parser.parse_args(args)
    try:
        data = build_selected_pack(options.courses)
        write_new_pack(options.output, data)
        print(f"Built {options.output} ({len(data)} bytes, {len(options.courses)} selected courses).")
        return 0
    except (OSError, ValueError) as error:
        print(f"Selected course pack: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
