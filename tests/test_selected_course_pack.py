"""Consumer contracts for explicit selected offline packs (Python stdlib only)."""
from hashlib import sha256
import importlib.util
from io import BytesIO
import json
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("selected_pack", PROJECT / "tools/build-selected-course-pack.py")
PACK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACK)

INTRO = '<p class="intro-description">Explore every published course across science, mathematics and computing. See the ideas it connects, download the lesson, and study it in the RecallWeave learner.</p>'


def catalog_for(sources):
    payload = json.dumps(sources, ensure_ascii=True).replace("<", "\\u003c")
    return ('<!doctype html>\r\n<html><head><title>Course catalog · RecallWeave</title></head>'
            '<body>' + INTRO + '<a id="open-learner" href="demo.html">Open learner</a>'
            '<a href="author.html" target="_blank" rel="noopener">Have a lesson to share? Open Deck studio </a>'
            '<script type="application/json" id="course-data">' + payload + '</script>'
            '<script>/* unchanged catalog controls */</script></body></html>\r\n').encode("utf-8")


def unpack(data):
    with zipfile.ZipFile(BytesIO(data)) as archive:
        return {name.removeprefix("RecallWeave/"): archive.read(name) for name in archive.namelist()}


class SelectedCoursePackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="recallweave-selected-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo with spaces"
        (self.root / "courses").mkdir(parents=True)
        (self.root / "catalog").mkdir()
        self.paths = ["courses/alpha.json", "courses/beta.json", "courses/gamma.json"]
        self.originals = {
            self.paths[0]: b'{\r\n  "title": "Alpha", "permission": "Keep this credit."\r\n}\r\n',
            self.paths[1]: '{"title":"βeta — 日本語","note":"</script><script>throw 1</script> &    "}\n'.encode("utf-8"),
            self.paths[2]: b'{"title":"Gamma"}\n',
        }
        for path, data in self.originals.items():
            (self.root / path).write_bytes(data)
        self.sources = [{"path": path, "text": self.originals[path].decode("utf-8")} for path in self.paths]
        (self.root / "catalog/courses.json").write_text(json.dumps(self.paths) + "\n", encoding="utf-8")
        (self.root / "catalog.html").write_bytes(catalog_for(self.sources))
        (self.root / "demo.html").write_bytes(b'<!doctype html><title>Unchanged learner</title>\r\n')
        self.before = self.snapshot()

    def snapshot(self):
        return {path.relative_to(self.root).as_posix(): path.read_bytes()
                for path in self.root.rglob("*") if path.is_file()}

    def test_order_original_bytes_complete_inventory_and_full_pack_preserved(self):
        full_before, _ = PACK.FULL_PACK.build_pack(self.root)
        selection = [self.paths[1], self.paths[0]]
        members = unpack(PACK.build_selected_pack(selection, self.root))
        self.assertEqual(set(members), set(selection) | {
            "demo.html", "catalog.html", "START-HERE.txt", "SELECTED-COURSES.json", "SHA256SUMS.json"})
        for path in selection:
            self.assertEqual(members[path], self.originals[path])
        self.assertEqual(members["demo.html"], self.before["demo.html"])
        record = json.loads(members["SELECTED-COURSES.json"])
        self.assertEqual(record["courses"], selection)
        self.assertEqual(record["complete_pack"], {"bytes": len(full_before), "sha256": sha256(full_before).hexdigest()})
        parser = PACK.FULL_PACK.CatalogData()
        parser.feed(members["catalog.html"].decode("utf-8")); parser.close()
        received = json.loads("".join(parser.parts))
        self.assertEqual([item["path"] for item in received], selection)
        for item in received:
            self.assertEqual(item["text"].encode("utf-8"), self.originals[item["path"]])
        manifest = json.loads(members["SHA256SUMS.json"])
        self.assertEqual(manifest["format"], "recallweave-selected-course-pack-v1")
        self.assertEqual(manifest["files"], [{"path": path, "bytes": len(data), "sha256": sha256(data).hexdigest()}
                         for path, data in sorted(members.items()) if path != "SHA256SUMS.json"])
        full_after, _ = PACK.FULL_PACK.build_pack(self.root)
        self.assertEqual(full_before, full_after)
        self.assertEqual(self.snapshot(), self.before)

    def test_deterministic_zip_and_selection_order_is_observable(self):
        forward = PACK.build_selected_pack(self.paths[:2], self.root)
        self.assertEqual(forward, PACK.build_selected_pack(self.paths[:2], self.root))
        reverse = PACK.build_selected_pack(self.paths[:2][::-1], self.root)
        self.assertNotEqual(forward, reverse)
        with zipfile.ZipFile(BytesIO(forward)) as archive:
            self.assertEqual(archive.namelist(), sorted(archive.namelist()))
            self.assertEqual(archive.comment, b"")
            for entry in archive.infolist():
                self.assertTrue(entry.filename.startswith("RecallWeave/"))
                self.assertEqual(entry.date_time, (1980, 1, 1, 0, 0, 0))
                self.assertTrue(stat.S_ISREG(entry.external_attr >> 16))
                self.assertEqual(entry.compress_type, zipfile.ZIP_STORED)
                self.assertEqual(entry.extra, b"")
        for path in self.paths[:2] + ["demo.html"]:
            self.assertEqual(unpack(forward)[path], unpack(reverse)[path])

    def test_catalog_projection_is_labeled_script_safe_and_keeps_other_markup(self):
        selection = [self.paths[1]]
        html = unpack(PACK.build_selected_pack(selection, self.root))["catalog.html"].decode("utf-8")
        self.assertIn("Selected course pack · RecallWeave", html)
        self.assertIn("This pack contains your selected courses, in the order chosen.", html)
        self.assertNotIn("Explore every published course", html)
        self.assertNotIn("</script><script>throw 1</script>", html)
        self.assertEqual(html.count("</script>"), 2)
        self.assertIn('<a id="open-learner" href="demo.html">Open learner</a>', html)
        self.assertIn('<a href="https://jacobmetoyer.com/RecallWeave/author.html" '
                      'target="_blank" rel="noopener">Have a lesson to share? Open Deck studio online ', html)
        self.assertNotIn('href="author.html"', html)
        self.assertIn('<script>/* unchanged catalog controls */</script>', html)
        parsed = PACK.FULL_PACK.CatalogData(); parsed.feed(html); parsed.close()
        self.assertEqual(json.loads("".join(parsed.parts))[0]["text"].encode("utf-8"), self.originals[self.paths[1]])

    def test_invalid_selections_refuse_without_changing_sources(self):
        cases = [[], self.paths[0], [None], ["../courses/alpha.json"],
                 ["courses/alpha.json", "courses/alpha.json"], ["courses/missing.json"], self.paths * 43]
        for selection in cases:
            with self.subTest(selection=selection):
                with self.assertRaises(ValueError):
                    PACK.build_selected_pack(selection, self.root)
        self.assertEqual(self.snapshot(), self.before)

    def test_full_source_parity_and_layout_remain_required(self):
        path = self.root / self.paths[2]  # Unselected data must still match the checked complete pack.
        path.write_bytes(b'{"title":"Changed"}\n')
        with self.assertRaisesRegex(ValueError, "catalog.html is stale"):
            PACK.build_selected_pack(self.paths[:1], self.root)
        path.write_bytes(self.originals[self.paths[2]])
        catalog = self.root / "catalog.html"
        catalog.write_bytes(catalog.read_bytes().replace(b"Course catalog", b"Renamed catalog"))
        with self.assertRaisesRegex(ValueError, "catalog layout changed"):
            PACK.build_selected_pack(self.paths[:1], self.root)

    def test_real_cli_new_output_existing_file_and_bad_arguments(self):
        (self.root / "tools").mkdir()
        for name in ("build-selected-course-pack.py", "build-offline-pack.py"):
            shutil.copyfile(PROJECT / "tools" / name, self.root / "tools" / name)
        script = self.root / "tools/build-selected-course-pack.py"
        output = Path(self.temp.name) / "chosen lessons.zip"
        command = [sys.executable, "-B", str(script), "--output", str(output), *self.paths[:2]]
        result = subprocess.run(command, cwd=self.temp.name, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        expected = PACK.build_selected_pack(self.paths[:2], self.root)
        self.assertEqual(output.read_bytes(), expected)
        self.assertIn("2 selected courses", result.stdout)
        result = subprocess.run(command, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(output.read_bytes(), expected)
        missing = Path(self.temp.name) / "refused.zip"
        result = subprocess.run([*command[:3], "--output", str(missing), "courses/missing.json"],
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(missing.exists())
        result = subprocess.run(command[:3], capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 2)
        with self.assertRaisesRegex(ValueError, "ending in .zip"):
            PACK.write_new_pack(Path(self.temp.name) / "not-a-zip.txt", expected)


if __name__ == "__main__":
    unittest.main()
