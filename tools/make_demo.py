#!/usr/bin/env python3
"""Build a double-clickable, dependency-free single-file RecallWeave demo."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text()
css = (ROOT / "styles.css").read_text()
core = (ROOT / "src/knowledge.mjs").read_text()
review = (ROOT / "src/review.mjs").read_text()
session_export = (ROOT / "src/session-export.mjs").read_text()
answer_order = (ROOT / "src/answer-order.mjs").read_text()
app = (ROOT / "src/app.mjs").read_text()
deck = (ROOT / "data/deck.json").read_text()

html = html.replace('  <link rel="stylesheet" href="./styles.css">\n', "")
html = html.replace('  <script type="module" src="./src/app.mjs"></script>\n', "")
html = html.replace("</head>", f"<style>\n{css}\n</style>\n</head>")
core = re.sub(r"^export (const|function) ", r"\1 ", core, flags=re.M)
review = re.sub(r"^export (const|function) ", r"\1 ", review, flags=re.M)
session_export = re.sub(r"^export (const|function) ", r"\1 ", session_export, flags=re.M)
answer_order = re.sub(r"^export (const|function) ", r"\1 ", answer_order, flags=re.M)
app = app.replace("import { orderOptions } from './answer-order.mjs';\n", "")
app = app.replace("import { createStudyNotes } from './session-export.mjs';\n", "")
app = app.replace("import { answerPractice, beginPractice, createReview, currentPracticeItem } from './review.mjs';\n", "")
app = app.replace("import { DEFAULT_BKT, initialMastery, runLearnerSimulation, selectNextItem, updateMastery } from './knowledge.mjs';\n\nconst root = document.querySelector('#session-content');\nconst dataResponse = await fetch('./data/deck.json');\nif (!dataResponse.ok) throw new Error('The local demo deck could not be loaded.');\nconst deck = await dataResponse.json();", "const root = document.querySelector('#session-content');\nconst deck = JSON.parse(document.querySelector('#deck-json').textContent);")
html = html.replace("</body>", f'<script id="deck-json" type="application/json">{deck}</script>\n<script>\n{core}\n{review}\n{session_export}\n{answer_order}\n{app}\n</script>\n</body>')
(ROOT / "demo.html").write_text(html)
print(f"Built {ROOT / 'demo.html'} ({len(html)} bytes)")
