# Prepare a focused lesson from the terminal

The command uses the same checked-deck reader and prerequisite planner as [Lesson focus](../focus.html). It helps you repeat a deliberate lesson preparation without opening the browser preparation page. It does not change the original course or a learning session.

Run it from the repository root with an existing Node installation. Input is one UTF-8 course JSON document on standard input; successful output is JSON on standard output. There are no packages to install and no network calls.

## Inspect exact concept names

```sh
node tools/focus-course.mjs --list < courses/discrete-fourier.json
```

The inspection includes the original title, attribution and license, followed by every concept in the source's order. Each row gives its exact `id`, its direct `questionCount`, and `requiredConcepts`: all prerequisites the existing planner includes when you select that concept. These are the author's declared links, not a prescribed teaching order or a verification of the course's accuracy.

For the supplied Fourier course, `Fourier coefficients` has three questions and requires `Finite sample grids`. The command does not guess a concept from a partial name, rename one or choose a learning objective for you.

## Emit a checked lesson

```sh
node tools/focus-course.mjs \
  --title "Fourier coefficients: focused lesson" \
  --concept "Fourier coefficients" \
  < courses/discrete-fourier.json
```

That command prints a checked six-question lesson: the three coefficient questions and their three finite-grid prerequisite questions. To keep the result, choose a **new** destination:

```sh
node tools/focus-course.mjs \
  --title "Fourier coefficients: focused lesson" \
  --concept "Fourier coefficients" \
  < courses/discrete-fourier.json > fourier-coefficients-new.json
```

The shell handles `>` before the program runs. It can truncate an existing destination even if the program later refuses the input. Use a new filename, or an explicit temporary/staging destination and inspect the successful result before replacing another file. The command has no output-file writer or overwrite protection of its own. A broken output pipe can leave a partial downstream stream and produces a nonzero exit.

Import the saved JSON through the learner's existing local-file preview and explicit **Start this deck** flow, reopen it in Deck studio, or use it with the separate course-handout preparation flow. The output is the ordinary checked-deck format, not a learning trace or a saved session.

Repeat `--concept` to request multiple concepts. Their command-line order does not reorder the source's concepts or questions. Every question for each requested and required concept stays intact, including IDs, option order, answer indices, explanations, transfer prompts and prerequisite links. Original attribution and license text are retained. The title is the one you explicitly provide.

## Arguments and refusals

- `--help` alone prints usage without waiting for input. `--list` alone prints the inspection.
- Lesson production requires exactly one `--title VALUE` and one to 32 `--concept VALUE` arguments, in any flag order. Put each value in a separate argument; quote spaces and shell metacharacters as appropriate for your shell. The next argument is a literal value even if it starts with a hyphen.
- No positional, `--flag=value`, abbreviated, or `--` end-marker forms are supported. Missing values, unknown flags, repeated titles and combined help/list modes produce exit2 before reading stdin.
- Empty, unknown or repeated target concepts and an invalid title are refused by the unchanged focus model. The command never silently falls back to the whole course.
- Input is limited to 262,144 **raw bytes**, including any UTF-8 BOM. Malformed or truncated UTF-8 is refused; a valid BOM and valid Unicode, including a literal replacement character, are accepted. The existing checked-deck schema and limits still apply.
- Success is exit0. Input, deck, selection and stream failures are exit1. Diagnostics go to stderr. Input or argument refusals emit no prepared JSON on stdout.

## Source and qualification

The only production addition is `tools/focus-course.mjs`. Its selection and serialization come directly from unchanged `src/course-focus.mjs` and `src/deck.mjs`. It adds no course content, browser state, filesystem input modification, automatic storage or workflow.

Run the maintained process tests with:

```sh
node --test tests/focus-course-cli.test.mjs
```

The receiving packet at `docs/receiving/focus-course-cli-234cae4aee53/` distinguishes actual child-process behavior from the source-loading environment. Initial receiving used Node24.19.0 with exact path-based modules supplied by a recorded in-memory ESM loader because the workspace had no free storage. A later run used the same exact five source/test/example files in an ordinary private filesystem projection: all eight maintained groups and both documented commands passed, with source/input hashes and modes unchanged. The packet keeps the initial loader boundary and the later filesystem result separate, including the original reporter-parsing failure and its receipt-only correction. No full checkout, browser interaction, hosted execution or main integration is claimed. No new GitHub Actions run is authorized by the current no-Actions direction.
