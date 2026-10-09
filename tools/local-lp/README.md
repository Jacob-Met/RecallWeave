# RecallWeave LP Explorer on this Mac

Open **Open LP Explorer.command** to explore a bounded linear program with exact arithmetic. The entry verifies this package and asks macOS to open its HTML in your usual browser.

The explorer, lesson and guide are the original qualified files from RecallWeave commit `b5e46d4f8c3013259c0baa81507652d900cb5074`. The app runs from its local HTML file and needs no running server. Its optional reference link opens an external course page only when you choose it.

## Use the explorer

1. Choose **A fractional continuous optimum** and choose **Load example**.
2. Inspect the exact maximum, `10/3`, at `x = y = 5/3`. Select that vertex to inspect its constraint slacks.
3. Choose **Download observation** to save the current exact result. The other download buttons save the original lesson and guide.

Editing a field retires the previous result until you apply the complete problem again. Reopening the file starts the maintained initial example; unsaved changes are not restored automatically. Your browser controls where explicit downloads are saved. The lesson JSON can be imported into the existing RecallWeave learner separately.

## Check the installation

Run the entry with `--check` to verify its recorded files without opening a browser. Run it with `--no-open` to verify the package and print the exact file URL.

For the default installation:

```sh
"/Users/me/Applications/RecallWeave-LP-e3a41d2b3368/Open LP Explorer.command" --check
"/Users/me/Applications/RecallWeave-LP-e3a41d2b3368/Open LP Explorer.command" --no-open
```

If verification fails, keep the folder and error for inspection. The opener does not repair or replace files.

## Install or recover a separate copy

Keep all six files in `tools/local-lp/` together: `install.py`, `open.py`, the command template, this guide, `LP-ASSETS.json` and `RELEASE.json`. Use your existing Python 3 to run:

```sh
python3 -B install.py --destination /absolute/path/to/a/new/LP-folder
```

The parent must already exist and belong to your current user. The installer refuses an existing destination. It validates the complete fixed asset carrier before creating a folder and publishes `INSTALLATION.json` only after verifying the writes. An interrupted partial folder remains available for inspection.

The installed `recovery/` directory preserves the exact carrier and all six source files. It can supply a separately installed copy in a new destination. The recorded installation location is checked, so moving an installed folder requires a fresh installation in the intended new location.

The helper records and checks file identities for this source release. Native receiving records identify the runtime and browser that were actually used. A successful request to the macOS opener does not itself establish that a browser rendered the page.

## Scope

The explorer solves bounded continuous two-variable problems on a finite integer rectangle with up to eight integer half-planes. It reports exact rational feasible vertices, intersections, slacks and complete optima. It does not solve unbounded or integer-programming problems.

Original source and qualification: [RecallWeave LP contribution](https://github.com/Jacob-Met/RecallWeave/issues/174#issuecomment-6071314227). Local installation adds an entry and recovery files; it does not alter the solver, lesson, guide, learner, or installed Commons services.
