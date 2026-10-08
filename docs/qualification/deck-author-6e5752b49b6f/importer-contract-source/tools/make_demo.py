#!/usr/bin/env python3
"""Build a double-clickable, dependency-free single-file RecallWeave demo."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text()
css = (ROOT / "styles.css").read_text()
core = (ROOT / "src/knowledge.mjs").read_text()
review = (ROOT / "src/review.mjs").read_text()
deck_model = (ROOT / "src/deck.mjs").read_text()
deck_picker = (ROOT / "src/deck-picker.mjs").read_text()
app = (ROOT / "src/app.mjs").read_text()
deck = (ROOT / "data/deck.json").read_text()

html = html.replace('  <link rel="stylesheet" href="./styles.css">\n', "")
html = html.replace('  <script type="module" src="./src/app.mjs"></script>\n', "")
html = html.replace("</head>", f"<style>\n{css}\n</style>\n</head>")
core = re.sub(r"^export (const|function) ", r"\1 ", core, flags=re.M)
review = re.sub(r"^export (const|function) ", r"\1 ", review, flags=re.M)
deck_model = re.sub(r"^export (const|function) ", r"\1 ", deck_model, flags=re.M)
deck_picker = re.sub(r"^export (const|function) ", r"\1 ", deck_picker, flags=re.M)
deck_picker = re.sub(r"^import .*;\n", "", deck_picker, flags=re.M)
app = re.sub(r"^import .*;\n", "", app, flags=re.M)
loading = "const dataResponse = await fetch('./data/deck.json');\nif (!dataResponse.ok) throw new Error('The local demo deck could not be loaded.');\nconst bundledDeck = validateDeck(await dataResponse.json());"
if app.count(loading) != 1:
    raise RuntimeError("The app's bundled-deck loader changed; update the standalone builder.")
app = app.replace(loading, "const bundledDeck = validateDeck(JSON.parse(document.querySelector('#deck-json').textContent));")
deck = deck.replace("<", "\\u003c")
html = html.replace("</body>", f'<script id="deck-json" type="application/json">{deck}</script>\n<script>\n{core}\n{review}\n{deck_model}\n{deck_picker}\n{app}\n</script>\n</body>')
(ROOT / "demo.html").write_text(html)
print(f"Built {ROOT / 'demo.html'} ({len(html)} bytes)")
