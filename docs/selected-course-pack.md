# Make a selected offline course pack

Use this when a class, study group or individual needs a few existing courses in
one portable download. Choose the course files and their order explicitly. The
result contains the existing RecallWeave learner, a catalog showing that selection,
and the original selected JSON files. It does not change the published catalog.

From a complete current checkout, with Python 3.9 or newer:

```sh
python3 -B tools/build-selected-course-pack.py \
  --output "/path/to/new/algorithm-lessons.zip" \
  courses/binary-search.json \
  courses/euclidean-algorithm.json
```

Use an existing destination directory and a **new** filename ending in `.zip`.
The tool refuses to replace a file, directory or symlink already at that path.
It resolves repository inputs relative to the script, so the invocation's working
directory does not determine which catalog is packaged. Python's standard library
is sufficient; the build needs no connection or package installation.

The ordered paths must be distinct entries from `catalog/courses.json`. Select
between 1 and 128 courses. Unknown courses, duplicate selections and paths outside
the catalog are refused. This ordering records your choice; it does not infer
prerequisites or recommend a curriculum.

## Open and study

1. Extract the complete ZIP and keep its `RecallWeave` folder together.
2. Open `catalog.html` in a browser with JavaScript enabled. It shows only the
   selected courses, in the requested order, with the existing search, previews,
   source credits and course-download controls.
3. Download a course JSON, then choose **Open learner**. The sibling `demo.html`
   opens in a separate tab.
4. Under **Bring your own lesson**, choose the downloaded JSON or its identical
   copy in the extracted `courses` folder. Inspect the preview and choose
   **Start this deck** when ready.

The learner itself is unchanged. It initially shows its bundled starter lesson;
opening a pack or previewing a file does not automatically start a selected course.
Starting a deck begins a new session. Use the existing explicit study-record
downloads to retain work before reloading or replacing that session.

The selected catalog and learner work offline. Interactive labs, worked guides,
Deck studio and the other tools are separate downloads. The selected catalog's
**Open Deck studio online** link uses the same published HTTPS destination as the
learner and needs a connection; it does not look for an unbundled local file.
Other optional tools may need a connection or a separately supplied file.

## What is in the ZIP

Every entry is an ordinary file under one `RecallWeave/` directory:

| File | Purpose |
| --- | --- |
| `catalog.html` | The current compiled catalog, with its embedded course list reduced to the explicit selection and its title/introduction labeled accordingly. Its existing CSS and executable JavaScript are retained. |
| `demo.html` | The exact original standalone learner bytes. |
| Selected `courses/*.json` | Exact original files, including their source credits, permission statements, Unicode and original line endings. Unselected course JSON files are omitted. |
| `START-HERE.txt` | The selected paths in order and the existing extraction/learner instructions. |
| `SELECTED-COURSES.json` | The ordered selection and the byte length/SHA-256 of the complete validated pack from which it was derived. |
| `SHA256SUMS.json` | Format `recallweave-selected-course-pack-v1`, with the path, byte length and SHA-256 of every other file in this ZIP. |

ZIP member order, timestamps, file modes and compression settings are fixed, so
the same source inputs and selection reproduce the same archive bytes. A different
selection order changes the catalog and selection records. Hashes describe file
integrity; they are not authenticated signatures, authorship claims or evidence
of educational effectiveness.

## Relationship to the complete pack

The selected-pack tool calls the unchanged `tools/build-offline-pack.py` producer
in memory. That producer checks the full registry, its bounded regular input files,
and exact equality between all registered originals and the compiled catalog's
embedded texts. A stale unselected course therefore also stops the build. Rebuild
the catalog through the normal repository workflow before trying again.

The committed `offline/recallweave-offline.zip`, source courses, registry, catalog,
learner and complete-pack producer are never rewritten by this tool. It does not
read or trust the committed ZIP as its input. Original member and total ZIP size
limits still apply: 1 MiB per member and 2 MiB for a complete archive.

The catalog adapter recognizes the current compiled page's single course-data
script, title, introductory paragraph and Deck studio link. If that page structure changes, it
refuses instead of silently producing an ambiguously labeled selection. Update
and receive the adapter alongside such a future catalog change.

## Maintained checks

```sh
python3 -B -m unittest discover -s tests -p 'test_selected_course_pack.py' -v
```

The six methods cover exact original bytes and ordered membership, complete
manifest integrity, deterministic ZIP metadata, unchanged full-pack production,
literal script-closing text/Unicode/CRLF, stale-source and layout refusal, invalid
selections, and actual CLI creation, existing-output protection and usage errors.
Use an extracted real selection for browser receiving as well: check the ordered
cards, download the originals, open the sibling learner, preview each course and
start it explicitly. Model estimates and course content retain their existing
qualification; packaging tests do not measure learning effectiveness.
