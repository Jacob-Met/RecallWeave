#!/usr/bin/env python3
"""Build a double-clickable, dependency-free single-file RecallWeave demo."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
core = (ROOT / "src/knowledge.mjs").read_text(encoding="utf-8")
review = (ROOT / "src/review.mjs").read_text(encoding="utf-8")
reflections = (ROOT / "src/reflections.mjs").read_text(encoding="utf-8")
reflection_file = (ROOT / "src/reflection-file.mjs").read_text(encoding="utf-8")
reflection_file_ui = (ROOT / "src/reflection-file-ui.mjs").read_text(encoding="utf-8")
deck_model = (ROOT / "src/deck.mjs").read_text(encoding="utf-8")
deck_picker = (ROOT / "src/deck-picker.mjs").read_text(encoding="utf-8")
session_export = (ROOT / "src/session-export.mjs").read_text(encoding="utf-8")
trace_archive = (ROOT / "src/trace-archive.mjs").read_text(encoding="utf-8")
trace_archive_ui = (ROOT / "src/trace-archive-ui.mjs").read_text(encoding="utf-8")
lesson_archive = (ROOT / "src/lesson-archive.mjs").read_text(encoding="utf-8")
lesson_archive_ui = (ROOT / "src/lesson-archive-ui.mjs").read_text(encoding="utf-8")
answer_order = (ROOT / "src/answer-order.mjs").read_text(encoding="utf-8")
app = (ROOT / "src/app.mjs").read_text(encoding="utf-8")
deck = (ROOT / "data/deck.json").read_text(encoding="utf-8")

html = html.replace('  <link rel="stylesheet" href="./styles.css">\n', "")
html = html.replace('  <script type="module" src="./src/app.mjs"></script>\n', "")
html = html.replace("</head>", f"<style>\n{css}\n</style>\n</head>")
core = re.sub(r"^export (const|function) ", r"\1 ", core, flags=re.M)
review = re.sub(r"^export (const|function) ", r"\1 ", review, flags=re.M)
reflections = re.sub(r"^export (const|function) ", r"\1 ", reflections, flags=re.M)
session_export = session_export.replace("import { APPLICATION_PROMPT, reflectionSnapshot } from './reflections.mjs';\n", "")
session_export = re.sub(r"^export (const|function) ", r"\1 ", session_export, flags=re.M)
answer_order = re.sub(r"^export (const|function) ", r"\1 ", answer_order, flags=re.M)
deck_model = re.sub(r"^export (const|function) ", r"\1 ", deck_model, flags=re.M)
deck_picker = re.sub(r"^export (const|function) ", r"\1 ", deck_picker, flags=re.M)
deck_picker = re.sub(r"^import .*;\n", "", deck_picker, flags=re.M)
trace_archive = re.sub(r"^import .+;\n", "", trace_archive, flags=re.M)
trace_archive = re.sub(r"^export (const|function) ", r"\1 ", trace_archive, flags=re.M)
trace_archive_ui = re.sub(r"^import .+;\n", "", trace_archive_ui, flags=re.M)
trace_archive_ui = re.sub(r"^export (const|function) ", r"\1 ", trace_archive_ui, flags=re.M)
lesson_archive = re.sub(r"^import .+;\n", "", lesson_archive, flags=re.M)
lesson_archive = re.sub(r"^export (const|function) ", r"\1 ", lesson_archive, flags=re.M)
# Keep private codec helpers scoped when composing the classic single-file demo.
lesson_archive = ("const {LESSON_ARCHIVE_MAX_BYTES, createLessonArchive, readLessonArchive} = (() => {\n"
                  + lesson_archive
                  + "\nreturn {LESSON_ARCHIVE_MAX_BYTES, createLessonArchive, readLessonArchive};\n})();")
lesson_archive_ui = re.sub(r"^import .+;\n", "", lesson_archive_ui, flags=re.M)
lesson_archive_ui = re.sub(r"^export (const|function) ", r"\1 ", lesson_archive_ui, flags=re.M)
reflection_file = re.sub(r"^import .+;\n", "", reflection_file, flags=re.M)
reflection_file = re.sub(r"^export (const|function) ", r"\1 ", reflection_file, flags=re.M)
reflection_file = ("const {REFLECTION_FILE_MAX_BYTES, createReflectionFile, readReflectionFile} = (() => {\n"
                   + reflection_file
                   + "\nreturn {REFLECTION_FILE_MAX_BYTES, createReflectionFile, readReflectionFile};\n})();")
reflection_file_ui = re.sub(r"^import .+;\n", "", reflection_file_ui, flags=re.M)
reflection_file_ui = re.sub(r"^export (const|function) ", r"\1 ", reflection_file_ui, flags=re.M)
app = re.sub(r"^import .*;\n", "", app, flags=re.M)
loading = "const dataResponse = await fetch('./data/deck.json');\nif (!dataResponse.ok) throw new Error('The local demo deck could not be loaded.');\nconst bundledSource = await dataResponse.json();\nconst bundledDeck = validateDeck(bundledSource);"
if app.count(loading) != 1:
    raise RuntimeError("The app's bundled-deck loader changed; update the standalone builder.")
app = app.replace(loading, "const bundledSource = JSON.parse(document.querySelector('#deck-json').textContent);\nconst bundledDeck = validateDeck(bundledSource);")
deck = deck.replace("<", "\\u003c")
html = html.replace("</body>", f'<script id="deck-json" type="application/json">{deck}</script>\n<script>\n{core}\n{review}\n{reflections}\n{reflection_file}\n{reflection_file_ui}\n{session_export}\n{answer_order}\n{deck_model}\n{deck_picker}\n{trace_archive}\n{trace_archive_ui}\n{lesson_archive}\n{lesson_archive_ui}\n{app}\n</script>\n</body>')
(ROOT / "demo.html").write_text(html, encoding="utf-8", newline="\n")
print(f"Built {ROOT / 'demo.html'} ({len(html.encode('utf-8'))} bytes)")
