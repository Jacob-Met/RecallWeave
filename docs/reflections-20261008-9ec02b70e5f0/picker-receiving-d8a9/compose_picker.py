from pathlib import Path
import difflib
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT / "repo"
PUBLISHED = ROOT / "published"
PRIOR = Path("/dev/shm/estate-9ec02b70e5f0/runtime/reflection-5ce/repo")
changes = []

def replace_once(text, old, new, label):
    if text.count(old) != 1:
        raise RuntimeError(f"{label}: expected one exact source anchor, got {text.count(old)}")
    changes.append({"label": label, "old": old, "new": new})
    return text.replace(old, new)

original = (PUBLISHED / "src/app.mjs").read_text()
prior = (PRIOR / "src/app.mjs").read_text()
app = original
reflection_import = next(line for line in prior.splitlines() if "from './reflections.mjs'" in line)
app = replace_once(app, "import { orderOptions } from './answer-order.mjs';",
                   reflection_import + "\nimport { orderOptions } from './answer-order.mjs';", "reflection import")
app = replace_once(app, "let deck = bundledDeck;", "let deck = bundledDeck;\nlet reflections = createReflections(deck.items);", "initial notebook")
app = replace_once(app, "  deck = nextDeck;\n", "  deck = nextDeck;\n  reflections = createReflections(deck.items);\n", "fresh notebook on native session reset")
old_prompt = """  const reflection = deck === bundledDeck
    ? 'Trace energy from sunlight to a cell doing work. Where does the form of energy change, and what molecule transfers it to cellular processes?'
    : 'Choose one connection from this deck and explain how it relates to another idea in your own words.';"""
prompt_helper = """function applicationPrompt() {
  return deck === bundledDeck
    ? APPLICATION_PROMPT
    : 'Choose one connection from this deck and explain how it relates to another idea in your own words.';
}

"""
app = replace_once(app, "function renderResults() {", prompt_helper + "function renderResults() {", "shared native application prompt")
app = replace_once(app, old_prompt, "  const reflection = applicationPrompt();", "render current application prompt")
field_start = prior.index('<section class="reflection reflection-field"')
field_end = prior.index("</section>", field_start) + len("</section>")
field = prior[field_start:field_end].replace("escapeHtml(APPLICATION_PROMPT)", "escapeHtml(reflection)")
field = field.replace("Your writing is not scored. It stays in this tab and is included when you download study notes.",
                      "Your writing is not scored. Download study notes to keep it. Starting a fresh session or another deck clears this writing.")
app = replace_once(app, '<div class="reflection"><strong>Apply it:</strong> ${reflection}</div>', field, "application reflection field")
listeners_start = prior.index("  root.querySelectorAll('[data-reflection-item]')")
listeners_end = prior.index("  const resetButton =", listeners_start)
listeners = prior[listeners_start:listeners_end]
app = replace_once(app, "  const resetButton = root.querySelector('#reset-button');",
                   listeners + "  const resetButton = root.querySelector('#reset-button');", "native reflection input listeners")
app = replace_once(app, "Open a question to see your first answer, the explanation, and an idea to apply.",
                   "Open a question to see your first answer and explanation, then write how you would apply the idea.", "review help")
app = replace_once(app, "Save your questions, first answers, explanations, and any practice answers as a text file.",
                   "Save your questions, first answers, explanations, reflections, and any practice answers as a text file.", "notes help")
app = replace_once(app, "createStudyNotes({deck, review, mastery, practice, conceptLabel})",
                   "createStudyNotes({deck, review, mastery, practice, reflections, conceptLabel, applicationPrompt: applicationPrompt()})",
                   "export exact notebook and displayed prompt")
question_start = prior.index('<div class="reflection-field"><label for="reflection-')
question_end = prior.index("</div>", question_start) + len("</div>")
question = prior[question_start:question_end]
app = replace_once(app, "</p>${practiceAnswer}</div></details>", "</p>" + question + "${practiceAnswer}</div></details>", "question reflection fields")
inverse = app
for change in reversed(changes):
    if inverse.count(change["new"]) != 1:
        raise RuntimeError("noninvertible source change: " + change["label"])
    inverse = inverse.replace(change["new"], change["old"])
if inverse != original:
    raise RuntimeError("native owner app was not preserved by inverse composition")
(REPO / "src/app.mjs").write_text(app)
(ROOT / "app-composition.json").write_text(json.dumps({"inverse_recovers_complete_published_app": True, "changes": changes}, indent=2) + "\n")

# Keep all incoming picker/validator/trace source and safe standalone loader behavior.
builder = (PUBLISHED / "tools/make_demo.py").read_text()
builder = builder.replace('review = (ROOT / "src/review.mjs").read_text()\n',
                          'review = (ROOT / "src/review.mjs").read_text()\nreflections = (ROOT / "src/reflections.mjs").read_text()\n')
review_strip = next(line for line in builder.splitlines() if line.startswith('review = re.sub('))
builder = builder.replace(review_strip, review_strip + "\n" + review_strip.replace("review", "reflections"))
session_strip = next(line for line in builder.splitlines() if line.startswith('session_export = re.sub('))
builder = builder.replace(session_strip, 'session_export = session_export.replace("import { APPLICATION_PROMPT, reflectionSnapshot } from \'./reflections.mjs\';\\n", "")\n' + session_strip)
builder = builder.replace('{review}\\n{session_export}', '{review}\\n{reflections}\\n{session_export}')
(REPO / "tools/make_demo.py").write_text(builder)

exporter = (PRIOR / "src/session-export.mjs").read_text()
exporter = exporter.replace("conceptLabel = id => id })", "conceptLabel = id => id, applicationPrompt = APPLICATION_PROMPT })")
exporter = exporter.replace("  const reflectionById = new Map", """  if (notebook && (typeof applicationPrompt !== 'string' || !applicationPrompt.trim())) {
    throw new TypeError('Study notes need the application prompt shown in this session.');
  }
  const reflectionById = new Map""")
exporter = exporter.replace("Prompt: ${APPLICATION_PROMPT}", "Prompt: ${applicationPrompt}")
(REPO / "src/session-export.mjs").write_text(exporter)

for label, ours, base, theirs, target in [
    ("styles", PRIOR / "styles.css", ROOT / "base-styles.css", PUBLISHED / "styles.css", REPO / "styles.css"),
    ("README", Path("/dev/shm/estate-9ec02b70e5f0/lead/recall-final/README.md"),
     Path("/dev/shm/estate-9ec02b70e5f0/lead/recall-final/incoming-README.md"),
     PUBLISHED / "README.md", REPO / "README.md"),
]:
    result = subprocess.run(["git", "merge-file", "-p", str(ours), str(base), str(theirs)], capture_output=True)
    (ROOT / (label + "-merge.log")).write_bytes(result.stderr)
    if result.returncode:
        (ROOT / (label + "-merge-conflict.txt")).write_bytes(result.stdout)
        raise RuntimeError(f"{label}: current receiving conflict")
    target.write_bytes(result.stdout)
readme = (REPO / "README.md").read_text()
readme = readme.replace("session's first answers and practice. Until then", "session's first answers, practice and reflections. Until then")
readme = readme.replace("keeps the selected deck but clears its answers; reloading", "keeps the selected deck but clears its answers and reflections; reloading")
readme = readme.replace("provides a separate place to describe the complete energy pathway.", "provides a separate place to respond to the current lesson's application prompt: the energy pathway for the bundled example, or a connection between ideas for an imported deck.")
readme = readme.replace("Refreshing or starting a fresh local session clears the writing along with the lesson.", "Starting another deck or a fresh local session clears the writing; a fresh session keeps the selected deck. Reloading also clears writing and returns to the bundled lesson.")
(REPO / "README.md").write_text(readme)
(ROOT / "composition.patch").write_text("".join(
    "".join(difflib.unified_diff((PUBLISHED / path).read_text().splitlines(True), (REPO / path).read_text().splitlines(True),
                                fromfile="published/" + path, tofile="candidate/" + path))
    for path in ["src/app.mjs", "tools/make_demo.py", "styles.css", "README.md"]
))
print(json.dumps({"complete_incoming_app_recovered_by_inverse": True, "source_root": str(REPO), "app_sha256": hashlib.sha256(app.encode()).hexdigest()}))

